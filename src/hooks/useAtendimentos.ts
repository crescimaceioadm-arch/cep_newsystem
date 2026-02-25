import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Atendimento, StatusAtendimento, ItemCategoria, AtendimentoItem } from "@/types/database";
import { getDateTimeUTC } from "@/lib/utils";
import { toast } from "sonner";
import { useLogAtividade } from "@/hooks/useLogAtividade";

export function useAtendimentos() {
  return useQuery({
    queryKey: ["atendimentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atendimentos")
        .select("*")
        .order("hora_chegada", { ascending: false });

      if (error) throw error;
      const { data: itens } = await supabase
        .from("atendimento_itens")
        .select("*, item_categories(*)");

      const itensByAtendimento = new Map<string, AtendimentoItem[]>();
      (itens || []).forEach((it) => {
        const list = itensByAtendimento.get(it.atendimento_id) || [];
        list.push({
          id: it.id,
          categoria_id: it.categoria_id,
          quantidade: it.quantidade,
          valor_total: it.valor_total,
          categoria: it.item_categories as ItemCategoria | undefined,
        });
        itensByAtendimento.set(it.atendimento_id, list);
      });

      return (data as Atendimento[]).map((a) => ({
        ...a,
        itens: itensByAtendimento.get(a.id) || [],
      }));
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

      const { data: itens } = await supabase
        .from("atendimento_itens")
        .select("*, item_categories(*)");

      const itensByAtendimento = new Map<string, AtendimentoItem[]>();
      (itens || []).forEach((it) => {
        const list = itensByAtendimento.get(it.atendimento_id) || [];
        list.push({
          id: it.id,
          categoria_id: it.categoria_id,
          quantidade: it.quantidade,
          valor_total: it.valor_total,
          categoria: it.item_categories as ItemCategoria | undefined,
        });
        itensByAtendimento.set(it.atendimento_id, list);
      });

      return (data as Atendimento[]).map((a) => ({
        ...a,
        itens: itensByAtendimento.get(a.id) || [],
      }));
    },
  });
}

export function useCreateAtendimento() {
  const queryClient = useQueryClient();
  const { log } = useLogAtividade();

  return useMutation({
    mutationFn: async ({
      nomeCliente,
      origemAvaliacao = "presencial",
    }: {
      nomeCliente: string;
      origemAvaliacao?: "presencial" | "whatsapp" | null;
    }) => {
      console.log("🔍 [DEBUG CRIAR ATENDIMENTO] ==========================================");
      console.log("🔍 [DEBUG CRIAR ATENDIMENTO] mutationFn chamada");
      console.log("🔍 [DEBUG CRIAR ATENDIMENTO] Nome:", nomeCliente);
      console.log("🔍 [DEBUG CRIAR ATENDIMENTO] Origem:", origemAvaliacao);
      
      const horaChegada = getDateTimeUTC(); // Agora salva em UTC corretamente
      console.log("🔍 [DEBUG CRIAR ATENDIMENTO] Hora chegada:", horaChegada);
      
      const { data, error } = await supabase
        .from("atendimentos")
        .insert({ 
          nome_cliente: nomeCliente,
          origem_avaliacao: origemAvaliacao ?? null,
          hora_chegada: horaChegada,
          status: "aguardando_avaliacao" as StatusAtendimento,
        })
        .select()
        .single();
      
      if (error) {
        console.error("❌ [DEBUG CRIAR ATENDIMENTO] Erro:", error);
        throw error;
      }
      
      console.log("✅ [DEBUG CRIAR ATENDIMENTO] Sucesso! ID:", data.id);
      console.log("🔍 [DEBUG CRIAR ATENDIMENTO] ========================================== FIM");
      return data;
    },
    onSuccess: (data) => {
      console.log("🔍 [DEBUG CRIAR ATENDIMENTO] onSuccess - invalidando queries");
      queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
      log({
        acao: "criar",
        tabela_afetada: "atendimentos",
        registro_id: data.id,
        dados_depois: data,
        detalhes: `Atendimento criado para ${data.nome_cliente} (${data.origem_avaliacao || 'presencial'})`
      });
      console.log("✅ [DEBUG CRIAR ATENDIMENTO] onSuccess concluído");
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
  const { log } = useLogAtividade();

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
      console.log("╔════════════════════════════════════════════════════════════════");
      console.log("║ 🔍 [DEBUG PAGAMENTO] INÍCIO DO PROCESSAMENTO");
      console.log("╠════════════════════════════════════════════════════════════════");
      console.log("║ Atendimento ID:", id);
      console.log("║ Cliente:", pagamento);
      console.log("║ Timestamp:", new Date().toISOString());
      console.log("╚════════════════════════════════════════════════════════════════");
      
      // 1. Atualizar o atendimento
      console.log("\n📝 PASSO 1: Atualizando atendimento no banco...");
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
        console.error("❌ ERRO CRÍTICO ao atualizar atendimento:", error);
        throw error;
      }

      console.log("✅ PASSO 1 COMPLETO - Atendimento atualizado");
      console.log("   Nome Cliente:", data.nome_cliente);

      // 2. Calcular valor em DINHEIRO
      console.log("\n💰 PASSO 2: Analisando métodos de pagamento...");
      console.log("   Pagamento 1:");
      console.log("      - Método:", pagamento.pagamento_1_metodo);
      console.log("      - Valor:", pagamento.pagamento_1_valor);
      console.log("      - toLowerCase():", pagamento.pagamento_1_metodo?.toLowerCase());
      console.log("      - É dinheiro?", pagamento.pagamento_1_metodo?.toLowerCase() === 'dinheiro');
      
      console.log("   Pagamento 2:");
      console.log("      - Método:", pagamento.pagamento_2_metodo);
      console.log("      - Valor:", pagamento.pagamento_2_valor);
      console.log("      - toLowerCase():", pagamento.pagamento_2_metodo?.toLowerCase());
      console.log("      - É dinheiro?", pagamento.pagamento_2_metodo?.toLowerCase() === 'dinheiro');
      
      console.log("   Pagamento 3:");
      console.log("      - Método:", pagamento.pagamento_3_metodo);
      console.log("      - Valor:", pagamento.pagamento_3_valor);
      console.log("      - toLowerCase():", pagamento.pagamento_3_metodo?.toLowerCase());
      console.log("      - É dinheiro?", pagamento.pagamento_3_metodo?.toLowerCase() === 'dinheiro');
      
      let valorDinheiro = 0;
      
      if (pagamento.pagamento_1_metodo?.toLowerCase() === 'dinheiro') {
        const valor = pagamento.pagamento_1_valor || 0;
        console.log(`   ✅ Pagamento 1 é DINHEIRO: +R$ ${valor}`);
        valorDinheiro += valor;
      }
      if (pagamento.pagamento_2_metodo?.toLowerCase() === 'dinheiro') {
        const valor = pagamento.pagamento_2_valor || 0;
        console.log(`   ✅ Pagamento 2 é DINHEIRO: +R$ ${valor}`);
        valorDinheiro += valor;
      }
      if (pagamento.pagamento_3_metodo?.toLowerCase() === 'dinheiro') {
        const valor = pagamento.pagamento_3_valor || 0;
        console.log(`   ✅ Pagamento 3 é DINHEIRO: +R$ ${valor}`);
        valorDinheiro += valor;
      }

      console.log("\n💵 TOTAL EM DINHEIRO CALCULADO: R$", valorDinheiro);
      console.log("   Condição (valorDinheiro > 0):", valorDinheiro > 0);

      // 3. Se houve pagamento em dinheiro, registrar na movimentação
      if (valorDinheiro > 0) {
        console.log("\n🏦 PASSO 3: REGISTRANDO NO CAIXA (valorDinheiro > 0)");
        console.log("═══════════════════════════════════════════════════════════════");

        // 3.1 Verificar localStorage
        console.log("\n🔐 PASSO 3.1: Verificando localStorage...");
        console.log("   localStorage completo:");
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.includes('caixa')) {
            console.log(`      ${key}:`, localStorage.getItem(key));
          }
        }
        
        const caixaAvaliacaoAberto = localStorage.getItem("caixa_avaliacao_aberto");
        console.log("\n   Valor de 'caixa_avaliacao_aberto':", caixaAvaliacaoAberto);
        console.log("   Tipo:", typeof caixaAvaliacaoAberto);
        console.log("   Comparação === '1':", caixaAvaliacaoAberto === "1");
        console.log("   Comparação == 1:", caixaAvaliacaoAberto == 1);
        
        const isAberto = caixaAvaliacaoAberto === "1";
        console.log("   Resultado final (isAberto):", isAberto);
        
        if (!isAberto) {
          console.error("\n❌❌❌ BLOQUEADO: Caixa Avaliação NÃO está aberto!");
          console.error("   FLUXO INTERROMPIDO - Movimentação NÃO será criada");
          console.error("   Cliente:", data.nome_cliente);
          console.error("   Valor:", valorDinheiro);
          toast.error("❌ O Caixa de Avaliação não está aberto. Abra o caixa antes de finalizar pagamentos em dinheiro.");
          throw new Error("Caixa de Avaliação não está aberto");
        }

        console.log("✅ PASSO 3.1 COMPLETO - Caixa está aberto");

        // 3.2 Buscar o caixa de Avaliação
        console.log("\n🔍 PASSO 3.2: Buscando caixa Avaliação no banco...");
        const { data: caixaAvaliacao, error: caixaError } = await supabase
          .from("caixas")
          .select("id")
          .eq("nome", "Avaliação")
          .single();

        if (caixaError) {
          console.error("\n❌❌❌ ERRO ao buscar caixa Avaliação:", caixaError);
          console.error("   Código:", caixaError.code);
          console.error("   Mensagem:", caixaError.message);
          console.error("   Detalhes:", caixaError.details);
          console.error("   FLUXO INTERROMPIDO - Movimentação NÃO será criada");
          console.error("   Cliente:", data.nome_cliente);
          toast.error("⚠️ Avaliação finalizada, mas não foi possível registrar no caixa. Contate o administrador.");
          // ⚠️ NÃO lança erro - atendimento continua finalizado mesmo sem movimentação!
          console.error("⚠️ ATENÇÃO: Atendimento foi finalizado SEM criar movimentação!");
        } else if (!caixaAvaliacao) {
          console.error("\n❌❌❌ Caixa Avaliação NÃO encontrado (retornou null)");
          console.error("   FLUXO INTERROMPIDO - Movimentação NÃO será criada");
          console.error("   Cliente:", data.nome_cliente);
          console.error("⚠️ ATENÇÃO: Atendimento foi finalizado SEM criar movimentação!");
        } else {
          console.log("✅ PASSO 3.2 COMPLETO - Caixa encontrado");
          console.log("   ID do Caixa Avaliação:", caixaAvaliacao.id);
          
          // 3.3 Criar movimentação
          console.log("\n💾 PASSO 3.3: Criando movimentação...");
          const movimentacao = {
            caixa_origem_id: caixaAvaliacao.id,
            caixa_destino_id: null,
            tipo: 'pagamento_avaliacao',
            valor: valorDinheiro,
            motivo: `Pagamento avaliação - ${data.nome_cliente || 'Cliente'}`,
          };
          console.log("   Dados da movimentação:", JSON.stringify(movimentacao, null, 2));
          
          const { data: movimentacaoData, error: movError } = await supabase
            .from("movimentacoes_caixa")
            .insert(movimentacao)
            .select()
            .single();

          if (movError) {
            console.error("\n❌❌❌ ERRO ao inserir movimentação:", movError);
            console.error("   Código:", movError.code);
            console.error("   Mensagem:", movError.message);
            console.error("   Detalhes:", movError.details);
            console.error("   Hint:", movError.hint);
            console.error("   DADOS QUE TENTARAM SER INSERIDOS:", movimentacao);
            console.error("   Cliente:", data.nome_cliente);
            toast.error("⚠️ Avaliação finalizada, mas não foi possível registrar no caixa. Contate o administrador.");
            // ⚠️ NÃO lança erro - atendimento continua finalizado mesmo sem movimentação!
            console.error("⚠️ ATENÇÃO: Atendimento foi finalizado SEM criar movimentação!");
          } else {
            console.log("\n✅✅✅ PASSO 3.3 COMPLETO - MOVIMENTAÇÃO CRIADA COM SUCESSO!");
            console.log("   ID da movimentação:", movimentacaoData?.id);
            console.log("   Data/Hora:", movimentacaoData?.data_hora);
            console.log("   Valor:", movimentacaoData?.valor);
            console.log("   Cliente:", data.nome_cliente);
          }
        }
      } else {
        console.log("\n⏭️ PASSO 3 IGNORADO: Nenhum pagamento em dinheiro (valorDinheiro =", valorDinheiro, ")");
      }

      console.log("\n╔════════════════════════════════════════════════════════════════");
      console.log("║ ✅ [DEBUG PAGAMENTO] FIM DO PROCESSAMENTO");
      console.log("║ Cliente:", data.nome_cliente);
      console.log("║ Status: Finalizado");
      console.log("╚════════════════════════════════════════════════════════════════\n");

      return data;
    },
    onSuccess: (data) => {
      console.log("🔍 [DEBUG PAGAMENTO] onSuccess - Invalidando queries...");
      queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
      queryClient.invalidateQueries({ queryKey: ["caixas"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_caixa"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_dinheiro"] });
      queryClient.invalidateQueries({ queryKey: ["saldo_final_hoje"] });
      console.log("✅ [DEBUG PAGAMENTO] Queries invalidadas");
      
      log({
        acao: "finalizar",
        tabela_afetada: "atendimentos",
        registro_id: data.id,
        dados_depois: data,
        detalhes: `Atendimento finalizado - ${data.nome_cliente} - R$ ${data.valor_total_negociado}`
      });
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
  valor_total_itens_medios?: number;
  valor_total_itens_grandes?: number;
  descricao_itens_extra: string;
  avaliadora_nome?: string;
  origem_avaliacao?: "presencial" | "whatsapp" | null;
  pagamento_1_metodo?: string | null;
  pagamento_1_valor?: number | null;
  pagamento_2_metodo?: string | null;
  pagamento_2_valor?: number | null;
  pagamento_3_metodo?: string | null;
  pagamento_3_valor?: number | null;
  isEditing?: boolean;
  status?: StatusAtendimento;
  itens?: Array<{ categoria_id: string; quantidade: number; valor_total?: number | null }>;
  itensGrandes?: Array<{ tipo_id: string; marca_id: string; descricao: string; valor_compra: number }>;
}

export function useSaveAvaliacao() {
  const queryClient = useQueryClient();
  const { log } = useLogAtividade();

  return useMutation({
    mutationFn: async (data: AvaliacaoData) => {
      console.log("[useSaveAvaliacao] Salvando avaliação:", data);

      const { data: categorias } = await supabase
        .from("item_categories")
        .select("id, slug, ativo");
      const catBySlug = new Map<string, string>();
      (categorias || []).forEach((c) => {
        if ((c as any).ativo !== false) catBySlug.set((c as any).slug, (c as any).id);
      });

      // Busca valores atuais para calcular ajuste de dinheiro (caso método mude para Dinheiro)
      const { data: atendimentoAtual, error: atendimentoFetchError } = await supabase
        .from("atendimentos")
        .select("nome_cliente, status, pagamento_1_metodo, pagamento_1_valor, pagamento_2_metodo, pagamento_2_valor, pagamento_3_metodo, pagamento_3_valor")
        .eq("id", data.id)
        .maybeSingle();

      if (atendimentoFetchError) {
        console.error("[useSaveAvaliacao] Erro ao buscar atendimento atual:", atendimentoFetchError);
        throw atendimentoFetchError;
      }

      const calcularDinheiro = (p1m?: string | null, p1v?: number | null, p2m?: string | null, p2v?: number | null, p3m?: string | null, p3v?: number | null) => {
        const isCash = (m?: string | null) => (m || "").toLowerCase() === "dinheiro";
        return (isCash(p1m) ? p1v || 0 : 0) + (isCash(p2m) ? p2v || 0 : 0) + (isCash(p3m) ? p3v || 0 : 0);
      };

      const dinheiroAntes = calcularDinheiro(
        atendimentoAtual?.pagamento_1_metodo,
        atendimentoAtual?.pagamento_1_valor,
        atendimentoAtual?.pagamento_2_metodo,
        atendimentoAtual?.pagamento_2_valor,
        atendimentoAtual?.pagamento_3_metodo,
        atendimentoAtual?.pagamento_3_valor
      );

      const dinheiroDepois = calcularDinheiro(
        data.pagamento_1_metodo,
        data.pagamento_1_valor,
        data.pagamento_2_metodo,
        data.pagamento_2_valor,
        data.pagamento_3_metodo,
        data.pagamento_3_valor
      );

      const deltaDinheiro = (dinheiroDepois || 0) - (dinheiroAntes || 0);

      // Define o novo status: preserva o status atual se for edição, senão muda para aguardando_pagamento
      const statusOverride = data.isEditing ? data.status : undefined;
      const novoStatus: StatusAtendimento = data.isEditing
        ? (statusOverride ?? (atendimentoAtual?.status as StatusAtendimento))
        : "aguardando_pagamento";
      const motivoRecusaUpdate = statusOverride === "recusado"
        ? "loja"
        : statusOverride === "recusou"
          ? "cliente"
          : undefined;

      // 1. Atualiza o atendimento com as quantidades e muda status
      const atendimentoUpdates: Partial<Atendimento> & { motivo_recusa?: "loja" | "cliente" } = {
        qtd_baby: data.qtd_baby,
        qtd_1_a_16: data.qtd_1_a_16,
        qtd_calcados: data.qtd_calcados,
        qtd_brinquedos: data.qtd_brinquedos,
        qtd_itens_medios: data.qtd_itens_medios,
        qtd_itens_grandes: data.qtd_itens_grandes,
        valor_total_itens_medios: data.valor_total_itens_medios || 0,
        valor_total_itens_grandes: data.valor_total_itens_grandes || 0,
        descricao_itens_extra: data.descricao_itens_extra,
        avaliadora_nome: data.avaliadora_nome || null,
        origem_avaliacao: data.origem_avaliacao ?? null,
        // Persistência dos campos de pagamento (colunas existentes pagamento_* )
        pagamento_1_metodo: data.pagamento_1_metodo ?? null,
        pagamento_1_valor: data.pagamento_1_valor ?? null,
        pagamento_2_metodo: data.pagamento_2_metodo ?? null,
        pagamento_2_valor: data.pagamento_2_valor ?? null,
        pagamento_3_metodo: data.pagamento_3_metodo ?? null,
        pagamento_3_valor: data.pagamento_3_valor ?? null,
        status: novoStatus,
      };

      if (motivoRecusaUpdate) {
        atendimentoUpdates.motivo_recusa = motivoRecusaUpdate;
      }

      const { error: updateError } = await supabase
        .from("atendimentos")
        .update(atendimentoUpdates)
        .eq("id", data.id);

      if (updateError) {
        console.error("[useSaveAvaliacao] Erro ao atualizar atendimento:", updateError);
        throw updateError;
      }

      // 1.0a Atualiza pivot de itens (remove e recria)
      await supabase.from("atendimento_itens").delete().eq("atendimento_id", data.id);

      const itensPivot: Array<{ atendimento_id: string; categoria_id: string; quantidade: number; valor_total?: number | null }> = [];
      const pushIf = (slug: string, qtd: number, valor?: number | null) => {
        if (qtd && qtd > 0) {
          const cid = catBySlug.get(slug);
          if (cid) itensPivot.push({ atendimento_id: data.id, categoria_id: cid, quantidade: qtd, valor_total: valor });
        }
      };
      pushIf("baby", Number(data.qtd_baby));
      pushIf("1a16", Number(data.qtd_1_a_16));
      pushIf("calcados", Number(data.qtd_calcados));
      pushIf("brinquedos", Number(data.qtd_brinquedos));
      pushIf("itens_medios", Number(data.qtd_itens_medios), data.valor_total_itens_medios || null);
      pushIf("itens_grandes", Number(data.qtd_itens_grandes), data.valor_total_itens_grandes || null);
      (data.itens || []).forEach((it) => {
        if (it.quantidade > 0) itensPivot.push({ atendimento_id: data.id, categoria_id: it.categoria_id, quantidade: it.quantidade, valor_total: it.valor_total ?? null });
      });

      if (itensPivot.length > 0) {
        await supabase.from("atendimento_itens").insert(itensPivot);
      }

      // 1.0b Salvar itens grandes individuais (se houver)
      if (data.itensGrandes && data.itensGrandes.length > 0) {
        const { error: itensGrandesError } = await supabase
          .from("itens_grandes_individuais")
          .insert(
            data.itensGrandes.map(item => ({
              tipo_id: item.tipo_id,
              marca_id: item.marca_id,
              descricao: item.descricao,
              valor_compra: item.valor_compra,
              atendimento_id: data.id,
              avaliadora_nome: data.avaliadora_nome || null,
              status: 'disponivel',
            }))
          );

        if (itensGrandesError) {
          console.error("[useSaveAvaliacao] Erro ao salvar itens grandes:", itensGrandesError);
          throw itensGrandesError;
        }
      }

      // 1.1 Ajuste de dinheiro no caixa de Avaliação (se houve mudança para Dinheiro)
      if (deltaDinheiro !== 0) {
        try {
          const { data: caixaAvaliacao, error: caixaError } = await supabase
            .from("caixas")
            .select("id")
            .eq("nome", "Avaliação")
            .single();

          if (caixaError) {
            console.error("[useSaveAvaliacao] Erro ao buscar caixa Avaliação:", caixaError);
          } else if (caixaAvaliacao?.id) {
            // Sempre usa tipo 'pagamento_avaliacao', mas com valor positivo (entrada) ou negativo (saída)
            const { error: movError } = await supabase
              .from("movimentacoes_caixa")
              .insert({
                caixa_origem_id: caixaAvaliacao.id,
                caixa_destino_id: null,
                tipo: "pagamento_avaliacao",
                valor: deltaDinheiro,
                motivo: `Ajuste pagamento avaliação - ${atendimentoAtual?.nome_cliente || "Cliente"}`,
              });

            if (movError) {
              console.error("[useSaveAvaliacao] Erro ao registrar ajuste no caixa Avaliação:", movError);
            } else {
              console.log("[useSaveAvaliacao] Ajuste de caixa registrado. Delta R$", deltaDinheiro);
            }
          }
        } catch (err) {
          console.error("[useSaveAvaliacao] Exceção ao registrar ajuste de caixa:", err);
        }
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
      
      return { atendimentoAtual, atendimentoId: data.id };
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
      
      // Log de auditoria
      const atendAnterior = _result?.atendimentoAtual as any;
      log({
        acao: 'editar',
        tabela_afetada: 'atendimentos',
        registro_id: variables.id,
        dados_antes: atendAnterior,
        dados_depois: variables,
        detalhes: `Avaliação editada - Cliente: ${atendAnterior?.nome_cliente || 'N/A'}, Avaliadora: ${variables.avaliadora_nome || 'N/A'}`,
      });
    },
  });
}

export function useRecusarAvaliacao() {
  const queryClient = useQueryClient();
  const { log } = useLogAtividade();

  return useMutation({
    mutationFn: async (data: { 
      id: string; 
      motivo_recusa: "loja" | "cliente";
      avaliadora_nome?: string;
    }) => {
      console.log("[useRecusarAvaliacao] Recusando atendimento:", data);

      // Definir status baseado no motivo: loja -> "recusado", cliente -> "recusou"
      const status: StatusAtendimento = data.motivo_recusa === "loja" ? "recusado" : "recusou";

      const { error } = await supabase
        .from("atendimentos")
        .update({
          status: status,
          motivo_recusa: data.motivo_recusa,
          avaliadora_nome: data.avaliadora_nome || null,
        })
        .eq("id", data.id);

      if (error) {
        console.error("[useRecusarAvaliacao] Erro:", error);
        throw error;
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
      log({
        acao: "recusar",
        tabela_afetada: "atendimentos",
        registro_id: data.id,
        dados_depois: data,
        detalhes: `Avaliação recusada - Motivo: ${data.motivo_recusa === 'loja' ? 'Recusado pela loja' : 'Cliente recusou'}`
      });
    },
  });
}

export function useDeleteAtendimento() {
  const queryClient = useQueryClient();
  const { log } = useLogAtividade();

  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Buscar atendimento antes de deletar para registrar no log
      const { data: atendimentoParaLog } = await supabase
        .from("atendimentos")
        .select("*")
        .eq("id", id)
        .single();
      
      // 2. Deletar itens grandes associados à avaliação
      const { error: deleteItensGrandesError } = await supabase
        .from("itens_grandes_individuais")
        .delete()
        .eq("atendimento_id", id);

      if (deleteItensGrandesError) {
        console.error("[useDeleteAtendimento] Erro ao deletar itens grandes:", deleteItensGrandesError);
        throw deleteItensGrandesError;
      }

      // 2. Buscar o atendimento para verificar se há pagamento em dinheiro
      const { data: atendimento } = await supabase
        .from("atendimentos")
        .select("*")
        .eq("id", id)
        .single();

      if (atendimento && atendimento.status === 'finalizado') {
        // 3. Calcular total em dinheiro
        let valorDinheiro = 0;
        if (atendimento.pagamento_1_metodo?.toLowerCase() === 'dinheiro') {
          valorDinheiro += atendimento.pagamento_1_valor || 0;
        }
        if (atendimento.pagamento_2_metodo?.toLowerCase() === 'dinheiro') {
          valorDinheiro += atendimento.pagamento_2_valor || 0;
        }
        if (atendimento.pagamento_3_metodo?.toLowerCase() === 'dinheiro') {
          valorDinheiro += atendimento.pagamento_3_valor || 0;
        }

        // 4. Se houve pagamento em dinheiro, deletar a movimentação
        if (valorDinheiro > 0) {
          // Deletar a movimentação associada (motivo do frontend: "Pagamento avaliação - ...")
          await supabase
            .from("movimentacoes_caixa")
            .delete()
            .eq("tipo", "pagamento_avaliacao")
            .ilike("motivo", `Pagamento avaliação - %${atendimento.nome_cliente}%`);
              
          console.log("[useDeleteAtendimento] ✅ Movimentação excluída do caixa Avaliação:", valorDinheiro);
        }
      }

      // 5. Finalmente, deletar o atendimento
      const { error } = await supabase
        .from("atendimentos")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("[useDeleteAtendimento] Erro:", error);
        throw error;
      }
      
      return atendimentoParaLog;
    },
    onSuccess: (atendimentoDeletado) => {
      queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
      queryClient.invalidateQueries({ queryKey: ["caixas"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_caixa"] });
      queryClient.invalidateQueries({ queryKey: ["saldo_final_hoje"] });
      queryClient.invalidateQueries({ queryKey: ["itens_grandes_individuais"] });
      queryClient.invalidateQueries({ queryKey: ["itens_grandes_disponiveis"] });
      
      if (atendimentoDeletado) {
        log({
          acao: "deletar",
          tabela_afetada: "atendimentos",
          registro_id: atendimentoDeletado.id,
          dados_antes: atendimentoDeletado,
          detalhes: `Atendimento deletado - ${atendimentoDeletado.nome_cliente}`
        });
      }
    },
  });
}
