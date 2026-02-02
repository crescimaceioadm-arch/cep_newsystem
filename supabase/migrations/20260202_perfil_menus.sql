-- Tabela para gerenciar permissões de menus por perfil
CREATE TABLE IF NOT EXISTS perfil_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo TEXT NOT NULL UNIQUE,
  menus TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca rápida por cargo
CREATE INDEX IF NOT EXISTS idx_perfil_menus_cargo ON perfil_menus(cargo);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_perfil_menus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_perfil_menus_updated_at
  BEFORE UPDATE ON perfil_menus
  FOR EACH ROW
  EXECUTE FUNCTION update_perfil_menus_updated_at();

-- Inserir permissões padrão
INSERT INTO perfil_menus (cargo, menus) VALUES
  ('admin', ARRAY['vendas', 'recepcao', 'avaliacao', 'financeiro', 'estoque', 'dashboard', 'configuracoes', 'marketing']),
  ('caixa', ARRAY['vendas', 'financeiro', 'dashboard']),
  ('avaliadora', ARRAY['recepcao', 'avaliacao']),
  ('geral', ARRAY['vendas', 'recepcao', 'avaliacao', 'financeiro', 'marketing']),
  ('social_media', ARRAY['marketing']),
  ('mkt', ARRAY['marketing', 'dashboard'])
ON CONFLICT (cargo) DO UPDATE SET menus = EXCLUDED.menus;

-- RLS
ALTER TABLE perfil_menus ENABLE ROW LEVEL SECURITY;

-- Qualquer um autenticado pode visualizar
CREATE POLICY "Qualquer um pode visualizar menus"
  ON perfil_menus
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Apenas admin pode atualizar
CREATE POLICY "Apenas admin pode atualizar menus"
  ON perfil_menus
  FOR UPDATE
  USING (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo = 'admin'
  ))
  WITH CHECK (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo = 'admin'
  ));

COMMENT ON TABLE perfil_menus IS 'Define quais menus cada perfil de usuário pode acessar';
COMMENT ON COLUMN perfil_menus.cargo IS 'Tipo de cargo (admin, caixa, avaliadora, geral, social_media)';
COMMENT ON COLUMN perfil_menus.menus IS 'Array com IDs dos menus que o perfil pode acessar';
