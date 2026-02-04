# Sistema de Permissões por Usuário - Implementação Completa

## 📋 Resumo das Alterações

Implementado sistema granular de controle de permissões por usuário individual, permitindo exceções e customizações além das permissões padrão do cargo.

## 🔧 Arquivos Criados

### 1. **supabase/20260204_permissoes_usuario.sql**
Migração SQL que cria:
- Tabela `permissoes_usuario` com RLS habilitado
- Políticas de segurança (admins gerenciam, usuários veem próprias)
- Índices para performance
- Constraint UNIQUE(user_id, permissao)

### 2. **src/hooks/usePermissoesUsuario.ts**
Hook React Query com operações:
- `usePermissoesUsuario(userId)` - Buscar permissões de um usuário
- `useTodasPermissoesUsuarios()` - Buscar todas (admin)
- `useSalvarPermissao()` - Salvar permissão individual
- `useSalvarPermissoesLote()` - Salvar lote completo
- `useDeletarPermissao()` - Deletar permissão

Define 24 tipos de permissões:
- 13 menus
- 4 ações (editar/deletar vendas e avaliações)
- 3 seções do financeiro
- 3 tipos de exportação CSV

### 3. **src/components/configuracoes/ControlePermissoesUsuarioCard.tsx**
Interface de gerenciamento com:
- Dropdown de seleção de usuário
- Checkboxes organizados por categoria
- Exibição do cargo atual do usuário
- Botões Salvar e Resetar
- Loading states

### 4. **GUIA_APLICAR_PERMISSOES_USUARIO.md**
Documentação completa com:
- Passo a passo para aplicar migração
- Exemplos de uso
- Lógica de funcionamento
- Troubleshooting

## 📝 Arquivos Modificados

### 1. **src/contexts/UserContext.tsx**
**Alterações:**
- Adicionado import de `TipoPermissao`
- Adicionado campo `permissoes?: Map<TipoPermissao, boolean>` em `UserProfile`
- Adicionado método `hasPermission(permissao)` em `UserContextType`
- Modificado `fetchProfile()` para carregar permissões do banco
- Criado método `hasPermission()` com lógica:
  1. Se usuário tem permissões customizadas → usa elas
  2. Se não tem → usa permissões do cargo (fallback)

### 2. **src/pages/Configuracoes.tsx**
**Alterações:**
- Adicionado import de `ControlePermissoesUsuarioCard`
- Criado novo AccordionItem "Permissões por Usuário"
- Posicionado após "Permissões de Menus"

## 🎯 Funcionalidades

### Permissões Disponíveis

#### 📱 Menus (13)
- Recepção e Clientes
- Vendas e Histórico
- Avaliação e Histórico
- Financeiro
- Estoque
- Dashboard
- Configurações
- Marketing
- Performance de Vendas
- Logs de Atividades

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
- CSV de Cartões
- CSV de Atendimentos

## 🔐 Lógica de Permissões

### Ordem de Verificação
```typescript
hasPermission(permissao) {
  // 1. Usuário tem customizações?
  if (profile.permissoes.size > 0) {
    // Se a permissão está definida, usar o valor
    if (profile.permissoes.has(permissao)) {
      return profile.permissoes.get(permissao);
    }
    // Se não está definida mas há customizações, negar
    return false;
  }
  
  // 2. Caso contrário, usar permissões do cargo
  return permissoesDoCargo(cargo, permissao);
}
```

### Comportamento por Cenário

**Cenário 1: Usuário SEM permissões customizadas**
```
✅ Usa 100% as permissões do cargo
✅ Admin → tudo liberado
✅ Caixa → menus financeiros + ações de venda
✅ Avaliadora → menus de avaliação + ações de avaliação
```

**Cenário 2: Usuário COM permissões customizadas**
```
✅ Se permissão X está na lista → usa o valor (true/false)
❌ Se permissão X NÃO está na lista → NEGA acesso
⚠️ Comportamento "whitelist" quando há customizações
```

## 🚀 Como Usar

### 1. Aplicar Migração SQL
```bash
1. Acesse Supabase Dashboard
2. SQL Editor > New Query
3. Cole o conteúdo de: supabase/20260204_permissoes_usuario.sql
4. Execute (Ctrl+Enter)
```

### 2. Configurar Permissões na Interface
```
1. Login como admin
2. Configurações > Permissões por Usuário
3. Selecionar usuário no dropdown
4. Marcar/desmarcar permissões
5. Salvar Permissões
```

### 3. Exemplo: Bloquear CSV para Admin
```
Usuário: fesidro@gmail.com (admin)
Permissões marcadas:
  - ✅ Todos os menus
  - ✅ Todas as ações
  - ✅ Todos os financeiros
  - ❌ export:csv_vendas
  - ❌ export:csv_cartoes
  - ❌ export:csv_atendimentos

Resultado: Admin com tudo EXCETO exports CSV
```

## ✅ Checklist de Implementação

- [x] Migração SQL criada
- [x] Hook usePermissoesUsuario implementado
- [x] Componente UI ControlePermissoesUsuarioCard criado
- [x] UserContext atualizado com hasPermission()
- [x] Página Configuracoes atualizada
- [x] Documentação completa criada
- [ ] Migração aplicada no Supabase (manual)
- [ ] Teste em ambiente de desenvolvimento
- [ ] Aplicar verificações nos botões de ação
- [ ] Aplicar verificações nos exports

## 🔜 Próximos Passos

### 1. Aplicar a Migração (URGENTE)
- Executar SQL no Supabase Dashboard
- Verificar se tabela foi criada
- Testar RLS policies

### 2. Integrar Verificações nos Componentes
Locais que precisam de verificação:
- Botão "Editar Venda" em VendasHistorico
- Botão "Deletar Venda" em VendasHistorico
- Botões de Export CSV em várias páginas
- Botão "Editar Avaliação" em HistoricoAvaliacoes
- Etc.

Exemplo de implementação:
```tsx
import { useUser } from '@/contexts/UserContext';

function VendaActions() {
  const { hasPermission } = useUser();
  
  return (
    <>
      {hasPermission('action:editar_venda') && (
        <Button onClick={handleEdit}>Editar</Button>
      )}
      {hasPermission('export:csv_vendas') && (
        <Button onClick={handleExport}>Exportar CSV</Button>
      )}
    </>
  );
}
```

### 3. Testar Casos de Uso
- [ ] Admin sem customizações (deve ter tudo)
- [ ] Admin bloqueado de CSV (deve ter tudo exceto CSV)
- [ ] Caixa com acesso extra ao Estoque
- [ ] Avaliadora sem poder deletar avaliações
- [ ] Usuário geral sem customizações

## 🔒 Segurança

### RLS Policies Implementadas
1. **Admin Full Access**: Admins veem e modificam todas as permissões
2. **Self Read**: Usuários veem apenas suas próprias permissões
3. **Cascade Delete**: Permissões deletadas quando usuário é removido

### Validações
- ✅ TypeScript garante tipo correto de permissões
- ✅ Unique constraint evita duplicatas
- ✅ FK constraint garante integridade
- ✅ RLS impede acesso não autorizado

## 📊 Performance

### Otimizações Implementadas
- Índices em `user_id` e `permissao`
- Cache via React Query
- Carregamento de permissões apenas no login
- Mapa em memória durante a sessão

### Queries Esperadas
```sql
-- Load na autenticação (1x por login)
SELECT permissao, concedida 
FROM permissoes_usuario 
WHERE user_id = $1;

-- Verificação em memória (0 queries)
hasPermission(permissao) // cache em Map
```

## 🐛 Troubleshooting Comum

### Permissões não aparecem
- Fazer logout e login novamente
- Verificar se migração foi aplicada
- Verificar console do navegador

### Usuário não aparece no dropdown
- Verificar se está na tabela profiles
- Verificar se você está logado como admin

### RLS bloqueando acesso
- Verificar se seu cargo é 'admin' na tabela usuarios/profiles
- Executar: `SELECT cargo FROM profiles WHERE id = auth.uid();`

## 📚 Referências

- Arquivo de migração: `supabase/20260204_permissoes_usuario.sql`
- Hook principal: `src/hooks/usePermissoesUsuario.ts`
- Contexto de auth: `src/contexts/UserContext.tsx`
- UI de gerenciamento: `src/components/configuracoes/ControlePermissoesUsuarioCard.tsx`
- Guia completo: `GUIA_APLICAR_PERMISSOES_USUARIO.md`
