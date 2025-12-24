# 📊 PLANO DE REFATORAÇÃO - CÁLCULO DE SALDO

**Status**: ✅ PRONTO PARA EXECUÇÃO  
**Data**: 23/12/2024  
**Versão**: 1.0  

---

## 🎯 OBJETIVO

Refatorar toda a lógica de cálculo de saldo para funcionar como um saldo bancário:
```
Saldo Final = Saldo Inicial + Entradas - Saídas
```

---

## 📋 RESUMO DE MUDANÇAS

### ✅ O QUE NÃO MUDA
- ✅ Trigger `trg_venda_dinheiro` (já criado e funcionando)
- ✅ Sistema de exclusão de vendas e atendimentos (já funciona)
- ✅ Tabelas do banco de dados

### 🔧 O QUE MUDA
- ❌ Lógica de cálculo em `useSaldoFinalHoje()` - REFATORAR
- ❌ Lógica de saldo em `useSaldoInicial()` - MELHORAR
- ❌ Lógica em `useMovimentacaoManual()` - REMOVER atualizações de saldo
- ❌ Lógica em `useTransferenciaCaixa()` - REMOVER atualizações de saldo
- ❌ Lógica em `useFinalizarAtendimento()` - REMOVER atualizações de saldo
- ❌ Lógica em `useExcluirVenda()` - REMOVER atualizações de saldo
- ❌ Lógica em `useDeleteAtendimento()` - REMOVER atualizações de saldo
- ❓ Hook `useResumoVendasPorCaixa()` - MANTER (usado no modal de fechamento)

---

## 🔴 PROBLEMAS ATUAIS

1. **useMovimentacaoManual()** - Atualiza `saldo_atual` manualmente (ERRADO)
2. **useTransferenciaCaixa()** - Usa RPC que provavelmente atualiza `saldo_atual` (ERRADO)
3. **useFinalizarAtendimento()** - Atualiza `saldo_atual` manualmente (ERRADO)
4. **useExcluirVenda()** - Atualiza `saldo_atual` manualmente (ERRADO)
5. **useDeleteAtendimento()** - Atualiza `saldo_atual` manualmente (ERRADO)
6. **useSaldoFinalHoje()** - Cálculo está correto, mas `saldo_atual` não é usado

---

## ✨ SOLUÇÃO IMPLEMENTADA

**Nova Abordagem:**
- ✅ `saldo_atual` é CALCULADO dinamicamente (nunca é atualizado no banco)
- ✅ Todas as transações vão para `movimentacoes_caixa`
- ✅ Trigger de vendas gera movimentações automaticamente
- ✅ Exclusões apenas deletam da `movimentacoes_caixa`
- ✅ Fechamento registra o `valor_contado` que vira saldo inicial do próximo dia

---

## 📍 ARQUIVOS A ALTERAR

### 1️⃣ **src/hooks/useCaixas.ts** - PRINCIPAL
**Funções a alterar:**
- `useMovimentacaoManual()` - Remover atualização de saldo
- `useTransferenciaCaixa()` - Verificar RPC (pode precisar ajuste)
- `useSaldoFinalHoje()` - ✅ Já está correto
- `useSaldoInicial()` - ✅ Já está correto
- `useDeleteMovimentacao()` - ✅ Já correto (não atualiza saldo)

**Linhas a remover:**
```typescript
// ANTES (linhas 425-444):
const novoSaldo = tipo === "entrada" ? caixa.saldo_atual + valor : caixa.saldo_atual - valor;
// ... update saldo_atual ...

// DEPOIS: REMOVER completamente
```

---

### 2️⃣ **src/hooks/useAtendimentos.ts**
**Função a alterar:**
- `useFinalizarAtendimento()` - Remover atualização de saldo (linhas 166-185)
- `useDeleteAtendimento()` - Remover atualização de saldo (linhas 375-385)

**Linhas a remover:**
```typescript
// Remover linhas 166-185 (atualização de saldo_atual)
const novoSaldo = caixaAvaliacao.saldo_atual - valorDinheiro;
await supabase.from("caixas").update({ saldo_atual: novoSaldo })...

// Remover linhas 375-385 (reverter saldo)
const novoSaldo = caixaAvaliacao.saldo_atual + valorDinheiro;
await supabase.from("caixas").update({ saldo_atual: novoSaldo })...
```

---

### 3️⃣ **src/hooks/useVendasHistorico.ts**
**Função a alterar:**
- `useExcluirVenda()` - Remover atualização de saldo (linhas 262-271)

**Linhas a remover:**
```typescript
// Remover linhas 262-271 (atualização de saldo_atual)
await supabase.from("caixas").update({ saldo_atual: (caixa.saldo_atual || 0) - valorDinheiro })...
```

---

### 4️⃣ **src/components/financeiro/FechamentoCaixaModal.tsx** - SEM MUDANÇAS
- ✅ Continua usando `useResumoVendasPorCaixa()` 
- ✅ Continua usando `useSaldoFinalHoje()`
- ✅ Tudo já está certo

---

### 5️⃣ **src/pages/Financeiro.tsx** - SEM MUDANÇAS
- ✅ Componente CaixaCard já usa `useSaldoFinalHoje()` corretamente

---

## 🔄 FLUXO DE OPERAÇÕES (NOVO)

### ➕ Criar Venda
```
1. Inserir em tabela vendas
   ↓
2. Trigger trg_venda_dinheiro executa:
   - Processa todos os 3 métodos de pagamento
   - Insere em movimentacoes_caixa APENAS valor dinheiro
   ↓
3. useSaldoFinalHoje() calcula:
   - Saldo Inicial (do fechamento anterior)
   - Soma movimentacoes dinheiro de hoje
   - Resultado = Saldo Final
```

### ➖ Excluir Venda
```
1. Buscar venda
   ↓
2. Deletar de vendas
   ↓
3. Deletar movimentação em movimentacoes_caixa
   ↓
4. useSaldoFinalHoje() recalcula automaticamente
```

### 💸 Fazer Pagamento (Atendimento)
```
1. Inserir em atendimentos (finalizado)
   ↓
2. Inserir em movimentacoes_caixa (tipo='pagamento_avaliacao')
   ↓
3. useSaldoFinalHoje() calcula automaticamente
```

### ➖ Excluir Pagamento (Atendimento)
```
1. Deletar de atendimentos
   ↓
2. Deletar movimentação em movimentacoes_caixa
   ↓
3. useSaldoFinalHoje() recalcula automaticamente
```

### 🔄 Fazer Transferência
```
1. Inserir em movimentacoes_caixa (origem/destino preenchidos)
   ↓
2. useSaldoFinalHoje() para cada caixa calcula:
   - Caixa Origem: -valor
   - Caixa Destino: +valor
```

---

## 📊 CASOS DE TESTE

### Teste 1: Vendas com múltiplos pagamentos
```
Venda de R$ 200:
- PIX: R$ 100
- Dinheiro: R$ 100

Resultado esperado:
- Saldo aumenta em R$ 100 (apenas dinheiro)
- Movimentação registra R$ 100
```

### Teste 2: Exclusão de venda
```
Venda anterior criada (saldo +R$ 100)
Exclui a venda

Resultado esperado:
- Saldo diminui em R$ 100
- Movimentação deletada
```

### Teste 3: Fechamento e novo dia
```
Dia 1: Saldo Final = R$ 500 (valor_contado = R$ 500)
Dia 2: Saldo Inicial deve ser R$ 500
```

---

## ⚠️ PONTOS CRÍTICOS

1. **Trigger trg_venda_dinheiro** - NÃO MEXER
2. **Campo saldo_atual** - NUNCA é atualizado no banco (só lido)
3. **Transações** - IMPORTANTE: operações devem ser atômicas no banco
4. **Testes** - Executar todos os 3 testes antes de finalizar

---

## 📝 CHECKLIST DE EXECUÇÃO

- [ ] Remover linha 425-444 de `useCaixas.ts` (useMovimentacaoManual)
- [ ] Remover linha 166-185 de `useAtendimentos.ts` (useFinalizarAtendimento)
- [ ] Remover linha 375-385 de `useAtendimentos.ts` (useDeleteAtendimento)
- [ ] Remover linha 262-271 de `useVendasHistorico.ts` (useExcluirVenda)
- [ ] Validar que `useSaldoFinalHoje()` está correto em `useCaixas.ts`
- [ ] Validar que `useSaldoInicial()` está correto em `useCaixas.ts`
- [ ] Testar: Criar venda com múltiplos pagamentos
- [ ] Testar: Excluir venda
- [ ] Testar: Fazer fechamento
- [ ] Testar: Verificar saldo do próximo dia

---

## 🎯 ORDEM DE EXECUÇÃO RECOMENDADA

1. **Primeira** - Remover atualizações em `useCaixas.ts` (useMovimentacaoManual)
2. **Segunda** - Remover atualizações em `useAtendimentos.ts`
3. **Terceira** - Remover atualizações em `useVendasHistorico.ts`
4. **Quarta** - Validar toda a lógica
5. **Quinta** - Testar completo

---

**PRÓXIMA ETAPA:** Você confirma este plano e podemos começar a implementação!
