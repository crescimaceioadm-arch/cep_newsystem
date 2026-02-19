# Funcionamento de Caixas — Abertura, Fechamento e Atualização Diária de Saldo

## 1) Visão geral (modo de funcionamento)
O fluxo de caixas é composto por:
- **Abertura/seleção do caixa** na tela de Financeiro.
- **Movimentações do dia** (vendas em dinheiro, entradas, saídas e transferências).
- **Fechamento** (saldo do sistema vs. saldo contado e status).
- **Saldo diário** calculado a partir do saldo inicial + movimentações do dia.

Fontes principais:
- UI/Fluxo: `src/pages/Financeiro.tsx`, `src/components/financeiro/FechamentoCaixaModal.tsx`
- Hooks: `src/hooks/useCaixas.ts`
- Banco/Trigger: `supabase/20260127_fix_saldo_movimentacoes.sql`

---

## 2) Abertura de Caixa

### Arquivos envolvidos
- `src/pages/Financeiro.tsx`

### Código principal (abertura/seleção)
````tsx
// filepath: c:\Users\fesid\Desktop\CeP Sistema\cep_newsystem\src\pages\Financeiro.tsx
// ...existing code...
const openFechamento = (caixa: Caixa) => {
  setCaixaFechamento(caixa);
  setModalFechamento(true);
};
// ...existing code...

3) Fechamento de Caixa
Arquivos envolvidos
src/components/financeiro/FechamentoCaixaModal.tsx
src/hooks/useCaixas.ts

// filepath: c:\Users\fesid\Desktop\CeP Sistema\cep_newsystem\src\components\financeiro\FechamentoCaixaModal.tsx
// ...existing code...
const diferenca = valorContadoNum - valorSistema;
const temDiferenca = Math.abs(diferenca) >= 0.01;
const statusFechamento = temDiferenca ? "pendente_aprovacao" : "aprovado";

fecharCaixa({
  caixaId: caixa.id,
  valorSistema,
  valorContado: valorContadoNum,
  justificativa: justificativa.trim() || null,
  dataFechamento,
  status: statusFechamento,
  detalhesPagamentos: resumo ? {
    dinheiro: resumo.totalDinheiro,
    pix: resumo.totalPix,
    debito: resumo.totalDebito,
    credito: resumo.totalCredito,
    giraCredito: resumo.totalGiraCredito,
  } : undefined,
});
// ...existing code...
Código (hook: gravação do fechamento)
// filepath: c:\Users\fesid\Desktop\CeP Sistema\cep_newsystem\src\hooks\useCaixas.ts
// ...existing code...
export function useFechamentoCaixa() {
  return useMutation({
    mutationFn: async ({
      caixaId,
      valorSistema,
      valorContado,
      justificativa,
      dataFechamento,
      status,
      detalhesPagamentos,
    }) => {
      const diferenca = valorSistema - valorContado;
      const statusFinal = status || "aprovado";

      const { error } = await supabase.from("fechamentos_caixa").insert({
        caixa_id: caixaId,
        data_fechamento: dataParaSalvar,
        valor_sistema: valorSistema,
        valor_contado: valorContado,
        diferenca,
        justificativa: justificativa || null,
        status: statusFinal,
        requer_revisao: statusFinal === "pendente_aprovacao",
        detalhes_pagamentos: detalhesPagamentos ? JSON.stringify(detalhesPagamentos) : null,
        criado_por: user?.id || null,
      });

      if (error) throw error;
      return { caixaId, valorSistema, valorContado, diferenca, status: statusFinal };
    },
  });
}
// ...existing code...
4) Atualização diária do saldo de cada caixa
Arquivos envolvidos
src/hooks/useCaixas.ts (saldo inicial, movimentações e saldo final)
supabase/20260127_fix_saldo_movimentacoes.sql (registro de vendas em dinheiro)
Como o saldo diário é calculado
Saldo inicial: busca fechamento aprovado do dia anterior.
Movimentações do dia: entradas, saídas, transferências e vendas em dinheiro.
Saldo final: saldo_inicial + entradas - saídas.
// filepath: c:\Users\fesid\Desktop\CeP Sistema\cep_newsystem\src\hooks\useCaixas.ts
// ...existing code...
export function useSaldoFinalHoje(caixaId: string | null) {
  const hoje = getDateBrasilia();
  const { data: saldoInicialData } = useSaldoInicial(caixaId, hoje);
  const { data: movimentacoesPeriodo } = useMovimentacoesDinheiro(caixaId, hoje, hoje);

  return useQuery({
    queryKey: ["saldo_final_hoje", caixaId, saldoInicialData, movimentacoesPeriodo],
    enabled: !!caixaId,
    queryFn: async () => {
      const saldoInicial = saldoInicialData?.valor || 0;
      const movs = movimentacoesPeriodo || [];

      let totalEntradas = 0;
      let totalSaidas = 0;

      movs.forEach((mov) => {
        const tipo = mov.tipo;
        const destinoId = mov.caixa_destino_id;
        const origemId = mov.caixa_origem_id;

        if (tipo === "venda" && destinoId === caixaId) totalEntradas += mov.valor;
        if (tipo === "pagamento_avaliacao" && origemId === caixaId) totalSaidas += mov.valor;
        if (tipo === "entrada" && destinoId === caixaId) totalEntradas += mov.valor;
        if (tipo === "saida" && origemId === caixaId) totalSaidas += mov.valor;
        if (tipo === "transferencia_entre_caixas") {
          if (destinoId === caixaId) totalEntradas += mov.valor;
          if (origemId === caixaId) totalSaidas += mov.valor;
        }
      });

      const saldoFinal = saldoInicial + totalEntradas - totalSaidas;
      return { saldoInicial, totalEntradas, totalSaidas, saldoFinal };
    },
  });
}
// ...existing code...

6) Análise completa (pontos-chave para refazer)
Modelo de dados: caixas, movimentacoes_caixa, fechamentos_caixa.
Registro de vendas em dinheiro: trigger no banco (SQL em supabase/20260127_fix_saldo_movimentacoes.sql).
Saldo diário sempre calculado: não depender apenas de saldo_atual.
Fechamento: grava valor_contado, valor_sistema, diferenca, status.
Divergência: status pendente_aprovacao quando há diferença relevante.
Se quiser, posso incluir também um checklist de reimplementação etapa por etapa.

GPT-5.2-Codex • 1x
flowchart TD
  A[Usuário seleciona caixa] --> B[Operações do dia]
  B --> C[Vendas em dinheiro]
  B --> D[Entradas/Saídas/Transferências]
  C --> E[Movimentações na tabela movimentacoes_caixa]
  D --> E
  E --> F[useMovimentacoesDinheiro]
  F --> G[useSaldoFinalHoje]
  G --> H[Saldo final do dia]

  H --> I[Fechamento de caixa]
  I --> J[Fechamento gravado em fechamentos_caixa]
  J --> K[useSaldoInicial do dia seguinte]