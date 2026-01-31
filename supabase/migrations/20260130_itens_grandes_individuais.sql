-- Migration: Sistema de controle unitário de itens grandes
-- Data: 30/01/2026

-- 1. Tabela de tipos de itens grandes (Carrinho, Cercadinho, Berço, etc)
CREATE TABLE IF NOT EXISTS tipos_itens_grandes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabela de marcas (Burigotto, Galzerano, etc)
CREATE TABLE IF NOT EXISTS marcas_itens_grandes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela de itens grandes individuais
CREATE TABLE IF NOT EXISTS itens_grandes_individuais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_id UUID NOT NULL REFERENCES tipos_itens_grandes(id),
  marca_id UUID NOT NULL REFERENCES marcas_itens_grandes(id),
  descricao TEXT NOT NULL,
  valor_compra NUMERIC NOT NULL,
  valor_venda NUMERIC, -- Preenchido na venda
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'vendido', 'baixa')),
  
  -- Rastreamento entrada (compra/avaliação)
  atendimento_id UUID REFERENCES atendimentos(id) ON DELETE SET NULL,
  data_entrada TIMESTAMPTZ NOT NULL DEFAULT now(),
  avaliadora_nome TEXT,
  
  -- Rastreamento saída (venda)
  venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
  data_saida TIMESTAMPTZ,
  vendedora_nome TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_itens_grandes_status ON itens_grandes_individuais(status);
CREATE INDEX IF NOT EXISTS idx_itens_grandes_tipo ON itens_grandes_individuais(tipo_id);
CREATE INDEX IF NOT EXISTS idx_itens_grandes_marca ON itens_grandes_individuais(marca_id);
CREATE INDEX IF NOT EXISTS idx_itens_grandes_atendimento ON itens_grandes_individuais(atendimento_id);
CREATE INDEX IF NOT EXISTS idx_itens_grandes_venda ON itens_grandes_individuais(venda_id);

-- 5. Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tipos_itens_grandes_updated_at
  BEFORE UPDATE ON tipos_itens_grandes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marcas_itens_grandes_updated_at
  BEFORE UPDATE ON marcas_itens_grandes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_itens_grandes_individuais_updated_at
  BEFORE UPDATE ON itens_grandes_individuais
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Seed inicial de tipos comuns
INSERT INTO tipos_itens_grandes (nome, ordem) VALUES
  ('Carrinho de Bebê', 1),
  ('Berço', 2),
  ('Cercadinho', 3),
  ('Cadeirinha de Carro', 4),
  ('Cadeirão de Alimentação', 5),
  ('Andador', 6),
  ('Banheira', 7),
  ('Bebê Conforto', 8),
  ('Moisés', 9),
  ('Outros', 99)
ON CONFLICT (nome) DO NOTHING;

-- 7. Seed inicial de marcas comuns
INSERT INTO marcas_itens_grandes (nome, ordem) VALUES
  ('Burigotto', 1),
  ('Galzerano', 2),
  ('Chicco', 3),
  ('Safety 1st', 4),
  ('Cosco', 5),
  ('Fisher-Price', 6),
  ('Maxi Baby', 7),
  ('Infanti', 8),
  ('Tutti Baby', 9),
  ('Outros', 99),
  ('Sem Marca', 100)
ON CONFLICT (nome) DO NOTHING;

-- 8. Função para deleção segura de itens (limpeza de testes)
CREATE OR REPLACE FUNCTION delete_item_grande_individual(item_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM itens_grandes_individuais WHERE id = item_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Comentários
COMMENT ON TABLE tipos_itens_grandes IS 'Tipos de itens grandes (Carrinho, Berço, etc) - gerenciável em Configurações';
COMMENT ON TABLE marcas_itens_grandes IS 'Marcas de itens grandes (Burigotto, Galzerano, etc) - gerenciável em Configurações';
COMMENT ON TABLE itens_grandes_individuais IS 'Controle unitário de cada item grande comprado e vendido';
COMMENT ON COLUMN itens_grandes_individuais.valor_compra IS 'Valor negociado na avaliação (compra)';
COMMENT ON COLUMN itens_grandes_individuais.valor_venda IS 'Valor informado pela vendedora no momento da venda';
COMMENT ON COLUMN itens_grandes_individuais.status IS 'disponivel = em estoque, vendido = já vendido, baixa = perdido/danificado';
COMMENT ON FUNCTION delete_item_grande_individual(UUID) IS 'Função para deletar item grande (usada em limpeza de testes)';
