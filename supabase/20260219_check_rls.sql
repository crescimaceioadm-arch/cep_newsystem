-- Debug: Verificar se há políticas RLS na tabela fechamentos_caixa
-- Data: 2026-02-19

-- Query 1: Ver se RLS está ATIVADO na tabela
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'fechamentos_caixa';

-- Query 2: Ver ALL as políticas RLS existentes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual AS qualifying_expression,
  with_check
FROM pg_policies
WHERE tablename = 'fechamentos_caixa'
ORDER BY tablename, policyname;

-- Query 3: Ver se há políticas em outras tabelas importantes
SELECT 
  tablename,
  COUNT(*) as num_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY COUNT(*) DESC;

-- Query 4: Ver permissões de granted à role 'authenticated'
SELECT 
  grantee,
  privilege_type,
  is_grantable,
  table_name
FROM role_table_grants
WHERE grantee = 'authenticated' AND table_name IN ('fechamentos_caixa', 'caixas', 'vendas')
ORDER BY table_name, privilege_type;
