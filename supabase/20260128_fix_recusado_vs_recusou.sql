-- Correção: Diferenciar entre "recusado" (loja) e "recusou" (cliente)
-- Baseado no campo motivo_recusa existente

-- 1. Ver registros com status incorreto
SELECT 
  id,
  nome_cliente,
  status,
  motivo_recusa,
  created_at
FROM atendimentos
WHERE status = 'recusado' 
  OR status = 'Recusou'
  OR status = 'recusou'
ORDER BY created_at DESC;

-- 2. Corrigir baseado no motivo_recusa
UPDATE atendimentos
SET status = 'recusado'
WHERE motivo_recusa = 'loja' AND status IN ('recusado', 'Recusou', 'recusou', 'Finalizada');

UPDATE atendimentos
SET status = 'recusou'
WHERE motivo_recusa = 'cliente' AND status IN ('recusado', 'Recusou', 'recusou', 'Finalizada');

-- 3. Para registros SEM motivo_recusa, assumir "recusado" (loja)
UPDATE atendimentos
SET status = 'recusado'
WHERE motivo_recusa IS NULL 
  AND status IN ('recusado', 'Recusou', 'recusou', 'Finalizada');

-- 4. Verificar resultado
SELECT 
  status,
  COUNT(*) as total,
  array_agg(DISTINCT motivo_recusa) as motivos
FROM atendimentos
GROUP BY status
ORDER BY status;

-- 5. Verificar RICARDO CAMPELO
SELECT 
  nome_cliente,
  status,
  motivo_recusa,
  created_at AT TIME ZONE 'America/Sao_Paulo' as data_brasilia
FROM atendimentos
WHERE nome_cliente ILIKE '%RICARDO CAMPELO%'
ORDER BY created_at DESC;
