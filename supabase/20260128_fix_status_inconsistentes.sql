-- Correção: Padronizar os status na tabela atendimentos
-- Os status devem ser: 'aguardando', 'em_avaliacao', 'aguardando_pagamento', 'finalizado', 'recusado'

-- 1. Verificar valores únicos atuais de status
SELECT DISTINCT status FROM atendimentos ORDER BY status;

-- 2. Corrigir para o padrão correto
UPDATE atendimentos
SET status = 'recusado'
WHERE LOWER(status) LIKE '%recus%' OR status = 'Recusou';

UPDATE atendimentos
SET status = 'finalizado'
WHERE LOWER(status) LIKE '%finali%' AND status != 'finalizado';

-- 3. Verificar resultado
SELECT DISTINCT status FROM atendimentos ORDER BY status;

-- 4. Confirmar quantos foram atualizados
SELECT 
  status,
  COUNT(*) as total
FROM atendimentos
GROUP BY status
ORDER BY status;
