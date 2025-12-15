import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Atendimento, StatusAtendimento } from "@/types/database";

export function useAtendimentos() {
  return useQuery({
    queryKey: ["atendimentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atendimentos")
        .select("*")
        .order("hora_chegada", { ascending: false });

      if (error) throw error;
      return data as Atendimento[];
    },
  });
}

export function useAtendimentosByStatus(status: StatusAtendimento) {
  return useQuery({
    queryKey: ["atendimentos", "status", status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atendimentos")
        .select("*")
        .eq("status", status)
        .order("hora_chegada", { ascending: false });

      if (error) throw error;

      // DEBUG: confirma dados retornando do Supabase
      console.log("[useAtendimentosByStatus]", status, data);

      return data as Atendimento[];
    },
  });
}

export function useCreateAtendimento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nomeCliente: string) => {
      const { data, error } = await supabase
        .from("atendimentos")
        .insert({ nome_cliente: nomeCliente })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
    },
  });
}

export function useUpdateAtendimento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<Atendimento> 
    }) => {
      const { data, error } = await supabase
        .from("atendimentos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
    },
  });
}

export function useFinalizarAtendimento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      pagamento 
    }: { 
      id: string; 
      pagamento: {
        valor_total_negociado: number;
        desconto_aplicado?: number;
        pagamento_1_metodo?: string | null;
        pagamento_1_valor?: number;
        pagamento_1_banco?: string | null;
        pagamento_2_metodo?: string | null;
        pagamento_2_valor?: number;
        pagamento_2_banco?: string | null;
        pagamento_3_metodo?: string | null;
        pagamento_3_valor?: number;
        pagamento_3_banco?: string | null;
      }
    }) => {
      console.log("[useFinalizarAtendimento] Payload enviado:", pagamento);
      
      const { data, error } = await supabase
        .from("atendimentos")
        .update({
          ...pagamento,
          status: 'finalizado' as StatusAtendimento,
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) {
        console.error("[useFinalizarAtendimento] Erro Supabase:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
    },
  });
}

interface AvaliacaoData {
  id: string;
  qtd_baby: number;
  qtd_1_a_16: number;
  qtd_calcados: number;
  qtd_brinquedos: number;
  qtd_itens_medios: number;
  qtd_itens_grandes: number;
  descricao_itens_extra: string;
  avaliadora_nome?: string;
}

export function useSaveAvaliacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AvaliacaoData) => {
      console.log("[useSaveAvaliacao] Salvando avaliação:", data);

      // 1. Atualiza o atendimento com as quantidades e muda status
      const { error: updateError } = await supabase
        .from("atendimentos")
        .update({
          qtd_baby: data.qtd_baby,
          qtd_1_a_16: data.qtd_1_a_16,
          qtd_calcados: data.qtd_calcados,
          qtd_brinquedos: data.qtd_brinquedos,
          qtd_itens_medios: data.qtd_itens_medios,
          qtd_itens_grandes: data.qtd_itens_grandes,
          descricao_itens_extra: data.descricao_itens_extra,
          avaliadora_nome: data.avaliadora_nome || null,
          status: "aguardando_pagamento" as StatusAtendimento,
        })
        .eq("id", data.id);

      if (updateError) {
        console.error("[useSaveAvaliacao] Erro ao atualizar atendimento:", updateError);
        throw updateError;
      }

      console.log("[useSaveAvaliacao] Atendimento atualizado, atualizando estoque...");

      // 2. CRÍTICO: Atualiza estoque imediatamente somando as quantidades
      // Busca todas as categorias do estoque
      const { data: estoqueAtual, error: estoqueError } = await supabase
        .from("estoque")
        .select("*");

      if (estoqueError) {
        console.error("[useSaveAvaliacao] Erro ao buscar estoque:", estoqueError);
        throw estoqueError;
      }

      console.log("[useSaveAvaliacao] Estoque atual:", estoqueAtual);

      // Mapeamento de categorias para as quantidades da avaliação
      // IMPORTANTE: Os nomes devem corresponder EXATAMENTE à coluna 'categoria' na tabela 'estoque'
      // (mantemos aliases para evitar falhas por divergência histórica de strings)
      const categoriaMap: Record<string, number> = {
        "Roupas Baby": data.qtd_baby,
        "Baby": data.qtd_baby,
        "Roupas 1 a 16": data.qtd_1_a_16,
        "1 a 16": data.qtd_1_a_16,
        "Calçados": data.qtd_calcados,
        "Brinquedos": data.qtd_brinquedos,
        "Itens Médios": data.qtd_itens_medios,
        "Itens Grandes": data.qtd_itens_grandes,
      };

      // Atualiza cada categoria no estoque
      for (const item of estoqueAtual || []) {
        const adicionar = categoriaMap[item.categoria] || 0;
        if (adicionar > 0) {
          const novaQuantidade = (item.quantidade_atual || 0) + adicionar;
          const { error: updateEstoqueError } = await supabase
            .from("estoque")
            .update({ quantidade_atual: novaQuantidade })
            .eq("id", item.id);

          if (updateEstoqueError) {
            console.error(`[useSaveAvaliacao] Erro ao atualizar estoque ${item.categoria}:`, updateEstoqueError);
            throw updateEstoqueError;
          }
          console.log(`[useSaveAvaliacao] Estoque ${item.categoria}: ${item.quantidade_atual} + ${adicionar} = ${novaQuantidade}`);
        }
      }

      console.log("[useSaveAvaliacao] Avaliação salva com sucesso!");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
    },
  });
}
