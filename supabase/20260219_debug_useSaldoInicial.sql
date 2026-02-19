-- Debug: Verificar exatamente o que useSaldoInicial() deveria estar encontrando
-- Data: 2026-02-19

-- SIMULAR O QUE O CÓDIGO TYPESCRIPT FAZ:
-- 1. hoje = "2026-02-19"
-- 2. diaAnterior = "2026-02-18"
-- 3. diaAnteriorInicio = "2026-02-18T00:00:00Z"
-- 4. diaAnteriorFim = "2026-02-19T00:00:00Z"

-- Query 1: EXATAMENTE o que o useSaldoInicial() faz para Caixa 1
SELECT 
  'Caixa 1' as caixa_nome,
  f.id,
  f.data_fechamento,
  f.status,
  f.valor_contado,
  f.created_at
FROM fechamentos_caixa f
WHERE f.caixa_id = '83b48d64-60a6-4751-afc5-d9e86a9f6080'  -- Caixa 1
  AND f.data_fechamento >= '2026-02-18T00:00:00Z'
  AND f.data_fechamento < '2026-02-19T00:00:00Z'
  AND f.status = 'aprovado'
ORDER BY f.created_at DESC
LIMIT 1;

-- Query 2: Para Caixa 2
SELECT 
  'Caixa 2' as caixa_nome,
  f.id,
  f.data_fechamento,
  f.status,
  f.valor_contado,
  f.created_at
FROM fechamentos_caixa f
WHERE f.caixa_id = 'b9962a74-c456-4197-91ae-b231fe15b340'  -- Caixa 2
  AND f.data_fechamento >= '2026-02-18T00:00:00Z'
  AND f.data_fechamento < '2026-02-19T00:00:00Z'
  AND f.status = 'aprovado'
ORDER BY f.created_at DESC
LIMIT 1;

-- Query 3: Para Avaliação
SELECT 
  'Avaliação' as caixa_nome,
  f.id,
  f.data_fechamento,
  f.status,
  f.valor_contado,
  f.created_at
FROM fechamentos_caixa f
WHERE f.caixa_id = '88d0feb0-c9b5-4c5d-9b14-a50f76fe515c'  -- Avaliação
  AND f.data_fechamento >= '2026-02-18T00:00:00Z'
  AND f.data_fechamento < '2026-02-19T00:00:00Z'
  AND f.status = 'aprovado'
ORDER BY f.created_at DESC
LIMIT 1;

-- Query 4: Ver movimentações de HOJE para cada caixa
SELECT 
  c.nome as caixa_nome,
  m.tipo,
  m.valor,
  m.motivo,
  m.data_hora,
  m.caixa_origem_id,
  m.caixa_destino_id
FROM movimentacoes_caixa m
LEFT JOIN caixas c ON (m.caixa_destino_id = c.id OR m.caixa_origem_id = c.id)
WHERE DATE(m.data_hora) = '2026-02-19'
ORDER BY c.nome, m.data_hora DESC;

-- Query 5: Verificar se os fechamentos de ontem REALMENTE estão salvos com timestamp
SELECT 
  c.nome,
  f.data_fechamento,
  f.data_fechamento::text as data_fechamento_text,
  EXTRACT(HOUR FROM f.data_fechamento) as hora,
  EXTRACT(MINUTE FROM f.data_fechamento) as minuto,
  f.status,
  f.valor_contado
FROM fechamentos_caixa f
JOIN caixas c ON f.caixa_id = c.id
WHERE DATE(f.data_fechamento) = '2026-02-18'
ORDER BY c.nome, f.created_at DESC;
