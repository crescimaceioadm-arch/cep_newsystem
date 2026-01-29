-- Verificar estado atual dos status após o SQL anterior

-- 1. Ver todos os status únicos
SELECT DISTINCT status FROM atendimentos ORDER BY status;

-- 2. Contar quantos de cada status
SELECT 
  status,
  COUNT(*) as total
FROM atendimentos
GROUP BY status
ORDER BY total DESC, status;

-- 3. Ver especificamente o Ricardo
SELECT 
  id,
  nome_cliente,
  status,
  created_at AT TIME ZONE 'America/Sao_Paulo' as data_brasilia,
  pagamento_1_metodo
FROM atendimentos
WHERE nome_cliente ILIKE '%RICARDO CAMPELO%'
ORDER BY created_at DESC;
