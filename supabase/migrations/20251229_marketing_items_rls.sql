-- Migration: Criar tabela marketing_items e políticas RLS
-- Data: 2025-12-29
-- Descrição: Configurar estrutura completa da tabela de marketing

-- 1. Criar tabela se não existir
CREATE TABLE IF NOT EXISTS public.marketing_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo TEXT NOT NULL,
    descricao TEXT,
    categoria TEXT,
    data_producao DATE,
    data_postagem DATE,
    dia_producao TEXT,
    dia_postagem TEXT,
    produzido BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.marketing_items ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS - Permitir SELECT para usuários autenticados
DROP POLICY IF EXISTS "Usuarios autenticados podem ver marketing_items" ON public.marketing_items;
CREATE POLICY "Usuarios autenticados podem ver marketing_items"
    ON public.marketing_items
    FOR SELECT
    TO authenticated
    USING (true);

-- 4. Políticas RLS - Permitir INSERT para usuários autenticados
DROP POLICY IF EXISTS "Usuarios autenticados podem inserir marketing_items" ON public.marketing_items;
CREATE POLICY "Usuarios autenticados podem inserir marketing_items"
    ON public.marketing_items
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 5. Políticas RLS - Permitir UPDATE para usuários autenticados
DROP POLICY IF EXISTS "Usuarios autenticados podem atualizar marketing_items" ON public.marketing_items;
CREATE POLICY "Usuarios autenticados podem atualizar marketing_items"
    ON public.marketing_items
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. Políticas RLS - Permitir DELETE para usuários autenticados
DROP POLICY IF EXISTS "Usuarios autenticados podem deletar marketing_items" ON public.marketing_items;
CREATE POLICY "Usuarios autenticados podem deletar marketing_items"
    ON public.marketing_items
    FOR DELETE
    TO authenticated
    USING (true);

-- 7. Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_marketing_items_updated_at ON public.marketing_items;
CREATE TRIGGER update_marketing_items_updated_at
    BEFORE UPDATE ON public.marketing_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Índices para performance
CREATE INDEX IF NOT EXISTS idx_marketing_items_data_postagem ON public.marketing_items(data_postagem);
CREATE INDEX IF NOT EXISTS idx_marketing_items_data_producao ON public.marketing_items(data_producao);
CREATE INDEX IF NOT EXISTS idx_marketing_items_categoria ON public.marketing_items(categoria);
