-- Tabela de eventos de marketing diários
CREATE TABLE IF NOT EXISTS eventos_marketing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  criado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_eventos_marketing_data ON eventos_marketing(data);
CREATE INDEX IF NOT EXISTS idx_eventos_marketing_created_at ON eventos_marketing(created_at);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_eventos_marketing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_eventos_marketing_updated_at
  BEFORE UPDATE ON eventos_marketing
  FOR EACH ROW
  EXECUTE FUNCTION update_eventos_marketing_updated_at();

-- RLS (Row Level Security)
ALTER TABLE eventos_marketing ENABLE ROW LEVEL SECURITY;

-- Política: todos podem ver eventos
CREATE POLICY "Todos podem visualizar eventos"
  ON eventos_marketing
  FOR SELECT
  USING (true);

-- Política: apenas autenticados podem criar/editar/deletar
CREATE POLICY "Autenticados podem gerenciar eventos"
  ON eventos_marketing
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Comentários
COMMENT ON TABLE eventos_marketing IS 'Eventos de marketing organizados por data para visualização em calendário semanal';
COMMENT ON COLUMN eventos_marketing.data IS 'Data do evento';
COMMENT ON COLUMN eventos_marketing.titulo IS 'Título do evento';
COMMENT ON COLUMN eventos_marketing.descricao IS 'Descrição detalhada do evento';
COMMENT ON COLUMN eventos_marketing.criado_por IS 'Nome do usuário que criou o evento';
