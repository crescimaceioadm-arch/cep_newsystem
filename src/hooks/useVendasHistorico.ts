import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Venda {
  id: string;
  data_venda: string | null;
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
        .order("data_venda", { ascending: false });

      if (error) throw error;
      return data as Venda[];
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
}

export function useAtualizarVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dados, vendaOriginal }: { id: string; dados: AtualizacaoVenda; vendaOriginal?: Venda }) => {
      // 1. Buscar venda original se não fornecida
      let vendaAnterior = vendaOriginal;
      if (!vendaAnterior) {
        const { data } = await supabase
          .from("vendas")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        vendaAnterior = data as Venda | undefined;
      }

      // 2. Atualizar a venda
      const { error } = await supabase
        .from("vendas")
        .update(dados)
        .eq("id", id);

      if (error) throw error;

      // 3. Ajustar movimentações de caixa se método de pagamento mudou
      const metodoAnterior = vendaAnterior?.metodo_pagto_1?.toLowerCase();
      const metodoNovo = dados.metodo_pagto_1?.toLowerCase();
      const valorAnterior = vendaAnterior?.valor_total_venda || 0;
      const valorNovo = dados.valor_total_venda ?? valorAnterior;
      const caixaAnterior = vendaAnterior?.caixa_origem || "Caixa 1";
      const caixaNovo = dados.caixa_origem || caixaAnterior;

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      queryClient.invalidateQueries({ queryKey: ["caixas"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes"] });
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

      // 4. Devolver itens ao estoque
      const categoriasParaRestaurar = [
        { categoria: 'Roupas Baby', quantidade: venda.qtd_baby_vendida || 0 },
        { categoria: 'Roupas 1 a 16', quantidade: venda.qtd_1_a_16_vendida || 0 },
        { categoria: 'Calçados', quantidade: venda.qtd_calcados_vendida || 0 },
        { categoria: 'Brinquedos', quantidade: venda.qtd_brinquedos_vendida || 0 },
        { categoria: 'Itens Médios', quantidade: venda.qtd_itens_medios_vendida || 0 },
        { categoria: 'Itens Grandes', quantidade: venda.qtd_itens_grandes_vendida || 0 },
      ];

      for (const item of categoriasParaRestaurar) {
        if (item.quantidade > 0) {
          // Buscar estoque atual
          const { data: estoque } = await supabase
            .from("estoque")
            .select("id, quantidade_atual")
            .eq("categoria", item.categoria)
            .maybeSingle();

          if (estoque) {
            await supabase
              .from("estoque")
              .update({ quantidade_atual: (estoque.quantidade_atual || 0) + item.quantidade })
              .eq("id", estoque.id);
          }
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
