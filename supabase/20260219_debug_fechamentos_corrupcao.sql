-- Debug: Investigar por que todas as queries retornam o MESMO fechamento
-- Data: 2026-02-19

-- Query 1: Ver EXATAMENTE o que tem na tabela fechamentos_caixa
SELECT 
  f.id,
  f.caixa_id,
  c.nome as caixa_nome,
  f.data_fechamento,
  f.status,
  f.valor_contado,
  COUNT(*) OVER () as total_linhas_tabela
FROM fechamentos_caixa f
LEFT JOIN caixas c ON f.caixa_id = c.id
ORDER BY f.created_at DESC
LIMIT 20;

-- Query 2: Verificar se há IDs duplicados
SELECT 
  f.id,
  COUNT(*) as qtd_linhas_com_mesmo_id
FROM fechamentos_caixa f
GROUP BY f.id
HAVING COUNT(*) > 1;

-- Query 3: Total de linhas por caixa
SELECT 
  f.caixa_id,
  c.nome as caixa_nome,
  COUNT(*) as total_fechamentos
FROM fechamentos_caixa f
LEFT JOIN caixas c ON f.caixa_id = c.id
GROUP BY f.caixa_id, c.nome
ORDER BY c.nome;

-- Query 4: Listar todos os fechamentos de 2026-02-18 com detalhes completos
SELECT 
  f.id,
  f.caixa_id,
  c.nome as caixa_nome,
  f.data_fechamento,
  f.status,
  f.valor_contado,
  f.valor_sistema,
  f.diferenca,
  f.created_at,
  f.updated_at
FROM fechamentos_caixa f
LEFT JOIN caixas c ON f.caixa_id = c.id
WHERE DATE(f.data_fechamento) >= '2026-02-18'
ORDER BY f.caixa_id, f.data_fechamento DESC;

-- Query 5: Ver estrutura da tabela
-- UNCOMMENT to see table structure (informação de schema)
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
-- WHERE table_name = 'fechamentos_caixa'
-- ORDER BY ordinal_position;
