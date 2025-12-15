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
        metodo_pagto_1?: string;
        valor_pagto_1?: number;
        metodo_pagto_2?: string;
        valor_pagto_2?: number;
        metodo_pagto_3?: string;
        valor_pagto_3?: number;
      }
    }) => {
      const { data, error } = await supabase
        .from("atendimentos")
        .update({
          ...pagamento,
          status: 'finalizado' as StatusAtendimento,
        })
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

interface AvaliacaoData {
  id: string;
  qtd_baby: number;
  qtd_1_a_16: number;
  qtd_calcados: number;
  qtd_brinquedos: number;
  qtd_itens_medios: number;
  qtd_itens_grandes: number;
  descricao_itens_extra: string;
}

export function useSaveAvaliacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AvaliacaoData) => {
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
          status: "aguardando_pagamento" as StatusAtendimento,
        })
        .eq("id", data.id);

      if (updateError) throw updateError;

      // 2. CRÍTICO: Atualiza estoque imediatamente somando as quantidades
      const { data: estoqueAtual, error: estoqueError } = await supabase
        .from("estoque")
        .select("*")
        .single();

      if (estoqueError) throw estoqueError;

      const { error: updateEstoqueError } = await supabase
        .from("estoque")
        .update({
          qtd_baby: (estoqueAtual.qtd_baby || 0) + data.qtd_baby,
          qtd_1_a_16: (estoqueAtual.qtd_1_a_16 || 0) + data.qtd_1_a_16,
          qtd_calcados: (estoqueAtual.qtd_calcados || 0) + data.qtd_calcados,
          qtd_brinquedos: (estoqueAtual.qtd_brinquedos || 0) + data.qtd_brinquedos,
          qtd_itens_medios: (estoqueAtual.qtd_itens_medios || 0) + data.qtd_itens_medios,
          qtd_itens_grandes: (estoqueAtual.qtd_itens_grandes || 0) + data.qtd_itens_grandes,
        })
        .eq("id", estoqueAtual.id);

      if (updateEstoqueError) throw updateEstoqueError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
    },
  });
}
