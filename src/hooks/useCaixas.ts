import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Caixa {
  id: string;
  nome: string;
  saldo_atual: number;
  updated_at: string;
}

export interface MovimentacaoCaixa {
  id: string;
  caixa_id: string;
  tipo: 'entrada' | 'saida' | 'transferencia_entrada' | 'transferencia_saida';
  valor: number;
  motivo: string;
  created_at: string;
  caixas?: { nome: string };
}

export interface FechamentoCaixa {
  id: string;
  caixa_id: string;
  data_fechamento: string;
  valor_sistema: number;
  valor_contado: number;
  diferenca: number;
  created_at: string;
}

export function useCaixas() {
  return useQuery({
    queryKey: ["caixas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caixas")
        .select("*")
        .order("nome");

      if (error) throw error;
      return data as Caixa[];
    },
  });
}

export function useMovimentacoesCaixa() {
  return useQuery({
    queryKey: ["movimentacoes_caixa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes_caixa")
        .select("*, caixas(nome)")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as MovimentacaoCaixa[];
    },
  });
}

export function useTransferenciaCaixa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      origemNome,
      destinoNome,
      valor,
      motivo,
    }: {
      origemNome: string;
      destinoNome: string;
      valor: number;
      motivo: string;
    }) => {
      const { data, error } = await supabase.rpc("realizar_transferencia_caixa", {
        p_origem_nome: origemNome,
        p_destino_nome: destinoNome,
        p_valor: valor,
        p_motivo: motivo,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caixas"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_caixa"] });
      toast.success("Transferência realizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro na transferência: " + error.message);
    },
  });
}

export function useMovimentacaoManual() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caixaNome,
      tipo,
      valor,
      motivo,
    }: {
      caixaNome: string;
      tipo: "entrada" | "saida";
      valor: number;
      motivo: string;
    }) => {
      // Buscar o caixa pelo nome
      const { data: caixa, error: caixaError } = await supabase
        .from("caixas")
        .select("id, saldo_atual")
        .eq("nome", caixaNome)
        .single();

      if (caixaError) throw caixaError;

      const novoSaldo =
        tipo === "entrada"
          ? caixa.saldo_atual + valor
          : caixa.saldo_atual - valor;

      if (novoSaldo < 0) {
        throw new Error("Saldo insuficiente para esta operação");
      }

      // Atualizar saldo
      const { error: updateError } = await supabase
        .from("caixas")
        .update({ saldo_atual: novoSaldo, updated_at: new Date().toISOString() })
        .eq("id", caixa.id);

      if (updateError) throw updateError;

      // Registrar movimentação
      const { error: movError } = await supabase
        .from("movimentacoes_caixa")
        .insert({
          caixa_id: caixa.id,
          tipo: tipo,
          valor: valor,
          motivo: motivo,
        });

      if (movError) throw movError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caixas"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_caixa"] });
      toast.success("Movimentação registrada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro: " + error.message);
    },
  });
}

export function useFechamentoCaixa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caixaId,
      valorSistema,
      valorContado,
    }: {
      caixaId: string;
      valorSistema: number;
      valorContado: number;
    }) => {
      const diferenca = valorSistema - valorContado;

      const { error } = await supabase.from("fechamentos_caixa").insert({
        caixa_id: caixaId,
        data_fechamento: new Date().toISOString().split("T")[0],
        valor_sistema: valorSistema,
        valor_contado: valorContado,
        diferenca: diferenca,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caixas"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_caixa"] });
      toast.success("Fechamento de caixa registrado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao fechar caixa: " + error.message);
    },
  });
}

export function useResumoVendasHoje() {
  return useQuery({
    queryKey: ["resumo_vendas_hoje"],
    queryFn: async () => {
      const hoje = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .gte("created_at", `${hoje}T00:00:00`)
        .lte("created_at", `${hoje}T23:59:59`);

      if (error) throw error;

      let totalDinheiro = 0;
      let totalPix = 0;
      let totalCartao = 0;

      data?.forEach((venda) => {
        // Pagamento 1
        if (venda.metodo_pagto_1 === "Dinheiro") {
          totalDinheiro += venda.valor_pagto_1 || 0;
        } else if (venda.metodo_pagto_1 === "PIX") {
          totalPix += venda.valor_pagto_1 || 0;
        } else if (venda.metodo_pagto_1?.includes("Crédito") || venda.metodo_pagto_1?.includes("Débito")) {
          totalCartao += venda.valor_pagto_1 || 0;
        }

        // Pagamento 2
        if (venda.metodo_pagto_2 === "Dinheiro") {
          totalDinheiro += venda.valor_pagto_2 || 0;
        } else if (venda.metodo_pagto_2 === "PIX") {
          totalPix += venda.valor_pagto_2 || 0;
        } else if (venda.metodo_pagto_2?.includes("Crédito") || venda.metodo_pagto_2?.includes("Débito")) {
          totalCartao += venda.valor_pagto_2 || 0;
        }

        // Pagamento 3
        if (venda.metodo_pagto_3 === "Dinheiro") {
          totalDinheiro += venda.valor_pagto_3 || 0;
        } else if (venda.metodo_pagto_3 === "PIX") {
          totalPix += venda.valor_pagto_3 || 0;
        } else if (venda.metodo_pagto_3?.includes("Crédito") || venda.metodo_pagto_3?.includes("Débito")) {
          totalCartao += venda.valor_pagto_3 || 0;
        }
      });

      return {
        totalDinheiro,
        totalPix,
        totalCartao,
        totalGeral: totalDinheiro + totalPix + totalCartao,
      };
    },
  });
}
