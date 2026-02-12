-- ============================================
-- REBUILD: cliente_pagamento_preferencia
-- ============================================
-- Recalcula toda a tabela a partir de atendimentos finalizados
-- Segurança: mantém backup em tabela temporária e roda em transação

BEGIN;

-- Backup temporário (sessão atual)
CREATE TEMP TABLE cliente_pagamento_preferencia_backup AS
SELECT * FROM cliente_pagamento_preferencia;

-- Limpa tabela
TRUNCATE TABLE cliente_pagamento_preferencia;

-- Rebuild completo
WITH base AS (
  SELECT
    nome_cliente,
    (
      COALESCE(pagamento_1_metodo, '') ILIKE '%gira%'
      OR COALESCE(pagamento_2_metodo, '') ILIKE '%gira%'
      OR COALESCE(pagamento_3_metodo, '') ILIKE '%gira%'
    ) AS is_gira
  FROM atendimentos
  WHERE status = 'finalizado'
)
INSERT INTO cliente_pagamento_preferencia (
  nome_cliente,
  total_avaliacoes,
  total_gira,
  total_pix_dinheiro,
  percentual_gira,
  atualizado_em
)
SELECT
  nome_cliente,
  COUNT(*) AS total_avaliacoes,
  SUM(CASE WHEN is_gira THEN 1 ELSE 0 END) AS total_gira,
  SUM(CASE WHEN is_gira THEN 0 ELSE 1 END) AS total_pix_dinheiro,
  CASE WHEN COUNT(*) > 0
    THEN (SUM(CASE WHEN is_gira THEN 1 ELSE 0 END)::FLOAT / COUNT(*)::FLOAT) * 100
    ELSE 0
  END AS percentual_gira,
  NOW() AS atualizado_em
FROM base
GROUP BY nome_cliente;

COMMIT;

-- Se precisar desfazer, rode (na mesma sessão) antes do COMMIT:
-- ROLLBACK;
-- Para restaurar manualmente após commit:
-- TRUNCATE TABLE cliente_pagamento_preferencia;
-- INSERT INTO cliente_pagamento_preferencia SELECT * FROM cliente_pagamento_preferencia_backup;