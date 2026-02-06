import { supabase } from "@/integrations/supabase/client";

/**
 * Corrigir records antigos com timezone incorreto
 * Execute apenas uma vez após validar os timestamps!
 * 
 * Adiciona 3 horas aos registros antigos (Brasília = UTC-3)
 */
export async function corrigirTimestampsAntigos() {
  console.log("🔧 Iniciando correção de timestamps antigos...");
  
  try {
    // 1. CORRIGIR VENDAS
    console.log("📦 Corrigindo vendas...");
    const { error: errorVendas } = await supabase.rpc("corrigir_vendas_timezone");
    if (errorVendas) throw new Error(`Erro em vendas: ${errorVendas.message}`);
    console.log("✅ Vendas corrigidas");

    // 2. CORRIGIR ATENDIMENTOS
    console.log("📋 Corrigindo atendimentos...");
    const { error: errorAtendimentos } = await supabase.rpc("corrigir_atendimentos_timezone");
    if (errorAtendimentos) throw new Error(`Erro em atendimentos: ${errorAtendimentos.message}`);
    console.log("✅ Atendimentos corrigidos");

    // 3. CORRIGIR ITENS GRANDES
    console.log("🎁 Corrigindo itens grandes...");
    const { error: errorItens } = await supabase.rpc("corrigir_itens_grandes_timezone");
    if (errorItens) throw new Error(`Erro em itens grandes: ${errorItens.message}`);
    console.log("✅ Itens grandes corrigidos");

    console.log("🎉 Correção concluída com sucesso!");
    return { success: true };
  } catch (error) {
    console.error("❌ Erro na correção:", error);
    throw error;
  }
}

/**
 * Executar no console do navegador:
 * 
 * import { corrigirTimestampsAntigos } from "@/lib/corrigirTimezones";
 * await corrigirTimestampsAntigos();
 */
