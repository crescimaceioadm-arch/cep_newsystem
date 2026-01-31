import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Venda, Estoque, ItemCategoria } from "@/types/database";
import { toast } from "sonner";
import { registrarMovimentacaoCaixa } from "@/lib/registrarMovimentacaoCaixa";

export interface ItemGrandeSelecionado {
  id: string;
  valor_venda: number;
}

export interface NovaVenda {
  qtd_baby_vendida: number;
  qtd_1_a_16_vendida: number;
  qtd_calcados_vendida: number;
  qtd_brinquedos_vendida: number;
  qtd_itens_medios_vendida: number;
  qtd_itens_grandes_vendida: number;
  valor_total_venda: number;
  pagamentos: Array<{ metodo: string; valor: number; bandeira?: string }>;
  vendedora_nome?: string;
  caixa_origem?: string;
  itens?: Array<{ categoria_id: string; quantidade: number }>;
  itensGrandesSelecionados?: ItemGrandeSelecionado[];
}

export function useVendas() {
  return useQuery({
    queryKey: ["vendas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const { data: itens } = await supabase
        .from("venda_itens")
        .select("*, item_categories(*)");

      const itensByVenda = new Map<string, any[]>();
      (itens || []).forEach((it) => {
        const list = itensByVenda.get(it.venda_id) || [];
        list.push({
          id: it.id,
          categoria_id: it.categoria_id,
          quantidade: it.quantidade,
          categoria: it.item_categories as ItemCategoria | undefined,
        });
        itensByVenda.set(it.venda_id, list);
      });

      return (data as Venda[]).map((v) => ({
        ...v,
        itens: itensByVenda.get(v.id) || [],
      }));
    },
  });
}

export function useVendasHoje() {
  return useQuery({
    queryKey: ["vendas", "hoje"],
    queryFn: async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);

      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .gte("created_at", hoje.toISOString())
        .lt("created_at", amanha.toISOString());

      if (error) throw error;
      const { data: itens } = await supabase
        .from("venda_itens")
        .select("*, item_categories(*)");

      const itensByVenda = new Map<string, any[]>();
      (itens || []).forEach((it) => {
        const list = itensByVenda.get(it.venda_id) || [];
        list.push({
          id: it.id,
          categoria_id: it.categoria_id,
          quantidade: it.quantidade,
          categoria: it.item_categories as ItemCategoria | undefined,
        });
        itensByVenda.set(it.venda_id, list);
      });

      return (data as Venda[]).map((v) => ({
        ...v,
        itens: itensByVenda.get(v.id) || [],
      }));
    },
  });
}

export function useFinalizarVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (venda: NovaVenda) => {
      // 🔒 PROTEÇÃO CONTRA DUPLA EXECUÇÃO
      const transactionId = `VENDA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`[useFinalizarVenda] 🆔 ID da Transação: ${transactionId}`);
      console.log("[useFinalizarVenda] Iniciando venda:", venda);

      // Categorias dinâmicas (para pivot)
      const { data: categorias } = await supabase
        .from("item_categories")
        .select("id, slug, ativo");
      const catBySlug = new Map<string, string>();
      (categorias || []).forEach((c) => {
        if ((c as any).ativo !== false) catBySlug.set((c as any).slug, (c as any).id);
      });

      // 1. Buscar estoque atual
      const { data: estoqueAtual, error: estoqueError } = await supabase
        .from("estoque")
        .select("*");

      if (estoqueError) {
        console.error("[useFinalizarVenda] Erro ao buscar estoque:", estoqueError);
        throw estoqueError;
      }

      // 2. Verificar disponibilidade e preparar alertas
      // IMPORTANTE: Os nomes devem corresponder EXATAMENTE à coluna 'categoria' na tabela 'estoque'
      // (mantemos aliases para evitar falhas por divergência histórica de strings)
      const categoriaMap: Record<string, { vendido: number; campo: keyof Estoque }> = {
        "Roupas Baby": { vendido: venda.qtd_baby_vendida, campo: "quantidade_atual" },
        "Baby": { vendido: venda.qtd_baby_vendida, campo: "quantidade_atual" },
        "Roupas 1 a 16": { vendido: venda.qtd_1_a_16_vendida, campo: "quantidade_atual" },
        "1 a 16": { vendido: venda.qtd_1_a_16_vendida, campo: "quantidade_atual" },
        "Calçados": { vendido: venda.qtd_calcados_vendida, campo: "quantidade_atual" },
        "Brinquedos": { vendido: venda.qtd_brinquedos_vendida, campo: "quantidade_atual" },
        "Itens Médios": { vendido: venda.qtd_itens_medios_vendida, campo: "quantidade_atual" },
        "Itens Grandes": { vendido: venda.qtd_itens_grandes_vendida, campo: "quantidade_atual" },
      };

      const alertas: string[] = [];
      for (const item of estoqueAtual || []) {
        const info = categoriaMap[item.categoria];
        if (info && info.vendido > 0 && info.vendido > (item.quantidade_atual || 0)) {
          alertas.push(`${item.categoria}: estoque ${item.quantidade_atual}, vendendo ${info.vendido}`);
        }
      }

      if (alertas.length > 0) {
        console.warn("[useFinalizarVenda] Alertas de estoque:", alertas);
        // Continua mesmo assim (estoque físico manda)
      }

      // 3. Inserir a venda - MAPEAMENTO CORRETO para as colunas do banco
      if (!Number.isFinite(venda.valor_total_venda) || venda.valor_total_venda <= 0) {
        throw new Error("valor_total_venda inválido (não pode ser nulo/zero)");
      }

      const totalItensCalculado =
        Number(venda.qtd_baby_vendida) +
        Number(venda.qtd_1_a_16_vendida) +
        Number(venda.qtd_calcados_vendida) +
        Number(venda.qtd_brinquedos_vendida) +
        Number(venda.qtd_itens_medios_vendida) +
        Number(venda.qtd_itens_grandes_vendida);

      const vendaData = {
        qtd_total_itens: totalItensCalculado,
        caixa_origem: venda.caixa_origem || "Caixa 1",
        qtd_baby_vendida: venda.qtd_baby_vendida,
        qtd_1_a_16_vendida: venda.qtd_1_a_16_vendida,
        qtd_calcados_vendida: venda.qtd_calcados_vendida,
        qtd_brinquedos_vendida: venda.qtd_brinquedos_vendida,
        qtd_itens_medios_vendida: venda.qtd_itens_medios_vendida,
        qtd_itens_grandes_vendida: venda.qtd_itens_grandes_vendida,
        valor_total_venda: venda.valor_total_venda,
        vendedora_nome: venda.vendedora_nome || null,

        // Mapeamento manual dos pagamentos (colunas planas; NÃO enviar JSON)
        metodo_pagto_1: venda.pagamentos[0]?.metodo || null,
        valor_pagto_1: venda.pagamentos[0]?.valor ?? 0,
        bandeira_cartao_1: venda.pagamentos[0]?.bandeira || null,
        metodo_pagto_2: venda.pagamentos[1]?.metodo || null,
        valor_pagto_2: venda.pagamentos[1]?.valor ?? 0,
        bandeira_cartao_2: venda.pagamentos[1]?.bandeira || null,
        metodo_pagto_3: venda.pagamentos[2]?.metodo || null,
        valor_pagto_3: venda.pagamentos[2]?.valor ?? 0,
        bandeira_cartao_3: venda.pagamentos[2]?.bandeira || null,
      };

      console.log("Payload enviado:", vendaData);
      console.log("[useFinalizarVenda] Inserindo venda:", vendaData);
      const { data: vendaInserida, error: vendaError } = await supabase
        .from("vendas")
        .insert(vendaData)
        .select()
        .single();

      if (vendaError) {
        console.error("[useFinalizarVenda] Erro ao inserir venda:", vendaError);
        throw vendaError;
      }

      // 3b. Inserir itens pivot (derivados dos campos legados + opcionais)
      if (vendaInserida) {
        const itensPivot: Array<{ venda_id: string; categoria_id: string; quantidade: number }> = [];
        const pushIf = (slug: string, qtd: number) => {
          if (qtd && qtd > 0) {
            const cid = catBySlug.get(slug);
            if (cid) itensPivot.push({ venda_id: vendaInserida.id, categoria_id: cid, quantidade: qtd });
          }
        };
        pushIf("baby", Number(venda.qtd_baby_vendida));
        pushIf("1a16", Number(venda.qtd_1_a_16_vendida));
        pushIf("calcados", Number(venda.qtd_calcados_vendida));
        pushIf("brinquedos", Number(venda.qtd_brinquedos_vendida));
        pushIf("itens_medios", Number(venda.qtd_itens_medios_vendida));
        pushIf("itens_grandes", Number(venda.qtd_itens_grandes_vendida));
        (venda.itens || []).forEach((it) => {
          if (it.quantidade > 0) itensPivot.push({ venda_id: vendaInserida.id, categoria_id: it.categoria_id, quantidade: it.quantidade });
        });

        if (itensPivot.length > 0) {
          await supabase.from("venda_itens").insert(itensPivot);
        }

        // Marcar itens grandes como vendidos
        if (venda.itensGrandesSelecionados && venda.itensGrandesSelecionados.length > 0) {
          const agora = new Date().toISOString();
          for (const itemSelecionado of venda.itensGrandesSelecionados) {
            await supabase
              .from("itens_grandes_individuais")
              .update({
                status: "vendido",
                valor_venda: itemSelecionado.valor_venda,
                venda_id: vendaInserida.id,
                data_saida: agora,
                vendedora_nome: venda.vendedora_nome || null,
              })
              .eq("id", itemSelecionado.id);
          }
        }
      }

      // 5. ✅ REGISTRAR MOVIMENTAÇÃO DE CAIXA DE FORMA SEGURA (NÃO DEPENDE APENAS DO TRIGGER)
      // Esta chamada garante que a movimentação seja registrada mesmo se o trigger falhar
      console.log("[useFinalizarVenda] Registrando movimentação de caixa...");
      
      const resultadoMovimentacao = await registrarMovimentacaoCaixa({
        vendaId: vendaInserida.id,
        caixaOrigem: venda.caixa_origem || "Caixa 1",
        pagamentos: venda.pagamentos,
        dataHoraVenda: vendaInserida.created_at,
      });

      if (!resultadoMovimentacao.success) {
        // ⚠️ IMPORTANTE: Não falhar a venda, mas alertar
        console.error(
          `[useFinalizarVenda] ⚠️ Venda ${vendaInserida.id} inserida mas falha ao registrar movimentação:`,
          resultadoMovimentacao.error
        );
        toast.warning(
          `Venda registrada mas houve problema ao atualizar o caixa. Registre manualmente R$ ${resultadoMovimentacao.valorRegistrado || 0}`
        );
      } else if (resultadoMovimentacao.error === "DUPLICADA") {
        console.log(
          `[useFinalizarVenda] ℹ️ Movimentação já existia (provavelmente criada pelo trigger)`
        );
      } else {
        console.log(
          `[useFinalizarVenda] ✅ Movimentação registrada com sucesso: R$ ${resultadoMovimentacao.valorRegistrado}`
        );
      }

      console.log("[useFinalizarVenda] Venda inserida, atualizando estoque...");

      // 4. Atualizar estoque (subtrair) - ler -> calcular no JS -> gravar
      // (decrementa SOMENTE após a venda ter sido gravada com sucesso)
      for (const item of estoqueAtual || []) {
        const info = categoriaMap[item.categoria];
        if (!info || info.vendido <= 0) continue;

        // lê o valor mais recente desta categoria (evita divergência por cache/concorrência)
        const { data: atualRow, error: atualError } = await supabase
          .from("estoque")
          .select("quantidade_atual")
          .eq("id", item.id)
          .single();

        if (atualError) {
          console.error(`[useFinalizarVenda] Erro ao ler estoque atual (${item.categoria}):`, atualError);
          throw atualError;
        }

        const atual = atualRow?.quantidade_atual ?? 0;
        const novaQuantidade = atual - info.vendido; // pode ficar negativo (estoque físico manda)

        const { error: updateError } = await supabase
          .from("estoque")
          .update({ quantidade_atual: novaQuantidade })
          .eq("id", item.id);

        if (updateError) {
          console.error(`[useFinalizarVenda] Erro ao atualizar estoque ${item.categoria}:`, updateError);
          throw updateError;
        }

        console.log(`[useFinalizarVenda] Estoque ${item.categoria}: ${atual} - ${info.vendido} = ${novaQuantidade}`);
      }

      console.log("[useFinalizarVenda] Venda finalizada com sucesso!");
      return alertas;
    },
    onSuccess: (alertas) => {
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      if (alertas.length > 0) {
        toast.warning("Venda realizada! Atenção: estoque negativo em algumas categorias.");
      } else {
        toast.success("Venda finalizada com sucesso!");
      }
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error && "message" in error
            ? String((error as any).message)
            : typeof error === "string"
              ? error
              : JSON.stringify(error);

      toast.error("Erro ao finalizar venda: " + message);
    },
  });
}
