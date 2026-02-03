-- Script de debug para verificar vendas

-- 1. Contar vendas na tabela
SELECT COUNT(*) as total_vendas FROM vendas;

-- 2. Mostrar últimas 5 vendas
SELECT 
  id, 
  created_at, 
  vendedora_nome, 
  cliente_nome,
  valor_total_venda,
  caixa_origem
FROM vendas 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'vendas';

-- 4. Testar se o usuário atual consegue ver vendas
SELECT 
  COUNT(*) as vendas_visiveis_para_mim,
  auth.uid() as meu_user_id
FROM vendas;
