-- Corrigir tabela profiles para usuários antigos
-- Esta migração marca usuários existentes como NÃO precisando mudar senha

-- 1. Adicionar coluna se não existir (idempotente)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS precisa_mudar_senha BOOLEAN DEFAULT FALSE;

-- 2. IMPORTANTE: Atualizar usuários existentes para NÃO forçar mudança
-- Apenas novos usuários criados via interface receberão TRUE
UPDATE profiles 
SET precisa_mudar_senha = FALSE 
WHERE precisa_mudar_senha IS NULL OR precisa_mudar_senha = TRUE;

-- 3. Criar índice para otimizar queries
CREATE INDEX IF NOT EXISTS idx_profiles_precisa_mudar_senha 
ON profiles(precisa_mudar_senha);

-- 4. Verificar resultado
SELECT id, email, nome, precisa_mudar_senha 
FROM profiles 
ORDER BY nome;

