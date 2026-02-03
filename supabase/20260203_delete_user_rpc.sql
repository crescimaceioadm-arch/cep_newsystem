-- RPC para deletar usuário completamente (profiles + auth.users)
-- Tenta deletar de ambos os lugares com tratamento de erro

CREATE OR REPLACE FUNCTION delete_user_complete(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_deleted BOOLEAN := FALSE;
  auth_deleted BOOLEAN := FALSE;
  error_msg TEXT := '';
BEGIN
  -- Tentar deletar de profiles
  BEGIN
    DELETE FROM public.profiles WHERE id = user_id;
    profile_deleted := TRUE;
  EXCEPTION WHEN OTHERS THEN
    error_msg := error_msg || 'Profiles: ' || SQLERRM || '; ';
  END;

  -- Tentar deletar de auth.users (pode falhar se sem permissão, é OK)
  BEGIN
    DELETE FROM auth.users WHERE id = user_id;
    auth_deleted := TRUE;
  EXCEPTION WHEN OTHERS THEN
    -- Ignorar erro de auth.users - pode ser permissão
    NULL;
  END;

  -- Retornar resultado
  IF profile_deleted THEN
    RETURN json_build_object(
      'success', true,
      'message', CASE 
        WHEN auth_deleted THEN 'Usuário deletado completamente'
        ELSE 'Usuário removido de profiles (email pode estar reservado)'
      END,
      'profile_deleted', profile_deleted,
      'auth_deleted', auth_deleted
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'Erro ao remover usuário: ' || error_msg
    );
  END IF;
END;
$$;

-- Conceder permissão ao role authenticated
GRANT EXECUTE ON FUNCTION delete_user_complete(UUID) TO authenticated;

