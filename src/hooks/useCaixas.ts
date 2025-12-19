import React from "react";
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
  caixa_origem_id: string | null;
  caixa_destino_id: string | null;
  // 🔥 TIPOS REAIS DO BANCO:
  tipo: 'venda' | 'pagamento_avaliacao' | 'entrada' | 'saida' | 'transferencia_entre_caixas';
  valor: number;
  motivo: string | null;
  data_hora: string;
  caixa_origem?: { nome: string }[] | null;
  caixa_destino?: { nome: string }[] | null;
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

/**
 * 🛡️ HOOK BLINDADO: Busca o saldo inicial do dia anterior
 * Com tratamento de erros e fallbacks seguros
 */
export function useSaldoInicial(caixaId: string | null, dataInicio: string | null) {
  return useQuery({
    queryKey: ["saldo_inicial", caixaId, dataInicio],
    enabled: !!caixaId && !!dataInicio,
    queryFn: async () => {
      try {
        console.log("🔍 [SALDO INICIAL] Iniciando busca...", { caixaId, dataInicio });
        
        // Null checks
        if (!caixaId || !dataInicio) {
          console.log("⚠️ [SALDO INICIAL] Parâmetros inválidos, retornando 0");
          return { valor: 0, fonte: "fallback", data_fechamento: null };
        }

        // Calcular dia anterior com segurança
        let diaAnterior: string;
        try {
          const dataInicialDate = new Date(dataInicio + 'T00:00:00');
          if (isNaN(dataInicialDate.getTime())) {
            throw new Error("Data inválida");
          }
          dataInicialDate.setDate(dataInicialDate.getDate() - 1);
          diaAnterior = dataInicialDate.toISOString().split('T')[0];
        } catch (err) {
          console.error("❌ [SALDO INICIAL] Erro ao calcular dia anterior:", err);
          return { valor: 0, fonte: "erro_data", data_fechamento: null };
        }

        console.log("✅ [SALDO INICIAL] Dia anterior:", diaAnterior);

        // Buscar fechamento do dia anterior
        // 🔥 CORREÇÃO: created_at NÃO EXISTE! Removendo .order()
        const { data, error } = await supabase
          .from("fechamentos_caixa")
          .select("*")
          .eq("caixa_id", caixaId)
          .eq("data_fechamento", diaAnterior)
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error("❌ [SALDO INICIAL] Erro ao buscar fechamento:", error);
          return { valor: 0, fonte: "erro_query", data_fechamento: null };
        }

        if (data) {
          console.log("✅ [SALDO INICIAL] Fechamento encontrado:", data.valor_sistema);
          return { 
            valor: data.valor_sistema || 0, 
            fonte: "fechamento", 
            data_fechamento: data.data_fechamento 
          };
        }

        // Fallback: buscar o fechamento mais recente antes da data
        const { data: dataFallback, error: errorFallback } = await supabase
          .from("fechamentos_caixa")
          .select("*")
          .eq("caixa_id", caixaId)
          .lt("data_fechamento", dataInicio)
          .order("data_fechamento", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (dataFallback && !errorFallback) {
          console.log("✅ [SALDO INICIAL] Fechamento anterior encontrado:", dataFallback.valor_sistema);
          return { 
            valor: dataFallback.valor_sistema || 0, 
            fonte: "fechamento_anterior",
            data_fechamento: dataFallback.data_fechamento 
          };
        }

        console.log("⚠️ [SALDO INICIAL] Nenhum fechamento encontrado, usando 0");
        return { valor: 0, fonte: "sem_fechamento", data_fechamento: null };

      } catch (error) {
        console.error("❌ [SALDO INICIAL] Erro crítico:", error);
        return { valor: 0, fonte: "erro_critico", data_fechamento: null };
      }
    },
  });
}

/**
 * 🛡️ HOOK BLINDADO: Busca movimentações em dinheiro do período
 * Com tratamento de erros e validações
 */
export function useMovimentacoesDinheiro(
  caixaId: string | null,
  dataInicio: string | null,
  dataFim: string | null
) {
  return useQuery({
    queryKey: ["movimentacoes_dinheiro", caixaId, dataInicio, dataFim],
    enabled: !!caixaId && !!dataInicio && !!dataFim,
    queryFn: async () => {
      try {
        console.log("🔍 [MOVIMENTAÇÕES] Iniciando busca...", { caixaId, dataInicio, dataFim });

        // Null checks
        if (!caixaId || !dataInicio || !dataFim) {
          console.log("⚠️ [MOVIMENTAÇÕES] Parâmetros inválidos");
          return [];
        }

        // Validar datas
        const dataInicioObj = new Date(dataInicio + 'T00:00:00');
        const dataFimObj = new Date(dataFim + 'T23:59:59');
        
        if (isNaN(dataInicioObj.getTime()) || isNaN(dataFimObj.getTime())) {
          console.error("❌ [MOVIMENTAÇÕES] Datas inválidas");
          return [];
        }

        const dataHoraInicio = dataInicioObj.toISOString();
        const dataHoraFim = dataFimObj.toISOString();

        console.log("✅ [MOVIMENTAÇÕES] Range:", { dataHoraInicio, dataHoraFim });

        // 🔍 BUSCAR MOVIMENTAÇÕES DO CAIXA
        // A tabela movimentacoes_caixa NÃO TEM coluna de método de pagamento!
        // Todas as movimentações nela SÃO em dinheiro físico:
        // - entrada: dinheiro entrando no caixa
        // - saida: dinheiro saindo do caixa  
        // - transferencia: dinheiro movendo entre caixas
        // - venda: ATUALMENTE NÃO GRAVA VENDAS AQUI (verificar com logs)
        
        // 🔥 CORREÇÃO: caixa_id NÃO EXISTE! Usar apenas origem e destino
        const { data, error } = await supabase
          .from("movimentacoes_caixa")
          .select(`
            id, 
            tipo, 
            valor, 
            motivo, 
            data_hora,
            caixa_origem_id, 
            caixa_destino_id,
            caixa_origem:caixas!movimentacoes_caixa_caixa_origem_id_fkey(nome),
            caixa_destino:caixas!movimentacoes_caixa_caixa_destino_id_fkey(nome)
          `)
          .or(`caixa_origem_id.eq.${caixaId},caixa_destino_id.eq.${caixaId}`)
          .gte("data_hora", dataHoraInicio)
          .lte("data_hora", dataHoraFim)
          .order("data_hora", { ascending: true });

        if (error) {
          console.error("❌ [MOVIMENTAÇÕES] Erro na query:", error);
          throw error;
        }

        // 🚨🚨🚨 DEBUG VISUAL COMPLETO 🚨🚨🚨
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🔍 DADOS DO BANCO (movimentacoes_caixa):");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📊 Total de registros:", data?.length || 0);
        console.log("📋 Tipos encontrados:", data?.map(m => m.tipo).join(', ') || 'nenhum');
        console.log("🔍 ANÁLISE DETALHADA:");
        data?.forEach((mov, i) => {
          console.log(`  [${i+1}] tipo="${mov.tipo}" | valor=${mov.valor} | origem_id=${mov.caixa_origem_id || 'NULL'} | destino_id=${mov.caixa_destino_id || 'NULL'} | origem_nome=${mov.caixa_origem?.[0]?.nome || 'NULL'} | destino_nome=${mov.caixa_destino?.[0]?.nome || 'NULL'}`);
        });
        console.log("📦 DADOS BRUTOS:", data);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        return (data as MovimentacaoCaixa[]) || [];

      } catch (error) {
        console.error("❌ [MOVIMENTAÇÕES] Erro crítico:", error);
        return [];
      }
    },
  });
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
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["movimentacoes_caixa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes_caixa")
        .select("id, tipo, valor, motivo, data_hora, caixa_origem_id, caixa_destino_id, caixa_origem:caixas!movimentacoes_caixa_caixa_origem_id_fkey(nome), caixa_destino:caixas!movimentacoes_caixa_caixa_destino_id_fkey(nome)")
        .order("data_hora", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as MovimentacaoCaixa[];
    },
  });

  // Realtime subscription para atualizar automaticamente
  React.useEffect(() => {
    const channel = supabase
      .channel('movimentacoes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'movimentacoes_caixa'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["movimentacoes_caixa"] });
          queryClient.invalidateQueries({ queryKey: ["caixas"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
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
        p_tipo: "transferencia_entre_caixas",
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
        .update({ saldo_atual: novoSaldo })
        .eq("id", caixa.id);

      if (updateError) throw updateError;

      // Registrar movimentação
      // Para ENTRADA: destino é o caixa que recebeu
      // Para SAÍDA: origem é o caixa que perdeu
      const movimentacao = tipo === "entrada" 
        ? {
            caixa_destino_id: caixa.id,
            caixa_origem_id: null,
            tipo: tipo,
            valor: valor,
            motivo: motivo,
          }
        : {
            caixa_origem_id: caixa.id,
            caixa_destino_id: null,
            tipo: tipo,
            valor: valor,
            motivo: motivo,
          };

      const { error: movError } = await supabase
        .from("movimentacoes_caixa")
        .insert(movimentacao);

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

export interface DetalhesPagamentosFechamento {
  dinheiro: number;
  pix: number;
  debito: number;
  credito: number;
  giraCredito: number;
}

export function useFechamentoCaixa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caixaId,
      valorSistema,
      valorContado,
      justificativa,
      detalhesPagamentos,
    }: {
      caixaId: string;
      valorSistema: number;
      valorContado: number;
      justificativa?: string | null;
      detalhesPagamentos?: DetalhesPagamentosFechamento;
    }) => {
      const diferenca = valorSistema - valorContado;

      const { error } = await supabase.from("fechamentos_caixa").insert({
        caixa_id: caixaId,
        data_fechamento: new Date().toISOString().split("T")[0],
        valor_sistema: valorSistema,
        valor_contado: valorContado,
        diferenca: diferenca,
        justificativa: justificativa || null,
        detalhes_pagamentos: detalhesPagamentos ? JSON.stringify(detalhesPagamentos) : null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caixas"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_caixa"] });
      toast.success("Caixa fechado com sucesso!");
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

export interface ResumoVendasPorCaixa {
  totalDinheiro: number;
  totalPix: number;
  totalDebito: number;
  totalCredito: number;
  totalGiraCredito: number;
  totalGeral: number;
}

export function useResumoVendasPorCaixa(caixaNome: string | null) {
  return useQuery({
    queryKey: ["resumo_vendas_caixa", caixaNome],
    enabled: !!caixaNome,
    queryFn: async (): Promise<ResumoVendasPorCaixa> => {
      const hoje = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .eq("caixa_origem", caixaNome);

      if (error) throw error;

      // Filtrar vendas de hoje pelo campo data_venda (YYYY-MM-DD)
      const vendasHoje = data?.filter((venda) => {
        const dataVenda = venda.data_venda || venda.created_at || "";
        return dataVenda.startsWith(hoje);
      }) || [];

      console.log("Vendas encontradas para", caixaNome, "hoje:", vendasHoje);

      let totalDinheiro = 0;
      let totalPix = 0;
      let totalDebito = 0;
      let totalCredito = 0;
      let totalGiraCredito = 0;

      const processarPagamento = (metodo: string | null, valor: number | null) => {
        if (!metodo || !valor) return;
        
        const metodoLower = metodo.toLowerCase();
        
        if (metodoLower === "dinheiro") {
          totalDinheiro += valor;
        } else if (metodoLower === "pix") {
          totalPix += valor;
        } else if (metodoLower === "débito" || metodoLower === "debito") {
          totalDebito += valor;
        } else if (metodoLower.includes("crédito") || metodoLower.includes("credito")) {
          // Exclui "gira crédito" que é tratado separadamente
          if (!metodoLower.includes("gira")) {
            totalCredito += valor;
          }
        }
        
        if (metodoLower === "gira crédito" || metodoLower === "gira credito") {
          totalGiraCredito += valor;
        }
      };

      vendasHoje.forEach((venda) => {
        processarPagamento(venda.metodo_pagto_1, venda.valor_pagto_1);
        processarPagamento(venda.metodo_pagto_2, venda.valor_pagto_2);
        processarPagamento(venda.metodo_pagto_3, venda.valor_pagto_3);
      });

      return {
        totalDinheiro,
        totalPix,
        totalDebito,
        totalCredito,
        totalGiraCredito,
        totalGeral: totalDinheiro + totalPix + totalDebito + totalCredito + totalGiraCredito,
      };
    },
  });
}
