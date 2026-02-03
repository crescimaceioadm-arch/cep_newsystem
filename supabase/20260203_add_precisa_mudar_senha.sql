-- Adicionar coluna precisa_mudar_senha à tabela profiles se não existir
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS precisa_mudar_senha BOOLEAN DEFAULT TRUE;

-- Criar índice para otimizar queries
CREATE INDEX IF NOT EXISTS idx_profiles_precisa_mudar_senha 
ON profiles(precisa_mudar_senha);

-- Atualizar registros existentes para marcar que precisam mudar senha
UPDATE profiles 
SET precisa_mudar_senha = TRUE 
WHERE precisa_mudar_senha IS NULL;
