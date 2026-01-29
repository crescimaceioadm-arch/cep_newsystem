-- Correção: Contar apenas AVALIAÇÕES na preferência de pagamento
-- O sistema estava contando todos os atendimentos (avaliações + vendas)

-- 1. Atualizar a função de trigger para filtrar apenas avaliações
CREATE OR REPLACE FUNCTION atualizar_cliente_pagamento_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  is_gira BOOLEAN;
  inc_gira INT := 0;
  inc_pix_dinheiro INT := 0;
  total_aval INT;
  total_gira_count INT;
  total_pix_din_count INT;
  percentual FLOAT;
BEGIN
  -- Só processa AVALIAÇÕES finalizadas
  IF NEW.tipo_atendimento = 'avaliacao'
     AND ((TG_OP = 'INSERT' AND NEW.status = 'finalizado')
          OR (TG_OP = 'UPDATE' AND NEW.status = 'finalizado' AND (OLD.status IS DISTINCT FROM 'finalizado'))) THEN

    -- Determina se qualquer método contém "gira"
    is_gira := (
      COALESCE(NEW.pagamento_1_metodo, '') ILIKE '%gira%'
      OR COALESCE(NEW.pagamento_2_metodo, '') ILIKE '%gira%'
      OR COALESCE(NEW.pagamento_3_metodo, '') ILIKE '%gira%'
      OR COALESCE(NEW.pagamento_4_metodo, '') ILIKE '%gira%'
    );

    IF is_gira THEN
      inc_gira := 1;
    ELSE
      inc_pix_dinheiro := 1; -- inclui PIX ou Dinheiro ou outros não-gira
    END IF;

    -- Garante existência do registro
    INSERT INTO cliente_pagamento_preferencia (nome_cliente, total_avaliacoes, total_gira, total_pix_dinheiro, percentual_gira, atualizado_em)
    VALUES (NEW.nome_cliente, 0, 0, 0, 0, NOW())
    ON CONFLICT (nome_cliente) DO NOTHING;

    -- Incrementa contadores
    UPDATE cliente_pagamento_preferencia
    SET
      total_avaliacoes = total_avaliacoes + 1,
      total_gira = total_gira + inc_gira,
      total_pix_dinheiro = total_pix_dinheiro + inc_pix_dinheiro,
      atualizado_em = NOW()
    WHERE nome_cliente = NEW.nome_cliente;

    -- Recalcula percentual
    SELECT total_gira, total_pix_dinheiro, (total_gira + total_pix_dinheiro)
    INTO total_gira_count, total_pix_din_count, total_aval
    FROM cliente_pagamento_preferencia
    WHERE nome_cliente = NEW.nome_cliente;

    IF total_aval > 0 THEN
      percentual := (total_gira_count::FLOAT / total_aval::FLOAT) * 100;
    ELSE
      percentual := 0;
    END IF;

    UPDATE cliente_pagamento_preferencia
    SET percentual_gira = percentual
    WHERE nome_cliente = NEW.nome_cliente;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Reconstruir a tabela com dados corretos (apenas avaliações)
TRUNCATE TABLE cliente_pagamento_preferencia;

WITH base AS (
  SELECT
    nome_cliente,
    (
      COALESCE(pagamento_1_metodo, '') ILIKE '%gira%'
      OR COALESCE(pagamento_2_metodo, '') ILIKE '%gira%'
      OR COALESCE(pagamento_3_metodo, '') ILIKE '%gira%'
      OR COALESCE(pagamento_4_metodo, '') ILIKE '%gira%'
    ) AS is_gira
  FROM atendimentos
  WHERE status = 'finalizado'
    AND tipo_atendimento = 'avaliacao'  -- <<<< FILTRO ADICIONADO
)
INSERT INTO cliente_pagamento_preferencia (nome_cliente, total_avaliacoes, total_gira, total_pix_dinheiro, percentual_gira, atualizado_em)
SELECT
  nome_cliente,
  COUNT(*) AS total_avaliacoes,
  SUM(CASE WHEN is_gira THEN 1 ELSE 0 END) AS total_gira,
  SUM(CASE WHEN is_gira THEN 0 ELSE 1 END) AS total_pix_dinheiro,
  CASE WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN is_gira THEN 1 ELSE 0 END)::FLOAT / COUNT(*)::FLOAT) * 100 ELSE 0 END AS percentual_gira,
  NOW() AS atualizado_em
FROM base
GROUP BY nome_cliente
ON CONFLICT (nome_cliente) DO UPDATE
SET
  total_avaliacoes = EXCLUDED.total_avaliacoes,
  total_gira = EXCLUDED.total_gira,
  total_pix_dinheiro = EXCLUDED.total_pix_dinheiro,
  percentual_gira = EXCLUDED.percentual_gira,
  atualizado_em = NOW();
