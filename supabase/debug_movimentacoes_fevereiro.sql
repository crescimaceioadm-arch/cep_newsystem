-- ========================================
-- DEBUG: Movimentações de Fevereiro do caixa Avaliação
-- ========================================

-- 1. Todas as movimentações de 01/02 e 02/02
SELECT 
  id,
  data_hora,
  tipo,
  valor,
  motivo,
  CASE 
    WHEN caixa_origem_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%') THEN 'SAÍDA (Avaliação paga)'
    WHEN caixa_destino_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%') THEN 'ENTRADA (Avaliação recebe)'
  END as direcao
FROM movimentacoes_caixa
WHERE (caixa_origem_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%')
    OR caixa_destino_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%'))
  AND data_hora >= '2026-02-01T00:00:00'
ORDER BY data_hora ASC;

-- 2. Resumo por tipo
SELECT 
  tipo,
  CASE 
    WHEN caixa_origem_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%') THEN 'origem (sai)'
    WHEN caixa_destino_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%') THEN 'destino (entra)'
  END as papel,
  COUNT(*) as quantidade,
  SUM(valor) as total
FROM movimentacoes_caixa
WHERE (caixa_origem_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%')
    OR caixa_destino_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%'))
  AND data_hora >= '2026-02-01T00:00:00'
GROUP BY tipo, papel
ORDER BY tipo;

-- 3. Saldo atual na tabela caixas
SELECT nome, saldo_atual, updated_at
FROM caixas
WHERE nome ILIKE '%avalia%';
