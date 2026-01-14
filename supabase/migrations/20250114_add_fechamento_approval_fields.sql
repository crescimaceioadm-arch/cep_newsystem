-- =====================================================================
-- MIGRATION: Sistema de Aprovação de Fechamentos de Caixa
-- Data: 14/01/2026
-- =====================================================================
-- 
-- OBJETIVO:
-- Adicionar campos necessários para o fluxo de aprovação de fechamentos
-- quando há divergências entre valor físico e valor do sistema.
-- 
-- FLUXO:
-- 1. Caixa faz fechamento com divergência → status "pendente_aprovacao"
-- 2. Admin revisa e aprova/rejeita
-- 3. Se aprovado → status "aprovado"
-- 4. Se rejeitado → status "rejeitado" (caixa deve refazer)
-- =====================================================================

-- Adicionar novas colunas
ALTER TABLE fechamentos_caixa 
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'aprovado',
  ADD COLUMN IF NOT EXISTS requer_revisao BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS aprovado_por UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS data_aprovacao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_rejeicao TEXT;

-- Comentários das colunas
COMMENT ON COLUMN fechamentos_caixa.status IS 'Status do fechamento: aprovado, pendente_aprovacao, rejeitado';
COMMENT ON COLUMN fechamentos_caixa.requer_revisao IS 'Flag indicando se precisa revisão do admin';
COMMENT ON COLUMN fechamentos_caixa.aprovado_por IS 'ID do admin que aprovou/rejeitou';
COMMENT ON COLUMN fechamentos_caixa.data_aprovacao IS 'Data/hora da aprovação/rejeição';
COMMENT ON COLUMN fechamentos_caixa.motivo_rejeicao IS 'Motivo da rejeição pelo admin';

-- Atualizar fechamentos existentes sem divergência como já aprovados
UPDATE fechamentos_caixa 
SET status = 'aprovado', 
    requer_revisao = FALSE
WHERE diferenca = 0 OR diferenca IS NULL;

-- Marcar fechamentos existentes COM divergência para revisão
UPDATE fechamentos_caixa 
SET status = 'pendente_aprovacao', 
    requer_revisao = TRUE
WHERE diferenca != 0 AND diferenca IS NOT NULL;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_fechamentos_status ON fechamentos_caixa(status);
CREATE INDEX IF NOT EXISTS idx_fechamentos_requer_revisao ON fechamentos_caixa(requer_revisao);
CREATE INDEX IF NOT EXISTS idx_fechamentos_data_fechamento ON fechamentos_caixa(data_fechamento DESC);

-- =====================================================================
-- VIEWS AUXILIARES
-- =====================================================================

-- View para listar fechamentos pendentes de aprovação
CREATE OR REPLACE VIEW v_fechamentos_pendentes AS
SELECT 
  fc.id,
  fc.caixa_id,
  c.nome as caixa_nome,
  fc.data_fechamento,
  fc.valor_sistema,
  fc.valor_contado,
  fc.diferenca,
  fc.justificativa,
  fc.status
FROM fechamentos_caixa fc
JOIN caixas c ON c.id = fc.caixa_id
WHERE fc.status = 'pendente_aprovacao'
ORDER BY fc.data_fechamento DESC;

-- View para estatísticas de fechamentos
CREATE OR REPLACE VIEW v_estatisticas_fechamentos AS
WITH fechamentos_por_dia AS (
  SELECT 
    data_fechamento,
    COUNT(DISTINCT caixa_id) as total_caixas,
    COUNT(DISTINCT CASE WHEN diferenca = 0 THEN caixa_id END) as caixas_corretos,
    COUNT(DISTINCT CASE WHEN diferenca != 0 THEN caixa_id END) as caixas_com_divergencia
  FROM fechamentos_caixa
  WHERE status IN ('aprovado', 'pendente_aprovacao')
  GROUP BY data_fechamento
)
SELECT 
  data_fechamento,
  total_caixas,
  caixas_corretos,
  caixas_com_divergencia,
  CASE 
    WHEN total_caixas = caixas_corretos THEN TRUE
    ELSE FALSE
  END as dia_perfeito,
  ROUND((caixas_corretos::NUMERIC / NULLIF(total_caixas, 0)) * 100, 2) as percentual_correto
FROM fechamentos_por_dia
ORDER BY data_fechamento DESC;

-- =====================================================================
-- FUNCTION: Aprovar fechamento
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_aprovar_fechamento(
  p_fechamento_id UUID,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Atualizar o fechamento
  UPDATE fechamentos_caixa
  SET 
    status = 'aprovado',
    requer_revisao = FALSE,
    aprovado_por = p_admin_id,
    data_aprovacao = NOW()
  WHERE id = p_fechamento_id
    AND status = 'pendente_aprovacao';

  -- Verificar se foi atualizado
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Fechamento não encontrado ou já processado'
    );
  END IF;

  -- Retornar sucesso
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Fechamento aprovado com sucesso'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$;

-- =====================================================================
-- FUNCTION: Rejeitar fechamento
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_rejeitar_fechamento(
  p_fechamento_id UUID,
  p_admin_id UUID,
  p_motivo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Validar motivo
  IF p_motivo IS NULL OR TRIM(p_motivo) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Motivo da rejeição é obrigatório'
    );
  END IF;

  -- Atualizar o fechamento
  UPDATE fechamentos_caixa
  SET 
    status = 'rejeitado',
    requer_revisao = TRUE,
    aprovado_por = p_admin_id,
    data_aprovacao = NOW(),
    motivo_rejeicao = p_motivo
  WHERE id = p_fechamento_id
    AND status = 'pendente_aprovacao';

  -- Verificar se foi atualizado
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Fechamento não encontrado ou já processado'
    );
  END IF;

  -- Retornar sucesso
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Fechamento rejeitado com sucesso'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$;

-- =====================================================================
-- RLS (Row Level Security)
-- =====================================================================

-- Permitir que admins vejam todos os fechamentos
-- Permitir que operadores vejam apenas seus próprios fechamentos

-- Nota: As policies específicas devem ser criadas de acordo com a
-- estrutura de roles do sistema. Exemplo:

-- CREATE POLICY "Admins podem ver todos fechamentos"
--   ON fechamentos_caixa FOR SELECT
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM profiles 
--       WHERE profiles.id = auth.uid() 
--       AND profiles.role = 'admin'
--     )
--   );

-- =====================================================================
-- FIM DA MIGRATION
-- =====================================================================
