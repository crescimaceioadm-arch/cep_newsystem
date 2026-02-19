-- Debug: Investigar por que saldos aparecem zerados
-- Data: 2026-02-19

-- 1. Ver TODOS os caixas e seus fechamentos mais recentes
WITH ultimos_fechamentos AS (
  SELECT 
    caixa_id,
    data_fechamento,
    status,
    valor_contado,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY caixa_id ORDER BY data_fechamento DESC) as rn
  FROM fechamentos_caixa
)
SELECT 
  c.id as caixa_id,
  c.nome as caixa_nome,
  c.saldo_seed_caixas,
  uf.data_fechamento as ultimo_fechamento_data,
  uf.status as ultimo_fechamento_status,
  uf.valor_contado as ultimo_fechamento_valor,
  uf.created_at as ultimo_fechamento_criado_em
FROM caixas c
LEFT JOIN ultimos_fechamentos uf ON c.id = uf.caixa_id AND uf.rn = 1
ORDER BY c.nome;

-- 2. Ver TODOS os fechamentos de CADA caixa (últimos 5 de cada)
SELECT 
  c.nome as caixa_nome,
  f.data_fechamento,
  f.status,
  f.valor_contado,
  f.valor_sistema,
  f.diferenca,
  f.created_at
FROM caixas c
LEFT JOIN fechamentos_caixa f ON c.id = f.caixa_id
ORDER BY c.nome, f.data_fechamento DESC;

-- 3. Ver fechamentos de HOJE especificamente
SELECT 
  c.nome as caixa_nome,
  f.data_fechamento,
  f.status,
  f.valor_contado,
  f.created_at
FROM caixas c
LEFT JOIN fechamentos_caixa f ON c.id = f.caixa_id
WHERE DATE(f.data_fechamento) = CURRENT_DATE
ORDER BY c.nome;

-- 4. Ver fechamentos de ONTEM (que seria usado como saldo inicial de hoje)
-- FIX: Usar CAST ou DATE() para comparar apenas a parte da data
SELECT 
  c.nome as caixa_nome,
  f.data_fechamento,
  f.status,
  f.valor_contado,
  f.created_at
FROM caixas c
LEFT JOIN fechamentos_caixa f ON c.id = f.caixa_id
WHERE DATE(f.data_fechamento) = CURRENT_DATE - INTERVAL '1 day'
ORDER BY c.nome;

-- 5. Verificar se há caixas SEM nenhum fechamento
SELECT 
  c.id,
  c.nome,
  c.saldo_seed_caixas,
  COUNT(f.id) as total_fechamentos
FROM caixas c
LEFT JOIN fechamentos_caixa f ON c.id = f.caixa_id
GROUP BY c.id, c.nome, c.saldo_seed_caixas
HAVING COUNT(f.id) = 0;
