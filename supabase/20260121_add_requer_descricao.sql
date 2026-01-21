-- Adicionar campo requer_descricao para controlar se categoria precisa de descrição

ALTER TABLE item_categories ADD COLUMN IF NOT EXISTS requer_descricao BOOLEAN DEFAULT false;

-- Configurar quais categorias precisam de descrição
-- Itens Grandes: pede valor E descrição
UPDATE item_categories SET requer_descricao = true WHERE slug = 'itens_grandes';

-- Fralda e Bolsa Escolar: já tem requer_valor = true, mas não pede descrição
UPDATE item_categories SET requer_descricao = false WHERE slug IN ('fralda', 'bolsa-escolar');

-- Verificar
SELECT slug, nome, requer_valor, requer_descricao FROM item_categories ORDER BY ordem;
