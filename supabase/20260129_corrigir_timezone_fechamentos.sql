-- =====================================================================
-- CORREÇÃO: Timezone incorreto em fechamentos_caixa
-- Data: 29/01/2026
-- =====================================================================
-- PROBLEMA:
-- O sistema estava salvando data_fechamento apenas como data (YYYY-MM-DD)
-- sem timezone, usando a meia-noite UTC (00:00+00), que corresponde a
-- 21:00 do dia anterior em Brasília (UTC-3).
--
-- EXEMPLO DO BUG:
-- data_fechamento inserida: 2026-01-26 00:00:00+00 (UTC)
--                  exibida: 2026-01-25 21:00:00 (Brasília)
--
-- SOLUÇÃO:
-- Agora o frontend usa convertToLocalTime() e envia a data correta.
-- Este script corrige os fechamentos históricos.
-- =====================================================================

-- 1. Verificar fechamentos com timezone incorreto
SELECT 
  id,
  caixa_id,
  data_fechamento,
  DATE(data_fechamento AT TIME ZONE 'America/Sao_Paulo') as data_corrigida,
  EXTRACT(HOUR FROM data_fechamento AT TIME ZONE 'America/Sao_Paulo')::int as hora_br
FROM fechamentos_caixa
WHERE EXTRACT(HOUR FROM data_fechamento AT TIME ZONE 'America/Sao_Paulo')::int >= 20
  OR EXTRACT(HOUR FROM data_fechamento AT TIME ZONE 'America/Sao_Paulo')::int < 5
ORDER BY data_fechamento DESC;

-- 2. CORRIGIR: Deslocar todas as datas de fechamento para 3 horas antes
-- Isso move de 00:00 UTC para 21:00 UTC (que é 18:00 em Brasília para os limites)
-- ⚠️ CUIDADO: Isto assume que TODOS os fechamentos foram criados com meia-noite UTC
-- Se houver fechamentos com horas corretas, este script vai quebrá-los!
UPDATE fechamentos_caixa
SET data_fechamento = data_fechamento AT TIME ZONE 'UTC' - INTERVAL '3 hours'
WHERE EXTRACT(HOUR FROM data_fechamento AT TIME ZONE 'America/Sao_Paulo')::int >= 20
  OR EXTRACT(HOUR FROM data_fechamento AT TIME ZONE 'America/Sao_Paulo')::int < 5;

-- 3. Verificar resultado
SELECT 
  id,
  caixa_id,
  data_fechamento,
  DATE(data_fechamento AT TIME ZONE 'America/Sao_Paulo') as data_corrigida,
  EXTRACT(HOUR FROM data_fechamento AT TIME ZONE 'America/Sao_Paulo')::int as hora_br
FROM fechamentos_caixa
ORDER BY data_fechamento DESC
LIMIT 20;

-- 4. Corrigir o registro específico de 27/01 que estava com valor_sistema errado
-- Saldo correto: 400 (inicial do dia 26) + 330 (entradas 27) - 730 (saídas 27) = 0
UPDATE fechamentos_caixa
SET 
  valor_sistema = 0,
  diferenca = CASE 
    WHEN valor_contado = 0 THEN 0 - 0
    ELSE valor_contado - 0
  END,
  justificativa = 'CORRIGIDO: saldo anterior 400 + entradas 330 - saídas 730 = 0. Valor_sistema estava incorreto porque não pegou as movimentações do dia 27/01'
WHERE caixa_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%')
  AND DATE(data_fechamento AT TIME ZONE 'America/Sao_Paulo') = '2026-01-27'::date
  AND valor_sistema = 400;  -- Só corrige se ainda estiver com 400

-- 5. Verificar o resultado da correção
SELECT 
  id,
  caixa_id,
  data_fechamento AT TIME ZONE 'America/Sao_Paulo' as data_br,
  valor_sistema,
  valor_contado,
  diferenca,
  status,
  justificativa
FROM fechamentos_caixa
WHERE caixa_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%')
ORDER BY data_fechamento DESC
LIMIT 10;
