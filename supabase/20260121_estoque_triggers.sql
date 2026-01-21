-- Triggers para atualizar estoque automaticamente após compras/vendas

-- Função que atualiza o estoque de uma categoria específica
CREATE OR REPLACE FUNCTION update_estoque_categoria(cat_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  cat_nome TEXT;
  total_comprado INTEGER;
  total_vendido INTEGER;
  saldo_atual INTEGER;
BEGIN
  -- Buscar nome da categoria
  SELECT nome INTO cat_nome FROM item_categories WHERE id = cat_id;
  
  IF cat_nome IS NULL THEN
    RETURN;
  END IF;
  
  -- Calcular total comprado
  SELECT COALESCE(SUM(quantidade), 0) INTO total_comprado
  FROM atendimento_itens
  WHERE categoria_id = cat_id;
  
  -- Calcular total vendido
  SELECT COALESCE(SUM(quantidade), 0) INTO total_vendido
  FROM venda_itens
  WHERE categoria_id = cat_id;
  
  -- Calcular saldo
  saldo_atual := total_comprado - total_vendido;
  
  -- Inserir ou atualizar
  INSERT INTO estoque (categoria, categoria_id, quantidade_atual)
  VALUES (cat_nome, cat_id, saldo_atual)
  ON CONFLICT (categoria_id) 
  DO UPDATE SET 
    categoria = cat_nome,
    quantidade_atual = saldo_atual;
END;
$$;

-- Trigger para atendimento_itens (compras)
CREATE OR REPLACE FUNCTION trigger_update_estoque_compra()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_estoque_categoria(OLD.categoria_id);
    RETURN OLD;
  ELSE
    PERFORM update_estoque_categoria(NEW.categoria_id);
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger para venda_itens (vendas)
CREATE OR REPLACE FUNCTION trigger_update_estoque_venda()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_estoque_categoria(OLD.categoria_id);
    RETURN OLD;
  ELSE
    PERFORM update_estoque_categoria(NEW.categoria_id);
    RETURN NEW;
  END IF;
END;
$$;

-- Criar triggers
DROP TRIGGER IF EXISTS atendimento_itens_estoque_trigger ON atendimento_itens;
CREATE TRIGGER atendimento_itens_estoque_trigger
AFTER INSERT OR UPDATE OR DELETE ON atendimento_itens
FOR EACH ROW
EXECUTE FUNCTION trigger_update_estoque_compra();

DROP TRIGGER IF EXISTS venda_itens_estoque_trigger ON venda_itens;
CREATE TRIGGER venda_itens_estoque_trigger
AFTER INSERT OR UPDATE OR DELETE ON venda_itens
FOR EACH ROW
EXECUTE FUNCTION trigger_update_estoque_venda();

-- Sincronizar estoque inicial
SELECT sync_estoque();
