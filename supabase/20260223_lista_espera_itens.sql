-- ========================================
-- SISTEMA DE LISTA DE ESPERA DE ITENS
-- Data: 23/02/2026
-- Descrição: Sistema completo para gerenciar
-- lista de espera de clientes por itens grandes
-- ========================================

-- ========================================
-- 1. TABELA DE CLIENTES NA LISTA DE ESPERA
-- ========================================
CREATE TABLE IF NOT EXISTS lista_espera_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dados do Cliente
  nome_cliente TEXT NOT NULL,
  telefone TEXT NOT NULL,
  cpf TEXT,
  observacoes TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'aguardando', -- 'aguardando', 'notificado', 'atendido', 'cancelado'
  
  -- Controle
  criado_por UUID REFERENCES auth.users(id),
  data_atendimento TIMESTAMP WITH TIME ZONE,
  atendido_por UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT status_valido CHECK (status IN ('aguardando', 'notificado', 'atendido', 'cancelado'))
);

-- ========================================
-- 2. TABELA DE ITENS DESEJADOS
-- ========================================
CREATE TABLE IF NOT EXISTS lista_espera_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES lista_espera_clientes(id) ON DELETE CASCADE,
  
  -- Especificações do Item Desejado
  tipo_id UUID REFERENCES tipos_itens_grandes(id) ON DELETE SET NULL,
  descricao TEXT, -- Ex: "Carrinho rosa com capota"
  cor TEXT,
  ordem INT DEFAULT 1 CHECK (ordem IN (1, 2, 3)), -- 1, 2 ou 3 (item desejado 1, 2, 3)
  
  -- Status de Match
  status TEXT DEFAULT 'aguardando', -- 'aguardando', 'match_encontrado', 'recusado_pelo_usuario'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT status_item_valido CHECK (status IN ('aguardando', 'match_encontrado', 'recusado_pelo_usuario'))
);

-- ========================================
-- 3. TABELA DE MATCHES (SUGESTÕES)
-- ========================================
CREATE TABLE IF NOT EXISTS lista_espera_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  cliente_id UUID NOT NULL REFERENCES lista_espera_clientes(id) ON DELETE CASCADE,
  item_desejado_id UUID NOT NULL REFERENCES lista_espera_itens(id) ON DELETE CASCADE,
  item_estoque_id UUID NOT NULL REFERENCES itens_grandes_individuais(id) ON DELETE CASCADE,
  
  -- Status do Match
  status TEXT DEFAULT 'pendente', -- 'pendente', 'aceito', 'recusado'
  
  -- Controle
  verificado_por UUID REFERENCES auth.users(id),
  data_verificacao TIMESTAMP WITH TIME ZONE,
  motivo_recusa TEXT, -- Se recusado, por que?
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT status_match_valido CHECK (status IN ('pendente', 'aceito', 'recusado')),
  
  -- Evitar duplicatas
  CONSTRAINT unique_match UNIQUE (cliente_id, item_desejado_id, item_estoque_id)
);

-- ========================================
-- 4. ÍNDICES PARA PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_lista_espera_status ON lista_espera_clientes(status);
CREATE INDEX IF NOT EXISTS idx_lista_espera_nome ON lista_espera_clientes(nome_cliente);
CREATE INDEX IF NOT EXISTS idx_lista_espera_created ON lista_espera_clientes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lista_espera_itens_cliente ON lista_espera_itens(cliente_id);
CREATE INDEX IF NOT EXISTS idx_lista_espera_itens_tipo ON lista_espera_itens(tipo_id);
CREATE INDEX IF NOT EXISTS idx_lista_espera_itens_status ON lista_espera_itens(status);

CREATE INDEX IF NOT EXISTS idx_lista_espera_matches_cliente ON lista_espera_matches(cliente_id);
CREATE INDEX IF NOT EXISTS idx_lista_espera_matches_status ON lista_espera_matches(status);
CREATE INDEX IF NOT EXISTS idx_lista_espera_matches_item_estoque ON lista_espera_matches(item_estoque_id);
CREATE INDEX IF NOT EXISTS idx_lista_espera_matches_item_desejado ON lista_espera_matches(item_desejado_id);

-- ========================================
-- 5. TRIGGER DE UPDATED_AT
-- ========================================
CREATE OR REPLACE FUNCTION update_lista_espera_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lista_espera_clientes
  BEFORE UPDATE ON lista_espera_clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_lista_espera_updated_at();

-- ========================================
-- 6. TRIGGER DE DETECÇÃO AUTOMÁTICA DE MATCHES
-- ========================================
CREATE OR REPLACE FUNCTION detectar_match_lista_espera()
RETURNS TRIGGER AS $$
DECLARE
  item_desejado RECORD;
BEGIN
  -- Apenas quando um novo item grande é criado (entrada de avaliação)
  IF TG_OP = 'INSERT' AND NEW.status = 'disponivel' THEN
    
    -- Buscar itens desejados que fazem match com o tipo
    FOR item_desejado IN 
      SELECT 
        le_itens.id as item_desejado_id,
        le_itens.cliente_id,
        le_clientes.nome_cliente
      FROM lista_espera_itens le_itens
      JOIN lista_espera_clientes le_clientes ON le_itens.cliente_id = le_clientes.id
      WHERE le_itens.tipo_id = NEW.tipo_id
        AND le_itens.status = 'aguardando'
        AND le_clientes.status = 'aguardando'
    LOOP
      
      -- Verificar se este item específico já foi recusado antes
      IF NOT EXISTS (
        SELECT 1 FROM lista_espera_matches
        WHERE cliente_id = item_desejado.cliente_id
          AND item_estoque_id = NEW.id
          AND status = 'recusado'
      ) THEN
        
        -- Criar match pendente (usar INSERT ... ON CONFLICT para evitar duplicatas)
        INSERT INTO lista_espera_matches (
          cliente_id,
          item_desejado_id,
          item_estoque_id,
          status
        ) VALUES (
          item_desejado.cliente_id,
          item_desejado.item_desejado_id,
          NEW.id,
          'pendente'
        )
        ON CONFLICT (cliente_id, item_desejado_id, item_estoque_id) DO NOTHING;
        
      END IF;
      
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_detectar_match
  AFTER INSERT ON itens_grandes_individuais
  FOR EACH ROW
  EXECUTE FUNCTION detectar_match_lista_espera();

-- ========================================
-- 7. FUNCTION PARA CONTAR MATCHES PENDENTES
-- ========================================
CREATE OR REPLACE FUNCTION count_matches_pendentes(p_cliente_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM lista_espera_matches
    WHERE cliente_id = p_cliente_id
      AND status = 'pendente'
  );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ========================================

-- Habilitar RLS nas tabelas
ALTER TABLE lista_espera_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lista_espera_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE lista_espera_matches ENABLE ROW LEVEL SECURITY;

-- Política para lista_espera_clientes
-- Usuários autenticados podem ver todos os registros
CREATE POLICY "Usuários autenticados podem ver clientes"
  ON lista_espera_clientes
  FOR SELECT
  TO authenticated
  USING (true);

-- Usuários autenticados podem inserir
CREATE POLICY "Usuários autenticados podem criar clientes"
  ON lista_espera_clientes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Usuários autenticados podem atualizar
CREATE POLICY "Usuários autenticados podem atualizar clientes"
  ON lista_espera_clientes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Usuários autenticados podem deletar
CREATE POLICY "Usuários autenticados podem deletar clientes"
  ON lista_espera_clientes
  FOR DELETE
  TO authenticated
  USING (true);

-- Política para lista_espera_itens
CREATE POLICY "Usuários autenticados podem ver itens"
  ON lista_espera_itens
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar itens"
  ON lista_espera_itens
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar itens"
  ON lista_espera_itens
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem deletar itens"
  ON lista_espera_itens
  FOR DELETE
  TO authenticated
  USING (true);

-- Política para lista_espera_matches
CREATE POLICY "Usuários autenticados podem ver matches"
  ON lista_espera_matches
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar matches"
  ON lista_espera_matches
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar matches"
  ON lista_espera_matches
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem deletar matches"
  ON lista_espera_matches
  FOR DELETE
  TO authenticated
  USING (true);

-- ========================================
-- 9. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ========================================
COMMENT ON TABLE lista_espera_clientes IS 'Clientes cadastrados na lista de espera por itens grandes';
COMMENT ON TABLE lista_espera_itens IS 'Itens desejados pelos clientes (até 3 por cliente)';
COMMENT ON TABLE lista_espera_matches IS 'Matches entre itens desejados e itens em estoque';

COMMENT ON COLUMN lista_espera_clientes.status IS 'aguardando: aguardando item | notificado: item encontrado e cliente notificado | atendido: cliente já foi atendido | cancelado: cliente cancelou a espera';
COMMENT ON COLUMN lista_espera_itens.status IS 'aguardando: aguardando match | match_encontrado: match aceito | recusado_pelo_usuario: todos os matches foram recusados';
COMMENT ON COLUMN lista_espera_matches.status IS 'pendente: aguardando verificação | aceito: item serve ao cliente | recusado: item não serve';

-- ========================================
-- FIM DA MIGRATION
-- ========================================
