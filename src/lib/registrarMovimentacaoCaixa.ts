/**
 * Registra movimentação de caixa de forma segura e garantida
 * 
 * Esta função substitui a dependência exclusiva no trigger do banco,
 * garantindo que toda venda em dinheiro seja registrada mesmo se o trigger falhar.
 * 
 * @returns {success: boolean, movimentacaoId?: string, error?: string}
 */

import { supabase } from "@/integrations/supabase/client";

interface PagamentoVenda {
  metodo: string;
  valor: number;
  bandeira?: string;
}

interface RegistrarMovimentacaoParams {
  vendaId: string;
  caixaOrigem: string;
  pagamentos: PagamentoVenda[];
  dataHoraVenda: string; // ISO string
}

export async function registrarMovimentacaoCaixa({
  vendaId,
  caixaOrigem,
  pagamentos,
  dataHoraVenda,
}: RegistrarMovimentacaoParams): Promise<{
  success: boolean;
  movimentacaoId?: string;
  valorRegistrado?: number;
  error?: string;
}> {
  try {
    // 1. Calcular total em dinheiro
    const totalDinheiro = pagamentos.reduce((total, pag) => {
      if (pag.metodo.toLowerCase().trim() === "dinheiro") {
        return total + (pag.valor || 0);
      }
      return total;
    }, 0);

    // Se não houver dinheiro, não precisa registrar movimentação
    if (totalDinheiro <= 0) {
      console.log(`[registrarMovimentacaoCaixa] Venda ${vendaId} sem dinheiro - skip`);
      return { success: true, valorRegistrado: 0 };
    }

    console.log(`[registrarMovimentacaoCaixa] Venda ${vendaId}: R$ ${totalDinheiro} em dinheiro`);

    // 2. Buscar ID do caixa destino
    const { data: caixaData, error: caixaError } = await supabase
      .from("caixas")
      .select("id, saldo_atual")
      .eq("nome", caixaOrigem)
      .single();

    if (caixaError || !caixaData) {
      const errorMsg = `Caixa "${caixaOrigem}" não encontrado: ${caixaError?.message || "unknown"}`;
      console.error(`[registrarMovimentacaoCaixa] ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    // 3. Verificar se já existe movimentação para esta venda (evitar duplicação)
    const { data: movExistente, error: checkError } = await supabase
      .from("movimentacoes_caixa")
      .select("id, valor")
      .eq("tipo", "venda")
      .ilike("motivo", `%${vendaId}%`)
      .maybeSingle();

    if (checkError) {
      console.error(`[registrarMovimentacaoCaixa] Erro ao verificar movimentação existente:`, checkError);
      // Continua mesmo com erro de verificação
    }

    if (movExistente) {
      console.warn(`[registrarMovimentacaoCaixa] ⚠️ Movimentação já existe para venda ${vendaId} (id=${movExistente.id})`);
      return {
        success: true,
        movimentacaoId: movExistente.id,
        valorRegistrado: movExistente.valor,
        error: "DUPLICADA",
      };
    }

    // 4. Inserir movimentação na tabela movimentacoes_caixa
    const { data: movimentacao, error: movError } = await supabase
      .from("movimentacoes_caixa")
      .insert({
        caixa_origem_id: null, // venda vem do cliente (origem NULL)
        caixa_destino_id: caixaData.id,
        tipo: "venda",
        valor: totalDinheiro,
        motivo: `Venda #${vendaId}`,
        data_hora: dataHoraVenda,
      })
      .select("id")
      .single();

    if (movError) {
      const errorMsg = `Erro ao inserir movimentação: ${movError.message}`;
      console.error(`[registrarMovimentacaoCaixa] ${errorMsg}`, movError);
      return { success: false, error: errorMsg };
    }

    console.log(`[registrarMovimentacaoCaixa] ✅ Movimentação inserida: id=${movimentacao.id}, valor=R$${totalDinheiro}`);

    // 5. Atualizar saldo do caixa
    const novoSaldo = (caixaData.saldo_atual || 0) + totalDinheiro;
    const { error: saldoError } = await supabase
      .from("caixas")
      .update({ saldo_atual: novoSaldo })
      .eq("id", caixaData.id);

    if (saldoError) {
      console.error(
        `[registrarMovimentacaoCaixa] ⚠️ Movimentação inserida mas erro ao atualizar saldo:`,
        saldoError
      );
      // NÃO retornar erro - movimentação foi criada com sucesso
      // O saldo será corrigido no próximo fechamento ou reconciliação
    } else {
      console.log(`[registrarMovimentacaoCaixa] ✅ Saldo atualizado: ${caixaData.saldo_atual} + ${totalDinheiro} = ${novoSaldo}`);
    }

    return {
      success: true,
      movimentacaoId: movimentacao.id,
      valorRegistrado: totalDinheiro,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[registrarMovimentacaoCaixa] Exceção não tratada:`, error);
    return { success: false, error: errorMsg };
  }
}

/**
 * Job de reconciliação - executa verificação e correção de vendas sem movimentação
 * 
 * Deve ser chamado:
 * - Diariamente (agendado)
 * - Antes de cada fechamento de caixa
 * - Manualmente quando suspeitar de inconsistências
 */
export async function reconciliarVendasSemMovimentacao(
  dataInicio: string,
  dataFim: string
): Promise<{
  vendasCorrigidas: number;
  erros: string[];
}> {
  console.log(`[reconciliarVendas] Verificando vendas entre ${dataInicio} e ${dataFim}`);

  try {
    // 1. Buscar todas as vendas com dinheiro no período
    const { data: vendas, error: vendasError } = await supabase
      .from("vendas")
      .select("id, caixa_origem, metodo_pagto_1, valor_pagto_1, metodo_pagto_2, valor_pagto_2, metodo_pagto_3, valor_pagto_3, created_at")
      .gte("created_at", dataInicio)
      .lte("created_at", dataFim)
      .order("created_at", { ascending: true });

    if (vendasError) {
      console.error("[reconciliarVendas] Erro ao buscar vendas:", vendasError);
      return { vendasCorrigidas: 0, erros: [vendasError.message] };
    }

    const erros: string[] = [];
    let corrigidas = 0;

    for (const venda of vendas || []) {
      // Calcular dinheiro
      const pagamentos = [
        { metodo: venda.metodo_pagto_1 || "", valor: venda.valor_pagto_1 || 0 },
        { metodo: venda.metodo_pagto_2 || "", valor: venda.valor_pagto_2 || 0 },
        { metodo: venda.metodo_pagto_3 || "", valor: venda.valor_pagto_3 || 0 },
      ].filter((p) => p.metodo && p.valor > 0);

      const totalDinheiro = pagamentos.reduce((sum, p) => {
        return p.metodo.toLowerCase().trim() === "dinheiro" ? sum + p.valor : sum;
      }, 0);

      if (totalDinheiro <= 0) continue;

      // Verificar se existe movimentação
      const { data: movExistente } = await supabase
        .from("movimentacoes_caixa")
        .select("id")
        .eq("tipo", "venda")
        .ilike("motivo", `%${venda.id}%`)
        .maybeSingle();

      if (movExistente) continue; // já tem movimentação

      // CORRIGIR: registrar movimentação faltante
      console.log(`[reconciliarVendas] ⚠️ Venda ${venda.id} com R$${totalDinheiro} SEM movimentação`);

      const resultado = await registrarMovimentacaoCaixa({
        vendaId: venda.id,
        caixaOrigem: venda.caixa_origem || "Caixa 1",
        pagamentos,
        dataHoraVenda: venda.created_at,
      });

      if (resultado.success) {
        corrigidas++;
        console.log(`[reconciliarVendas] ✅ Venda ${venda.id} corrigida`);
      } else {
        erros.push(`Venda ${venda.id}: ${resultado.error}`);
        console.error(`[reconciliarVendas] ❌ Falha ao corrigir venda ${venda.id}`);
      }
    }

    console.log(`[reconciliarVendas] Finalizado: ${corrigidas} vendas corrigidas, ${erros.length} erros`);
    return { vendasCorrigidas: corrigidas, erros };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[reconciliarVendas] Exceção:", error);
    return { vendasCorrigidas: 0, erros: [errorMsg] };
  }
}
