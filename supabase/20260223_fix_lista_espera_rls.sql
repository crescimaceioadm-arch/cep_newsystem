-- ========================================
-- FIX: Corrigir políticas RLS da Lista de Espera
-- Data: 23/02/2026
-- Descrição: Corrige políticas RLS que estavam
-- bloqueando inserções na lista de espera
-- ========================================

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Usuários autenticados podem ver clientes" ON lista_espera_clientes;
DROP POLICY IF EXISTS "Usuários autenticados podem criar clientes" ON lista_espera_clientes;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar clientes" ON lista_espera_clientes;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar clientes" ON lista_espera_clientes;

DROP POLICY IF EXISTS "Usuários autenticados podem ver itens" ON lista_espera_itens;
DROP POLICY IF EXISTS "Usuários autenticados podem criar itens" ON lista_espera_itens;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar itens" ON lista_espera_itens;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar itens" ON lista_espera_itens;

DROP POLICY IF EXISTS "Usuários autenticados podem ver matches" ON lista_espera_matches;
DROP POLICY IF EXISTS "Usuários autenticados podem criar matches" ON lista_espera_matches;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar matches" ON lista_espera_matches;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar matches" ON lista_espera_matches;

-- Recriar políticas corretas para lista_espera_clientes
CREATE POLICY "Usuários autenticados podem ver clientes"
  ON lista_espera_clientes
  FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem criar clientes"
  ON lista_espera_clientes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar clientes"
  ON lista_espera_clientes
  FOR UPDATE
  USING (true);

CREATE POLICY "Usuários autenticados podem deletar clientes"
  ON lista_espera_clientes
  FOR DELETE
  USING (true);

-- Recriar políticas corretas para lista_espera_itens
CREATE POLICY "Usuários autenticados podem ver itens"
  ON lista_espera_itens
  FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem criar itens"
  ON lista_espera_itens
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar itens"
  ON lista_espera_itens
  FOR UPDATE
  USING (true);

CREATE POLICY "Usuários autenticados podem deletar itens"
  ON lista_espera_itens
  FOR DELETE
  USING (true);

-- Recriar políticas corretas para lista_espera_matches
CREATE POLICY "Usuários autenticados podem ver matches"
  ON lista_espera_matches
  FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem criar matches"
  ON lista_espera_matches
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar matches"
  ON lista_espera_matches
  FOR UPDATE
  USING (true);

CREATE POLICY "Usuários autenticados podem deletar matches"
  ON lista_espera_matches
  FOR DELETE
  USING (true);

-- Confirmar que RLS está habilitado
ALTER TABLE lista_espera_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lista_espera_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE lista_espera_matches ENABLE ROW LEVEL SECURITY;
