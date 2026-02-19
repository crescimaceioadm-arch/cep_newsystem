-- ============================================================
-- FIX: Duplicação de R$ 1600 no Caixa Avaliação
-- ============================================================
-- PROBLEMA: Entrada manual de R$ 1600 está sendo contada duas vezes:
--   1. Como movimentação (entrada)
--   2. Como saldo_inicial (via fechamento)
--
-- SOLUÇÃO:
--   1. Deletar a movimentação incorreta
--   2. Criar fechamento correto para 17/02 com valor 1600
-- ============================================================

BEGIN;

-- 1️⃣ DELETAR a movimentação de entrada de R$ 1600 (duplicada)
DELETE FROM movimentacoes_caixa 
WHERE id = 'e16a3307-26dc-4105-9bd1-b701501a03a4';

-- 2️⃣ Buscar o ID do Caixa Avaliação
DO $$
DECLARE
  v_caixa_avaliacao_id UUID;
BEGIN
  -- Buscar ID do Caixa Avaliação
  SELECT id INTO v_caixa_avaliacao_id
  FROM caixas
  WHERE nome = 'Avaliação'
  LIMIT 1;

  IF v_caixa_avaliacao_id IS NULL THEN
    RAISE EXCEPTION 'Caixa Avaliação não encontrado!';
  END IF;

  RAISE NOTICE 'Caixa Avaliação ID: %', v_caixa_avaliacao_id;

  -- 3️⃣ Verificar se já existe fechamento para 17/02
  IF EXISTS (
    SELECT 1 FROM fechamentos_caixa
    WHERE caixa_id = v_caixa_avaliacao_id
      AND data_fechamento >= '2026-02-17T00:00:00Z'
      AND data_fechamento < '2026-02-18T00:00:00Z'
  ) THEN
    -- Se existe, ATUALIZAR
    UPDATE fechamentos_caixa
    SET 
      valor_contado = 1600,
      status = 'aprovado',
      updated_at = NOW()
    WHERE caixa_id = v_caixa_avaliacao_id
      AND data_fechamento >= '2026-02-17T00:00:00Z'
      AND data_fechamento < '2026-02-18T00:00:00Z';
    
    RAISE NOTICE 'Fechamento de 17/02 ATUALIZADO para R$ 1600';
  ELSE
    -- Se não existe, CRIAR
    INSERT INTO fechamentos_caixa (
      caixa_id,
      data_fechamento,
      valor_contado,
      observacoes,
      status,
      criado_por
    ) VALUES (
      v_caixa_avaliacao_id,
      '2026-02-17T23:59:59Z',
      1600,
      'Fechamento criado via correção - saldo ajustado para R$ 1600',
      'aprovado',
      NULL  -- Pode atualizar com ID do admin se necessário
    );
    
    RAISE NOTICE 'Fechamento de 17/02 CRIADO com R$ 1600';
  END IF;

END $$;

-- 4️⃣ VERIFICAR resultado
SELECT 
  'Movimentação deletada' AS acao,
  COUNT(*) AS quantidade
FROM movimentacoes_caixa
WHERE id = 'e16a3307-26dc-4105-9bd1-b701501a03a4';

SELECT 
  'Fechamento 17/02' AS acao,
  data_fechamento,
  valor_contado,
  status
FROM fechamentos_caixa
WHERE caixa_id = (SELECT id FROM caixas WHERE nome = 'Avaliação')
  AND data_fechamento >= '2026-02-17T00:00:00Z'
  AND data_fechamento < '2026-02-18T00:00:00Z';

COMMIT;

-- ============================================================
-- RESULTADO ESPERADO:
-- ✅ Movimentação e16a3307... deletada (COUNT = 0)
-- ✅ Fechamento de 17/02 criado/atualizado com valor_contado = 1600
-- ✅ Extrato 18/02 a 19/02 agora mostra:
--    - Saldo Inicial: R$ 1600 (do fechamento de 17/02)
--    - Movimentações: SEM a entrada de 1600
--    - Saldo Final: R$ 1880 (igual ao card!)
-- ============================================================
