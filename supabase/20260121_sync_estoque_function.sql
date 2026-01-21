-- Função para sincronizar tabela estoque com saldo atual (compras - vendas)

-- Primeiro, garantir que categoria_id seja UNIQUE na tabela estoque
ALTER TABLE estoque DROP CONSTRAINT IF EXISTS estoque_categoria_id_key;
ALTER TABLE estoque ADD CONSTRAINT estoque_categoria_id_key UNIQUE (categoria_id);

CREATE OR REPLACE FUNCTION sync_estoque()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  cat RECORD;
  total_comprado INTEGER;
  total_vendido INTEGER;
  saldo_atual INTEGER;
BEGIN
  -- Para cada categoria ativa
  FOR cat IN SELECT id, slug, nome FROM item_categories WHERE ativo = true ORDER BY ordem
  LOOP
    -- Calcular total comprado (atendimentos) das pivot tables
    SELECT COALESCE(SUM(quantidade), 0) INTO total_comprado
    FROM atendimento_itens
    WHERE categoria_id = cat.id;
    
    -- Calcular total vendido (vendas) das pivot tables
    SELECT COALESCE(SUM(quantidade), 0) INTO total_vendido
    FROM venda_itens
    WHERE categoria_id = cat.id;
    
    -- Calcular saldo
    saldo_atual := total_comprado - total_vendido;
    
    -- Inserir ou atualizar na tabela estoque
    INSERT INTO estoque (categoria, categoria_id, quantidade_atual)
    VALUES (cat.nome, cat.id, saldo_atual)
    ON CONFLICT (categoria_id) 
    DO UPDATE SET 
      categoria = cat.nome,
      quantidade_atual = saldo_atual;
      
  END LOOP;
  
  RAISE NOTICE 'Estoque sincronizado com sucesso!';
END;
$$;

-- Executar a função pela primeira vez para popular a tabela
SELECT sync_estoque();

-- Verificar resultado
SELECT categoria, quantidade_atual FROM estoque ORDER BY categoria;
