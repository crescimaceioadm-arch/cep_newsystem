-- ========================================
-- CORREÇÃO: Registrar TODAS as vendas em dinheiro
-- na tabela movimentacoes_caixa
-- ========================================
-- 
-- PROBLEMA: O sistema não registrava vendas quando 
-- o dinheiro não era o primeiro método de pagamento.
-- 
-- SOLUÇÃO: Processar os 3 métodos de pagamento e
-- somar TODOS os valores em dinheiro.
-- ========================================

-- 1. Remover trigger antigo (se existir)
DROP TRIGGER IF EXISTS trg_venda_dinheiro ON vendas;
DROP FUNCTION IF EXISTS fn_registrar_venda_dinheiro();

-- 2. Criar função que processa TODOS os métodos de pagamento
CREATE OR REPLACE FUNCTION fn_registrar_venda_dinheiro()
RETURNS TRIGGER AS $$
DECLARE
  v_caixa_id UUID;
  v_total_dinheiro NUMERIC := 0;
BEGIN
  -- Buscar o ID do caixa pelo nome
  SELECT id INTO v_caixa_id
  FROM caixas
  WHERE nome = NEW.caixa_origem;

  -- Se o caixa não for encontrado, usar 'Caixa 1' como fallback
  IF v_caixa_id IS NULL THEN
    SELECT id INTO v_caixa_id
    FROM caixas
    WHERE nome = 'Caixa 1';
  END IF;

  -- Se ainda não encontrar, abortar
  IF v_caixa_id IS NULL THEN
    RAISE EXCEPTION 'Caixa não encontrado: %', COALESCE(NEW.caixa_origem, 'Caixa 1');
  END IF;

  -- ============================================
  -- PROCESSAR OS 3 MÉTODOS DE PAGAMENTO
  -- ============================================
  
  -- Método 1
  IF LOWER(TRIM(NEW.metodo_pagto_1)) = 'dinheiro' THEN
    v_total_dinheiro := v_total_dinheiro + COALESCE(NEW.valor_pagto_1, 0);
  END IF;

  -- Método 2
  IF LOWER(TRIM(NEW.metodo_pagto_2)) = 'dinheiro' THEN
    v_total_dinheiro := v_total_dinheiro + COALESCE(NEW.valor_pagto_2, 0);
  END IF;

  -- Método 3
  IF LOWER(TRIM(NEW.metodo_pagto_3)) = 'dinheiro' THEN
    v_total_dinheiro := v_total_dinheiro + COALESCE(NEW.valor_pagto_3, 0);
  END IF;

  -- ============================================
  -- REGISTRAR MOVIMENTAÇÃO SE HOUVER DINHEIRO
  -- ============================================
  
  IF v_total_dinheiro > 0 THEN
    -- Inserir na tabela movimentacoes_caixa
    INSERT INTO movimentacoes_caixa (
      caixa_origem_id,
      caixa_destino_id,
      tipo,
      valor,
      motivo,
      data_hora
    ) VALUES (
      NULL,                     -- origem: NULL (cliente pagou)
      v_caixa_id,              -- destino: caixa que recebeu
      'venda',                 -- tipo
      v_total_dinheiro,        -- valor TOTAL em dinheiro
      'Venda #' || NEW.id,     -- motivo
      NEW.created_at           -- data/hora da venda
    );

    -- Atualizar saldo do caixa
    UPDATE caixas
    SET saldo_atual = saldo_atual + v_total_dinheiro
    WHERE id = v_caixa_id;

    -- Log para debug
    RAISE NOTICE 'Venda registrada: ID=%, Caixa=%, Dinheiro=R$%', 
      NEW.id, NEW.caixa_origem, v_total_dinheiro;
  ELSE
    RAISE NOTICE 'Venda sem dinheiro: ID=%, Total=R$%', 
      NEW.id, NEW.valor_total_venda;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar trigger AFTER INSERT
CREATE TRIGGER trg_venda_dinheiro
AFTER INSERT ON vendas
FOR EACH ROW
EXECUTE FUNCTION fn_registrar_venda_dinheiro();

-- ========================================
-- COMENTÁRIOS E TESTES
-- ========================================

COMMENT ON FUNCTION fn_registrar_venda_dinheiro() IS 
'Registra automaticamente vendas em dinheiro na tabela movimentacoes_caixa.
Processa os 3 métodos de pagamento e soma todos os valores em dinheiro.
Exemplo: PIX R$100 + Dinheiro R$100 = registra R$100 em movimentacoes_caixa';

-- Para testar manualmente:
-- INSERT INTO vendas (
--   caixa_origem, valor_total_venda, qtd_total_itens,
--   metodo_pagto_1, valor_pagto_1,
--   metodo_pagto_2, valor_pagto_2
-- ) VALUES (
--   'Caixa 1', 200, 5,
--   'PIX', 100,
--   'Dinheiro', 100
-- );
-- 
-- Resultado esperado:
-- - 1 registro em movimentacoes_caixa com valor = 100 (apenas o dinheiro)
-- - saldo_atual do 'Caixa 1' aumenta em 100
