-- =====================================================================
-- DIAGNÓSTICO RÁPIDO: Caixa 1 - 09/01/2026
-- =====================================================================
-- Execute cada bloco separadamente para investigar o problema
-- =====================================================================

-- =====================================================================
-- BLOCO 1: ENCONTRAR A VENDA DE R$ 261
-- =====================================================================
SELECT 
  '=== VENDA ENCONTRADA ===' as titulo,
  id,
  caixa_origem,
  valor_total_venda,
  qtd_total_itens,
  metodo_pagto_1,
  valor_pagto_1,
  metodo_pagto_2,
  valor_pagto_2,
  metodo_pagto_3,
  valor_pagto_3,
  data_venda,
  created_at,
  vendedora_nome
FROM vendas
WHERE caixa_origem = 'Caixa 1'
  AND valor_total_venda = 261
  AND DATE(COALESCE(data_venda, created_at)) = '2026-01-09'
ORDER BY created_at DESC;

-- =====================================================================
-- BLOCO 2: TODAS AS VENDAS DO DIA (CASO NÃO ENCONTRE)
-- =====================================================================
SELECT 
  '=== TODAS AS VENDAS CAIXA 1 - 09/01 ===' as titulo,
  id,
  valor_total_venda,
  metodo_pagto_1 || ' R$' || COALESCE(valor_pagto_1, 0) as pag1,
  metodo_pagto_2 || ' R$' || COALESCE(valor_pagto_2, 0) as pag2,
  metodo_pagto_3 || ' R$' || COALESCE(valor_pagto_3, 0) as pag3,
  created_at
FROM vendas
WHERE caixa_origem = 'Caixa 1'
  AND DATE(COALESCE(data_venda, created_at)) = '2026-01-09'
ORDER BY created_at DESC;

-- =====================================================================
-- BLOCO 3: CALCULAR DINHEIRO DE CADA VENDA
-- =====================================================================
SELECT 
  '=== DINHEIRO POR VENDA - 09/01 ===' as titulo,
  id,
  valor_total_venda as total,
  COALESCE(
    CASE WHEN LOWER(TRIM(metodo_pagto_1)) = 'dinheiro' THEN valor_pagto_1 ELSE 0 END +
    CASE WHEN LOWER(TRIM(metodo_pagto_2)) = 'dinheiro' THEN valor_pagto_2 ELSE 0 END +
    CASE WHEN LOWER(TRIM(metodo_pagto_3)) = 'dinheiro' THEN valor_pagto_3 ELSE 0 END,
    0
  ) as total_dinheiro,
  created_at
FROM vendas
WHERE caixa_origem = 'Caixa 1'
  AND DATE(COALESCE(data_venda, created_at)) = '2026-01-09'
ORDER BY created_at DESC;

-- =====================================================================
-- BLOCO 4: VERIFICAR MOVIMENTAÇÕES DE VENDA
-- =====================================================================
SELECT 
  '=== MOVIMENTAÇÕES TIPO VENDA - 09/01 ===' as titulo,
  mc.id,
  mc.tipo,
  mc.valor,
  mc.motivo,
  mc.data_hora,
  c.nome as caixa_destino
FROM movimentacoes_caixa mc
LEFT JOIN caixas c ON c.id = mc.caixa_destino_id
WHERE mc.tipo = 'venda'
  AND DATE(mc.data_hora) = '2026-01-09'
ORDER BY mc.data_hora DESC;

-- =====================================================================
-- BLOCO 5: TODAS AS MOVIMENTAÇÕES DO CAIXA 1
-- =====================================================================
SELECT 
  '=== TODAS MOVIMENTAÇÕES CAIXA 1 - 09/01 ===' as titulo,
  mc.id,
  mc.tipo,
  mc.valor,
  CASE 
    WHEN mc.caixa_origem_id IS NOT NULL THEN 'SAÍDA'
    WHEN mc.caixa_destino_id IS NOT NULL THEN 'ENTRADA'
    ELSE 'INDEFINIDO'
  END as fluxo,
  mc.motivo,
  mc.data_hora,
  origem.nome as de_caixa,
  destino.nome as para_caixa
FROM movimentacoes_caixa mc
LEFT JOIN caixas origem ON origem.id = mc.caixa_origem_id
LEFT JOIN caixas destino ON destino.id = mc.caixa_destino_id
WHERE (
  mc.caixa_destino_id IN (SELECT id FROM caixas WHERE nome = 'Caixa 1')
  OR mc.caixa_origem_id IN (SELECT id FROM caixas WHERE nome = 'Caixa 1')
)
AND DATE(mc.data_hora) = '2026-01-09'
ORDER BY mc.data_hora;

-- =====================================================================
-- BLOCO 6: RESUMO DO DIA
-- =====================================================================
SELECT 
  '=== RESUMO ESPERADO - 09/01 ===' as titulo,
  COUNT(*) as total_vendas,
  SUM(valor_total_venda) as total_vendido,
  SUM(
    CASE WHEN LOWER(TRIM(metodo_pagto_1)) = 'dinheiro' THEN valor_pagto_1 ELSE 0 END +
    CASE WHEN LOWER(TRIM(metodo_pagto_2)) = 'dinheiro' THEN valor_pagto_2 ELSE 0 END +
    CASE WHEN LOWER(TRIM(metodo_pagto_3)) = 'dinheiro' THEN valor_pagto_3 ELSE 0 END
  ) as total_dinheiro_esperado
FROM vendas
WHERE caixa_origem = 'Caixa 1'
  AND DATE(COALESCE(data_venda, created_at)) = '2026-01-09';

-- =====================================================================
-- BLOCO 7: VERIFICAR FECHAMENTOS
-- =====================================================================
-- Fechamento de 09/01
SELECT 
  '=== FECHAMENTO DO DIA 09/01 ===' as titulo,
  fc.id,
  c.nome as caixa,
  fc.data_fechamento,
  fc.valor_sistema,
  fc.valor_contado,
  fc.diferenca,
  fc.justificativa,
  fc.created_at
FROM fechamentos_caixa fc
JOIN caixas c ON c.id = fc.caixa_id
WHERE c.nome = 'Caixa 1'
  AND fc.data_fechamento = '2026-01-09';

-- Fechamento de 08/01 (dia anterior)
SELECT 
  '=== FECHAMENTO DO DIA 08/01 ===' as titulo,
  fc.id,
  c.nome as caixa,
  fc.data_fechamento,
  fc.valor_sistema,
  fc.valor_contado,
  fc.diferenca,
  fc.created_at
FROM fechamentos_caixa fc
JOIN caixas c ON c.id = fc.caixa_id
WHERE c.nome = 'Caixa 1'
  AND fc.data_fechamento = '2026-01-08';

-- =====================================================================
-- BLOCO 8: STATUS DO TRIGGER
-- =====================================================================
SELECT 
  '=== STATUS DO TRIGGER ===' as titulo,
  t.tgname as nome_trigger,
  t.tgenabled as status,
  CASE t.tgenabled
    WHEN 'O' THEN '✅ ATIVO'
    WHEN 'D' THEN '❌ DESABILITADO'
    WHEN 'R' THEN '⚠️ REPLICA ONLY'
    WHEN 'A' THEN '⚠️ ALWAYS'
    ELSE '❓ DESCONHECIDO'
  END as status_legivel
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE t.tgname = 'trg_venda_dinheiro'
  AND c.relname = 'vendas';

-- =====================================================================
-- BLOCO 9: 🎯 PROBLEMA - VENDAS SEM MOVIMENTAÇÃO
-- =====================================================================
WITH vendas_dinheiro AS (
  SELECT 
    v.id as venda_id,
    v.caixa_origem,
    v.valor_total_venda,
    v.created_at,
    COALESCE(
      CASE WHEN LOWER(TRIM(v.metodo_pagto_1)) = 'dinheiro' THEN v.valor_pagto_1 ELSE 0 END +
      CASE WHEN LOWER(TRIM(v.metodo_pagto_2)) = 'dinheiro' THEN v.valor_pagto_2 ELSE 0 END +
      CASE WHEN LOWER(TRIM(v.metodo_pagto_3)) = 'dinheiro' THEN v.valor_pagto_3 ELSE 0 END,
      0
    ) as total_dinheiro
  FROM vendas v
  WHERE v.caixa_origem = 'Caixa 1'
    AND DATE(COALESCE(v.data_venda, v.created_at)) = '2026-01-09'
    AND COALESCE(
      CASE WHEN LOWER(TRIM(v.metodo_pagto_1)) = 'dinheiro' THEN v.valor_pagto_1 ELSE 0 END +
      CASE WHEN LOWER(TRIM(v.metodo_pagto_2)) = 'dinheiro' THEN v.valor_pagto_2 ELSE 0 END +
      CASE WHEN LOWER(TRIM(v.metodo_pagto_3)) = 'dinheiro' THEN v.valor_pagto_3 ELSE 0 END,
      0
    ) > 0
)
SELECT 
  '=== ⚠️ VENDAS COM DINHEIRO SEM MOVIMENTAÇÃO ===' as titulo,
  vd.venda_id,
  vd.caixa_origem,
  vd.valor_total_venda,
  vd.total_dinheiro,
  vd.created_at,
  CASE 
    WHEN mc.id IS NULL THEN '❌ SEM MOVIMENTAÇÃO (PROBLEMA!)'
    ELSE '✅ Com movimentação'
  END as status
FROM vendas_dinheiro vd
LEFT JOIN movimentacoes_caixa mc ON (
  mc.tipo = 'venda' 
  AND mc.motivo LIKE '%' || vd.venda_id || '%'
  AND DATE(mc.data_hora) = DATE(vd.created_at)
)
ORDER BY vd.created_at DESC;

-- =====================================================================
-- 🛑 PARE AQUI E ANALISE OS RESULTADOS!
-- =====================================================================
-- Se o BLOCO 9 mostrou vendas "SEM MOVIMENTAÇÃO", continue para correção
-- =====================================================================
