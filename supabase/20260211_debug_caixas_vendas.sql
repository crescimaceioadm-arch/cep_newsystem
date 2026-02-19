-- Script para DEBUG: Investigar problema de vendas registradas em caixa errado

-- 1. Ver todos os caixas existentes
SELECT id, nome, ativo FROM caixas ORDER BY nome;

-- 2. Ver dados das duas vendas problemáticas
SELECT 
  id, 
  caixa_origem, 
  valor_total_venda, 
  metodo_pagto_1,
  valor_pagto_1,
  created_at 
FROM vendas 
WHERE id IN ('bf00f843-fdc2-4e78-ad33-6f2c729a5f03', 'cba8ce5f-ec90-43d5-a7ab-45a1b4473703')
ORDER BY created_at DESC;

-- 3. Ver as movimentações registradas para essas vendas
SELECT 
  m.id,
  m.tipo,
  m.caixa_origem_id,
  m.caixa_destino_id,
  c_dest.nome as caixa_destino_nome,
  c_orig.nome as caixa_origem_nome,
  m.valor,
  m.motivo,
  m.data_hora
FROM movimentacoes_caixa m
LEFT JOIN caixas c_dest ON m.caixa_destino_id = c_dest.id
LEFT JOIN caixas c_orig ON m.caixa_origem_id = c_orig.id
WHERE m.motivo LIKE '%bf00f843-fdc2-4e78-ad33-6f2c729a5f03%'
   OR m.motivo LIKE '%cba8ce5f-ec90-43d5-a7ab-45a1b4473703%'
ORDER BY m.data_hora DESC;

-- 4. Verificar quantas movimentações existem para cada venda
SELECT 
  SUBSTRING(motivo, 8, 36) as venda_id,
  COUNT(*) as qtd_movimentacoes,
  SUM(valor) as valor_total
FROM movimentacoes_caixa
WHERE tipo = 'venda'
GROUP BY SUBSTRING(motivo, 8, 36)
HAVING SUBSTRING(motivo, 8, 36) IN ('bf00f843-fdc2-4e78-ad33-6f2c729a5f03', 'cba8ce5f-ec90-43d5-a7ab-45a1b4473703');

-- 5. Ver se há caixas com nome similar
SELECT id, nome FROM caixas WHERE nome ILIKE '%1%' OR nome ILIKE '%2%';

-- 6. Ver movimentações de Caixa 1 nas últimas 24h (para contexto)
SELECT 
  m.id,
  m.tipo,
  c_dest.nome as caixa_destino_nome,
  m.valor,
  m.motivo,
  m.data_hora
FROM movimentacoes_caixa m
LEFT JOIN caixas c_dest ON m.caixa_destino_id = c_dest.id
WHERE c_dest.nome = 'Caixa 1'
  AND m.data_hora > NOW() - INTERVAL '3 days'
ORDER BY m.data_hora DESC;
