-- ============================================================
-- LIMPEZA: Deletar TODAS movimentações de ajuste manual
-- ============================================================
-- PROBLEMA: O botão "Ajustar Saldo" estava criando movimentações
--           ao invés de fechamentos, causando duplicação de valores
--
-- SOLUÇÃO: Deletar todas essas movimentações incorretas
--          (O código já foi corrigido para criar fechamentos)
-- ============================================================

BEGIN;

-- 1️⃣ VERIFICAR quantas movimentações de ajuste existem
SELECT 
  'ANTES DA LIMPEZA' AS momento,
  COUNT(*) AS total_ajustes,
  SUM(valor) AS soma_valores
FROM movimentacoes_caixa
WHERE motivo LIKE '%Ajuste manual de saldo%'
   OR motivo LIKE '%ajuste%admin%';

-- 2️⃣ VISUALIZAR todas (para confirmar antes de deletar)
SELECT 
  id,
  data_hora,
  tipo,
  valor,
  motivo,
  caixa_origem_id,
  caixa_destino_id,
  (SELECT nome FROM caixas WHERE id = caixa_origem_id) AS caixa_origem,
  (SELECT nome FROM caixas WHERE id = caixa_destino_id) AS caixa_destino
FROM movimentacoes_caixa
WHERE motivo LIKE '%Ajuste manual de saldo%'
   OR motivo LIKE '%ajuste%admin%'
ORDER BY data_hora DESC;

-- 3️⃣ DELETAR todas as movimentações de ajuste
DELETE FROM movimentacoes_caixa
WHERE motivo LIKE '%Ajuste manual de saldo%'
   OR motivo LIKE '%ajuste%admin%';

-- 4️⃣ CONFIRMAR deleção
SELECT 
  'APÓS LIMPEZA' AS momento,
  COUNT(*) AS total_ajustes_restantes
FROM movimentacoes_caixa
WHERE motivo LIKE '%Ajuste manual de saldo%'
   OR motivo LIKE '%ajuste%admin%';

COMMIT;

-- ============================================================
-- PRÓXIMO PASSO:
-- Execute o script 20260219_fix_duplicacao_entrada_1600.sql
-- para criar os fechamentos corretos
-- ============================================================
