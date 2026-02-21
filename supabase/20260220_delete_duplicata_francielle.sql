-- ============================================================================
-- DELETAR MOVIMENTAÇÃO DUPLICADA ESPECÍFICA
-- Data: 20/02/2026
-- Cliente: FRANCIELLE DE SOUSA SANTOS
-- ============================================================================
--
-- PROBLEMA: Duas movimentações para o mesmo pagamento
-- 1. 16:18:34 - "Pagamento Atendimento: FRANCIELLE..." (trigger - DELETAR)
-- 2. 16:18:35 - "Pagamento avaliação - FRANCIELLE..." (frontend - MANTER)
--
-- SOLUÇÃO: Deletar apenas a movimentação mais antiga (criada pelo trigger)
-- ============================================================================

-- 1. VERIFICAR as movimentações antes de deletar
SELECT 
  id,
  data_hora,
  valor,
  tipo,
  motivo,
  'SERÁ DELETADA' as acao
FROM movimentacoes_caixa
WHERE id = '9520cb07-035d-4582-81b4-96582880a668'
  AND tipo = 'pagamento_avaliacao'
  AND valor = 170
  AND motivo = 'Pagamento Atendimento: FRANCIELLE DE SOUSA SANTOS';

-- ESPERADO: 1 linha (a movimentação de 16:18:34)

UNION ALL

SELECT 
  id,
  data_hora,
  valor,
  tipo,
  motivo,
  'SERÁ MANTIDA' as acao
FROM movimentacoes_caixa
WHERE id = 'f9910d3a-7ac8-4f67-9764-80bb32739a91'
  AND tipo = 'pagamento_avaliacao'
  AND valor = 170
  AND motivo = 'Pagamento avaliação - FRANCIELLE DE SOUSA SANTOS';

-- ESPERADO: 1 linha (a movimentação de 16:18:35)

-- ============================================================================

-- 2. DELETAR apenas a movimentação duplicada (a mais antiga - do trigger)
DELETE FROM movimentacoes_caixa
WHERE id = '9520cb07-035d-4582-81b4-96582880a668'
  AND tipo = 'pagamento_avaliacao'
  AND valor = 170
  AND motivo = 'Pagamento Atendimento: FRANCIELLE DE SOUSA SANTOS'
RETURNING id, data_hora, valor, motivo;

-- ESPERADO: 1 linha deletada (16:18:34)

-- ============================================================================

-- 3. VERIFICAR o resultado final
SELECT 
  COUNT(*) as total_movimentacoes,
  SUM(valor) as total_valor
FROM movimentacoes_caixa
WHERE tipo = 'pagamento_avaliacao'
  AND valor = 170
  AND data_hora::date = '2026-02-20'
  AND (
    motivo LIKE '%FRANCIELLE%'
  );

-- ESPERADO: total_movimentacoes = 1, total_valor = 170

-- ============================================================================
-- RESULTADO ESPERADO NO SALDO DO CAIXA AVALIAÇÃO
-- ============================================================================
-- Antes:  R$ 850 - R$ 340 (duplicado) = R$ 510
-- Depois: R$ 850 - R$ 170 (correto)  = R$ 680
-- ============================================================================
