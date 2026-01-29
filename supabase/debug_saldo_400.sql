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

-- 3. Ver todas as movimentações do caixa "Avaliação" de 27/01 (CORRIGIDO TIMEZONE)
SELECT 
  id,
  tipo,
  valor,
  data_hora AT TIME ZONE 'America/Sao_Paulo' as data_hora_br,
  motivo,
  caixa_origem_id,
  caixa_destino_id
FROM movimentacoes_caixa
WHERE (caixa_origem_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%')
   OR caixa_destino_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%'))
AND DATE(data_hora AT TIME ZONE 'America/Sao_Paulo') = '2026-01-27'::date
ORDER BY data_hora DESC;

-- 4. Cálculo manual do saldo para 27/01 - SOMENTE DINHEIRO
-- Saldo inicial (do fechamento 26/01) + Movimentações de dinheiro de 27/01
WITH caixa_info AS (
  SELECT id, nome, saldo_atual
  FROM caixas
  WHERE nome ILIKE '%avalia%'
),
ultimo_fechamento AS (
  SELECT COALESCE(valor_contado, 0) as saldo_inicial
  FROM fechamentos_caixa
  WHERE caixa_id IN (SELECT id FROM caixa_info)
  AND DATE(data_fechamento AT TIME ZONE 'America/Sao_Paulo') = '2026-01-26'::date
  ORDER BY data_fechamento DESC
  LIMIT 1
),
mov_27_janeiro AS (
  SELECT 
    SUM(CASE WHEN tipo IN ('venda', 'entrada', 'transferencia_entre_caixas') 
             AND caixa_origem_id IN (SELECT id FROM caixa_info) THEN valor 
        WHEN tipo = 'transferencia_entre_caixas' 
             AND caixa_destino_id IN (SELECT id FROM caixa_info) THEN valor
        ELSE 0 END) as entradas,
    SUM(CASE WHEN tipo IN ('pagamento_avaliacao', 'saida', 'transferencia_entre_caixas')
             AND caixa_origem_id IN (SELECT id FROM caixa_info) THEN valor
        ELSE 0 END) as saidas
  FROM movimentacoes_caixa
  WHERE (caixa_origem_id IN (SELECT id FROM caixa_info)
     OR caixa_destino_id IN (SELECT id FROM caixa_info))
  AND DATE(data_hora AT TIME ZONE 'America/Sao_Paulo') = '2026-01-27'::date
)
SELECT 
  (SELECT nome FROM caixa_info) as caixa,
  (SELECT saldo_inicial FROM ultimo_fechamento) as saldo_inicial_26_01,
  (SELECT COALESCE(entradas, 0) FROM mov_27_janeiro) as entradas_27_01,
  (SELECT COALESCE(saidas, 0) FROM mov_27_janeiro) as saidas_27_01,
  (SELECT saldo_inicial FROM ultimo_fechamento) + 
  (SELECT COALESCE(entradas, 0) FROM mov_27_janeiro) -
  (SELECT COALESCE(saidas, 0) FROM mov_27_janeiro) as saldo_esperado_27_01,
  (SELECT saldo_atual FROM caixa_info) as saldo_atual_tabela;

-- 5. INVESTIGAR: Ver TODAS as movimentações do dia 27/01
-- HIPÓTESE: Falta fechamento do dia 27/01, por isso o saldo não foi consolidado
SELECT 
  id,
  tipo,
  valor,
  data_hora AT TIME ZONE 'America/Sao_Paulo' as data_hora_br,
  motivo,
  CASE 
    WHEN caixa_origem_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%') THEN 'SAÍDA de Avaliação'
    WHEN caixa_destino_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%') THEN 'ENTRADA em Avaliação'
  END as fluxo
FROM movimentacoes_caixa
WHERE (caixa_origem_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%')
   OR caixa_destino_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%'))
AND DATE(data_hora AT TIME ZONE 'America/Sao_Paulo') = '2026-01-27'::date
ORDER BY data_hora;

-- 6. VERIFICAR: Fechamento do dia 27/01 existe?
SELECT 
  id,
  DATE(data_fechamento AT TIME ZONE 'America/Sao_Paulo') as data,
  valor_sistema,
  valor_contado,
  diferenca,
  status,
  data_fechamento AT TIME ZONE 'America/Sao_Paulo' as data_fechamento_br
FROM fechamentos_caixa
WHERE caixa_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%')
AND DATE(data_fechamento AT TIME ZONE 'America/Sao_Paulo') = '2026-01-27'::date;

-- 8. DIAGNÓSTICO: Qual é o saldo_inicial que o hook useSaldoInicial está pegando em 27/01?
-- Este é o dado que o useSaldoInicial deveria retornar
WITH caixa_avalia AS (
  SELECT id FROM caixas WHERE nome ILIKE '%avalia%'
)
SELECT 
  'Usando data_fechamento' as metodo,
  DATE(data_fechamento AT TIME ZONE 'America/Sao_Paulo') as data,
  COALESCE(valor_contado, 0) as saldo,
  status,
  data_fechamento
FROM fechamentos_caixa
WHERE caixa_id = (SELECT id FROM caixa_avalia)
AND DATE(data_fechamento AT TIME ZONE 'America/Sao_Paulo') < '2026-01-27'::date
ORDER BY data_fechamento DESC
LIMIT 1;

-- 9. INVESTIGAR: O saldo inicial deveria vir do último fechamento anterior a 27/01
-- Hook useSaldoInicial busca o fechamento ANTERIOR à data especificada
SELECT 
  'Último fechamento ANTES de 27/01' as descricao,
  id,
  data_fechamento AT TIME ZONE 'America/Sao_Paulo' as data_br,
  valor_contado as saldo_inicial_para_27,
  diferenca,
  status
FROM fechamentos_caixa
WHERE caixa_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%')
AND data_fechamento < '2026-01-27T00:00:00'::timestamptz
ORDER BY data_fechamento DESC
LIMIT 1;

-- 10. VERIFICAR: Qual era a HORA EXATA em que o fechamento de 27/01 foi criado?
-- Talvez o hook tenha pegado as movimentações até a hora X, mas o fechamento foi criado depois
SELECT 
  id,
  data_fechamento,
  data_fechamento AT TIME ZONE 'America/Sao_Paulo' as data_br,
  valor_sistema,
  valor_contado,
  status,
  justificativa
FROM fechamentos_caixa
WHERE caixa_id IN (SELECT id FROM caixas WHERE nome ILIKE '%avalia%')
AND DATE(data_fechamento AT TIME ZONE 'America/Sao_Paulo') = '2026-01-27'::date;
