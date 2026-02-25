import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getDateBrasilia, getDateTimeBrasilia } from "@/lib/utils";
import { useLogAtividade } from "@/hooks/useLogAtividade";

export interface Caixa {
  id: string;
  nome: string;
  saldo_seed_caixas: number;
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
 * 🛡️ HOOK BLINDADO: Busca o saldo inicial
 * PRIORIDADE:
 * 1. Valor do fechamento físico (valor_contado) do dia anterior
 * 2. Fechamento mais recente anterior
 * 3. Zero como fallback
 * 
 * NOTA: O saldo é sempre calculado dinamicamente via movimentacoes_caixa e fechamentos_caixa.
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

        // PRIORIDADE 1: Buscar fechamento APROVADO do dia anterior (valor_contado)
        // 🔒 IMPORTANTE: Só considera fechamentos com status "aprovado"
        // 🐛 FIX: Usar range de datas pois data_fechamento pode ter timestamp com hora
        const diaAnteriorInicio = diaAnterior + "T00:00:00Z";
        const diaAnteriorFim = dataInicio + "T00:00:00Z";
        
        console.log("🔍 [SALDO INICIAL] Buscando range:", diaAnteriorInicio, "até", diaAnteriorFim);
        console.log("🔍 [SALDO INICIAL] Caixa ID:", caixaId);
        
        const { data, error } = await supabase
          .from("fechamentos_caixa")
          .select("*")
          .eq("caixa_id", caixaId)
          .gte("data_fechamento", diaAnteriorInicio)
          .lt("data_fechamento", diaAnteriorFim)
          .eq("status", "aprovado") // 🆕 Só fechamentos aprovados
          .maybeSingle();
        
        console.log("📊 [SALDO INICIAL] Resultado da query:", { data, error });

        if (error && error.code !== 'PGRST116') {
          console.error("❌ [SALDO INICIAL] Erro ao buscar fechamento:", error);
          return { valor: 0, fonte: "erro_query", data_fechamento: null };
        }

        if (data) {
          // Usar valor_contado (fechamento físico aprovado) como saldo inicial
          console.log("✅ [SALDO INICIAL] Fechamento aprovado do dia anterior:", data.valor_contado);
          return { 
            valor: data.valor_contado || 0, 
            fonte: "fechamento_aprovado", 
            data_fechamento: data.data_fechamento 
          };
        }

        // PRIORIDADE 1B: Se não houver aprovado, usar fechamento pendente do dia anterior
        const { data: dataPendenteDia, error: errorPendenteDia } = await supabase
          .from("fechamentos_caixa")
          .select("*")
          .eq("caixa_id", caixaId)
          .gte("data_fechamento", diaAnteriorInicio)
          .lt("data_fechamento", diaAnteriorFim)
          .eq("status", "pendente_aprovacao")
          .maybeSingle();

        if (errorPendenteDia && errorPendenteDia.code !== 'PGRST116') {
          console.error("❌ [SALDO INICIAL] Erro ao buscar fechamento pendente (dia anterior):", errorPendenteDia);
        }

        if (dataPendenteDia) {
          console.log("⚠️ [SALDO INICIAL] Fechamento pendente do dia anterior:", dataPendenteDia.valor_contado);
          return {
            valor: dataPendenteDia.valor_contado || 0,
            fonte: "fechamento_pendente",
            data_fechamento: dataPendenteDia.data_fechamento
          };
        }

        // PRIORIDADE 2: Buscar fechamento APROVADO mais recente antes da data
        const { data: dataFallback, error: errorFallback } = await supabase
          .from("fechamentos_caixa")
          .select("*")
          .eq("caixa_id", caixaId)
          .eq("status", "aprovado") // 🆕 Só fechamentos aprovados
          .lt("data_fechamento", dataInicio)
          .order("data_fechamento", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (dataFallback && !errorFallback) {
          // Usar valor_contado do fechamento aprovado anterior mais próximo
          console.log("✅ [SALDO INICIAL] Fechamento aprovado anterior encontrado:", dataFallback.valor_contado);
          return { 
            valor: dataFallback.valor_contado || 0, 
            fonte: "fechamento_aprovado_anterior",
            data_fechamento: dataFallback.data_fechamento 
          };
        }

        // PRIORIDADE 2B: Se não houver aprovado, usar fechamento pendente mais recente antes da data
        const { data: dataPendenteFallback, error: errorPendenteFallback } = await supabase
          .from("fechamentos_caixa")
          .select("*")
          .eq("caixa_id", caixaId)
          .eq("status", "pendente_aprovacao")
          .lt("data_fechamento", dataInicio)
          .order("data_fechamento", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (errorPendenteFallback && errorPendenteFallback.code !== 'PGRST116') {
          console.error("❌ [SALDO INICIAL] Erro ao buscar fechamento pendente (anterior):", errorPendenteFallback);
        }

        if (dataPendenteFallback) {
          console.log("⚠️ [SALDO INICIAL] Fechamento pendente anterior encontrado:", dataPendenteFallback.valor_contado);
          return {
            valor: dataPendenteFallback.valor_contado || 0,
            fonte: "fechamento_pendente_anterior",
            data_fechamento: dataPendenteFallback.data_fechamento
          };
        }

        // PRIORIDADE 3: Sem fechamento = sem saldo inicial (erro de configuração)
        console.log("❌ [SALDO INICIAL] ERRO: Nenhum fechamento encontrado! Caixa não tem saldo inicial.");
        console.log("⚠️  O caixa deve ter pelo menos UM fechamento para funcionar corretamente.");
        return { valor: 0, fonte: "erro_sem_fechamento", data_fechamento: null };

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
        
        // 🔍 DETECTAR IDs DUPLICADOS
        const ids = data?.map(m => m.id) || [];
        const idsUnicos = new Set(ids);
        console.log("🆔 IDs únicos:", idsUnicos.size, "de", ids.length, "registros");
        if (idsUnicos.size < ids.length) {
          console.error("🚨 ATENÇÃO: Há IDs DUPLICADOS na query!");
        }
        
        console.log("🔍 ANÁLISE DETALHADA:");
        data?.forEach((mov, i) => {
          console.log(`  [${i+1}] ID=${mov.id?.substring(0,8)} | tipo="${mov.tipo}" | valor=${mov.valor} | origem_id=${mov.caixa_origem_id || 'NULL'} | destino_id=${mov.caixa_destino_id || 'NULL'} | origem_nome=${mov.caixa_origem?.[0]?.nome || 'NULL'} | destino_nome=${mov.caixa_destino?.[0]?.nome || 'NULL'}`);
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

/**
 * Hook para calcular o saldo final de um caixa específico para o dia de hoje
 * Usa a mesma lógica do extrato: saldo_inicial + entradas - saídas
 */
export function useSaldoFinalHoje(caixaId: string | null) {
  const hoje = getDateBrasilia();
  
  const { data: saldoInicialData, isLoading: loadingSaldoInicial } = useSaldoInicial(caixaId, hoje);
  const { data: movimentacoesPeriodo, isLoading: loadingMovimentacoes } = useMovimentacoesDinheiro(caixaId, hoje, hoje);

  return useQuery({
    queryKey: ["saldo_final_hoje", caixaId, saldoInicialData, movimentacoesPeriodo],
    enabled: !!caixaId && !loadingSaldoInicial && !loadingMovimentacoes,
    queryFn: async () => {
      const saldoInicial = saldoInicialData?.valor || 0;
      const movs = movimentacoesPeriodo || [];
      
      console.log("🔢 [SALDO FINAL HOJE] Calculando para caixa:", caixaId);
      console.log("  💰 Saldo Inicial:", saldoInicial, "(fonte:", saldoInicialData?.fonte, ")");
      console.log("  📊 Movimentações:", movs.length);
      
      let totalEntradas = 0;
      let totalSaidas = 0;

      movs.forEach((mov) => {
        const tipo = mov.tipo;
        const destinoId = mov.caixa_destino_id;
        const origemId = mov.caixa_origem_id;
        
        if (tipo === 'venda') {
          if (destinoId === caixaId) {
            totalEntradas += mov.valor;
            console.log("  ➕ Venda:", mov.valor);
          }
        } else if (tipo === 'pagamento_avaliacao') {
          // Pagamento de avaliação é SAÍDA do caixa Avaliação (origem)
          if (origemId === caixaId) {
            totalSaidas += mov.valor;
            console.log("  ➖ Pagamento Avaliação:", mov.valor);
          }
        } else if (tipo === 'entrada') {
          // Entrada: destino é o caixa que recebeu
          if (destinoId === caixaId) {
            totalEntradas += mov.valor;
            console.log("  ➕ Entrada Manual:", mov.valor);
          }
        } else if (tipo === 'saida') {
          // Saída: origem é o caixa que perdeu
          if (origemId === caixaId) {
            totalSaidas += mov.valor;
            console.log("  ➖ Saída Manual:", mov.valor);
          }
        } else if (tipo === 'transferencia_entre_caixas') {
          if (destinoId === caixaId) {
            totalEntradas += mov.valor;
            console.log("  ➕ Transferência Recebida:", mov.valor);
          } else if (origemId === caixaId) {
            totalSaidas += mov.valor;
            console.log("  ➖ Transferência Enviada:", mov.valor);
          }
        }
      });

      const saldoFinal = saldoInicial + totalEntradas - totalSaidas;
      
      console.log("  📈 Total Entradas:", totalEntradas);
      console.log("  📉 Total Saídas:", totalSaidas);
      console.log("  ✅ Saldo Final:", saldoFinal);
      console.log("  🧮 Fórmula:", `${saldoInicial} + ${totalEntradas} - ${totalSaidas} = ${saldoFinal}`);
      
      // Validação: Se não há movimentações NEM saldo inicial, caixa pode estar sem configuração
      if (movs.length === 0 && saldoInicial === 0) {
        console.warn("⚠️  [SALDO FINAL HOJE] Caixa com ZERO movimentações e ZERO saldo inicial!");
        console.warn("   Verifique se o caixa foi devidamente configurado com fechamentos_caixa");
      }

      return {
        saldoInicial,
        totalEntradas,
        totalSaidas,
        saldoFinal,
        fonte: saldoInicialData?.fonte || "sem_dados",
        debugInfo: {
          movimentacoesConhecidas: movs.length,
          foiCalculado: true,
          timestamp: new Date().toISOString()
        }
      };
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
          // Invalidar TODAS as queries relacionadas a movimentações
          queryClient.invalidateQueries({ queryKey: ["movimentacoes_caixa"] });
          queryClient.invalidateQueries({ queryKey: ["movimentacoes_dinheiro"] });
          queryClient.invalidateQueries({ queryKey: ["saldo_inicial"] });
          queryClient.invalidateQueries({ queryKey: ["saldo_final_hoje"] });
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
  const { log } = useLogAtividade();

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
      return { data, origemNome, destinoNome, valor, motivo };
    },
    onSuccess: ({ origemNome, destinoNome, valor, motivo }) => {
      queryClient.invalidateQueries({ queryKey: ["caixas"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_caixa"] });
      toast.success("Transferência realizada com sucesso!");
      log({
        acao: "transferir",
        tabela_afetada: "movimentacoes_caixa",
        detalhes: `Transferência de ${origemNome} para ${destinoNome} - R$ ${valor} - ${motivo}`
      });
    },
    onError: (error: Error) => {
      toast.error("Erro na transferência: " + error.message);
    },
  });
}

export function useMovimentacaoManual() {
  const queryClient = useQueryClient();
  const { log } = useLogAtividade();

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
        .select("id")
        .eq("nome", caixaNome)
        .single();

      if (caixaError) throw caixaError;

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
      return { caixaNome, tipo, valor, motivo };
    },
    onSuccess: ({ caixaNome, tipo, valor, motivo }) => {
      // ✅ Invalidar queries para reconhecer nova movimentação:
      // 1. "caixas" - trigger pode ter atualizado saldo_seed_caixas
      // 2. "movimentacoes_caixa" - nova movimentação foi criada
      // 3. "movimentacoes_dinheiro" - será incluída na próxima busca
      // 4. "saldo_final_hoje" - deve recalcular incluindo esta movimentação
      queryClient.invalidateQueries({ queryKey: ["caixas"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_caixa"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_dinheiro"] });
      queryClient.invalidateQueries({ queryKey: ["saldo_final_hoje"] });
      
      toast.success("✅ Movimentação registrada com sucesso!");
      console.log(`📊 [CREATE] ${tipo.toUpperCase()} criada - ${caixaNome} - R$ ${valor}`);
      console.log("   Queries invalidadas, useSaldoFinalHoje() vai refazer o cálculo");
      
      log({
        acao: tipo,
        tabela_afetada: "movimentacoes_caixa",
        detalhes: `Movimentação manual ${tipo} - ${caixaNome} - R$ ${valor} - ${motivo}`
      });
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
  const { log } = useLogAtividade();

  return useMutation({
    mutationFn: async ({
      caixaId,
      valorSistema,
      valorContado,
      justificativa,
      dataFechamento,
      status,
      detalhesPagamentos,
    }: {
      caixaId: string;
      valorSistema: number;
      valorContado: number;
      justificativa?: string | null;
      dataFechamento?: string;
      status?: string;
      detalhesPagamentos?: DetalhesPagamentosFechamento;
    }) => {
      const diferenca = valorSistema - valorContado;
      const agoraBrasilia = getDateTimeBrasilia();
      const dataParaSalvar = dataFechamento
        ? (dataFechamento.includes("T")
          ? dataFechamento
          : `${dataFechamento}T${agoraBrasilia.split("T")[1]}`)
        : agoraBrasilia;

      const { data: { user } } = await supabase.auth.getUser();

      const statusFinal = status || "aprovado";
      const { error } = await supabase.from("fechamentos_caixa").insert({
        caixa_id: caixaId,
        data_fechamento: dataParaSalvar,
        valor_sistema: valorSistema,
        valor_contado: valorContado,
        diferenca: diferenca,
        justificativa: justificativa || null,
        status: statusFinal, // 🆕 Novo campo
        requer_revisao: statusFinal === "pendente_aprovacao", // 🆕 Flag de revisão
        detalhes_pagamentos: detalhesPagamentos ? JSON.stringify(detalhesPagamentos) : null,
        criado_por: user?.id || null,
      });

      if (error) throw error;
      return { caixaId, valorSistema, valorContado, diferenca, status: statusFinal };
    },
    onSuccess: ({ caixaId, valorSistema, valorContado, diferenca, status }) => {
      queryClient.invalidateQueries({ queryKey: ["caixas"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_caixa"] });
      queryClient.invalidateQueries({ queryKey: ["fechamentos_pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["historico_fechamentos"] });
      queryClient.invalidateQueries({ queryKey: ["estatisticas_fechamentos"] });
      queryClient.invalidateQueries({ queryKey: ["fechamentos_hoje"] }); // ✅ IMPORTANTE: atualiza status na tela
      queryClient.invalidateQueries({ queryKey: ["saldo_final_hoje"] }); // ✅ Atualiza saldo dos cards
      const mensagem = status === "pendente_aprovacao"
        ? "Caixa enviado para aprovação"
        : "Caixa fechado;";
      toast.success(mensagem);
      log({
        acao: "fechar",
        tabela_afetada: "fechamentos_caixa",
        registro_id: caixaId,
        detalhes: `Fechamento de caixa - Sistema: R$ ${valorSistema} / Contado: R$ ${valorContado} / Diferença: R$ ${diferenca}`
      });
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
      const hoje = getDateBrasilia();

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
      const hoje = getDateBrasilia();

      // 🔍 DEBUG: Log do que estamos procurando
      console.log("[useResumoVendasPorCaixa] Buscando vendas para caixa:", caixaNome, "data:", hoje);

      // 1️⃣ Busca SEM filtro de caixa primeiro para ver todos os dados
      const { data: todasVendas, error: erroTodas } = await supabase
        .from("vendas")
        .select("id, caixa_origem, created_at, valor_total_venda, metodo_pagto_1, valor_pagto_1, metodo_pagto_2, valor_pagto_2, metodo_pagto_3, valor_pagto_3")
        .gte("created_at", `${hoje}T00:00:00`)
        .lte("created_at", `${hoje}T23:59:59`);

      if (erroTodas) {
        console.error("[useResumoVendasPorCaixa] Erro ao buscar vendas:", erroTodas);
        throw erroTodas;
      }

      console.log("[useResumoVendasPorCaixa] Total de vendas do dia:", todasVendas?.length || 0);
      console.log("[useResumoVendasPorCaixa] Caixas disponíveis:", [...new Set((todasVendas || []).map(v => v.caixa_origem))]);

      // 2️⃣ Filtra por caixa (case-insensitive)
      const vendasCaixa = (todasVendas || []).filter((venda) => {
        const caixaVenda = (venda.caixa_origem || "").trim().toLowerCase();
        const caixaBuscada = (caixaNome || "").trim().toLowerCase();
        return caixaVenda === caixaBuscada;
      });

      console.log("[useResumoVendasPorCaixa] Vendas encontradas para", caixaNome, ":", vendasCaixa.length);

      let totalDinheiro = 0;
      let totalPix = 0;
      let totalDebito = 0;
      let totalCredito = 0;
      let totalGiraCredito = 0;

      const processarPagamento = (metodo: string | null, valor: number | null) => {
        if (!metodo || !valor || valor <= 0) return;
        
        const metodoLower = (metodo || "").trim().toLowerCase();
        
        console.log("[processarPagamento] Processando:", metodoLower, "Valor:", valor);
        
        if (metodoLower === "dinheiro") {
          totalDinheiro += valor;
        } else if (metodoLower === "pix") {
          totalPix += valor;
        } else if (metodoLower === "débito" || metodoLower === "debito") {
          totalDebito += valor;
        } else if (metodoLower === "gira crédito" || metodoLower === "gira credito") {
          totalGiraCredito += valor;
        } else if (metodoLower.includes("crédito") || metodoLower.includes("credito")) {
          // Crédito comum
          totalCredito += valor;
        }
      };

      vendasCaixa.forEach((venda) => {
        console.log("[useResumoVendasPorCaixa] Processando venda:", venda.id);
        processarPagamento(venda.metodo_pagto_1, venda.valor_pagto_1);
        processarPagamento(venda.metodo_pagto_2, venda.valor_pagto_2);
        processarPagamento(venda.metodo_pagto_3, venda.valor_pagto_3);
      });

      const totalGeral = totalDinheiro + totalPix + totalDebito + totalCredito + totalGiraCredito;
      console.log("[useResumoVendasPorCaixa] RESULTADO:", { totalDinheiro, totalPix, totalDebito, totalCredito, totalGiraCredito, totalGeral });

      return {
        totalDinheiro,
        totalPix,
        totalDebito,
        totalCredito,
        totalGiraCredito,
        totalGeral,
      };
    },
  });
}

/**
 * Hook para excluir uma movimentação manual (entrada, saída ou transferência)
 * Reverte o saldo do caixa e remove a movimentação
 */
export function useDeleteMovimentacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (movimentacao: MovimentacaoCaixa) => {
      const { tipo } = movimentacao;

      // Apenas tipos permitidos para exclusão manual
      const tiposPermitidos = ['entrada', 'saida', 'transferencia_entre_caixas'];
      if (!tiposPermitidos.includes(tipo)) {
        throw new Error(`Tipo "${tipo}" não pode ser excluído manualmente`);
      }

      // Deletar a movimentação
      // O trigger do banco vai reverter saldo_seed_caixas se existir
      // React Query vai recalcular useSaldoFinalHoje() automaticamente
      const { error: deleteError } = await supabase
        .from("movimentacoes_caixa")
        .delete()
        .eq("id", movimentacao.id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      // ✅ Invalidar queries para forçar recalcular:
      // 1. "caixas" - caso trigger tenha atualizado saldo_seed_caixas
      // 2. "movimentacoes_dinheiro" - lista de movimentações mudou
      // 3. "saldo_final_hoje" - deve recalcular baseado em movimentações novas
      // 4. "movimentacoes_caixa" - lista geral de movimentações
      queryClient.invalidateQueries({ queryKey: ["caixas"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_caixa"] });
      queryClient.invalidateQueries({ queryKey: ["saldo_final_hoje"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_dinheiro"] });
      
      toast.success("✅ Movimentação excluída com sucesso!");
      console.log("📊 [EXCLUDE] Queries invalidadas, useSaldoFinalHoje() vai recalcular na próxima renderização");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });
}

/**
 * Edita uma movimentação manual (entrada, saída ou transferência)
 * Regra: extorna o efeito antigo e aplica o novo valor, ajustando saldos
 */
export function useEditarMovimentacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      movimentacao,
      novoValor,
      novoMotivo,
    }: {
      movimentacao: MovimentacaoCaixa;
      novoValor: number;
      novoMotivo: string;
    }) => {
      const { tipo } = movimentacao;

      const tiposPermitidos = ['entrada', 'saida', 'transferencia_entre_caixas'];
      if (!tiposPermitidos.includes(tipo)) {
        throw new Error(`Tipo "${tipo}" não pode ser editado manualmente`);
      }

      if (!Number.isFinite(novoValor) || novoValor <= 0) {
        throw new Error("Valor inválido para edição");
      }

      // Atualizar registro
      // Triggers do banco vai ajustar saldo_seed_caixas se existir
      // React Query vai recalcular useSaldoFinalHoje() automaticamente
      const { error: updateMovError } = await supabase
        .from("movimentacoes_caixa")
        .update({ valor: novoValor, motivo: novoMotivo || null })
        .eq("id", movimentacao.id);

      if (updateMovError) throw updateMovError;
    },
    onSuccess: () => {
      // ✅ Invalidar queries para forçar recalcular:
      // 1. "caixas" - caso trigger tenha atualizado saldo_seed_caixas
      // 2. "movimentacoes_dinheiro" - valores das movimentações mudaram
      // 3. "saldo_final_hoje" - deve recalcular com novos valores
      // 4. "movimentacoes_caixa" - lista foi atualizada
      queryClient.invalidateQueries({ queryKey: ["caixas"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_caixa"] });
      queryClient.invalidateQueries({ queryKey: ["saldo_final_hoje"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_dinheiro"] });
      
      toast.success("✅ Movimentação editada com sucesso!");
      console.log("📊 [EDIT] Queries invalidadas, useSaldoFinalHoje() vai recalcular na próxima renderização");
    },
    onError: (error: Error) => {
      toast.error("Erro ao editar: " + error.message);
    },
  });
}

/**
 * Hook para buscar fechamentos pendentes de aprovação
 */
export function useFechamentosPendentes() {
  return useQuery({
    queryKey: ["fechamentos_pendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fechamentos_caixa")
        .select(`
          *,
          caixa:caixas(nome)
        `)
        .eq("status", "pendente_aprovacao")
        .order("data_fechamento", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Hook para buscar histórico de fechamentos com estatísticas
 */
export function useHistoricoFechamentos(limit: number = 30) {
  return useQuery({
    queryKey: ["historico_fechamentos", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fechamentos_caixa")
        .select(`
          *,
          caixa:caixas(nome)
        `)
        .in("status", ["aprovado", "pendente_aprovacao"])
        .order("data_fechamento", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Hook para calcular estatísticas de fechamentos
 */
export function useEstatisticasFechamentos(dias: number = 30) {
  return useQuery({
    queryKey: ["estatisticas_fechamentos", dias],
    queryFn: async () => {
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - dias);
      const dataInicioStr = dataInicio.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("fechamentos_caixa")
        .select("data_fechamento, diferenca, status")
        .in("status", ["aprovado", "pendente_aprovacao"])
        .gte("data_fechamento", dataInicioStr)
        .order("data_fechamento", { ascending: false });

      if (error) throw error;

      // Agrupar por data e calcular estatísticas
      const groupedByDate = data.reduce((acc: any, item: any) => {
        const date = item.data_fechamento;
        if (!acc[date]) {
          acc[date] = {
            total_caixas: 0,
            caixas_corretos: 0,
            caixas_com_divergencia: 0,
          };
        }
        acc[date].total_caixas++;
        if (item.diferenca === 0) {
          acc[date].caixas_corretos++;
        } else {
          acc[date].caixas_com_divergencia++;
        }
        return acc;
      }, {});

      // Calcular dias perfeitos (todos os caixas bateram)
      const diasPerfeitos = Object.values(groupedByDate).filter(
        (day: any) => day.total_caixas === day.caixas_corretos
      ).length;

      const totalDias = Object.keys(groupedByDate).length;
      const percentualDiasPerfeitos = totalDias > 0 
        ? ((diasPerfeitos / totalDias) * 100).toFixed(1)
        : "0.0";

      return {
        totalDias,
        diasPerfeitos,
        percentualDiasPerfeitos,
        detalhePorDia: groupedByDate,
      };
    },
  });
}

/**
 * Hook para aprovar fechamento
 */
export function useAprovarFechamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fechamentoId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.rpc("fn_aprovar_fechamento", {
        p_fechamento_id: fechamentoId,
        p_admin_id: userData.user.id,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fechamentos_pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["historico_fechamentos"] });
      queryClient.invalidateQueries({ queryKey: ["estatisticas_fechamentos"] });
      toast.success("Fechamento aprovado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao aprovar: " + error.message);
    },
  });
}

/**
 * Hook para rejeitar fechamento
 */
export function useRejeitarFechamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fechamentoId, motivo }: { fechamentoId: string; motivo: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      if (!motivo || motivo.trim() === "") {
        throw new Error("Motivo da rejeição é obrigatório");
      }

      const { data, error } = await supabase.rpc("fn_rejeitar_fechamento", {
        p_fechamento_id: fechamentoId,
        p_admin_id: userData.user.id,
        p_motivo: motivo,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fechamentos_pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["historico_fechamentos"] });
      queryClient.invalidateQueries({ queryKey: ["estatisticas_fechamentos"] });
      toast.success("Fechamento rejeitado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao rejeitar: " + error.message);
    },
  });
}

/**
 * Hook para buscar relatório de movimentações manuais
 * Inclui: entradas, saídas e transferências manuais
 */
export function useRelatorioMovimentacoesManual(
  dataInicio?: string,
  dataFim?: string,
  termoBusca?: string,
  tiposFiltro?: string[]
) {
  return useQuery({
    queryKey: ["relatorio_movimentacoes_manual", dataInicio, dataFim, termoBusca, tiposFiltro],
    queryFn: async () => {
      // Determinar tipos a buscar
      const tiposBusca = tiposFiltro && tiposFiltro.length > 0 
        ? tiposFiltro 
        : ["entrada", "saida", "transferencia_entre_caixas"];

      let query = supabase
        .from("movimentacoes_caixa")
        .select(`
          *,
          caixa_origem:caixas!movimentacoes_caixa_caixa_origem_id_fkey(nome),
          caixa_destino:caixas!movimentacoes_caixa_caixa_destino_id_fkey(nome)
        `)
        .in("tipo", tiposBusca)
        .order("data_hora", { ascending: false });

      // Filtro por data inicial
      if (dataInicio) {
        const dataInicioTimestamp = new Date(dataInicio + "T00:00:00").toISOString();
        query = query.gte("data_hora", dataInicioTimestamp);
      }
      // Filtro por data final
      if (dataFim) {
        const dataFimTimestamp = new Date(dataFim + "T23:59:59").toISOString();
        query = query.lte("data_hora", dataFimTimestamp);
      }

      // Filtro por termo de busca (case-insensitive, ignora acentos)
      if (termoBusca && termoBusca.trim()) {
        query = query.ilike("motivo", `%${termoBusca.trim()}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MovimentacaoCaixa[];
    },
  });
}

/**
 * Hook para AJUSTAR saldo via admin
 * 
 * ⚠️ IMPORTANTE: Não altera saldo_seed_caixas!
 * Em vez disso, CRIA uma movimentação de AJUSTE
 * 
 * Fluxo:
 * 1. Admin quer saldo = R$ 1000
 * 2. Saldo atual (calculado) = R$ 450
 * 3. Diferença = R$ 550
 * 4. Criar movimentação de ENTRADA com R$ 550 (motivo: "Ajuste manual")
 * 5. useSaldoFinalHoje() recalcula: 450 + 550 = 1000 ✓
 * 
 * Resultado: Saldo atualizado via movimentações (auditável, correto)
 */
export function useAjustarSaldoAdmin() {
  const queryClient = useQueryClient();
  const { log } = useLogAtividade();

  return useMutation({
    mutationFn: async ({
      caixaId,
      saldoDesejado,
      saldoAtual,
    }: {
      caixaId: string;
      saldoDesejado: number;
      saldoAtual: number;
    }) => {
      // Validar valores
      if (!Number.isFinite(saldoDesejado) || saldoDesejado < 0) {
        throw new Error("Saldo deve ser um valor válido (>= 0)");
      }

      const diferenca = saldoDesejado - saldoAtual;

      console.log(`📊 [AJUSTE] Saldo Atual: R$ ${saldoAtual.toFixed(2)}`);
      console.log(`📊 [AJUSTE] Saldo Desejado: R$ ${saldoDesejado.toFixed(2)}`);
      console.log(`📊 [AJUSTE] Diferença: R$ ${diferenca.toFixed(2)}`);

      // Se diferença é ZERO, não fazer nada
      if (Math.abs(diferenca) < 0.01) {
        console.log("ℹ️ [AJUSTE] Saldo já está correto, nenhuma alteração necessária");
        return { caixaId, saldoDesejado, saldoAtual, diferenca: 0 };
      }

      // ✅ CORREÇÃO: Criar FECHAMENTO ao invés de movimentação
      // Criar fechamento para ONTEM com o valor desejado
      // Assim, o saldo de hoje vai partir desse valor como saldo_inicial
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      const dataFechamento = ontem.toISOString().split('T')[0] + 'T23:59:59Z';

      console.log(`🔧 [AJUSTE] Criando fechamento para ${ontem.toISOString().split('T')[0]}`);

      // Verificar se já existe fechamento para ontem
      const { data: fechamentoExistente, error: errorCheck } = await supabase
        .from("fechamentos_caixa")
        .select("id")
        .eq("caixa_id", caixaId)
        .gte("data_fechamento", ontem.toISOString().split('T')[0] + 'T00:00:00Z')
        .lt("data_fechamento", new Date().toISOString().split('T')[0] + 'T00:00:00Z')
        .maybeSingle();

      if (errorCheck && errorCheck.code !== 'PGRST116') {
        throw errorCheck;
      }

      if (fechamentoExistente) {
        // Atualizar fechamento existente
        const { error: updateError } = await supabase
          .from("fechamentos_caixa")
          .update({
            valor_contado: saldoDesejado,
            observacoes: `Saldo ajustado manualmente pelo admin de R$ ${saldoAtual.toFixed(2)} para R$ ${saldoDesejado.toFixed(2)}`,
            status: "aprovado",
            updated_at: new Date().toISOString(),
          })
          .eq("id", fechamentoExistente.id);

        if (updateError) throw updateError;
        console.log(`✅ [AJUSTE] Fechamento existente ATUALIZADO para R$ ${saldoDesejado.toFixed(2)}`);
      } else {
        // Criar novo fechamento
        const { error: insertError } = await supabase
          .from("fechamentos_caixa")
          .insert({
            caixa_id: caixaId,
            data_fechamento: dataFechamento,
            valor_contado: saldoDesejado,
            observacoes: `Fechamento criado via ajuste manual - saldo ajustado de R$ ${saldoAtual.toFixed(2)} para R$ ${saldoDesejado.toFixed(2)}`,
            status: "aprovado",
          });

        if (insertError) throw insertError;
        console.log(`✅ [AJUSTE] Novo fechamento CRIADO para R$ ${saldoDesejado.toFixed(2)}`);
      }

      return { caixaId, saldoDesejado, saldoAtual, diferenca };
    },
    onSuccess: ({ saldoAtual, saldoDesejado, diferenca }) => {
      // ✅ Invalidar queries para recalcular tudo
      queryClient.invalidateQueries({ queryKey: ["caixas"] });
      queryClient.invalidateQueries({ queryKey: ["saldo_inicial"] }); // ✅ Adicionado
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_dinheiro"] });
      queryClient.invalidateQueries({ queryKey: ["saldo_final_hoje"] });
      queryClient.invalidateQueries({ queryKey: ["fechamentos_hoje"] }); // ✅ Adicionado

      toast.success(
        `✅ Saldo ajustado: R$ ${saldoAtual.toFixed(2)} → R$ ${saldoDesejado.toFixed(2)}`
      );

      console.log(`📊 [AJUSTE] Fechamento criado/atualizado, queries invalidadas`);
      console.log(`   Novo saldo inicial de hoje será: R$ ${saldoDesejado.toFixed(2)}`);

      log({
        acao: "ajustar_saldo",
        tabela_afetada: "fechamentos_caixa",
        registro_id: "caixa_id_" + "***",
        detalhes: `Saldo ajustado de R$ ${saldoAtual.toFixed(2)} para R$ ${saldoDesejado.toFixed(2)} via criação de fechamento`,
      });
    },
    onError: (error: Error) => {
      toast.error("❌ Erro ao ajustar saldo: " + error.message);
      console.error(error);
    },
  });
}
