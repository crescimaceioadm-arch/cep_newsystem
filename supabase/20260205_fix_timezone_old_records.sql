-- ============================================================================
-- CORRIGIR RECORDS ANTIGOS COM TIMEZONE INCORRETO
-- ============================================================================
-- 
-- Problema: Registros antigos salvaram horário de Brasília como se fosse UTC
-- Ex: 15:20 (Brasília) foi salvo como "2026-02-05T15:20:00+00:00" ao invés de "2026-02-05T18:20:00+00:00"
-- 
-- Solução: Adicionar 3 horas aos timestamps antigos (Brasília = UTC-3)
-- 
-- CUIDADO: Execute DEPOIS de validar que o código está correto!
-- ============================================================================

-- 1. CORRIGIR TABELA 'vendas' (created_at)
UPDATE vendas
SET created_at = created_at + INTERVAL '3 hours',
    data_venda = data_venda + INTERVAL '3 hours'
WHERE created_at < '2026-02-05T18:30:00Z'  -- Antes da última venda com timestamp correto
  AND created_at >= '2025-01-01T00:00:00Z'; -- Limitar a período razoável

-- 2. CORRIGIR TABELA 'atendimentos' (hora_chegada e hora_encerramento)
UPDATE atendimentos
SET hora_chegada = hora_chegada + INTERVAL '3 hours',
    hora_encerramento = CASE 
      WHEN hora_encerramento IS NOT NULL THEN hora_encerramento + INTERVAL '3 hours'
      ELSE hora_encerramento
    END
WHERE hora_chegada < '2026-02-05T18:30:00Z'
  AND hora_chegada >= '2025-01-01T00:00:00Z';

-- 3. CORRIGIR TABELA 'itens_grandes_individuais' (data_saida)
UPDATE itens_grandes_individuais
SET data_saida = data_saida + INTERVAL '3 hours'
WHERE data_saida IS NOT NULL
  AND data_saida < '2026-02-05T18:30:00Z'
  AND data_saida >= '2025-01-01T00:00:00Z';

-- 4. VERIFICAR RESULTADOS (execute separadamente)
-- SELECT COUNT(*) as vendas_corrigidas FROM vendas 
-- WHERE created_at >= '2025-01-01T03:00:00Z' AND created_at <= '2026-02-05T21:30:00Z';

-- SELECT COUNT(*) as atendimentos_corrigidos FROM atendimentos 
-- WHERE hora_chegada >= '2025-01-01T03:00:00Z' AND hora_chegada <= '2026-02-05T21:30:00Z';
