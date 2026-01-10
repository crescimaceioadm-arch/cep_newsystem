-- =====================================================================
-- DIAGNÓSTICO E CORREÇÃO: Inconsistência Caixa 1 - 09/01/2026
-- =====================================================================
-- 
-- PROBLEMA REPORTADO:
-- - Venda de R$ 261 (PIX R$ 161 + Dinheiro R$ 100) não foi contabilizada
-- - Saldo do sistema ficou em -R$ 50
-- - Saldo físico estava em R$ 100
-- - Venda não apareceu no extrato nem no saldo
-- 
-- Este script:
-- 1. Investiga se a venda existe
-- 2. Verifica se há movimentação correspondente
-- 3. Identifica a causa raiz
-- 4. Fornece correção automática
-- 5. Verifica saúde do trigger
-- =====================================================================

-- =====================================================================
-- PARTE 1: INVESTIGAÇÃO - ENCONTRAR A VENDA
-- =====================================================================

-- 1.1 Buscar venda de R$ 261 no Caixa 1 de 09/01/2026
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

-- 1.2 Buscar TODAS as vendas do Caixa 1 de 09/01 (caso não encontre exata)
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

-- 1.3 Calcular total em dinheiro de cada venda
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
-- PARTE 2: VERIFICAR MOVIMENTAÇÕES (EXTRATO)
-- =====================================================================

-- 2.1 Buscar movimentações do tipo 'venda' em 09/01
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

-- 2.2 Buscar TODAS as movimentações do Caixa 1 em 09/01
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

-- 2.3 Calcular resumo do dia (o que DEVERIA ter sido registrado)
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
-- PARTE 3: VERIFICAR FECHAMENTO E SALDO
-- =====================================================================

-- 3.1 Verificar fechamento de 09/01
SELECT 
  '=== FECHAMENTO DO DIA 09/01 ===' as titulo,
  fc.id,
  c.nome as caixa,
  fc.data_fechamento,
  fc.valor_sistema,
  fc.valor_contado,
  fc.diferenca,
  fc.justificativa
FROM fechamentos_caixa fc
JOIN caixas c ON c.id = fc.caixa_id
WHERE c.nome = 'Caixa 1'
  AND fc.data_fechamento = '2026-01-09';

-- 3.2 Verificar fechamento de 08/01 (dia anterior)
SELECT 
  '=== FECHAMENTO DO DIA 08/01 ===' as titulo,
  fc.id,
  c.nome as caixa,
  fc.data_fechamento,
  fc.valor_sistema,
  fc.valor_contado,
  fc.diferenca
FROM fechamentos_caixa fc
JOIN caixas c ON c.id = fc.caixa_id
WHERE c.nome = 'Caixa 1'
  AND fc.data_fechamento = '2026-01-08';

-- 3.3 Verificar saldo atual do caixa
SELECT 
  '=== SALDO ATUAL CAIXA 1 ===' as titulo,
  id,
  nome,
  saldo_atual
FROM caixas
WHERE nome = 'Caixa 1';

-- =====================================================================
-- PARTE 4: VERIFICAR SAÚDE DO TRIGGER
-- =====================================================================

-- 4.1 Verificar se o trigger existe e está ativo
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
  END as status_legivel,
  pg_get_triggerdef(t.oid) as definicao
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE t.tgname = 'trg_venda_dinheiro'
  AND c.relname = 'vendas';

-- 4.2 Verificar se a função do trigger existe
SELECT 
  '=== FUNÇÃO DO TRIGGER ===' as titulo,
  p.proname as nome_funcao,
  pg_get_functiondef(p.oid) as definicao
FROM pg_proc p
WHERE p.proname = 'fn_registrar_venda_dinheiro';

-- =====================================================================
-- PARTE 5: IDENTIFICAR VENDAS SEM MOVIMENTAÇÃO (PROBLEMA)
-- =====================================================================

-- 5.1 Encontrar vendas com dinheiro que NÃO geraram movimentação
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
-- PARTE 6: CORREÇÃO AUTOMÁTICA
-- =====================================================================
-- ⚠️ ATENÇÃO: Execute esta parte SOMENTE após confirmar o problema!
-- ⚠️ Substitua 'VENDA_ID_AQUI' pelo ID real da venda com problema
-- =====================================================================

-- 6.1 ANTES DE CORRIGIR: Fazer backup dos dados atuais
-- (Copie o resultado desta query antes de prosseguir)
SELECT 
  '=== BACKUP - ESTADO ANTES DA CORREÇÃO ===' as titulo,
  json_build_object(
    'venda', (SELECT row_to_json(v.*) FROM vendas v WHERE v.id = 'VENDA_ID_AQUI'),
    'caixa', (SELECT row_to_json(c.*) FROM caixas c WHERE c.nome = 'Caixa 1'),
    'movimentacoes_existentes', (
      SELECT json_agg(mc.*) 
      FROM movimentacoes_caixa mc 
      WHERE DATE(mc.data_hora) = '2026-01-09'
    )
  ) as backup_json;

-- 6.2 CORREÇÃO: Inserir movimentação faltante
-- ⚠️ Descomente e execute APENAS se confirmado que falta a movimentação
/*
INSERT INTO movimentacoes_caixa (
  caixa_origem_id,
  caixa_destino_id,
  tipo,
  valor,
  motivo,
  data_hora
)
SELECT 
  NULL,                              -- origem: cliente (NULL)
  c.id,                              -- destino: Caixa 1
  'venda',                           -- tipo
  COALESCE(
    CASE WHEN LOWER(TRIM(v.metodo_pagto_1)) = 'dinheiro' THEN v.valor_pagto_1 ELSE 0 END +
    CASE WHEN LOWER(TRIM(v.metodo_pagto_2)) = 'dinheiro' THEN v.valor_pagto_2 ELSE 0 END +
    CASE WHEN LOWER(TRIM(v.metodo_pagto_3)) = 'dinheiro' THEN v.valor_pagto_3 ELSE 0 END,
    0
  ),                                 -- valor em dinheiro
  'Correção manual - Venda #' || v.id,  -- motivo
  v.created_at                       -- data/hora original
FROM vendas v
CROSS JOIN caixas c
WHERE v.id = 'VENDA_ID_AQUI'
  AND c.nome = 'Caixa 1'
  AND COALESCE(
    CASE WHEN LOWER(TRIM(v.metodo_pagto_1)) = 'dinheiro' THEN v.valor_pagto_1 ELSE 0 END +
    CASE WHEN LOWER(TRIM(v.metodo_pagto_2)) = 'dinheiro' THEN v.valor_pagto_2 ELSE 0 END +
    CASE WHEN LOWER(TRIM(v.metodo_pagto_3)) = 'dinheiro' THEN v.valor_pagto_3 ELSE 0 END,
    0
  ) > 0;
*/

-- 6.3 Verificar se a correção foi aplicada
/*
SELECT 
  '=== VERIFICAÇÃO PÓS-CORREÇÃO ===' as titulo,
  mc.*,
  c.nome as caixa_destino
FROM movimentacoes_caixa mc
LEFT JOIN caixas c ON c.id = mc.caixa_destino_id
WHERE mc.motivo LIKE '%VENDA_ID_AQUI%'
ORDER BY mc.data_hora DESC;
*/

-- =====================================================================
-- PARTE 7: REABILITAR TRIGGER (SE NECESSÁRIO)
-- =====================================================================

-- 7.1 Se o trigger estiver desabilitado, reabilitar
/*
ALTER TABLE vendas ENABLE TRIGGER trg_venda_dinheiro;
*/

-- 7.2 Se o trigger não existir, recriar (executar migration completa)
/*
-- Execute o arquivo: supabase/migrations/20241223_fix_venda_dinheiro_trigger.sql
*/

-- =====================================================================
-- PARTE 8: AUDITORIA FINAL E VALIDAÇÃO
-- =====================================================================

-- 8.1 Recalcular saldo do dia 09/01 após correção
WITH saldo_inicial AS (
  SELECT COALESCE(valor_contado, 0) as valor
  FROM fechamentos_caixa fc
  JOIN caixas c ON c.id = fc.caixa_id
  WHERE c.nome = 'Caixa 1'
    AND fc.data_fechamento = '2026-01-08'
  UNION ALL
  SELECT 0 as valor
  LIMIT 1
),
movimentacoes AS (
  SELECT 
    SUM(CASE 
      WHEN mc.caixa_destino_id = (SELECT id FROM caixas WHERE nome = 'Caixa 1') 
      THEN mc.valor 
      ELSE 0 
    END) as entradas,
    SUM(CASE 
      WHEN mc.caixa_origem_id = (SELECT id FROM caixas WHERE nome = 'Caixa 1') 
      THEN mc.valor 
      ELSE 0 
    END) as saidas
  FROM movimentacoes_caixa mc
  WHERE DATE(mc.data_hora) = '2026-01-09'
)
SELECT 
  '=== SALDO RECALCULADO - 09/01 ===' as titulo,
  si.valor as saldo_inicial,
  m.entradas,
  m.saidas,
  (si.valor + m.entradas - m.saidas) as saldo_final_calculado,
  fc.valor_sistema as saldo_fechamento_registrado,
  fc.valor_contado as saldo_fisico_contado
FROM saldo_inicial si
CROSS JOIN movimentacoes m
LEFT JOIN fechamentos_caixa fc ON (
  fc.caixa_id = (SELECT id FROM caixas WHERE nome = 'Caixa 1')
  AND fc.data_fechamento = '2026-01-09'
);

-- 8.2 Teste do trigger em nova venda (simular)
/*
-- Não executar em produção - apenas para teste
-- Cria uma venda teste para verificar se o trigger funciona
INSERT INTO vendas (
  caixa_origem,
  valor_total_venda,
  qtd_total_itens,
  metodo_pagto_1,
  valor_pagto_1,
  metodo_pagto_2,
  valor_pagto_2
) VALUES (
  'Caixa 1',
  100,
  1,
  'PIX',
  50,
  'Dinheiro',
  50
);

-- Verificar se criou a movimentação automaticamente
SELECT * FROM movimentacoes_caixa 
WHERE tipo = 'venda' 
ORDER BY data_hora DESC 
LIMIT 1;
*/

-- =====================================================================
-- FIM DO SCRIPT
-- =====================================================================
-- 
-- PRÓXIMOS PASSOS:
-- 1. Execute as queries de investigação (Partes 1-5)
-- 2. Analise os resultados para confirmar o problema
-- 3. Se confirmado, execute a correção (Parte 6)
-- 4. Valide com auditoria final (Parte 8)
-- 
-- PREVENÇÃO FUTURA:
-- - Monitore diariamente a query 5.1 para detectar vendas sem movimentação
-- - Garanta que o trigger esteja sempre ativo
-- - Considere adicionar alertas automáticos no sistema
-- =====================================================================
