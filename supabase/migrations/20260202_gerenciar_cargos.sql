-- Tabela para armazenar cargos customizáveis
CREATE TABLE IF NOT EXISTS cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  cor TEXT DEFAULT 'bg-gray-600',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cargos_nome ON cargos(nome);
CREATE INDEX IF NOT EXISTS idx_cargos_ativo ON cargos(ativo);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_cargos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cargos_updated_at
  BEFORE UPDATE ON cargos
  FOR EACH ROW
  EXECUTE FUNCTION update_cargos_updated_at();

-- RLS
ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem visualizar
CREATE POLICY "Qualquer um pode visualizar cargos"
  ON cargos
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Apenas admin pode gerenciar
CREATE POLICY "Apenas admin pode gerenciar cargos"
  ON cargos
  FOR ALL
  USING (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo = 'admin'
  ))
  WITH CHECK (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo = 'admin'
  ));

-- Inserir cargos padrão
INSERT INTO cargos (nome, descricao, cor) VALUES
  ('admin', 'Administrador do sistema', 'bg-blue-600'),
  ('caixa', 'Operador de caixa', 'bg-orange-500'),
  ('avaliadora', 'Avaliadora de itens', 'bg-green-600'),
  ('geral', 'Acesso geral', 'bg-purple-500'),
  ('social_media', 'Gerenciador de redes sociais', 'bg-pink-500'),
  ('mkt', 'Equipe de marketing', 'bg-red-600')
ON CONFLICT (nome) DO NOTHING;

COMMENT ON TABLE cargos IS 'Define os cargos/roles disponíveis no sistema';
COMMENT ON COLUMN cargos.nome IS 'Nome único do cargo';
COMMENT ON COLUMN cargos.descricao IS 'Descrição do cargo';
COMMENT ON COLUMN cargos.cor IS 'Cor da badge (classe Tailwind)';
COMMENT ON COLUMN cargos.ativo IS 'Se o cargo está ativo para novos usuários';
