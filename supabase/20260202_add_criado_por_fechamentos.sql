-- ========================================
-- MIGRATION: Adicionar coluna criado_por em fechamentos_caixa
-- ========================================
-- Para rastrear quem criou o fechamento

ALTER TABLE fechamentos_caixa
ADD COLUMN criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_fechamentos_criado_por ON fechamentos_caixa(criado_por);

-- Comentário
COMMENT ON COLUMN fechamentos_caixa.criado_por IS 'ID do usuário que criou o fechamento';
