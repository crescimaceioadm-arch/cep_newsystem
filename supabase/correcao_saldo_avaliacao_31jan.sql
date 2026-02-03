-- ========================================
-- CORREÇÃO: Saldo zerado do caixa Avaliação em 02/02/2026
-- ========================================
-- 
-- PROBLEMA: Não houve fechamento do caixa Avaliação em 31/01/2026
-- CAUSA: Sistema usou fechamento de 30/01 (R$ 0) como saldo inicial de 02/02
-- IMPACTO: Saldo apareceu zerado no dia 02/02
-- 
-- SOLUÇÃO: Inserir fechamento retroativo de 31/01 com R$ 450
-- ========================================

-- 1. Validar dados antes da correção
DO $$
DECLARE
  v_caixa_id UUID;
  v_fechamento_30 NUMERIC;
  v_movs_31 NUMERIC;
  v_saldo_esperado NUMERIC;
BEGIN
  -- Buscar ID do caixa Avaliação
  SELECT id INTO v_caixa_id FROM caixas WHERE nome ILIKE '%avalia%';
  
  -- Verificar fechamento de 30/01
  SELECT COALESCE(valor_contado, 0) INTO v_fechamento_30
  FROM fechamentos_caixa
  WHERE caixa_id = v_caixa_id
    AND data_fechamento = '2026-01-30'
  LIMIT 1;
  
  -- Calcular movimentações de 31/01 (transferências de entrada)
  SELECT COALESCE(SUM(valor), 0) INTO v_movs_31
  FROM movimentacoes_caixa
  WHERE tipo = 'transferencia_entre_caixas'
    AND caixa_destino_id = v_caixa_id
    AND data_hora >= '2026-01-31T00:00:00'
    AND data_hora <= '2026-01-31T23:59:59';
  
  v_saldo_esperado := v_fechamento_30 + v_movs_31;
  
  RAISE NOTICE '═════════════════════════════════════════';
  RAISE NOTICE 'VALIDAÇÃO DOS DADOS';
  RAISE NOTICE '═════════════════════════════════════════';
  RAISE NOTICE 'Caixa ID: %', v_caixa_id;
  RAISE NOTICE 'Fechamento 30/01: R$ %', v_fechamento_30;
  RAISE NOTICE 'Movimentações 31/01: R$ %', v_movs_31;
  RAISE NOTICE 'Saldo esperado 31/01: R$ %', v_saldo_esperado;
  RAISE NOTICE '═════════════════════════════════════════';
  
  IF v_saldo_esperado != 450 THEN
    RAISE WARNING '⚠️ ATENÇÃO: Saldo esperado (R$ %) difere de R$ 450', v_saldo_esperado;
  END IF;
END $$;

-- 2. Inserir fechamento retroativo de 31/01
INSERT INTO fechamentos_caixa (
  caixa_id,
  data_fechamento,
  valor_sistema,
  valor_contado,
  diferenca,
  status,
  requer_revisao,
  justificativa
)
SELECT 
  id,
  '2026-01-31',
  450,
  450,
  0,
  'aprovado',
  FALSE,
  'Fechamento retroativo inserido em 02/02/2026 - Correção de saldo inicial zerado'
FROM caixas
WHERE nome ILIKE '%avalia%'
ON CONFLICT DO NOTHING;

-- 3. Verificar saldo_atual (NÃO atualizar - trigger já gerencia)
DO $$
DECLARE
  v_caixa_id UUID;
  v_saldo_atual NUMERIC;
BEGIN
  -- Buscar ID e saldo do caixa
  SELECT id, saldo_atual INTO v_caixa_id, v_saldo_atual
  FROM caixas 
  WHERE nome ILIKE '%avalia%';
  
  RAISE NOTICE '═════════════════════════════════════════';
  RAISE NOTICE 'SALDO ATUAL DO CAIXA';
  RAISE NOTICE '═════════════════════════════════════════';
  RAISE NOTICE 'Caixa ID: %', v_caixa_id;
  RAISE NOTICE 'Saldo atual (gerenciado por trigger): R$ %', v_saldo_atual;
  RAISE NOTICE '═════════════════════════════════════════';
  RAISE NOTICE '⚠️ O saldo_atual é gerenciado automaticamente por trigger.';
  RAISE NOTICE '⚠️ Não será alterado manualmente para evitar inconsistências.';
  RAISE NOTICE '═════════════════════════════════════════';
END $$;

-- 4. Validação final
SELECT 
  'Fechamento 31/01 inserido' as status,
  data_fechamento,
  valor_contado,
  status as fechamento_status
FROM fechamentos_caixa
WHERE caixa_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%')
  AND data_fechamento = '2026-01-31'
LIMIT 1;

SELECT 
  'Saldo atual do caixa' as status,
  nome,
  saldo_atual,
  updated_at
FROM caixas
WHERE nome ILIKE '%avalia%';

-- ========================================
-- COMENTÁRIOS FINAIS
-- ========================================
-- 
-- Após executar este script:
-- 1. O fechamento de 31/01 estará registrado com R$ 450
-- 2. O saldo_atual NÃO é alterado (gerenciado por trigger automático)
-- 3. O saldo inicial de 02/02 será R$ 450 em vez de R$ 0
-- 
-- IMPORTANTE:
-- - O saldo_atual é gerenciado automaticamente por trigger
-- - Não deve ser alterado manualmente para evitar inconsistências
-- - Se o saldo_atual estiver incorreto, use o script de reconciliação
-- 
-- PREVENÇÃO FUTURA:
-- - Garantir fechamento diário de todos os caixas
-- - Sistema já foi ajustado para aceitar fechamentos pendentes como fallback
-- 
-- ========================================
