-- ============================================
-- RECONCILIAÇÃO: Preferência de pagamento por cliente
-- ============================================
-- Cliente: LARISSA FONTES PEREIRA

-- 1) Listar todas as avaliações finalizadas do cliente
SELECT
  id,
  nome_cliente,
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
  AND status = 'finalizado'
ORDER BY hora_chegada DESC;

-- 2) Contagem real baseada em atendimentos (finalizados)
WITH base AS (
  SELECT
    id,
    nome_cliente,
    status,
    hora_chegada,
    (
      COALESCE(pagamento_1_metodo, '') ILIKE '%gira%'
      OR COALESCE(pagamento_2_metodo, '') ILIKE '%gira%'
      OR COALESCE(pagamento_3_metodo, '') ILIKE '%gira%'
    ) AS is_gira
  FROM atendimentos
  WHERE LOWER(TRIM(nome_cliente)) LIKE '%larissa fontes pereira%'
    AND status = 'finalizado'
)
SELECT
  COUNT(*) AS total_finalizadas,
  SUM(CASE WHEN is_gira THEN 1 ELSE 0 END) AS total_gira,
  SUM(CASE WHEN is_gira THEN 0 ELSE 1 END) AS total_pix_dinheiro
FROM base;

-- 3) Mostrar dados atuais na tabela de preferência
SELECT *
FROM cliente_pagamento_preferencia
WHERE LOWER(TRIM(nome_cliente)) LIKE '%larissa fontes pereira%';

-- ============================================
-- CHECAGEM: Avaliações da cliente LUCIANA DA SILVA LIMA
-- ============================================

-- A) Listar avaliações finalizadas da cliente
SELECT
  id,
  nome_cliente,
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
WHERE LOWER(TRIM(nome_cliente)) LIKE '%luciana da silva lima%'
  AND status = 'finalizado'
ORDER BY hora_chegada DESC;

-- B) Contagem real baseada em atendimentos (finalizados)
WITH base AS (
  SELECT
    id,
    nome_cliente,
    status,
    hora_chegada,
    (
      COALESCE(pagamento_1_metodo, '') ILIKE '%gira%'
      OR COALESCE(pagamento_2_metodo, '') ILIKE '%gira%'
      OR COALESCE(pagamento_3_metodo, '') ILIKE '%gira%'
    ) AS is_gira
  FROM atendimentos
  WHERE LOWER(TRIM(nome_cliente)) LIKE '%luciana da silva lima%'
    AND status = 'finalizado'
)
SELECT
  COUNT(*) AS total_finalizadas,
  SUM(CASE WHEN is_gira THEN 1 ELSE 0 END) AS total_gira,
  SUM(CASE WHEN is_gira THEN 0 ELSE 1 END) AS total_pix_dinheiro
FROM base;

-- C) Mostrar dados atuais na tabela de preferência
SELECT *
FROM cliente_pagamento_preferencia
WHERE LOWER(TRIM(nome_cliente)) LIKE '%luciana da silva lima%';

-- 4) Atualizar/ajustar a preferência desta cliente (se necessário)
-- Usa match por LOWER/TRIM para evitar divergência por espaços/variações
WITH base AS (
  SELECT
    nome_cliente,
    (
      COALESCE(pagamento_1_metodo, '') ILIKE '%gira%'
      OR COALESCE(pagamento_2_metodo, '') ILIKE '%gira%'
      OR COALESCE(pagamento_3_metodo, '') ILIKE '%gira%'
    ) AS is_gira
  FROM atendimentos
  WHERE LOWER(TRIM(nome_cliente)) LIKE '%larissa fontes pereira%'
    AND status = 'finalizado'
), agg AS (
  SELECT
    MAX(nome_cliente) AS nome_cliente,
    COUNT(*) AS total_avaliacoes,
    SUM(CASE WHEN is_gira THEN 1 ELSE 0 END) AS total_gira,
    SUM(CASE WHEN is_gira THEN 0 ELSE 1 END) AS total_pix_dinheiro,
    CASE WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN is_gira THEN 1 ELSE 0 END)::FLOAT / COUNT(*)::FLOAT) * 100 ELSE 0 END AS percentual_gira
  FROM base
)
UPDATE cliente_pagamento_preferencia
SET
  nome_cliente = (SELECT nome_cliente FROM agg),
  total_avaliacoes = (SELECT total_avaliacoes FROM agg),
  total_gira = (SELECT total_gira FROM agg),
  total_pix_dinheiro = (SELECT total_pix_dinheiro FROM agg),
  percentual_gira = (SELECT percentual_gira FROM agg),
  atualizado_em = NOW()
WHERE LOWER(TRIM(nome_cliente)) LIKE '%larissa fontes pereira%';

-- Se não existir registro, insere
WITH base AS (
  SELECT
    nome_cliente,
    (
      COALESCE(pagamento_1_metodo, '') ILIKE '%gira%'
      OR COALESCE(pagamento_2_metodo, '') ILIKE '%gira%'
      OR COALESCE(pagamento_3_metodo, '') ILIKE '%gira%'
    ) AS is_gira
  FROM atendimentos
  WHERE LOWER(TRIM(nome_cliente)) LIKE '%larissa fontes pereira%'
    AND status = 'finalizado'
), agg AS (
  SELECT
    MAX(nome_cliente) AS nome_cliente,
    COUNT(*) AS total_avaliacoes,
    SUM(CASE WHEN is_gira THEN 1 ELSE 0 END) AS total_gira,
    SUM(CASE WHEN is_gira THEN 0 ELSE 1 END) AS total_pix_dinheiro,
    CASE WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN is_gira THEN 1 ELSE 0 END)::FLOAT / COUNT(*)::FLOAT) * 100 ELSE 0 END AS percentual_gira
  FROM base
)
INSERT INTO cliente_pagamento_preferencia (nome_cliente, total_avaliacoes, total_gira, total_pix_dinheiro, percentual_gira, atualizado_em)
SELECT nome_cliente, total_avaliacoes, total_gira, total_pix_dinheiro, percentual_gira, NOW()
FROM agg
WHERE NOT EXISTS (
  SELECT 1
  FROM cliente_pagamento_preferencia
  WHERE LOWER(TRIM(nome_cliente)) LIKE '%larissa fontes pereira%'
);
