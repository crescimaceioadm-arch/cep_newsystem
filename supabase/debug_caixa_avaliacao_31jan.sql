-- ========================================
-- DEBUG: Investigar movimentações do caixa Avaliação até 31/01
-- ========================================

-- 1. TODAS as movimentações de PAGAMENTO_AVALIACAO
SELECT 
  id,
  data_hora,
  tipo,
  valor,
  motivo,
  caixa_origem_id,
  caixa_destino_id,
  CASE 
    WHEN caixa_origem_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%') THEN 'Avaliação é ORIGEM (paga)'
    WHEN caixa_destino_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%') THEN 'Avaliação é DESTINO (recebe)'
  END as papel_avaliacao
FROM movimentacoes_caixa
WHERE tipo = 'pagamento_avaliacao'
  AND (caixa_origem_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%')
    OR caixa_destino_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%'))
  AND data_hora <= '2026-01-31T23:59:59'
ORDER BY data_hora DESC
LIMIT 100;

-- 2. TODAS as movimentações de TRANSFERENCIA_ENTRE_CAIXAS
SELECT 
  id,
  data_hora,
  tipo,
  valor,
  motivo,
  caixa_origem_id,
  caixa_destino_id,
  CASE 
    WHEN caixa_origem_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%') THEN 'Avaliação é ORIGEM (perde)'
    WHEN caixa_destino_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%') THEN 'Avaliação é DESTINO (recebe)'
  END as papel_avaliacao
FROM movimentacoes_caixa
WHERE tipo = 'transferencia_entre_caixas'
  AND (caixa_origem_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%')
    OR caixa_destino_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%'))
  AND data_hora <= '2026-01-31T23:59:59'
ORDER BY data_hora DESC
LIMIT 100;

-- 3. ESTORNOS
SELECT 
  id,
  data_hora,
  tipo,
  valor,
  motivo,
  caixa_origem_id,
  caixa_destino_id
FROM movimentacoes_caixa
WHERE tipo = 'estorno_pagamento_avaliacao'
  AND (caixa_origem_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%')
    OR caixa_destino_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%'))
  AND data_hora <= '2026-01-31T23:59:59'
ORDER BY data_hora DESC;

-- 4. ENTRADAS
SELECT 
  id,
  data_hora,
  tipo,
  valor,
  motivo,
  caixa_origem_id,
  caixa_destino_id
FROM movimentacoes_caixa
WHERE tipo = 'entrada'
  AND (caixa_origem_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%')
    OR caixa_destino_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%'))
  AND data_hora <= '2026-01-31T23:59:59'
ORDER BY data_hora DESC;

-- 5. Resumo por dia
SELECT 
  DATE(data_hora) as dia,
  tipo,
  COUNT(*) as quantidade,
  SUM(valor) as total,
  CASE 
    WHEN caixa_origem_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%') THEN 'origem'
    WHEN caixa_destino_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%') THEN 'destino'
  END as papel
FROM movimentacoes_caixa
WHERE (caixa_origem_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%')
    OR caixa_destino_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%'))
  AND data_hora <= '2026-01-31T23:59:59'
GROUP BY DATE(data_hora), tipo, papel
ORDER BY dia DESC, tipo;
