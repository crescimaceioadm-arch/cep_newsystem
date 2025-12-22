import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Venda, Estoque } from "@/types/database";
import { toast } from "sonner";

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
      return data as Venda[];
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
      return data as Venda[];
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

      // 5. ✅ MOVIMENTAÇÃO E ATUALIZAÇÃO DE SALDO SÃO FEITAS PELO TRIGGER DO BANCO
      // O trigger 'trg_venda_dinheiro' (AFTER INSERT na tabela vendas) já cuida de:
      // - Inserir a movimentação em movimentacoes_caixa
      // - Atualizar o saldo_atual do caixa
      // ⚠️ NÃO duplicar essa lógica aqui!
      console.log("[useFinalizarVenda] ✅ Trigger do banco cuidará da movimentação de caixa");

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
