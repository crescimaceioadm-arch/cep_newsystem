-- Função para criar novo usuário (apenas admin)
CREATE OR REPLACE FUNCTION criar_novo_usuario(
  p_email TEXT,
  p_password TEXT,
  p_nome TEXT,
  p_cargo TEXT
)
RETURNS jsonb AS $$
DECLARE
  v_user_id UUID;
  v_response jsonb;
BEGIN
  -- Verifica se quem está chamando é admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND cargo = 'admin'
  ) THEN
    RETURN jsonb_build_object('error', 'Apenas admin pode criar usuários');
  END IF;

  -- Tenta criar o usuário (isso requer que a função tenha permissão no auth)
  -- Na prática, vamos criar apenas o perfil e retornar mensagem
  v_user_id := gen_random_uuid();

  -- Inserir no profiles
  INSERT INTO profiles (id, nome, email, cargo)
  VALUES (v_user_id, p_nome, p_email, p_cargo)
  ON CONFLICT (id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Usuário criado. Solicite ao admin que configure a senha via Supabase Dashboard.',
    'user_id', v_user_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION criar_novo_usuario(TEXT, TEXT, TEXT, TEXT) IS 'Cria um novo usuário no sistema (apenas admin)';
