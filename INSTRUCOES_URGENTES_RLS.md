# 🚨 INSTRUÇÕES URGENTES - RESOLVER ERRO RLS

## O PROBLEMA:
O Supabase está bloqueando o INSERT na tabela `marketing_items` porque as políticas RLS não estão configuradas.

## SOLUÇÃO RÁPIDA (5 MINUTOS):

### PASSO 1: Acessar Supabase
1. Vá em: https://supabase.com/dashboard
2. Selecione seu projeto
3. Menu lateral → **SQL Editor**

### PASSO 2: Executar Script
1. Clique em **+ New Query**
2. Cole TODO o conteúdo do arquivo: `supabase/migrations/20251229_marketing_items_rls.sql`
3. Clique no botão verde **Run** (ou Ctrl+Enter)

### PASSO 3: Verificar
1. Volte para seu app
2. Tente salvar um item novamente
3. Deve funcionar! ✅

---

## ALTERNATIVA MANUAL (Se SQL Editor não funcionar):

### Via Interface do Supabase:

1. **Table Editor** → Tabela `marketing_items`
2. Aba **RLS** (Row Level Security)
3. Clique em **Add Policy**
4. Crie 4 políticas:

**Política 1 - SELECT:**
- Name: `allow_select`
- Policy definition: `true`
- Target roles: `authenticated`

**Política 2 - INSERT:**
- Name: `allow_insert`
- Policy definition: `true`
- Target roles: `authenticated`

**Política 3 - UPDATE:**
- Name: `allow_update`
- Policy definition: `true`
- Target roles: `authenticated`

**Política 4 - DELETE:**
- Name: `allow_delete`
- Policy definition: `true`
- Target roles: `authenticated`

---

## SE NADA FUNCIONAR:
Me avise e vou criar uma solução via API do Supabase direto do código.
