import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ItemCategoria } from "@/types/database";
import { useLogAtividade } from "@/hooks/useLogAtividade";

export interface Venda {
  id: string;
  created_at: string;
  vendedora_nome: string | null;
  caixa_origem: string | null;
  cliente_nome: string | null;
  valor_total_venda: number;
  metodo_pagto_1: string | null;
  valor_pagto_1: number | null;
  bandeira_cartao_1: string | null;
  metodo_pagto_2: string | null;
  valor_pagto_2: number | null;
  bandeira_cartao_2: string | null;
  metodo_pagto_3: string | null;
  valor_pagto_3: number | null;
  bandeira_cartao_3: string | null;
  qtd_total_itens: number | null;
  itens?: Array<{ id?: string; categoria_id: string; quantidade: number; categoria?: ItemCategoria }>;
  qtd_baby_vendida: number | null;
  qtd_1_a_16_vendida: number | null;
  qtd_calcados_vendida: number | null;
  qtd_brinquedos_vendida: number | null;
  qtd_itens_medios_vendida: number | null;
  qtd_itens_grandes_vendida: number | null;
}

export function useVendasHistorico() {
  return useQuery({
    queryKey: ["vendas", "historico"],
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

export interface AtualizacaoVenda {
  vendedora_nome?: string | null;
  cliente_nome?: string | null;
  caixa_origem?: string | null;
  metodo_pagto_1?: string | null;
  valor_pagto_1?: number | null;
  metodo_pagto_2?: string | null;
  valor_pagto_2?: number | null;
  metodo_pagto_3?: string | null;
  valor_pagto_3?: number | null;
  qtd_baby_vendida?: number | null;
  qtd_1_a_16_vendida?: number | null;
  qtd_calcados_vendida?: number | null;
  qtd_brinquedos_vendida?: number | null;
  qtd_itens_medios_vendida?: number | null;
  qtd_itens_grandes_vendida?: number | null;
  qtd_total_itens?: number;
  valor_total_venda?: number;
  itens?: Array<{ categoria_id: string; quantidade: number }>;
}

export function useAtualizarVenda() {
  const queryClient = useQueryClient();
  const { log } = useLogAtividade();

  return useMutation({
    mutationFn: async ({ id, dados, vendaOriginal }: { id: string; dados: AtualizacaoVenda; vendaOriginal?: Venda }) => {
      // 1. Buscar venda original + pivot + categorias
      let vendaAnterior = vendaOriginal;
      if (!vendaAnterior) {
        const { data } = await supabase
          .from("vendas")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        vendaAnterior = data as Venda | undefined;
      }

      const { data: pivotAnterior } = await supabase
        .from("venda_itens")
        .select("venda_id, categoria_id, quantidade");

      const { data: categorias } = await supabase
        .from("item_categories")
        .select("id, slug, nome, ativo");

      const catById = new Map<string, { slug: string; nome: string }>();
      const catBySlug = new Map<string, string>();
      (categorias || []).forEach((c: any) => {
        catById.set(c.id, { slug: c.slug, nome: c.nome });
        if (c.ativo !== false) catBySlug.set(c.slug, c.id);
      });

      const pivotAntigos = (pivotAnterior || []).filter((p) => p.venda_id === id);

      const buildMapa = (pivots: Array<{ categoria_id: string; quantidade: number }>, origem?: Venda) => {
        const mapa = new Map<string, number>();
        pivots.forEach((p) => {
          mapa.set(p.categoria_id, (p.quantidade || 0) + (mapa.get(p.categoria_id) || 0));
        });
        if (mapa.size === 0 && origem) {
          const pushLegacy = (slug: string, qtd?: number | null) => {
            if (!qtd || qtd <= 0) return;
            const cid = catBySlug.get(slug);
            if (cid) mapa.set(cid, qtd);
          };
          pushLegacy("baby", origem.qtd_baby_vendida);
          pushLegacy("1a16", origem.qtd_1_a_16_vendida);
          pushLegacy("calcados", origem.qtd_calcados_vendida);
          pushLegacy("brinquedos", origem.qtd_brinquedos_vendida);
          pushLegacy("itens_medios", origem.qtd_itens_medios_vendida);
          pushLegacy("itens_grandes", origem.qtd_itens_grandes_vendida);
        }
        return mapa;
      };

      const mapaAnterior = buildMapa(pivotAntigos, vendaAnterior);

      // 2. Preparar novo mapa a partir dos dados recebidos
      const { itens, ...dadosVenda } = dados;
      const mapaNovo = new Map<string, number>();

      const pushNovo = (slug: string, qtd?: number | null) => {
        if (!qtd || qtd <= 0) return;
        const cid = catBySlug.get(slug);
        if (cid) mapaNovo.set(cid, (mapaNovo.get(cid) || 0) + qtd);
      };

      const valorOr = <T>(novo: T | undefined, anterior: T | undefined) => (novo !== undefined ? novo : anterior);

      const anteriorRef = vendaAnterior || ({} as any);
      pushNovo("baby", valorOr(dadosVenda.qtd_baby_vendida, anteriorRef.qtd_baby_vendida));
      pushNovo("1a16", valorOr(dadosVenda.qtd_1_a_16_vendida, anteriorRef.qtd_1_a_16_vendida));
      pushNovo("calcados", valorOr(dadosVenda.qtd_calcados_vendida, anteriorRef.qtd_calcados_vendida));
      pushNovo("brinquedos", valorOr(dadosVenda.qtd_brinquedos_vendida, anteriorRef.qtd_brinquedos_vendida));
      pushNovo("itens_medios", valorOr(dadosVenda.qtd_itens_medios_vendida, anteriorRef.qtd_itens_medios_vendida));
      pushNovo("itens_grandes", valorOr(dadosVenda.qtd_itens_grandes_vendida, anteriorRef.qtd_itens_grandes_vendida));

      (itens || []).forEach((it) => {
        if (it.quantidade > 0) {
          mapaNovo.set(it.categoria_id, (mapaNovo.get(it.categoria_id) || 0) + it.quantidade);
        }
      });

      // 3. Atualizar venda (tabela principal)
      const novoTotalItens = Array.from(mapaNovo.values()).reduce((sum, v) => sum + v, 0);
      const payloadVenda = {
        ...dadosVenda,
        qtd_total_itens: dadosVenda.qtd_total_itens ?? novoTotalItens,
      };

      const { error: updateVendaError } = await supabase
        .from("vendas")
        .update(payloadVenda)
        .eq("id", id);

      if (updateVendaError) throw updateVendaError;

      // 4. Atualizar pivot venda_itens
      await supabase.from("venda_itens").delete().eq("venda_id", id);

      const novosPivots: Array<{ venda_id: string; categoria_id: string; quantidade: number }> = [];
      mapaNovo.forEach((qtd, cid) => {
        if (qtd > 0) novosPivots.push({ venda_id: id, categoria_id: cid, quantidade: qtd });
      });
      if (novosPivots.length) {
        const { error: insertPivotError } = await supabase.from("venda_itens").insert(novosPivots);
        if (insertPivotError) throw insertPivotError;
      }

      // 5. Ajustar estoque (delta = novo - anterior)
      const { data: estoqueAtual } = await supabase.from("estoque").select("id, categoria, categoria_id, quantidade_atual");

      const deltas = new Map<string, number>();
      const allIds = new Set<string>([...mapaAnterior.keys(), ...mapaNovo.keys()]);
      allIds.forEach((cid) => {
        const delta = (mapaNovo.get(cid) || 0) - (mapaAnterior.get(cid) || 0);
        if (delta !== 0) deltas.set(cid, delta);
      });

      for (const [cid, delta] of deltas) {
        const catInfo = catById.get(cid);
        const match = (estoqueAtual || []).find((e) =>
          e.categoria_id === cid ||
          (catInfo && (e.categoria === catInfo.nome || e.categoria.toLowerCase() === catInfo.slug.toLowerCase()))
        );
        if (!match) continue;
        const atual = match.quantidade_atual || 0;
        const novoValor = atual - delta; // delta positivo => vendeu mais => subtrai
        const { error: estqError } = await supabase
          .from("estoque")
          .update({ quantidade_atual: novoValor })
          .eq("id", match.id);
        if (estqError) throw estqError;
      }

      // 3. Ajustar movimentações de caixa se método de pagamento mudou
      const metodoAnterior = vendaAnterior?.metodo_pagto_1?.toLowerCase();
      const metodoNovo = dadosVenda.metodo_pagto_1?.toLowerCase();
      const valorAnterior = vendaAnterior?.valor_total_venda || 0;
      const valorNovo = payloadVenda.valor_total_venda ?? valorAnterior;
      const caixaAnterior = vendaAnterior?.caixa_origem || "Caixa 1";
      const caixaNovo = dadosVenda.caixa_origem || caixaAnterior;

      const eraDinheiro = metodoAnterior === 'dinheiro';
      const agoraDinheiro = metodoNovo === 'dinheiro';

      // Se tinha movimentação de dinheiro anterior, precisamos ajustar
      if (eraDinheiro || agoraDinheiro) {
        // Buscar caixa anterior
        const { data: caixaAnteriorData } = await supabase
          .from("caixas")
          .select("id, saldo_atual")
          .eq("nome", caixaAnterior)
          .maybeSingle();

        // Buscar caixa novo (pode ser o mesmo)
        const { data: caixaNovoData } = await supabase
          .from("caixas")
          .select("id, saldo_atual")
          .eq("nome", caixaNovo)
          .maybeSingle();

        // Buscar movimentação existente para esta venda
        const { data: movExistente } = await supabase
          .from("movimentacoes_caixa")
          .select("id, valor, caixa_destino_id")
          .eq("tipo", "venda")
          .ilike("motivo", `%${id}%`)
          .maybeSingle();

        if (eraDinheiro && !agoraDinheiro) {
          // ERA dinheiro, AGORA não é mais → remover movimentação e subtrair do saldo
          if (movExistente && caixaAnteriorData) {
            await supabase
              .from("movimentacoes_caixa")
              .delete()
              .eq("id", movExistente.id);

            await supabase
              .from("caixas")
              .update({ saldo_atual: (caixaAnteriorData.saldo_atual || 0) - movExistente.valor })
              .eq("id", caixaAnteriorData.id);
          }
        } else if (!eraDinheiro && agoraDinheiro) {
          // NÃO era dinheiro, AGORA é → criar movimentação e somar ao saldo
          if (caixaNovoData) {
            await supabase
              .from("movimentacoes_caixa")
              .insert({
                caixa_destino_id: caixaNovoData.id,
                caixa_origem_id: null,
                tipo: 'venda',
                valor: valorNovo,
                motivo: `Venda #${id}`,
              });

            await supabase
              .from("caixas")
              .update({ saldo_atual: (caixaNovoData.saldo_atual || 0) + valorNovo })
              .eq("id", caixaNovoData.id);
          }
        } else if (eraDinheiro && agoraDinheiro) {
          // ERA e CONTINUA dinheiro → ajustar diferença de valor/caixa
          const diferencaValor = valorNovo - valorAnterior;
          const mudouCaixa = caixaAnterior !== caixaNovo;

          if (movExistente) {
            if (mudouCaixa) {
              // Remover do caixa anterior
              if (caixaAnteriorData) {
                await supabase
                  .from("caixas")
                  .update({ saldo_atual: (caixaAnteriorData.saldo_atual || 0) - movExistente.valor })
                  .eq("id", caixaAnteriorData.id);
              }
              // Adicionar ao novo caixa
              if (caixaNovoData) {
                await supabase
                  .from("caixas")
                  .update({ saldo_atual: (caixaNovoData.saldo_atual || 0) + valorNovo })
                  .eq("id", caixaNovoData.id);

                // Atualizar movimentação para o novo caixa
                await supabase
                  .from("movimentacoes_caixa")
                  .update({ 
                    caixa_destino_id: caixaNovoData.id, 
                    valor: valorNovo 
                  })
                  .eq("id", movExistente.id);
              }
            } else if (diferencaValor !== 0) {
              // Mesmo caixa, valor diferente
              if (caixaAnteriorData) {
                await supabase
                  .from("caixas")
                  .update({ saldo_atual: (caixaAnteriorData.saldo_atual || 0) + diferencaValor })
                  .eq("id", caixaAnteriorData.id);

                await supabase
                  .from("movimentacoes_caixa")
                  .update({ valor: valorNovo })
                  .eq("id", movExistente.id);
              }
            }
          } else {
            // Não existia movimentação (venda antiga), criar agora
            if (caixaNovoData) {
              await supabase
                .from("movimentacoes_caixa")
                .insert({
                  caixa_destino_id: caixaNovoData.id,
                  caixa_origem_id: null,
                  tipo: 'venda',
                  valor: valorNovo,
                  motivo: `Venda #${id}`,
                });

              await supabase
                .from("caixas")
                .update({ saldo_atual: (caixaNovoData.saldo_atual || 0) + valorNovo })
                .eq("id", caixaNovoData.id);
            }
          }
        }
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      queryClient.invalidateQueries({ queryKey: ["caixas"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes"] });
      
      // Log de auditoria
      log({
        acao: 'editar',
        tabela_afetada: 'vendas',
        registro_id: variables.id,
        dados_antes: variables.vendaOriginal,
        dados_depois: variables.dados,
        detalhes: `Venda editada - Cliente: ${variables.dados.cliente_nome || variables.vendaOriginal?.cliente_nome || 'N/A'}, Vendedora: ${variables.dados.vendedora_nome || variables.vendaOriginal?.vendedora_nome || 'N/A'}, Valor: R$ ${variables.dados.valor_total_venda || variables.vendaOriginal?.valor_total_venda || 0}`,
      });
      
      toast.success("Venda atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar venda:", error);
      toast.error("Erro ao atualizar venda");
    },
  });
}

export function useExcluirVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Buscar a venda antes de deletar
      const { data: venda, error: fetchError } = await supabase
        .from("vendas")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !venda) {
        throw new Error("Venda não encontrada");
      }

      // 1.1 Buscar pivô de itens e categorias para restaurar estoque
      const { data: categorias } = await supabase
        .from("item_categories")
        .select("id, slug, nome, ativo");
      const catById = new Map<string, { slug: string; nome: string }>();
      const catBySlug = new Map<string, string>();
      (categorias || []).forEach((c: any) => {
        catById.set(c.id, { slug: c.slug, nome: c.nome });
        if (c.ativo !== false) catBySlug.set(c.slug, c.id);
      });

      const { data: pivotVenda } = await supabase
        .from("venda_itens")
        .select("venda_id, categoria_id, quantidade")
        .eq("venda_id", id);

      const mapaRestaurar = new Map<string, number>();
      (pivotVenda || []).forEach((p) => {
        mapaRestaurar.set(p.categoria_id, (mapaRestaurar.get(p.categoria_id) || 0) + (p.quantidade || 0));
      });

      if (mapaRestaurar.size === 0) {
        const pushLegacy = (slug: string, qtd?: number | null) => {
          if (!qtd || qtd <= 0) return;
          const cid = catBySlug.get(slug);
          if (cid) mapaRestaurar.set(cid, qtd);
        };
        pushLegacy("baby", venda.qtd_baby_vendida);
        pushLegacy("1a16", venda.qtd_1_a_16_vendida);
        pushLegacy("calcados", venda.qtd_calcados_vendida);
        pushLegacy("brinquedos", venda.qtd_brinquedos_vendida);
        pushLegacy("itens_medios", venda.qtd_itens_medios_vendida);
        pushLegacy("itens_grandes", venda.qtd_itens_grandes_vendida);
      }

      // 2. Calcular o valor total em dinheiro
      let valorDinheiro = 0;
      if (venda.metodo_pagto_1?.toLowerCase() === 'dinheiro') {
        valorDinheiro += venda.valor_pagto_1 || 0;
      }
      if (venda.metodo_pagto_2?.toLowerCase() === 'dinheiro') {
        valorDinheiro += venda.valor_pagto_2 || 0;
      }
      if (venda.metodo_pagto_3?.toLowerCase() === 'dinheiro') {
        valorDinheiro += venda.valor_pagto_3 || 0;
      }

      // 3. Se houve dinheiro, deletar a movimentação
      if (valorDinheiro > 0 && venda.caixa_origem) {
        // Deletar movimentação associada
        await supabase
          .from("movimentacoes_caixa")
          .delete()
          .eq("tipo", "venda")
          .ilike("motivo", `%${id}%`);
      }

      // 4. Devolver itens ao estoque usando categoria_id/nome/slug
      if (mapaRestaurar.size > 0) {
        const { data: estoqueAtual } = await supabase
          .from("estoque")
          .select("id, categoria, categoria_id, quantidade_atual");

        for (const [cid, qtd] of mapaRestaurar) {
          if (qtd <= 0) continue;
          const catInfo = catById.get(cid);
          const match = (estoqueAtual || []).find((e) =>
            e.categoria_id === cid ||
            (catInfo && (e.categoria === catInfo.nome || e.categoria.toLowerCase() === catInfo.slug.toLowerCase()))
          );
          if (!match) continue;
          const novaQtd = (match.quantidade_atual || 0) + qtd;
          await supabase
            .from("estoque")
            .update({ quantidade_atual: novaQtd })
            .eq("id", match.id);
        }
      }

      // 5. Deletar a venda
      const { error } = await supabase
        .from("vendas")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      queryClient.invalidateQueries({ queryKey: ["caixas"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes"] });
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
      toast.success("Venda excluída com sucesso! Saldo e estoque revertidos.");
    },
    onError: (error) => {
      console.error("Erro ao excluir venda:", error);
      toast.error("Erro ao excluir venda");
    },
  });
}
