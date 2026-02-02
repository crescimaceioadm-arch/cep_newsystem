-- Remover constraint de cargo na tabela profiles para permitir cargos dinâmicos
-- Agora os cargos são gerenciados na tabela cargos

-- Verificar se existe a constraint e removê-la
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_cargo_check'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_cargo_check;
  END IF;
END $$;

-- Adicionar constraint de foreign key para cargos (se ainda não existir)
-- para garantir que apenas cargos válidos sejam usados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_profiles_cargo'
  ) THEN
    ALTER TABLE profiles 
    ADD CONSTRAINT fk_profiles_cargo 
    FOREIGN KEY (cargo) REFERENCES cargos(nome) 
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

COMMENT ON CONSTRAINT fk_profiles_cargo ON profiles IS 'Garante que o cargo do usuário existe na tabela cargos';
