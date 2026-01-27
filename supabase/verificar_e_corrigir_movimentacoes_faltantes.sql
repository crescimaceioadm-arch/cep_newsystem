-- ========================================
-- SCRIPT: Verificar e corrigir movimentações faltantes
-- ========================================
-- Execute este script periodicamente (ex: toda semana)
-- para identificar e corrigir avaliações que não geraram movimentação
-- ========================================

-- PASSO 1: Identificar avaliações sem movimentação
WITH avaliacoes_dinheiro AS (
  SELECT 
    a.id,
    a.nome_cliente,
    a.hora_encerramento,
    (CASE WHEN LOWER(a.pagamento_1_metodo) = 'dinheiro' THEN COALESCE(a.pagamento_1_valor, 0) ELSE 0 END +
     CASE WHEN LOWER(a.pagamento_2_metodo) = 'dinheiro' THEN COALESCE(a.pagamento_2_valor, 0) ELSE 0 END +
     CASE WHEN LOWER(a.pagamento_3_metodo) = 'dinheiro' THEN COALESCE(a.pagamento_3_valor, 0) ELSE 0 END) as total_dinheiro
  FROM atendimentos a
  WHERE a.status = 'finalizado'
    AND (
      LOWER(a.pagamento_1_metodo) = 'dinheiro' OR
      LOWER(a.pagamento_2_metodo) = 'dinheiro' OR
      LOWER(a.pagamento_3_metodo) = 'dinheiro'
    )
    AND a.hora_encerramento >= CURRENT_DATE - INTERVAL '30 days' -- Últimos 30 dias
),
movimentacoes_existentes AS (
  SELECT DISTINCT 
    REGEXP_REPLACE(m.motivo, '^Pagamento avaliação - ', '') as nome_cliente,
    m.data_hora::date as data
  FROM movimentacoes_caixa m
  WHERE m.tipo = 'pagamento_avaliacao'
    AND m.data_hora >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT 
  '=== AVALIAÇÕES SEM MOVIMENTAÇÃO ===' as titulo,
  ad.id,
  ad.nome_cliente,
  ad.hora_encerramento,
  ad.total_dinheiro as valor_dinheiro
FROM avaliacoes_dinheiro ad
LEFT JOIN movimentacoes_existentes me 
  ON UPPER(ad.nome_cliente) = UPPER(me.nome_cliente)
  AND ad.hora_encerramento::date = me.data
WHERE me.nome_cliente IS NULL
  AND ad.total_dinheiro > 0
ORDER BY ad.hora_encerramento DESC;

-- PASSO 2: Corrigir automaticamente (DESCOMENTE PARA EXECUTAR)
/*
DO $$
DECLARE
  v_caixa_id UUID;
  r RECORD;
  v_count INT := 0;
BEGIN
  -- Buscar ID do caixa Avaliação
  SELECT id INTO v_caixa_id FROM caixas WHERE nome = 'Avaliação';
  
  IF v_caixa_id IS NULL THEN
    RAISE EXCEPTION 'Caixa Avaliação não encontrado!';
  END IF;

  -- Inserir movimentações faltantes
  FOR r IN (
    WITH avaliacoes_dinheiro AS (
      SELECT 
        a.id,
        a.nome_cliente,
        a.hora_encerramento,
        (CASE WHEN LOWER(a.pagamento_1_metodo) = 'dinheiro' THEN COALESCE(a.pagamento_1_valor, 0) ELSE 0 END +
         CASE WHEN LOWER(a.pagamento_2_metodo) = 'dinheiro' THEN COALESCE(a.pagamento_2_valor, 0) ELSE 0 END +
         CASE WHEN LOWER(a.pagamento_3_metodo) = 'dinheiro' THEN COALESCE(a.pagamento_3_valor, 0) ELSE 0 END) as total_dinheiro
      FROM atendimentos a
      WHERE a.status = 'finalizado'
        AND (
          LOWER(a.pagamento_1_metodo) = 'dinheiro' OR
          LOWER(a.pagamento_2_metodo) = 'dinheiro' OR
          LOWER(a.pagamento_3_metodo) = 'dinheiro'
        )
        AND a.hora_encerramento >= CURRENT_DATE - INTERVAL '30 days'
    ),
    movimentacoes_existentes AS (
      SELECT DISTINCT 
        REGEXP_REPLACE(m.motivo, '^Pagamento avaliação - ', '') as nome_cliente,
        m.data_hora::date as data
      FROM movimentacoes_caixa m
      WHERE m.tipo = 'pagamento_avaliacao'
        AND m.data_hora >= CURRENT_DATE - INTERVAL '30 days'
    )
    SELECT 
      ad.id,
      ad.nome_cliente,
      ad.hora_encerramento,
      ad.total_dinheiro
    FROM avaliacoes_dinheiro ad
    LEFT JOIN movimentacoes_existentes me 
      ON UPPER(ad.nome_cliente) = UPPER(me.nome_cliente)
      AND ad.hora_encerramento::date = me.data
    WHERE me.nome_cliente IS NULL
      AND ad.total_dinheiro > 0
  )
  LOOP
    INSERT INTO movimentacoes_caixa (
      caixa_origem_id,
      tipo,
      valor,
      motivo,
      data_hora
    ) VALUES (
      v_caixa_id,
      'pagamento_avaliacao',
      r.total_dinheiro,
      'Pagamento avaliação - ' || r.nome_cliente || ' (CORRIGIDO AUTOMATICAMENTE)',
      r.hora_encerramento
    );
    
    v_count := v_count + 1;
    RAISE NOTICE 'Corrigido: % - R$ %', r.nome_cliente, r.total_dinheiro;
  END LOOP;
  
  RAISE NOTICE '✅ Total corrigido: % movimentações', v_count;
END $$;
*/

-- ========================================
-- INSTRUÇÕES:
-- 1. Execute primeiro apenas o PASSO 1 para VER quais estão faltando
-- 2. Se estiver correto, descomente o PASSO 2 e execute para CORRIGIR
-- ========================================
