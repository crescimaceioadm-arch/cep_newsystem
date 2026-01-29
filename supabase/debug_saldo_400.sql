-- Investigar por que o saldo de avaliação é R$400

-- 1. Ver saldo_atual configurado no caixa "Avaliação"
SELECT id, nome, saldo_atual, updated_at
FROM caixas
WHERE nome ILIKE '%avalia%';

-- 2. Ver últimos fechamentos do caixa "Avaliação"
SELECT 
  id,
  caixa_id,
  data_fechamento,
  valor_sistema,
  valor_contado,
  diferenca,
  status,
  created_at
FROM fechamentos_caixa
WHERE caixa_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%')
ORDER BY created_at DESC
LIMIT 10;

-- 3. Ver todas as movimentações do caixa "Avaliação" de hoje
SELECT 
  id,
  tipo,
  valor,
  data_hora,
  motivo
FROM movimentacoes_caixa
WHERE (caixa_origem_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%')
   OR caixa_destino_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%'))
AND DATE(data_hora AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo'
ORDER BY data_hora DESC;

-- 4. Cálculo manual do saldo de hoje
-- Saldo inicial (do fechamento ontem) + Movimentações de hoje
WITH caixa_info AS (
  SELECT id, nome, saldo_atual
  FROM caixas
  WHERE nome ILIKE '%avalia%'
),
ultimo_fechamento AS (
  SELECT COALESCE(valor_contado, 0) as saldo_inicial
  FROM fechamentos_caixa
  WHERE caixa_id IN (SELECT id FROM caixa_info)
  AND DATE(data_fechamento) = (CURRENT_DATE - INTERVAL '1 day')
  ORDER BY created_at DESC
  LIMIT 1
),
mov_hoje AS (
  SELECT 
    SUM(CASE WHEN tipo IN ('venda', 'entrada', 'transferencia_entre_caixas') THEN valor ELSE 0 END) as entradas,
    SUM(CASE WHEN tipo IN ('pagamento_avaliacao', 'saida', 'transferencia_entre_caixas') THEN valor ELSE 0 END) as saidas
  FROM movimentacoes_caixa
  WHERE (caixa_origem_id IN (SELECT id FROM caixa_info)
     OR caixa_destino_id IN (SELECT id FROM caixa_info))
)
SELECT 
  (SELECT nome FROM caixa_info) as caixa,
  (SELECT saldo_inicial FROM ultimo_fechamento) as saldo_inicial,
  (SELECT COALESCE(entradas, 0) FROM mov_hoje) as entradas_hoje,
  (SELECT COALESCE(saidas, 0) FROM mov_hoje) as saidas_hoje,
  (SELECT saldo_inicial FROM ultimo_fechamento) + 
  (SELECT COALESCE(entradas, 0) FROM mov_hoje) -
  (SELECT COALESCE(saidas, 0) FROM mov_hoje) as saldo_calculado;
