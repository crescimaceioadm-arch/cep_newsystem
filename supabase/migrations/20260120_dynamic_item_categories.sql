-- Dynamic item categories and pivot tables for atendimentos/vendas
-- Run on Supabase

-- 1) Extension
create extension if not exists "pgcrypto";

-- 2) Categories table
create table if not exists item_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  tipo text not null default 'ambos' check (tipo in ('compra','venda','ambos')),
  requer_valor boolean not null default false,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3) Pivot tables
create table if not exists atendimento_itens (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references atendimentos(id) on delete cascade,
  categoria_id uuid not null references item_categories(id) on delete restrict,
  quantidade numeric not null default 0,
  valor_total numeric null,
  created_at timestamptz not null default now()
);
create index if not exists idx_atendimento_itens_atendimento on atendimento_itens(atendimento_id);
create index if not exists idx_atendimento_itens_categoria on atendimento_itens(categoria_id);

create table if not exists venda_itens (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references vendas(id) on delete cascade,
  categoria_id uuid not null references item_categories(id) on delete restrict,
  quantidade numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_venda_itens_venda on venda_itens(venda_id);
create index if not exists idx_venda_itens_categoria on venda_itens(categoria_id);

-- 4) Seed default categories (idempotent)
insert into item_categories (slug, nome, tipo, ordem, requer_valor)
values
  ('baby', 'Baby', 'ambos', 1, false),
  ('1a16', '1 a 16', 'ambos', 2, false),
  ('calcados', 'Calçados', 'ambos', 3, false),
  ('brinquedos', 'Brinquedos', 'ambos', 4, false),
  ('enxoval', 'Enxoval', 'ambos', 5, false),
  ('itens_grandes', 'Itens Grandes', 'ambos', 6, true),
  ('fralda', 'Fralda', 'ambos', 7, false),
  ('bolsa_escolar', 'Bolsa Escolar', 'ambos', 8, false)
on conflict (slug) do nothing;

-- 5) Backfill atendimentos into pivot
insert into atendimento_itens (atendimento_id, categoria_id, quantidade, valor_total)
select a.id, c.id, coalesce(a.qtd_baby,0), null
from atendimentos a
join item_categories c on c.slug = 'baby'
where coalesce(a.qtd_baby,0) > 0;

insert into atendimento_itens (atendimento_id, categoria_id, quantidade, valor_total)
select a.id, c.id, coalesce(a.qtd_1_a_16,0), null
from atendimentos a
join item_categories c on c.slug = '1a16'
where coalesce(a.qtd_1_a_16,0) > 0;

insert into atendimento_itens (atendimento_id, categoria_id, quantidade, valor_total)
select a.id, c.id, coalesce(a.qtd_calcados,0), null
from atendimentos a
join item_categories c on c.slug = 'calcados'
where coalesce(a.qtd_calcados,0) > 0;

insert into atendimento_itens (atendimento_id, categoria_id, quantidade, valor_total)
select a.id, c.id, coalesce(a.qtd_brinquedos,0), null
from atendimentos a
join item_categories c on c.slug = 'brinquedos'
where coalesce(a.qtd_brinquedos,0) > 0;

insert into atendimento_itens (atendimento_id, categoria_id, quantidade, valor_total)
select a.id, c.id, coalesce(a.qtd_itens_medios,0), a.valor_total_itens_medios
from atendimentos a
join item_categories c on c.slug = 'itens_medios'
where coalesce(a.qtd_itens_medios,0) > 0;

insert into atendimento_itens (atendimento_id, categoria_id, quantidade, valor_total)
select a.id, c.id, coalesce(a.qtd_itens_grandes,0), a.valor_total_itens_grandes
from atendimentos a
join item_categories c on c.slug = 'itens_grandes'
where coalesce(a.qtd_itens_grandes,0) > 0;

-- 6) Backfill vendas into pivot
insert into venda_itens (venda_id, categoria_id, quantidade)
select v.id, c.id, coalesce(v.qtd_baby_vendida,0)
from vendas v
join item_categories c on c.slug = 'baby'
where coalesce(v.qtd_baby_vendida,0) > 0;

insert into venda_itens (venda_id, categoria_id, quantidade)
select v.id, c.id, coalesce(v.qtd_1_a_16_vendida,0)
from vendas v
join item_categories c on c.slug = '1a16'
where coalesce(v.qtd_1_a_16_vendida,0) > 0;

insert into venda_itens (venda_id, categoria_id, quantidade)
select v.id, c.id, coalesce(v.qtd_calcados_vendida,0)
from vendas v
join item_categories c on c.slug = 'calcados'
where coalesce(v.qtd_calcados_vendida,0) > 0;

insert into venda_itens (venda_id, categoria_id, quantidade)
select v.id, c.id, coalesce(v.qtd_brinquedos_vendida,0)
from vendas v
join item_categories c on c.slug = 'brinquedos'
where coalesce(v.qtd_brinquedos_vendida,0) > 0;

insert into venda_itens (venda_id, categoria_id, quantidade)
select v.id, c.id, coalesce(v.qtd_itens_medios_vendida,0)
from vendas v
join item_categories c on c.slug = 'itens_medios'
where coalesce(v.qtd_itens_medios_vendida,0) > 0;

insert into venda_itens (venda_id, categoria_id, quantidade)
select v.id, c.id, coalesce(v.qtd_itens_grandes_vendida,0)
from vendas v
join item_categories c on c.slug = 'itens_grandes'
where coalesce(v.qtd_itens_grandes_vendida,0) > 0;

-- 7) Add categoria_id to estoque (optional linkage)
alter table estoque add column if not exists categoria_id uuid references item_categories(id);
update estoque e
set categoria_id = c.id
from item_categories c
where lower(e.categoria) = lower(c.nome);

-- 8) Index for estoque categoria
create index if not exists idx_estoque_categoria on estoque(categoria_id);

-- Note: legacy columns remain for compatibilidade; futuras escritas devem popular as tabelas pivot.
