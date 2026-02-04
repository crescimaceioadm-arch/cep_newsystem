-- Criar tabela de permissões por usuário
CREATE TABLE IF NOT EXISTS public.permissoes_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permissao TEXT NOT NULL,
  concedida BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, permissao)
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_permissoes_usuario_user_id ON public.permissoes_usuario(user_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_usuario_permissao ON public.permissoes_usuario(permissao);

-- Habilitar RLS
ALTER TABLE public.permissoes_usuario ENABLE ROW LEVEL SECURITY;

-- Política: Admins podem ver e gerenciar todas as permissões
CREATE POLICY "Admins podem gerenciar permissoes" ON public.permissoes_usuario
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.cargo = 'admin'
    )
  );

-- Política: Usuários podem ver suas próprias permissões
CREATE POLICY "Usuarios veem proprias permissoes" ON public.permissoes_usuario
  FOR SELECT
  USING (user_id = auth.uid());

-- Comentários
COMMENT ON TABLE public.permissoes_usuario IS 'Permissões individuais por usuário para controle de acesso granular';
COMMENT ON COLUMN public.permissoes_usuario.permissao IS 'Identificador da permissão (ex: menu:/vendas, action:editar_venda, export:csv)';
COMMENT ON COLUMN public.permissoes_usuario.concedida IS 'true = usuário TEM a permissão, false = usuário NÃO TEM a permissão (negação explícita)';
