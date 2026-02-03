-- Migration: Sistema de Log de Atividades
-- Data: 03/02/2026
-- Descrição: Tabela para auditoria completa de todas as ações do sistema

-- Criar tabela de logs
CREATE TABLE IF NOT EXISTS log_atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_nome TEXT NOT NULL,
  user_cargo TEXT,
  acao TEXT NOT NULL, -- 'criar', 'editar', 'deletar', 'finalizar', 'cancelar', 'recusar', 'transferir', etc.
  tabela_afetada TEXT NOT NULL, -- 'clientes', 'vendas', 'atendimentos', 'movimentacoes_caixa', etc.
  registro_id TEXT, -- ID do registro afetado (pode ser UUID ou outro tipo)
  dados_antes JSONB, -- Estado anterior (para edições e deleções)
  dados_depois JSONB, -- Estado novo (para criações e edições)
  detalhes TEXT, -- Descrição textual adicional
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_log_atividades_user_id ON log_atividades(user_id);
CREATE INDEX idx_log_atividades_created_at ON log_atividades(created_at);
CREATE INDEX idx_log_atividades_acao ON log_atividades(acao);
CREATE INDEX idx_log_atividades_tabela_afetada ON log_atividades(tabela_afetada);
CREATE INDEX idx_log_atividades_registro_id ON log_atividades(registro_id);

-- Habilitar RLS
ALTER TABLE log_atividades ENABLE ROW LEVEL SECURITY;

-- Política: Qualquer usuário autenticado pode criar logs
CREATE POLICY "Usuários podem criar logs"
  ON log_atividades
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Apenas admin pode visualizar logs
CREATE POLICY "Admin pode visualizar logs"
  ON log_atividades
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.cargo = 'Admin'
    )
  );

-- Política: Logs não podem ser editados ou deletados (auditoria permanente)
-- Nenhuma política de UPDATE ou DELETE = ninguém pode modificar

COMMENT ON TABLE log_atividades IS 'Log de auditoria de todas as atividades do sistema';
COMMENT ON COLUMN log_atividades.acao IS 'Tipo de ação: criar, editar, deletar, finalizar, cancelar, recusar, transferir, abrir, fechar';
COMMENT ON COLUMN log_atividades.tabela_afetada IS 'Nome da tabela/entidade afetada';
COMMENT ON COLUMN log_atividades.dados_antes IS 'Estado do registro antes da ação (JSON)';
COMMENT ON COLUMN log_atividades.dados_depois IS 'Estado do registro depois da ação (JSON)';
