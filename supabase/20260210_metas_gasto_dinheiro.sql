-- Metas de gasto em dinheiro por grupo de avaliacao
CREATE TABLE IF NOT EXISTS public.metas_gasto_dinheiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes TEXT NOT NULL,
  categoria_id UUID NOT NULL REFERENCES public.item_categories(id) ON DELETE RESTRICT,
  valor NUMERIC NOT NULL DEFAULT 0,
  atualizado_por UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mes, categoria_id)
);

CREATE INDEX IF NOT EXISTS idx_metas_gasto_dinheiro_mes ON public.metas_gasto_dinheiro (mes);
CREATE INDEX IF NOT EXISTS idx_metas_gasto_dinheiro_categoria ON public.metas_gasto_dinheiro (categoria_id);

ALTER TABLE public.metas_gasto_dinheiro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar metas gasto dinheiro" ON public.metas_gasto_dinheiro
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.cargo = 'admin'
    )
  );

COMMENT ON TABLE public.metas_gasto_dinheiro IS 'Metas mensais de gasto em dinheiro por grupo de avaliacao';
COMMENT ON COLUMN public.metas_gasto_dinheiro.mes IS 'Referencia mensal no formato YYYY-MM';
COMMENT ON COLUMN public.metas_gasto_dinheiro.categoria_id IS 'Categoria de item associada (item_categories)';
COMMENT ON COLUMN public.metas_gasto_dinheiro.valor IS 'Meta mensal em dinheiro para o grupo';
