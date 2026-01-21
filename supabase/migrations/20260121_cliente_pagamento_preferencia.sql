-- Tabela para armazenar preferência de pagamento por cliente
CREATE TABLE IF NOT EXISTS cliente_pagamento_preferencia (
  nome_cliente TEXT PRIMARY KEY,
  total_avaliacoes INTEGER DEFAULT 0,
  total_gira INTEGER DEFAULT 0,
  total_pix_dinheiro INTEGER DEFAULT 0,
  percentual_gira FLOAT DEFAULT 0,
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Função para atualizar as estatísticas de pagamento quando uma avaliação é finalizada
CREATE OR REPLACE FUNCTION atualizar_cliente_pagamento_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  metodo_pagamento TEXT;
  total_aval INTEGER;
  total_gira_count INTEGER;
  total_pix_din_count INTEGER;
  percentual FLOAT;
BEGIN
  -- Apenas processar quando status muda para 'finalizado'
  IF NEW.status = 'finalizado' AND OLD.status != 'finalizado' THEN
    -- Obter o método de pagamento principal (sempre existe em avaliações finalizadas)
    metodo_pagamento := LOWER(COALESCE(NEW.pagamento_1_metodo, ''));
    
    -- Se a cliente não existe ainda, criar registro
    INSERT INTO cliente_pagamento_preferencia (nome_cliente, total_avaliacoes, atualizado_em)
    VALUES (NEW.nome_cliente, 0, NOW())
    ON CONFLICT (nome_cliente) DO NOTHING;
    
    -- Incrementar contadores baseado no método de pagamento
    IF metodo_pagamento ILIKE '%gira%' THEN
      UPDATE cliente_pagamento_preferencia
      SET 
        total_avaliacoes = total_avaliacoes + 1,
        total_gira = total_gira + 1,
        atualizado_em = NOW()
      WHERE nome_cliente = NEW.nome_cliente;
    ELSE
      -- PIX, Dinheiro, ou qualquer outro que não seja Gira
      UPDATE cliente_pagamento_preferencia
      SET 
        total_avaliacoes = total_avaliacoes + 1,
        total_pix_dinheiro = total_pix_dinheiro + 1,
        atualizado_em = NOW()
      WHERE nome_cliente = NEW.nome_cliente;
    END IF;
    
    -- Recalcular percentual
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

-- Trigger para atendimentos (atualiza stats quando finaliza)
DROP TRIGGER IF EXISTS trigger_atendimento_pagamento_stats ON atendimentos;
CREATE TRIGGER trigger_atendimento_pagamento_stats
AFTER UPDATE ON atendimentos
FOR EACH ROW
EXECUTE FUNCTION atualizar_cliente_pagamento_stats();
