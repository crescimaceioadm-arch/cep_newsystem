-- Fix category ordering: ensure Bolsa Escolar is 8th (last)
UPDATE item_categories SET ordem = 1 WHERE slug = 'baby';
UPDATE item_categories SET ordem = 2 WHERE slug = '1a16';
UPDATE item_categories SET ordem = 3 WHERE slug = 'calcados';
UPDATE item_categories SET ordem = 4 WHERE slug = 'brinquedos';
UPDATE item_categories SET ordem = 5 WHERE slug = 'itens_medios';
UPDATE item_categories SET ordem = 6 WHERE slug = 'itens_grandes';
UPDATE item_categories SET ordem = 7 WHERE slug = 'fralda';
UPDATE item_categories SET ordem = 8 WHERE slug = 'bolsa-escolar';

-- Verify order
SELECT id, slug, nome, ordem, requer_valor FROM item_categories ORDER BY ordem;
