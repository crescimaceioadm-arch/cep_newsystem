-- ========================================
-- CORREÇÃO: Atualizar saldo_atual automaticamente
-- para TODAS as movimentações de caixa
-- ========================================
-- 
-- PROBLEMA: O sistema não atualiza o saldo_atual do caixa
-- quando movimentações de tipo 'pagamento_avaliacao', 'entrada',
-- 'saida' ou 'transferencia_entre_caixas' são inseridas.
-- 
-- SOLUÇÃO: Criar um trigger que atualiza o saldo_atual
-- automaticamente para TODAS as movimentações.
-- ========================================

-- 1. Remover trigger antigo (se existir)
DROP TRIGGER IF EXISTS trg_atualizar_saldo_movimentacao ON movimentacoes_caixa;
DROP FUNCTION IF EXISTS fn_atualizar_saldo_movimentacao();

-- 2. Criar função que atualiza o saldo para qualquer tipo de movimentação
CREATE OR REPLACE FUNCTION fn_atualizar_saldo_movimentacao()
RETURNS TRIGGER AS $$
BEGIN
  -- ============================================
  -- ATUALIZAR SALDO DOS CAIXAS ENVOLVIDOS
  -- ============================================
  
  -- TIPO: 'venda' - ENTRADA (destino recebe)
  IF NEW.tipo = 'venda' THEN
    IF NEW.caixa_destino_id IS NOT NULL THEN
      UPDATE caixas
      SET saldo_atual = saldo_atual + NEW.valor
      WHERE id = NEW.caixa_destino_id;
      
      RAISE NOTICE '💰 Venda: +R$% no caixa %', NEW.valor, NEW.caixa_destino_id;
    END IF;
  
  -- TIPO: 'pagamento_avaliacao' - SAÍDA (origem paga)
  ELSIF NEW.tipo = 'pagamento_avaliacao' THEN
    IF NEW.caixa_origem_id IS NOT NULL THEN
      UPDATE caixas
      SET saldo_atual = saldo_atual - NEW.valor
      WHERE id = NEW.caixa_origem_id;
      
      RAISE NOTICE '🎯 Pagamento Avaliação: -R$% do caixa %', NEW.valor, NEW.caixa_origem_id;
    END IF;
  
  -- TIPO: 'entrada' - ENTRADA (positivo)
  ELSIF NEW.tipo = 'entrada' THEN
    IF NEW.caixa_origem_id IS NOT NULL THEN
      UPDATE caixas
      SET saldo_atual = saldo_atual + NEW.valor
      WHERE id = NEW.caixa_origem_id;
      
      RAISE NOTICE '📥 Entrada Manual: +R$% no caixa %', NEW.valor, NEW.caixa_origem_id;
    END IF;
  
  -- TIPO: 'saida' - SAÍDA (negativo)
  ELSIF NEW.tipo = 'saida' THEN
    IF NEW.caixa_origem_id IS NOT NULL THEN
      UPDATE caixas
      SET saldo_atual = saldo_atual - NEW.valor
      WHERE id = NEW.caixa_origem_id;
      
      RAISE NOTICE '📤 Saída/Despesa: -R$% do caixa %', NEW.valor, NEW.caixa_origem_id;
    END IF;
  
  -- TIPO: 'transferencia_entre_caixas' - AMBOS (origem perde, destino ganha)
  ELSIF NEW.tipo = 'transferencia_entre_caixas' THEN
    -- Caixa de origem PERDE dinheiro
    IF NEW.caixa_origem_id IS NOT NULL THEN
      UPDATE caixas
      SET saldo_atual = saldo_atual - NEW.valor
      WHERE id = NEW.caixa_origem_id;
      
      RAISE NOTICE '🔄 Transferência: -R$% do caixa origem %', NEW.valor, NEW.caixa_origem_id;
    END IF;
    
    -- Caixa de destino GANHA dinheiro
    IF NEW.caixa_destino_id IS NOT NULL THEN
      UPDATE caixas
      SET saldo_atual = saldo_atual + NEW.valor
      WHERE id = NEW.caixa_destino_id;
      
      RAISE NOTICE '🔄 Transferência: +R$% no caixa destino %', NEW.valor, NEW.caixa_destino_id;
    END IF;
  
  ELSE
    RAISE WARNING '⚠️ Tipo de movimentação desconhecido: %', NEW.tipo;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar trigger AFTER INSERT
CREATE TRIGGER trg_atualizar_saldo_movimentacao
AFTER INSERT ON movimentacoes_caixa
FOR EACH ROW
EXECUTE FUNCTION fn_atualizar_saldo_movimentacao();

-- ========================================
-- COMENTÁRIOS E VALIDAÇÃO
-- ========================================

COMMENT ON FUNCTION fn_atualizar_saldo_movimentacao() IS 
'Atualiza automaticamente o saldo_atual dos caixas para TODAS as movimentações.
Tipos suportados:
- venda: destino recebe (+)
- pagamento_avaliacao: origem paga (-)
- entrada: origem recebe (+)
- saida: origem paga (-)
- transferencia_entre_caixas: origem perde (-) e destino ganha (+)';

-- Para validar:
-- SELECT * FROM caixas WHERE nome = 'Avaliação';
-- (Anote o saldo_atual)
-- 
-- INSERT INTO movimentacoes_caixa (caixa_origem_id, tipo, valor, motivo)
-- SELECT id, 'pagamento_avaliacao', 50, 'Teste pagamento'
-- FROM caixas WHERE nome = 'Avaliação';
-- 
-- SELECT * FROM caixas WHERE nome = 'Avaliação';
-- (O saldo_atual deve ter DIMINUÍDO em 50)
