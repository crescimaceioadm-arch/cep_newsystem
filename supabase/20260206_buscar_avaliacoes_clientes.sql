-- ============================================
-- BUSCAR AVALIAÇÕES POR CLIENTE (sem created_at)
-- ============================================
-- Usa hora_chegada e hora_encerramento (colunas reais)

-- 1) Avaliações de ANA CLAUDIA
SELECT
  id,
  nome_cliente,
  origem_avaliacao,
  status,
  hora_chegada,
  hora_encerramento,
  pagamento_1_metodo,
  pagamento_1_valor,
  pagamento_2_metodo,
  pagamento_2_valor,
  pagamento_3_metodo,
  pagamento_3_valor
FROM atendimentos
WHERE LOWER(TRIM(nome_cliente)) LIKE '%ana claudia%'
ORDER BY hora_chegada DESC;

-- 2) Avaliações de LARISSA FONTES PEREIRA
SELECT
  id,
  nome_cliente,
  origem_avaliacao,
  status,
  hora_chegada,
  hora_encerramento,
  pagamento_1_metodo,
  pagamento_1_valor,
  pagamento_2_metodo,
  pagamento_2_valor,
  pagamento_3_metodo,
  pagamento_3_valor
FROM atendimentos
WHERE LOWER(TRIM(nome_cliente)) LIKE '%larissa fontes pereira%'
ORDER BY hora_chegada DESC;

-- 3) Variante: buscar por partes do nome (caso exista abreviação)
SELECT
  id,
  nome_cliente,
  origem_avaliacao,
  status,
  hora_chegada,
  hora_encerramento
FROM atendimentos
WHERE (
    LOWER(TRIM(nome_cliente)) LIKE '%ana%claudia%'
    OR LOWER(TRIM(nome_cliente)) LIKE '%larissa%fontes%pereira%'
  )
ORDER BY nome_cliente, hora_chegada DESC;
