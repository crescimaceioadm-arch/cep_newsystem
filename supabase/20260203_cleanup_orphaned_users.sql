-- Script para remover usuários órfãos em auth.users (que foram deletados apenas de profiles)
-- Execute este script uma vez para limpar usuários antigos que ficaram órfãos

-- Ver usuários órfãos (não tem correspondência em profiles)
SELECT id, email, created_at 
FROM auth.users 
WHERE id NOT IN (SELECT id FROM profiles)
ORDER BY created_at DESC;

-- ATENÇÃO: O comando abaixo vai DELETAR todos os usuários órfãos
-- Descomente se tiver certeza que quer remover
/*
DELETE FROM auth.users 
WHERE id NOT IN (SELECT id FROM profiles);
*/

-- Alternativa: Deletar apenas usuários específicos
-- DELETE FROM auth.users 
-- WHERE email IN ('email1@exemplo.com', 'email2@exemplo.com', 'email3@exemplo.com')
-- AND id NOT IN (SELECT id FROM profiles);
