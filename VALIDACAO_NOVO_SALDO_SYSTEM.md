## 🧪 Checklist de Validação - Sistema Novo de Saldo

### O Que Mudou

**Antes (ERRADO):**
- Cada operação (movimentação, venda, pagamento) atualizava `saldo_atual` diretamente no banco
- Múltiplas fontes de verdade criavam inconsistências
- Um erro em uma função quebrava todo o saldo

**Agora (CORRETO):**
- `saldo_atual` → `saldo_seed_caixas` (apenas seed value)
- Saldo é CALCULADO dinamicamente via React Query
- Triggers do banco TAMBÉM atualizam `saldo_seed_caixas` como backup de segurança
- Tudo recalculates via `useSaldoFinalHoje()`

---

### 📋 Fluxo de Validação

#### 1️⃣ Criar uma Movimentação Manual (ENTRADA)

**Ação:**
```
Financeiro → Extrato → Criar ENTRADA manualmente
Caixa: "Caixa 1"
Tipo: ENTRADA
Valor: R$ 100.00
Motivo: "Teste validação"
```

**O Que Verificar:**
```
✅ Console log deve mostrar:
   [CREATE] ENTRADA criada - Caixa 1 - R$ 100.00
   Queries invalidadas, useSaldoFinalHoje() vai refazer o cálculo
   
✅ React Query refaz a busca em movimentacoes_dinheiro
   [MOVIMENTAÇÕES] Iniciando busca...
   
✅ useSaldoFinalHoje() recalcula:
   [SALDO FINAL HOJE] Calculando para caixa: [id]
   ➕ Entrada Manual: 100
   Fórmula: saldo_inicial + 100 - 0 = novo_saldo
   
✅ Extrato atualiza mostrando a ENTRADA no cálculo
```

---

#### 2️⃣ Editar a Movimentação (Mudar para R$ 150.00)

**Ação:**
```
Financeiro → Extrato → Editar Movimentação
Novo Valor: R$ 150.00
```

**O Que Verificar:**
```
✅ Console log:
   [EDIT] Queries invalidadas, useSaldoFinalHoje() vai recalcular
   
✅ useSaldoFinalHoje() recalcula:
   [SALDO FINAL HOJE] Calculando para caixa: [id]
   ➕ Entrada Manual: 150  ← NOVO valor
   Fórmula: saldo_inicial + 150 - 0 = novo_saldo
   
✅ Extrato mostra novo valor (R$ 150.00) na movimentação
✅ Saldo final foi atualizado automaticamente
```

---

#### 3️⃣ Deletar a Movimentação

**Ação:**
```
Financeiro → Extrato → Deletar Movimentação
```

**O Que Verificar:**
```
✅ Console log:
   [EXCLUDE] Queries invalidadas, useSaldoFinalHoje() vai recalcular
   
✅ useSaldoFinalHoje() recalcula:
   [SALDO FINAL HOJE] Calculando para caixa: [id]
   📊 Movimentações: [número MENOR que antes]
   Fórmula: saldo_inicial + 0 - 0 = [valor sem a movimentação]
   
✅ Movimentação desaparece do extrato
✅ Saldo volta ao que era antes
```

---

#### 4️⃣ Testar Outro Tipo de Movimentação (VENDA)

**Quando uma venda é registrada em dinheiro:**
```
Recepcao → Finalizar Atendimento → Pagamento em DINHEIRO
```

**O Que Verificar:**
```
✅ useFinalizarAtendimento cria movimentacao_caixa com:
   tipo: 'venda'
   caixa_destino_id: "Caixa 1" (ou o caixa selecionado)
   valor: [valor da venda]
   
✅ useSaldoFinalHoje() processa:
   if (tipo === 'venda' && destinoId === caixaId) {
     totalEntradas += mov.valor;
     console.log("➕ Venda:", mov.valor);
   }
   
✅ Extrato mostra a venda como ENTRADA
✅ Saldo final inclui a venda
```

---

#### 5️⃣ Testar Transferência Entre Caixas

**Quando transfere dinheiro de um caixa para outro:**
```
Financeiro → Transferência
De: "Caixa 1"
Para: "Caixa 2"
Valor: R$ 50.00
```

**O Que Verificar:**
```
✅ Caixa 1 (origem):
   Console: ➖ Transferência Enviada: 50
   useSaldoFinalHoje() subtrai 50 (totalSaidas += 50)
   Saldo final DIMINUI

✅ Caixa 2 (destino):
   Console: ➕ Transferência Recebida: 50  
   useSaldoFinalHoje() adiciona 50 (totalEntradas += 50)
   Saldo final AUMENTA
```

---

### 🚨 Problemas a Procurar

#### ❌ Problema 1: Saldo não Atualiza Depois de Criar Movimentação
**Causa Provável:** `invalidateQueries` não está funcionando
**Teste:** Abra DevTools → Console
```
você deve ver:
[CREATE] ENTRADA criada...
Queries invalidadas...
```
Se não ver, há um problema em `useMovimentacaoManual()`.

#### ❌ Problema 2: Saldo Mostra Valor Errado
**Causa Provável:** `useSaldoFinalHoje()` não está processando um tipo
**Teste:** Abra DevTools → Console e veja:
```
[SALDO FINAL HOJE] Calculando...
Total Entradas: ???
Total Saídas: ???
Fórmula: ??? + ??? - ??? = ???
```
Se algum tipo está faltando, adicione seu processamento em `useSaldoFinalHoje()`.

#### ❌ Problema 3: Saldo Inicial é ZERO Sempre
**Causa Provável:** Nenhum `fechamento_caixa` foi criado
**Teste:** 
```
Financeiro → Selecionar Caixa → Ver console:
[SALDO INICIAL] Fechamento aprovado anterior encontrado...
ou
❌ Nenhum fechamento encontrado!
```
Se nenhum foi encontrado, o caixa precisa de um fechamento inicial.

---

### ✅ Validação Final

Se você conseguir fazer isso SEM bugs:

```
1. ✅ Criar ENTRADA → saldo aumenta
2. ✅ Editar ENTRADA → saldo recalcula
3. ✅ Deletar ENTRADA → saldo volta
4. ✅ Registrar VENDA → caixa Avaliação aumenta? Extrato mostra?
5. ✅ Transferência entre caixas → origem diminui, destino aumenta?
6. ✅ Pagamento de avaliação → caixa Avaliação diminui?
```

Então o sistema está **100% correto**!

---

### 📊 Banco de Dados - Próximo Passo

**Execute a migração no Supabase:**
```sql
-- Arquivo: supabase/20260218_remove_saldo_atual_logic.sql
-- Isso vai:
-- 1. Renomear saldo_atual → saldo_seed_caixas
-- 2. MANTER triggers como backup de segurança
-- 3. Docum
entar nova arquitetura
```

Depois disso, o sistema está pronto para produção.
