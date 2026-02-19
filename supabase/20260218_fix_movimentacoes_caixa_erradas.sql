-- Fix: Corrigir movimentações de vendas que foram registradas com caixa errado
-- Data: 2026-02-18
-- Problema: 2 vendas foram criadas em Caixa 2, mas reg registradas em Caixa 1
-- 
-- Vendas afetadas:
-- - bf00f843-fdc2-4e78-ad33-6f2c729a5f03 (Caixa 2, mas movimentação em Caixa 1)
-- - cba8ce5f-ec90-43d5-a7ab-45a1b4473703 (Caixa 2, mas movimentação em Caixa 1)

-- IDs para referência:
-- Caixa 1: 83b48d64-60a6-4751-afc5-d9e86a9f6080
-- Caixa 2: b9962a74-c456-4197-91ae-b231fe15b340

-- 1. Verificar estado atual ANTES da correção
SELECT 
  m.id as movimentacao_id,
  m.caixa_destino_id,
  c.nome as caixa_nome_atual,
  m.tipo,
  m.motivo,
  m.valor
FROM movimentacoes_caixa m
LEFT JOIN caixas c ON m.caixa_destino_id = c.id
WHERE m.motivo LIKE '%bf00f843%' OR m.motivo LIKE '%cba8ce5f%'
ORDER BY m.motivo;

-- 2. Atualizar as movimentações para apontar para Caixa 2 corretamente
UPDATE movimentacoes_caixa
SET caixa_destino_id = 'b9962a74-c456-4197-91ae-b231fe15b340'  -- Caixa 2
WHERE motivo IN (
  'Venda #bf00f843-fdc2-4e78-ad33-6f2c729a5f03',
  'Venda #cba8ce5f-ec90-43d5-a7ab-45a1b4473703'
);

-- 3. Verificar estado DEPOIS da correção
SELECT 
  m.id as movimentacao_id,
  m.caixa_destino_id,
  c.nome as caixa_nome_correto,
  m.tipo,
  m.motivo,
  m.valor
FROM movimentacoes_caixa m
LEFT JOIN caixas c ON m.caixa_destino_id = c.id
WHERE m.motivo LIKE '%bf00f843%' OR m.motivo LIKE '%cba8ce5f%'
ORDER BY m.motivo;

-- 4. Verificar que as vendas ainda têm caixa_origem correto
SELECT id, caixa_origem FROM vendas 
WHERE id IN ('bf00f843-fdc2-4e78-ad33-6f2c729a5f03', 'cba8ce5f-ec90-43d5-a7ab-45a1b4473703')
ORDER BY id;
