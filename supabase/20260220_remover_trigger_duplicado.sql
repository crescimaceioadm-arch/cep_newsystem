-- ============================================================================
-- REMOVER TRIGGER DUPLICADO DE PAGAMENTO DE AVALIAÇÃO
-- Data: 20/02/2026
-- ============================================================================
-- 
-- PROBLEMA: Trigger criando movimentações duplicadas
-- - Trigger: cria movimentação com "Pagamento Atendimento: {cliente}"
-- - Frontend: cria movimentação com "Pagamento avaliação - {cliente}"
--
-- SOLUÇÃO: Remover o trigger, pois o frontend já faz isso de forma mais completa
-- (valida caixa aberto, soma os 3 métodos de pagamento, etc)
-- ============================================================================

-- 1. Remover o trigger
DROP TRIGGER IF EXISTS trg_atualizar_caixa_pagamento ON atendimentos;

-- 2. Remover a função (não é mais necessária)
DROP FUNCTION IF EXISTS atualizar_caixa_pagamento();

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
-- Execute para confirmar que foram removidos:

SELECT 'Verificando triggers removidos...' as status;

SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table = 'atendimentos'
AND trigger_name = 'trg_atualizar_caixa_pagamento';
-- ESPERADO: (vazio)

SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'atualizar_caixa_pagamento';
-- ESPERADO: (vazio)

-- ============================================================================
-- LIMPEZA (OPCIONAL): Remover movimentações duplicadas existentes
-- ============================================================================
-- ⚠️ CUIDADO: Só execute se quiser limpar duplicatas históricas!
--
-- Esta query identifica duplicatas (mesmo valor, mesmo cliente, mesma hora):
-- SELECT
--   data_hora::date as data,
--   valor,
--   motivo,
--   COUNT(*) as quantidade
-- FROM movimentacoes_caixa
-- WHERE tipo = 'pagamento_avaliacao'
-- AND data_hora >= '2026-02-20'
-- GROUP BY data_hora::date, valor, motivo
-- HAVING COUNT(*) > 1
-- ORDER BY data_hora::date DESC;

-- Para DELETAR duplicatas (mantendo apenas 1 de cada):
-- DELETE FROM movimentacoes_caixa
-- WHERE id IN (
--   SELECT id FROM (
--     SELECT id, 
--            ROW_NUMBER() OVER (
--              PARTITION BY data_hora::timestamp(0), valor, tipo
--              ORDER BY data_hora DESC
--            ) as rn
--     FROM movimentacoes_caixa
--     WHERE tipo = 'pagamento_avaliacao'
--     AND data_hora >= '2026-02-20'
--   ) t
--   WHERE rn > 1
-- );
