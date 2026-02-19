# Correção: Saldo Duplicado no Extrato

**Data:** 19/02/2026  
**Problema:** Extrato mostrando valores diferentes dos cards (R$ 3480 vs R$ 1880)

---

## 🔍 Causa Raiz Identificada

O botão **"Ajustar Saldo"** estava criando MOVIMENTAÇÕES ao invés de FECHAMENTOS:

```typescript
// ❌ CÓDIGO ANTIGO (INCORRETO)
await supabase
  .from("movimentacoes_caixa")  // ← ERRADO!
  .insert({
    tipo: "entrada",
    valor: 1600,
    motivo: "Ajuste manual de saldo feito pelo admin"
  });
```

### Por que isso causa duplicação?

1. **Movimentação criada:** entrada de R$ 1600 no dia 18/02
2. **Saldo calculado:** R$ 1600 é somado nas movimentações
3. **Fechamento criado:** Depois foi criado fechamento com valor_contado = 1600
4. **Resultado:** O extrato conta os R$ 1600 DUAS VEZES:
   - Uma vez como saldo_inicial (do fechamento de 17/02)
   - Outra vez como movimentação de entrada (dia 18/02)

---

## ✅ Correção Aplicada

### 1. Código Corrigido

**Arquivo:** [src/hooks/useCaixas.ts](src/hooks/useCaixas.ts#L1138)

```typescript
// ✅ CÓDIGO NOVO (CORRETO)
// Criar FECHAMENTO ao invés de movimentação
const ontem = new Date();
ontem.setDate(ontem.getDate() - 1);

await supabase
  .from("fechamentos_caixa")  // ← CORRETO!
  .insert({
    caixa_id: caixaId,
    data_fechamento: ontem,
    valor_contado: saldoDesejado,
    status: "aprovado"
  });
```

**Mudança:** Agora "Ajustar Saldo" cria um fechamento de ONTEM com o valor desejado.

---

### 2. Scripts SQL Criados

Execute na ordem:

#### **1º - Limpar ajustes incorretos:**
```bash
# supabase/20260219_limpar_ajustes_incorretos.sql
```
- Deleta TODAS movimentações criadas por "Ajuste manual"
- Evita futuras duplicações

#### **2º - Criar fechamento correto:**
```bash
# supabase/20260219_fix_duplicacao_entrada_1600.sql
```
- Deleta especificamente a entrada de R$ 1600
- Cria/atualiza fechamento de 17/02 com valor correto

---

## 🎯 Resultado Esperado

Após executar os scripts + atualizar página:

### Cards (Financeiro)
```
┌─────────────────────┐
│ Caixa Avaliação    │
│                     │
│   R$ 2050.00       │  ✅ Correto
│                     │
│ Saldo Final Hoje    │
└─────────────────────┘
```

### Extrato (18/02 a 19/02)
```
📊 SALDO INICIAL:          R$ 1600.00  ← Do fechamento de 17/02
───────────────────────────────────────
Venda #123                 +R$ 100.00
Pagamento Avaliação        -R$ 50.00
... (outras movimentações)
───────────────────────────────────────
💰 SALDO FINAL:            R$ 2050.00  ✅ Igual ao card!
```

---

## 📋 Passos para Aplicar

1. **Execute SQL 1:**
   ```sql
   -- No Supabase Dashboard > SQL Editor
   -- Cole e execute: supabase/20260219_limpar_ajustes_incorretos.sql
   ```

2. **Verifique resultado:**
   - Deve mostrar quantas movimentações foram deletadas
   - Total restante deve ser 0

3. **Execute SQL 2:**
   ```sql
   -- Cole e execute: supabase/20260219_fix_duplicacao_entrada_1600.sql
   ```

4. **Atualize a página:**
   - Faça logout/login OU
   - Apenas recarregue (Ctrl+R)

5. **Confirme:**
   - Extrato e Card devem mostrar mesmo valor
   - Console sem erros (F12)

---

## 🛡️ Prevenção Futura

**Mudanças no código garantem que:**
- ✅ "Ajustar Saldo" nunca mais cria movimentações
- ✅ Sempre cria fechamentos (source of truth)
- ✅ Sem possibilidade de duplicação

**Estrutura correta:**
```
fechamentos_caixa (source of truth)
  ↓
saldo_inicial (calculado de fechamento)
  ↓
+ movimentacoes_caixa (vendas, pagamentos, etc)
  ↓
= saldo_final
```

---

## 📊 Validação

Execute no SQL Editor para confirmar:

```sql
-- Verificar fechamentos
SELECT 
  c.nome AS caixa,
  f.data_fechamento::date,
  f.valor_contado,
  f.status
FROM fechamentos_caixa f
JOIN caixas c ON c.id = f.caixa_id
WHERE c.nome = 'Avaliação'
  AND f.data_fechamento >= '2026-02-14'
ORDER BY f.data_fechamento DESC;

-- Verificar se NÃO há mais ajustes
SELECT COUNT(*) AS total_ajustes_restantes
FROM movimentacoes_caixa
WHERE motivo LIKE '%Ajuste manual%';
-- Deve retornar: 0
```

---

## 🎓 Aprendizado

**Ajuste de Saldo ≠ Movimentação**

- **Movimentação:** Representa uma ação real (venda, pagamento, transferência)
- **Fechamento:** Representa um estado validado (contagem física, auditoria)

**Quando ajustar saldo:**
- ❌ NÃO criar movimentação fictícia
- ✅ Criar fechamento com valor correto
- ✅ Isso se torna o saldo_inicial do próximo dia
