# Guia: Aplicar Sistema de Permissões por Usuário

## 1. Aplicar a Migração SQL

1. Acesse o Supabase Dashboard: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (no menu lateral)
4. Clique em **New Query**
5. Copie todo o conteúdo do arquivo: `supabase/20260204_permissoes_usuario.sql`
6. Cole no editor SQL
7. Clique em **Run** ou pressione `Ctrl+Enter`
8. Verifique se a mensagem mostra "Success"

## 2. Testar o Sistema

### Verificar se a tabela foi criada:
```sql
SELECT * FROM permissoes_usuario LIMIT 10;
```

### Dar permissão customizada para um usuário:
```sql
-- Exemplo: Remover acesso a exports CSV para um usuário específico
INSERT INTO permissoes_usuario (user_id, permissao, concedida)
VALUES 
  ('SEU-USER-ID-AQUI', 'export:csv_vendas', false),
  ('SEU-USER-ID-AQUI', 'export:csv_itens', false),
  ('SEU-USER-ID-AQUI', 'export:csv_avaliacoes', false)
ON CONFLICT (user_id, permissao) 
DO UPDATE SET concedida = EXCLUDED.concedida;
```

### Buscar o user_id de um usuário por email:
```sql
SELECT id, email FROM auth.users WHERE email = 'fesidro@gmail.com';
```

## 3. Como Usar no Sistema

### Na interface web:
1. Faça login como **admin**
2. Vá em **Configurações**
3. Abra o accordion **"Permissões por Usuário"**
4. Selecione o usuário no dropdown
5. Marque/desmarque as permissões desejadas
6. Clique em **Salvar Permissões**

### Permissões Disponíveis:

#### 📱 Menus (13)
- Vendas
- Avaliações
- Financeiro
- Estoque
- Recepção
- Aprovação de Fechamentos
- Marketing
- Configurações
- Clientes
- Histórico de Vendas
- Caixa
- Histórico de Avaliações
- Histórico de Movimentações

#### ⚡ Ações (4)
- Editar Venda
- Deletar Venda
- Editar Avaliação
- Deletar Avaliação

#### 💰 Financeiro (3)
- Aprovações
- Relatório
- Movimentações

#### 📊 Exportações (3)
- CSV de Vendas
- CSV de Itens
- CSV de Avaliações

## 4. Lógica de Funcionamento

### Ordem de Verificação:
1. **Se o usuário tem permissões customizadas definidas:**
   - Verifica se a permissão específica está na lista
   - Se SIM → usa o valor definido (true/false)
   - Se NÃO → NEGA acesso (comportamento padrão quando há customização)

2. **Se o usuário NÃO tem permissões customizadas:**
   - Usa as permissões padrão do cargo (role)
   - Admin → acesso total
   - Caixa → menus financeiros + ações de venda
   - Avaliadora → menus de avaliação + ações de avaliação
   - Etc.

### Exemplos Práticos:

**Caso 1: Admin que não pode exportar CSV**
- Usuário: fesidro@gmail.com (cargo: admin)
- Permissões customizadas:
  - export:csv_vendas = false
  - export:csv_itens = false
  - export:csv_avaliacoes = false
- Resultado: Tem acesso a tudo EXCETO aos botões de exportar CSV

**Caso 2: Caixa com acesso ao Estoque**
- Usuário: caixa@exemplo.com (cargo: caixa)
- Permissões customizadas:
  - menu:/estoque = true
- Resultado: Além dos acessos normais de caixa, também pode acessar o Estoque

**Caso 3: Usuário sem customizações**
- Usuário: avaliadora@exemplo.com (cargo: avaliadora)
- Permissões customizadas: (nenhuma)
- Resultado: Usa as permissões padrão do cargo "avaliadora"

## 5. Verificações Implementadas

### No UserContext:
- `hasPermission(permissao)` - Verifica se usuário tem uma permissão específica
- Carrega permissões do banco ao fazer login
- Cache em memória durante a sessão

### Nos Componentes:
- Botões de ação verificam permissões antes de renderizar
- Itens de menu verificam permissões para exibir/ocultar
- Exports verificam permissões antes de executar

## 6. Troubleshooting

### Permissões não estão funcionando:
1. Verifique se a migração SQL foi aplicada com sucesso
2. Faça logout e login novamente para recarregar permissões
3. Verifique no console do navegador se há erros

### Usuário não aparece no dropdown:
1. Verifique se o usuário está na tabela `usuarios` (ou `profiles`)
2. Verifique se você está logado como admin

### RLS bloqueando acesso:
1. Verifique se seu usuário tem cargo 'admin' na tabela `usuarios`
2. Execute: `SELECT cargo FROM usuarios WHERE id = auth.uid();`

## 7. Segurança

- ✅ RLS habilitado na tabela
- ✅ Apenas admins podem modificar permissões de outros usuários
- ✅ Usuários podem apenas VER suas próprias permissões
- ✅ Restrições de FK garantem integridade (CASCADE on delete)
- ✅ Índices para performance em queries frequentes
