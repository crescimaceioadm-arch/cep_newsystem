-- Padronizar status no banco de dados
-- Os status corretos devem ser: 'aguardando', 'em_avaliacao', 'aguardando_pagamento', 'finalizado', 'recusado'

-- 1. Ver valores únicos atuais
SELECT DISTINCT status FROM atendimentos ORDER BY status;

-- 2. Padronizar para lowercase
UPDATE atendimentos
SET status = LOWER(status)
WHERE status != LOWER(status);

-- 3. Renomear status antigos (se houver diferentes)
UPDATE atendimentos
SET status = 'recusado'
WHERE status LIKE '%recus%';

UPDATE atendimentos
SET status = 'finalizado'
WHERE status LIKE '%finali%' AND status != 'finalizado';

-- 4. Verificar resultado final
SELECT 
  status,
  COUNT(*) as total
FROM atendimentos
GROUP BY status
ORDER BY status;
