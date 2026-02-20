# Problema: Erro "column saldo_atual does not exist" ao Finalizar Vendas

**Data:** 19/02/2026  
**Erro:** `column "saldo_atual" does not exist` (código 42703)  
**Quando ocorre:** Ao tentar finalizar uma venda com pagamento em dinheiro

---

## 🔴 O QUE ESTÁ ACONTECENDO AGORA

Quando você tenta finalizar uma venda em dinheiro:

```
1. Frontend: Clica "Finalizar Venda"
   ↓
2. TypeScript: Chama useFinalizarVenda()
   ↓
3. INSERT em vendas é enviado ao Supabase
   ↓
4. ❌ ERRO 400: column "saldo_atual" does not exist
   ↓
5. Venda NÃO é criada
   ↓
6. Toast: "Erro ao finalizar venda: column saldo_atual does not exist"
```

---

## 🔍 A CAUSA RAIZ

### O que mudou em 18/02:

No banco de dados, a coluna foi **renomeada**:
```sql
ALTER TABLE caixas RENAME COLUMN saldo_atual TO saldo_seed_caixas;
```

Isso significava: **`saldo_atual` não existe mais no banco!**

### O que NÃO foi atualizado:

Mas no banco ainda existem **FUNÇÕES E TRIGGERS** que tentam usar `saldo_atual`:

```sql
-- Função 1: fn_registrar_venda_dinheiro()
UPDATE caixas SET saldo_atual = saldo_atual + NEW.valor_pagto_1  ❌

-- Função 2: corrigir_caixa_venda()
UPDATE caixas SET saldo_atual = saldo_atual - OLD.valor_pagto_1  ❌

-- Função 3: atualizar_caixa_pagamento()
UPDATE caixas SET saldo_atual = saldo_atual - NEW.pagamento_1_valor  ❌

-- Função 4: realizar_transferencia_caixa()
UPDATE caixas SET saldo_atual = saldo_atual - p_valor  ❌
UPDATE caixas SET saldo_atual = saldo_atual + p_valor  ❌
```

---

## 🎯 FLUXO DO ERRO (Por que venda falha)

```
VOCÊ: Clica "Finalizar Venda" com DINHEIRO
            ↓
TypeScript (src/hooks/useVendas.ts)
  INSERT INTO vendas (...)  ← Enviado para Supabase
            ↓
PostgreSQL no Supabase
  ANTES de aplicar o INSERT, verifica se há triggers
            ↓
ENCONTRA: trigger trg_venda_dinheiro
  (automático, criado em 27/01)
            ↓
EXECUTA: função fn_registrar_venda_dinheiro()
            ↓
TENTA: UPDATE caixas SET saldo_atual = ...
            ↓
❌ FALHA: coluna "saldo_atual" não existe!
            ↓
TRANSAÇÃO TODA É CANCELADA (rollback)
            ↓
Erro retorna ao TypeScript
            ↓
VOCÊ vê: "Erro ao finalizar venda: column saldo_atual does not exist"
```

---

## 📊 AS 4 FUNÇÕES COM ERRO

| Função | Tabela Trigger | Evento | Linha do Erro |
|--------|---|---|---|
| `fn_registrar_venda_dinheiro()` | vendas | INSERT | `UPDATE caixas SET saldo_atual = saldo_atual + ...` |
| `corrigir_caixa_venda()` | vendas | DELETE | `UPDATE caixas SET saldo_atual = saldo_atual - ...` |
| `corrigir_caixa_venda()` | vendas | UPDATE | `UPDATE caixas SET saldo_atual = saldo_atual + ...` |
| `atualizar_caixa_pagamento()` | atendimentos | UPDATE | `UPDATE caixas SET saldo_atual = saldo_atual - ...` |
| `realizar_transferencia_caixa()` | (RPC) | N/A | `UPDATE caixas SET saldo_atual = ...` (2 linhas) |

---

## 🗓️ HISTÓRICO: Como chegamos até aqui

### 27/01/2026
Arquivo criado: `supabase/20260127_fix_saldo_movimentacoes.sql`

Criou 5 funções que atualizam direto coluna `saldo_atual`:
- `fn_registrar_venda_dinheiro()`
- `corrigir_caixa_venda()`
- `atualizar_caixa_pagamento()`
- `realizar_transferencia_caixa()`

E 3 triggers:
- `trg_venda_dinheiro` (INSERT em vendas)
- `trg_correcao_venda` (DELETE em vendas)
- `trg_correcao_venda` (UPDATE em vendas)

---

### 18/02/2026
Mudança no design:

1. **Frontend corrigido:** `src/hooks/useVendas.ts`
   - Parou de tentar atualizar `saldo_atual` manualmente
   - Passou a usar `registrarMovimentacaoCaixa()` (só registra movimento)

2. **Banco de dados corrigido:** Coluna renomeada
   ```sql
   ALTER TABLE caixas RENAME COLUMN saldo_atual TO saldo_seed_caixas;
   ```
   - Razão: `saldo_atual` era atualizado erroneamente por múltiplas transações
   - Nova abordagem: Saldo é **calculado dinamicamente** via `useSaldoFinalHoje()`
   - Fórmula: `saldo_inicial + entradas - saidas`

**MAS:** As funções e triggers ANTIGOS do banco nunca foram removidas/atualizadas!

---

### 19/02/2026 (HOJE)
Problema aparece:

Quando você tenta finalizar venda em dinheiro:
- Frontend tenta inserir em vendas
- Trigger automático tenta executar função antiga
- Função antiga tenta atualizar `saldo_atual` (que não existe)
- ERRO 42703

---

## ❌ O PROBLEMA ESTRUTURAL

**Inconsistência entre camadas:**

| Camada | Status | Saldo é calculado? |
|--------|--------|---|
| **Frontend (TypeScript)** | ✅ Atualizado em 18/02 | SIM - via `useSaldoFinalHoje()` |
| **Backend (Supabase)** | ❌ NÃO foi atualizado | NÃO - tenta UPDATE em coluna que não existe |
| **Banco de dados** | ✅ Coluna renomeada em 18/02 | SIM - dinâmico |

---

## 🔍 DIAGNÓSTICO: O QUE ENCONTRAMOS

Executando queries no Supabase, encontramos:

**Query: Procurar por "saldo_atual" em todas as funções**
```
✅ ENCONTRADO:
- atualizar_caixa_pagamento() - tenta UPDATE saldo_atual
- atualizar_caixa_venda() - tenta UPDATE saldo_atual
- corrigir_caixa_venda() - tenta UPDATE saldo_atual (2 linhas)
- fn_registrar_venda_dinheiro() - tenta UPDATE saldo_atual
- realizar_transferencia_caixa() - tenta UPDATE saldo_atual (2 linhas)
```

**Query: Procurar por triggers na tabela vendas**
```
✅ ENCONTRADO:
- trg_correcao_venda (DELETE) → executa corrigir_caixa_venda()
- trg_correcao_venda (UPDATE) → executa corrigir_caixa_venda()
- trg_venda_dinheiro (INSERT) → executa fn_registrar_venda_dinheiro()
```

---

## 📝 O QUE PRECISA SER FEITO

Para corrigir, é necessário:

1. **Remover os triggers antigos** da tabela vendas (3 triggers)
2. **Remover as funções antigos** que usam `saldo_atual` (5 funções)
3. **Recriar as funções** SEM incluir `UPDATE caixas SET saldo_atual`
4. **Recriar os triggers** apontando para as funções corrigidas

Assim:
- Movimentações continuarão sendo registradas (importantes!)
- MAS sem tentar atualizar coluna que não existe
- Saldo será calculado dinamicamente (como deveria ser)

---

## ⚠️ IMPACTO

**Funcionalidades afetadas pela função**

| Funcionalidade | Função Afetada | Pode Usar? |
|---|---|---|
| Finalizar venda em dinheiro | `fn_registrar_venda_dinheiro()` | ❌ Falha com erro 42703 |
| Deletar/editar venda | `corrigir_caixa_venda()` | ❌ Falha com erro 42703 |
| Finalizar atendimento (pagamento) | `atualizar_caixa_pagamento()` | ❌ Falha com erro 42703 |
| Transferência entre caixas (RPC) | `realizar_transferencia_caixa()` | ❌ Falha com erro 42703 |

---

## 📚 Documentação Relacionada

| Arquivo | O que Explica |
|---|---|
| [LOGICA_FLUXO_CAIXA.md](LOGICA_FLUXO_CAIXA.md) | Toda o sistema de cálculo de saldo (completo) |
| [CORRECAO_DUPLICACAO_SALDO.md](CORRECAO_DUPLICACAO_SALDO.md) | Problema separado: saldo duplicado (R$ 1600) |

---

## 🔗 Referência das Funções/Triggers

**Arquivo original (criou o problema):**
- `supabase/20260127_fix_saldo_movimentacoes.sql`

**Investigação (como encontramos):**
- `supabase/20260219_DIAGNOSTICO_PROFUNDO.sql`
- `supabase/20260219_VER_triggers.sql`

**Scripts que tentaram corrigir (não funcionaram):**
- `supabase/20260219_FIX_TODAS_FUNCOES.sql`
- `supabase/20260219_HOTFIX_FINAL_SAFE.sql`
- `supabase/20260219_LIMPAR_triggers.sql`
