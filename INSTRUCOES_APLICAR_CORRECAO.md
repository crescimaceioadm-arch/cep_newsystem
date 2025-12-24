# 🔧 CORREÇÃO: Registro de Vendas em Dinheiro

## 📋 Problema Identificado

As vendas **não estavam sendo registradas** na tabela `movimentacoes_caixa` quando o dinheiro não era o primeiro método de pagamento.

### Exemplo do Bug:
```
Venda de R$ 200:
- Pagamento 1: PIX de R$ 100
- Pagamento 2: Dinheiro de R$ 100
```
❌ **Resultado anterior**: Nenhum registro em `movimentacoes_caixa`  
✅ **Resultado correto**: R$ 100 em dinheiro registrado

---

## 🛠️ Solução Implementada

Criado um **trigger no banco de dados** que:

1. ✅ Processa **todos os 3 métodos de pagamento**
2. ✅ Soma o valor total em dinheiro
3. ✅ Registra automaticamente em `movimentacoes_caixa`
4. ✅ Atualiza o `saldo_atual` do caixa

---

## 📦 Arquivos Criados

- `supabase/migrations/20241223_fix_venda_dinheiro_trigger.sql`

---

## 🚀 Como Aplicar

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)
4. Abra o arquivo `supabase/migrations/20241223_fix_venda_dinheiro_trigger.sql`
5. Copie todo o conteúdo
6. Cole no SQL Editor
7. Clique em **RUN**

### Opção 2: Via Supabase CLI

```bash
# Se você tem o Supabase CLI instalado
supabase db push

# Ou execute diretamente:
supabase db execute -f supabase/migrations/20241223_fix_venda_dinheiro_trigger.sql
```

---

## 🧪 Como Testar

### Teste 1: Dinheiro como 2º método
```sql
INSERT INTO vendas (
  caixa_origem, valor_total_venda, qtd_total_itens,
  metodo_pagto_1, valor_pagto_1,
  metodo_pagto_2, valor_pagto_2
) VALUES (
  'Caixa 1', 200, 5,
  'PIX', 100,
  'Dinheiro', 100
);

-- Verificar resultado:
SELECT * FROM movimentacoes_caixa 
WHERE tipo = 'venda' 
ORDER BY data_hora DESC 
LIMIT 1;

-- Deve mostrar: valor = 100
```

### Teste 2: Dinheiro como 3º método
```sql
INSERT INTO vendas (
  caixa_origem, valor_total_venda, qtd_total_itens,
  metodo_pagto_1, valor_pagto_1,
  metodo_pagto_2, valor_pagto_2,
  metodo_pagto_3, valor_pagto_3
) VALUES (
  'Caixa 1', 300, 8,
  'PIX', 100,
  'Crédito', 150,
  'Dinheiro', 50
);

-- Verificar resultado:
SELECT * FROM movimentacoes_caixa 
WHERE tipo = 'venda' 
ORDER BY data_hora DESC 
LIMIT 1;

-- Deve mostrar: valor = 50
```

### Teste 3: Múltiplos pagamentos em dinheiro
```sql
INSERT INTO vendas (
  caixa_origem, valor_total_venda, qtd_total_itens,
  metodo_pagto_1, valor_pagto_1,
  metodo_pagto_2, valor_pagto_2
) VALUES (
  'Caixa 1', 150, 3,
  'Dinheiro', 100,
  'Dinheiro', 50
);

-- Verificar resultado:
SELECT * FROM movimentacoes_caixa 
WHERE tipo = 'venda' 
ORDER BY data_hora DESC 
LIMIT 1;

-- Deve mostrar: valor = 150 (soma dos dois)
```

---

## ✅ Verificações Pós-Aplicação

Execute essas queries para confirmar que está funcionando:

```sql
-- 1. Verificar se a função foi criada
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'fn_registrar_venda_dinheiro';

-- 2. Verificar se o trigger foi criado
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger 
WHERE tgname = 'trg_venda_dinheiro';

-- 3. Verificar vendas em dinheiro de hoje
SELECT 
  v.id,
  v.created_at,
  v.caixa_origem,
  v.metodo_pagto_1,
  v.valor_pagto_1,
  v.metodo_pagto_2,
  v.valor_pagto_2,
  v.metodo_pagto_3,
  v.valor_pagto_3,
  m.valor as valor_registrado
FROM vendas v
LEFT JOIN movimentacoes_caixa m ON m.motivo = 'Venda #' || v.id
WHERE v.created_at::date = CURRENT_DATE
ORDER BY v.created_at DESC;
```

---

## 🔍 Logs e Debugging

O trigger gera logs no banco que podem ser visualizados:

```sql
-- Ver logs recentes (PostgreSQL)
SELECT * FROM pg_stat_activity 
WHERE application_name = 'your_app_name';
```

No console do navegador (JavaScript), você verá:
```
[useFinalizarVenda] ✅ Trigger do banco cuidará da movimentação de caixa
```

---

## ⚠️ Importante

- ✅ O trigger é **automático** - não precisa alterar o código JavaScript
- ✅ Funciona para **vendas novas** após aplicar a migration
- ⚠️ Vendas antigas **não serão corrigidas automaticamente**

---

## 🔄 Corrigir Vendas Antigas (Opcional)

Se precisar corrigir vendas antigas que não foram registradas:

```sql
-- SCRIPT DE CORREÇÃO (USE COM CUIDADO!)
-- Execute apenas se houver vendas antigas sem registro

DO $$
DECLARE
  v_venda RECORD;
  v_caixa_id UUID;
  v_total_dinheiro NUMERIC;
BEGIN
  -- Para cada venda com dinheiro que não tem movimentação
  FOR v_venda IN
    SELECT v.* FROM vendas v
    LEFT JOIN movimentacoes_caixa m ON m.motivo = 'Venda #' || v.id
    WHERE m.id IS NULL
    AND (
      LOWER(v.metodo_pagto_1) = 'dinheiro' OR
      LOWER(v.metodo_pagto_2) = 'dinheiro' OR
      LOWER(v.metodo_pagto_3) = 'dinheiro'
    )
  LOOP
    -- Calcular total em dinheiro
    v_total_dinheiro := 0;
    
    IF LOWER(TRIM(v_venda.metodo_pagto_1)) = 'dinheiro' THEN
      v_total_dinheiro := v_total_dinheiro + COALESCE(v_venda.valor_pagto_1, 0);
    END IF;
    
    IF LOWER(TRIM(v_venda.metodo_pagto_2)) = 'dinheiro' THEN
      v_total_dinheiro := v_total_dinheiro + COALESCE(v_venda.valor_pagto_2, 0);
    END IF;
    
    IF LOWER(TRIM(v_venda.metodo_pagto_3)) = 'dinheiro' THEN
      v_total_dinheiro := v_total_dinheiro + COALESCE(v_venda.valor_pagto_3, 0);
    END IF;
    
    IF v_total_dinheiro > 0 THEN
      -- Buscar caixa
      SELECT id INTO v_caixa_id
      FROM caixas
      WHERE nome = v_venda.caixa_origem;
      
      IF v_caixa_id IS NOT NULL THEN
        -- Inserir movimentação
        INSERT INTO movimentacoes_caixa (
          caixa_destino_id,
          tipo,
          valor,
          motivo,
          data_hora
        ) VALUES (
          v_caixa_id,
          'venda',
          v_total_dinheiro,
          'Venda #' || v_venda.id,
          v_venda.created_at
        );
        
        -- Atualizar saldo
        UPDATE caixas
        SET saldo_atual = saldo_atual + v_total_dinheiro
        WHERE id = v_caixa_id;
        
        RAISE NOTICE 'Corrigida venda %: R$%', v_venda.id, v_total_dinheiro;
      END IF;
    END IF;
  END LOOP;
END $$;
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do Supabase
2. Confirme que o trigger foi criado
3. Teste com uma venda simples primeiro
4. Verifique se os nomes dos caixas estão corretos

---

**Data da correção**: 23/12/2024  
**Versão da migration**: 20241223
