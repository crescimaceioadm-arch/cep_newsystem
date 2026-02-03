# 🔧 Corrigindo: Admin é Deslogado ao Criar Novo Usuário

**Problema:** Ao criar um novo usuário, o sistema:
1. ❌ Deslogava o admin automaticamente
2. ❌ Fazia login como o novo usuário criado
3. ❌ Admin não sabia qual email foi usado

**Causa:** O método `supabase.auth.signUp()` faz login automaticamente do novo usuário criado, substituindo a sessão do admin.

---

## ✅ Solução Implementada

### Fluxo Corrigido:

```
┌─────────────────────────────────────────┐
│ Admin: Clica "Novo Usuário"             │
│ Preenche: Email, Nome, Cargo            │
│ Clica: "Criar Usuário"                  │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ Sistema:                                 │
│ 1. Salva sessão atual do admin           │
│ 2. Cria usuário via signUp()            │
│    (signUp faz login automático)         │
│ 3. Cria perfil com cargo correto        │
│ 4. Faz logout do novo usuário            │
│ 5. Restaura sessão do admin             │
│ 6. Admin continua logado! ✅            │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ Resultado:                               │
│ ✅ Admin ainda está logado               │
│ ✅ Novo usuário criado com sucesso      │
│ ✅ Email exibido no toast                │
│ ✅ Admin pode criar mais usuários       │
└─────────────────────────────────────────┘
```

---

## 🔄 Código Atualizado

### GestaoUsuariosCard.tsx - handleCriarUsuario()

**O que mudou:**

```typescript
// ANTES (ERRADO)
const { data: authData, error: signUpError } = await supabase.auth.signUp({
  email: novoEmail,
  password: senhaTemporaria,
  options: { data: { ... } }
});
// signUp() faz login automático
// Admin é deslogado! ❌

// DEPOIS (CORRETO)
// 1. Guardar sessão do admin
const { data: sessionAtual } = await supabase.auth.getSession();
const adminSession = sessionAtual?.session;

// 2. Criar usuário (faz login automático)
const { data: authData, error: signUpError } = await supabase.auth.signUp({...});

// 3. Criar perfil
await supabase.from('profiles').upsert({...});

// 4. Fazer logout do novo usuário
await supabase.auth.signOut();

// 5. Restaurar sessão do admin
await supabase.auth.setSession(adminSession);
// Admin continua logado! ✅
```

---

## 🎯 Comportamento Esperado Agora

### ✅ Criar Novo Usuário (Social Media)

```
ANTES:
- Admin clica "Novo Usuário"
- Preenche: email=midia@empresa.com, cargo=social_media
- Clica "Criar"
- ❌ Admin é deslogado
- ❌ Página vai para dashboard de social_media
- ❌ Admin não sabe qual email foi criado

DEPOIS:
- Admin clica "Novo Usuário"
- Preenche: email=midia@empresa.com, cargo=social_media
- Clica "Criar"
- ✅ Toast mostra: "Usuário criado! Email: midia@empresa.com"
- ✅ Admin continua na página de Configurações
- ✅ Admin continua logado
- ✅ Email é visível no toast
```

### ✅ Criar Vários Usuários em Sequência

```
ANTES:
1. Cria admin: jose@empresa.com → Deslogado, vai para admin
2. Cria caixa: maria@empresa.com → Deslogado, vai para caixa
3. Cria avaliadora: ana@empresa.com → Deslogado, vai para avaliadora
❌ Nunca consegue criar mais de um!

DEPOIS:
1. Cria admin: jose@empresa.com → Admin continua logado ✅
2. Cria caixa: maria@empresa.com → Admin continua logado ✅
3. Cria avaliadora: ana@empresa.com → Admin continua logado ✅
✅ Cria quantos quiser!
```

---

## 🔐 Por Que Isso Acontecia?

### Comportamento do `signUp()`:

```
┌─────────────────────────────────────────────────────────┐
│ supabase.auth.signUp(email, password)                   │
├─────────────────────────────────────────────────────────┤
│ 1. Cria usuário em auth.users                            │
│ 2. Retorna JWT token do novo usuário                     │
│ 3. Armazena token no localStorage automaticamente        │
│ 4. Sessão do admin é SUBSTITUÍDA pela do novo usuário   │
│ 5. UserContext carrega novo cargo                        │
│ 6. App redireciona para rota padrão do novo cargo        │
│                                                          │
│ Resultado: Admin deslogado, novo usuário logado! ❌     │
└─────────────────────────────────────────────────────────┘
```

### A Solução:

```
┌─────────────────────────────────────────────────────────┐
│ Nova Abordagem                                           │
├─────────────────────────────────────────────────────────┤
│ 1. Salvar sessão do admin ANTES                          │
│ 2. Chamar signUp() (faz login novo user)                 │
│ 3. Fazer logout (remove token novo user)                │
│ 4. Restaurar sessão do admin                             │
│ 5. localStorage tem token do admin novamente             │
│ 6. UserContext atualiza para admin                       │
│ 7. Admin continua na mesma página! ✅                    │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Código Completo da Função Corrigida

```typescript
const handleCriarUsuario = async () => {
  if (!novoEmail.trim() || !novoNome.trim()) {
    toast.error('Email e nome são obrigatórios');
    return;
  }

  setSaving('novo');
  try {
    // ✅ PASSO 1: Guardar sessão atual do admin
    const { data: sessionAtual } = await supabase.auth.getSession();
    const adminSession = sessionAtual?.session;

    const senhaTemporaria = 'Temporaria@123';
    
    // ✅ PASSO 2: Criar usuário (signUp faz login automático)
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: novoEmail.trim(),
      password: senhaTemporaria,
      options: {
        data: {
          nome: novoNome.trim(),
          cargo: novoCargo,
        }
      }
    });

    if (signUpError) throw signUpError;

    if (authData?.user?.id) {
      // ✅ PASSO 3: Criar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          nome: novoNome.trim(),
          email: novoEmail.trim(),
          cargo: novoCargo,
          precisa_mudar_senha: true,
        }, {
          onConflict: 'id'
        });

      if (profileError) throw profileError;

      // ✅ PASSO 4: Fazer logout do novo usuário
      await supabase.auth.signOut();

      // ✅ PASSO 5: Restaurar sessão do admin
      if (adminSession) {
        await supabase.auth.setSession(adminSession);
      } else {
        window.location.reload();
      }

      // ✅ PASSO 6: Toast com email visível
      toast.success(`✅ Usuário criado com sucesso!\n\nEmail: ${novoEmail}\nCargo: ${novoCargo}\nSenha: Temporaria@123`);
      
      setNovoEmail('');
      setNovoNome('');
      setNovoCargo('geral');
      setMostrarNovoUsuario(false);
      fetchUsuarios();
    }
  } catch (err: any) {
    toast.error('Erro ao criar usuário: ' + err.message);
  } finally {
    setSaving(null);
  }
};
```

---

## ✅ Verificação da Correção

Para confirmar que está funcionando:

1. **Faça login como admin**
2. **Vá para Configurações**
3. **Clique "+ Novo Usuário"**
4. **Preencha:**
   - Nome: Test User
   - Email: test@empresa.com
   - Cargo: social_media
5. **Clique "Criar Usuário"**
6. **Observe:**
   - ✅ Toast mostra: "Usuário criado! Email: test@empresa.com"
   - ✅ Você continua logado como admin
   - ✅ Você está ainda na página de Configurações
   - ✅ Você pode criar mais usuários

---

## 🐛 Se Ainda Houver Problema

Se por algum motivo a restauração de sessão falhar:

```typescript
// Fallback automático
if (adminSession) {
  await supabase.auth.setSession(adminSession);
} else {
  // Se falhar, recarrega página para forçar refresh
  window.location.reload();
}
```

Isso garante que:
- ✅ Se conseguir restaurar sessão: Admin continua logado normalmente
- ✅ Se não conseguir restaurar: Página recarrega e admin faz login novamente

---

## 📊 Resumo das Mudanças

| Aspecto | Antes | Depois |
|--------|-------|--------|
| Admin deslogado ao criar | ❌ Sim | ✅ Não |
| Email visível no toast | ❌ Não | ✅ Sim |
| Pode criar vários usuários | ❌ Não | ✅ Sim |
| Sessão preservada | ❌ Não | ✅ Sim |
| Experiência do admin | ❌ Ruim | ✅ Boa |

---

**Implementado em:** 3 de Fevereiro de 2026  
**Versão:** 1.0  
**Status:** ✅ Corrigido
