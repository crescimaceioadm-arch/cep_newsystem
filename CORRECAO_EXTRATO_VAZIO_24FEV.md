# Correção: Extrato Vazio + Logs de Debug
**Data:** 24 de Fevereiro de 2026  
**Problema:** Pagamentos de avaliação em dinheiro não apareciam no extrato

---

## 🐛 Problema Identificado

### Sintoma
- Pagamentos em dinheiro eram **abatidos do saldo** ✅
- Mas **NÃO apareciam no extrato** ❌
- Cadastros duplicados ocasionalmente

### Causa Raiz
O sistema tinha **duas queries diferentes** para buscar movimentações:

1. **`useMovimentacoesCaixa()`** - Sem filtro de data
   - Buscava últimas **20 movimentações GLOBAIS** (de todos os caixas)
   - Depois filtrava por nome do caixa
   - **PROBLEMA:** Se houvessem mais de 20 movimentações em outros caixas desde a última do caixa de Avaliação, ela não aparecia!

2. **`useMovimentacoesDinheiro(caixaId, dataInicio, dataFim)`** - Com filtro de data
   - Filtrava corretamente por caixa_id
   - Funcionava perfeitamente ✅

### Por que o saldo estava correto?
O cálculo do saldo sempre usava `useMovimentacoesDinheiro()` com a data de hoje, então funcionava. Mas o extrato sem filtro usava a outra query problemática.

---

## ✅ Solução Implementada

### 1. Filtro de Data Padrão
**Arquivo:** `src/pages/Financeiro.tsx` (linhas 275-276)

**ANTES:**
```typescript
const [dataInicio, setDataInicio] = useState<string>("");
const [dataFim, setDataFim] = useState<string>("");
```

**DEPOIS:**
```typescript
const [dataInicio, setDataInicio] = useState<string>(getDateBrasilia());
const [dataFim, setDataFim] = useState<string>(getDateBrasilia());
```

**Efeito:** Agora o extrato SEMPRE usa filtro de data (hoje por padrão), garantindo que todas as movimentações do caixa sejam exibidas.

---

## 🔍 Logs de Debug Adicionados

### 2. Logs no Pagamento de Avaliação
**Arquivo:** `src/hooks/useAtendimentos.ts` - Função `useFinalizarAtendimento()`

**Logs adicionados:**
- ✅ Início da finalização com payload completo
- ✅ Detecção de pagamentos em dinheiro
- ✅ Verificação do status do caixa Avaliação
- ✅ Busca do caixa no banco
- ✅ Criação da movimentação com todos os campos
- ✅ Confirmação de sucesso ou erro detalhado
- ✅ Invalidação de queries

**Identificação:** Todos os logs começam com `🔍 [DEBUG PAGAMENTO]`

### 3. Logs no Cadastro de Atendimento
**Arquivos:**
- `src/components/recepcao/NovoAtendimentoModal.tsx` - Componente do formulário
- `src/hooks/useAtendimentos.ts` - Função `useCreateAtendimento()`

**Logs adicionados:**
- ✅ Detecção de submissão do formulário
- ✅ Verificação de estado isPending (previne double-submit)
- ✅ Rastreamento da mutation
- ✅ Confirmação de sucesso ou erro

**Identificação:** 
- `🔍 [DEBUG CADASTRO]` - No componente
- `🔍 [DEBUG CRIAR ATENDIMENTO]` - No hook

### 4. Proteção contra Double-Submit
Adicionada verificação extra no formulário de cadastro:
```typescript
// Prevenir múltiplas submissões
if (createAtendimento.isPending) {
  console.log("⚠️ [DEBUG CADASTRO] Já está processando - abortando");
  return;
}
```

---

## 📋 Como Testar

### Teste 1: Extrato Funcionando
1. Abra a página Financeiro
2. Verifique que os campos de data inicial e final **já estão preenchidos com hoje**
3. Faça um pagamento de avaliação em dinheiro
4. Verifique que aparece **tanto no saldo quanto no extrato**

### Teste 2: Logs de Pagamento
1. Abra o console do navegador (F12)
2. Finalize um atendimento com pagamento em dinheiro
3. Procure por logs que começam com `🔍 [DEBUG PAGAMENTO]`
4. Verifique se a movimentação foi criada com sucesso

### Teste 3: Logs de Cadastro
1. Abra o console do navegador (F12)
2. Crie um novo atendimento
3. Procure por logs que começam com `🔍 [DEBUG CADASTRO]`
4. Verifique se não há chamadas duplicadas

### Teste 4: Duplicação Resolvida
1. Cadastre novos atendimentos
2. Verifique no histórico que não há duplicatas
3. Se houver, os logs indicarão quantas vezes o formulário foi submetido

---

## 🔧 Manutenção Futura

### Se o extrato voltar a ficar vazio:
1. Abra o console (F12)
2. Procure pelos logs `🔍 [MOVIMENTAÇÕES]` e `📦 DADOS BRUTOS`
3. Verifique se a query está retornando dados
4. Compare com os logs `🔍 [DEBUG PAGAMENTO]` para ver se a movimentação foi criada

### Se houver duplicação de cadastros:
1. Verifique os logs `🔍 [DEBUG CADASTRO]` e `🔍 [DEBUG CRIAR ATENDIMENTO]`
2. Conte quantas vezes aparecem para o mesmo cadastro
3. Isso indicará se é problema de double-submit no frontend ou trigger no banco

---

## 📊 Arquivos Modificados

1. ✅ `src/pages/Financeiro.tsx` - Filtro padrão de data
2. ✅ `src/hooks/useAtendimentos.ts` - Logs de pagamento e cadastro
3. ✅ `src/components/recepcao/NovoAtendimentoModal.tsx` - Logs e proteção contra double-submit

---

## ⚠️ Observações Importantes

- Os logs são **temporários** para diagnóstico. Se quiser remover depois que o sistema estabilizar, basta procurar por `[DEBUG` no código.
- O filtro de data padrão é **permanente** e deve ser mantido.
- A proteção contra double-submit é **permanente** e deve ser mantida.

---

**Próximos Passos:**
Teste o sistema e me envie os logs caso ainda encontre problemas! 🔍
