-- Test: Simular exatamente o que useSaldoInicial() faz para 2026-02-19
-- Data: 2026-02-19
-- Timezone: UTC (banco) vs Brasília (frontend)

-- IMPORTANTE: O código TS faz:
-- const hoje = getDateBrasilia()  → Retorna qual data em Brasília AGORA?
-- const diaAnterior = hoje - 1 dia
-- const diaAnteriorInicio = diaAnterior + "T00:00:00Z"
-- const diaAnteriorFim = dataInicio + "T00:00:00Z"

-- HIPÓTESE 1: Hoje em Brasília É 2026-02-19, então busca 2026-02-18
-- Isso deveria encontrar os fechamentos de ontem!

-- Test 1: O que a query TS faria para Caixa 1
SELECT 
  'TESTE 1: Caixa 1 - Range 2026-02-18T00:00:00Z até 2026-02-19T00:00:00Z' as teste,
  COUNT(*) as encontrados,
  STRING_AGG(f.id::text, ', ') as ids,
  MAX(f.valor_contado) as maior_valor
FROM fechamentos_caixa f
WHERE f.caixa_id = '83b48d64-60a6-4751-afc5-d9e86a9f6080'  -- Caixa 1
  AND f.data_fechamento >= '2026-02-18T00:00:00Z'
  AND f.data_fechamento < '2026-02-19T00:00:00Z'
  AND f.status = 'aprovado';

-- Test 2: Caixa 2
SELECT 
  'TESTE 2: Caixa 2 - Range 2026-02-18T00:00:00Z até 2026-02-19T00:00:00Z' as teste,
  COUNT(*) as encontrados,
  STRING_AGG(f.id::text, ', ') as ids,
  MAX(f.valor_contado) as maior_valor
FROM fechamentos_caixa f
WHERE f.caixa_id = 'b9962a74-c456-4197-91ae-b231fe15b340'  -- Caixa 2
  AND f.data_fechamento >= '2026-02-18T00:00:00Z'
  AND f.data_fechamento < '2026-02-19T00:00:00Z'
  AND f.status = 'aprovado';

-- Test 3: Avaliação
SELECT 
  'TESTE 3: Avaliação - Range 2026-02-18T00:00:00Z até 2026-02-19T00:00:00Z' as teste,
  COUNT(*) as encontrados,
  STRING_AGG(f.id::text, ', ') as ids,
  MAX(f.valor_contado) as maior_valor
FROM fechamentos_caixa f
WHERE f.caixa_id = '88d0feb0-c9b5-4c5d-9b14-a50f76fe515c'  -- Avaliação
  AND f.data_fechamento >= '2026-02-18T00:00:00Z'
  AND f.data_fechamento < '2026-02-19T00:00:00Z'
  AND f.status = 'aprovado';

-- Test 4: E se hoje fosse 2026-02-20? (diaAnterior = 2026-02-19)
SELECT 
  'TESTE 4: Caixa 1 - Se hoje = 2026-02-20, busca 2026-02-19T00:00Z até 2026-02-20T00:00Z' as teste,
  COUNT(*) as encontrados,
  f.id,
  f.data_fechamento,
  f.valor_contado
FROM fechamentos_caixa f
WHERE f.caixa_id = '83b48d64-60a6-4751-afc5-d9e86a9f6080'
  AND f.data_fechamento >= '2026-02-19T00:00:00Z'
  AND f.data_fechamento < '2026-02-20T00:00:00Z'
  AND f.status = 'aprovado'
LIMIT 5;

-- Test 5: Ver qual é a data+hora ATUAL no banco
SELECT 
  'AGORA NO BANCO' as info,
  NOW() as agora_utc,
  CURRENT_DATE as data_atual,
  timezone(INTERVAL '0', NOW()) as timezone_info;
