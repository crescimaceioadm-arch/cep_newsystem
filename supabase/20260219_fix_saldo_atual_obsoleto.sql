-- filepath: supabase/20260219_fix_saldo_atual_obsoleto.sql
-- Data: 19/02/2026
-- Objetivo: Remover triggers/funções que usam coluna obsoleta 'saldo_atual'
--           e refatorar funções que precisam continuar funcionando
-- Problema: Coluna saldo_atual foi renomeada para saldo_seed_caixas em 18/02
--           Novo modelo: saldo é CALCULADO DINAMICAMENTE via movimentacoes_caixa
-- Impacto: Libera INSERT de vendas em dinheiro, permite editar/deletar vendas

-- ============================================================================
-- FASE 1: REMOVER TRIGGERS QUE CAUSAM O ERRO 42703
-- ============================================================================

DROP TRIGGER IF EXISTS trg_venda_dinheiro ON vendas;
DROP TRIGGER IF EXISTS trg_correcao_venda ON vendas;

-- ============================================================================
-- FASE 2: REMOVER FUNÇÕES QUE USAVAM TRIGGERS ACIMA
-- ============================================================================
-- Essas funções tentavam atualizar "saldo_atual" que não existe mais

DROP FUNCTION IF EXISTS fn_registrar_venda_dinheiro();
DROP FUNCTION IF EXISTS corrigir_caixa_venda();

-- ============================================================================
-- FASE 3: REFATORAR realizar_transferencia_caixa()
-- ============================================================================
-- Remove a dependência de UPDATE em saldo_atual
-- Agora apenas registra a movimentação (saldo é calculado dinamicamente)

CREATE OR REPLACE FUNCTION realizar_transferencia_caixa(
  p_origem_nome text,
  p_destino_nome text,
  p_valor numeric,
  p_motivo text,
  p_tipo text DEFAULT 'transferencia_entre_caixas'
)
RETURNS void AS $$
DECLARE
  v_origem_id UUID;
  v_destino_id UUID;
BEGIN
  -- 1. Buscar IDs dos caixas
  SELECT id INTO v_origem_id FROM caixas WHERE nome = p_origem_nome;
  SELECT id INTO v_destino_id FROM caixas WHERE nome = p_destino_nome;

  -- 2. Validações
  IF v_origem_id IS NULL THEN
    RAISE EXCEPTION 'Caixa de origem "%" não encontrada', p_origem_nome;
  END IF;

  IF v_destino_id IS NULL THEN
    RAISE EXCEPTION 'Caixa de destino "%" não encontrada', p_destino_nome;
  END IF;

  IF p_valor <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;

  -- 3. ✅ NOVA ABORDAGEM: Apenas registra a movimentação
  -- O saldo é calculado dinamicamente via função useSaldoFinalHoje()
  -- Movimentação de DÉBITO (saída da origem)
  INSERT INTO movimentacoes_caixa (
    caixa_origem_id,
    caixa_destino_id,
    tipo,
    valor,
    motivo
  ) VALUES (
    v_origem_id,
    v_destino_id,
    p_tipo,
    p_valor,
    p_motivo
  );

  -- Log de sucesso
  RAISE NOTICE 'Transferência registrada com sucesso: % -> % | R$ %',
    p_origem_nome, p_destino_nome, p_valor;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FASE 4: REFATORAR atualizar_caixa_pagamento()
-- ============================================================================
-- Remove a dependência de UPDATE em saldo_atual
-- Mantém apenas o registro em movimentacoes_caixa

CREATE OR REPLACE FUNCTION atualizar_caixa_pagamento()
RETURNS TRIGGER AS $$
DECLARE
  v_caixa_id UUID;
BEGIN
  -- Só processa quando finaliza e é DINHEIRO
  IF NEW.status = 'finalizado' AND OLD.status <> 'finalizado' THEN
    -- Buscar o caixa de Avaliação
    SELECT id INTO v_caixa_id FROM caixas WHERE nome = 'Avaliação';

    -- Se há pagamento em dinheiro, registra apenas a movimentação
    IF NEW.pagamento_1_metodo = 'Dinheiro' THEN
      -- ✅ NOVA ABORDAGEM: Apenas registra em movimentacoes_caixa
      -- Saldo é calculado dinamicamente
      INSERT INTO movimentacoes_caixa (
        caixa_origem_id,
        tipo,
        valor,
        motivo
      ) VALUES (
        v_caixa_id,
        'pagamento_avaliacao',
        NEW.pagamento_1_valor,
        'Pagamento Atendimento: ' || NEW.nome_cliente
      );

      RAISE NOTICE 'Pagamento registrado: Atendimento=%, Valor=R$%, Caixa=%',
        NEW.id, NEW.pagamento_1_valor, 'Avaliação';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar o trigger (se não existir, criar; se existir, já está bom)
DROP TRIGGER IF EXISTS trg_atualizar_caixa_pagamento ON atendimentos;
CREATE TRIGGER trg_atualizar_caixa_pagamento
AFTER UPDATE ON atendimentos
FOR EACH ROW
  EXECUTE FUNCTION atualizar_caixa_pagamento();

-- ============================================================================
-- FASE 5: VERIFICAÇÃO PÓS-EXECUÇÃO
-- ============================================================================
-- Execute estas queries após aplicar para confirmar que funcionou:

-- Query 1: Confirmar que funções foram removidas
-- SELECT routine_name 
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name IN (
--   'fn_registrar_venda_dinheiro',
--   'corrigir_caixa_venda'
-- );
-- ESPERADO: (vazio)

-- Query 2: Confirmar que triggers foram removidos de vendas
-- SELECT trigger_name 
-- FROM information_schema.triggers 
-- WHERE trigger_schema = 'public' 
-- AND event_object_table = 'vendas';
-- ESPERADO: (vazio)

-- Query 3: Confirmar que as novas funções existem
-- SELECT routine_name 
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name IN (
--   'realizar_transferencia_caixa',
--   'atualizar_caixa_pagamento'
-- );
-- ESPERADO: 2 linhas (ambas as funções)

-- Query 4: Confirmar trigger de atendimentos ainda existe
-- SELECT trigger_name 
-- FROM information_schema.triggers 
-- WHERE trigger_schema = 'public' 
-- AND event_object_table = 'atendimentos'
-- AND trigger_name = 'trg_atualizar_caixa_pagamento';
-- ESPERADO: 1 linha
