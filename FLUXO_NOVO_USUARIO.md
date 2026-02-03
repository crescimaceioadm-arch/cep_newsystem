# 📋 Novo Fluxo de Cadastro e Primeiro Login - Corrigido

**Data:** 3 de Fevereiro de 2026  
**Versão:** 2.0  

---

## 🎯 Melhorias Implementadas

✅ **Sem envio de email** (questões jurídicas)  
✅ **Senha padrão obrigatória** (Temporaria@123)  
✅ **Usuário obrigado a criar senha pessoal** no primeiro login  
✅ **Cargo correto exibido** (removido fallback para admin)  
✅ **Força de senha validada** (maiúscula, minúscula, número, caractere especial)  

---

## 📝 Fluxo Detalhado

### ETAPA 1: ADMIN CADASTRA NOVO USUÁRIO

**Local:** `Configurações` → "Controle de Acesso por Usuário" → Botão "+ Novo Usuário"

**Passos do Admin:**
1. Clica em "+ Novo Usuário"
2. Preenche:
   - **Nome:** João Silva
   - **Email:** joao@empresa.com
   - **Cargo:** Caixa (ou outro cargo)
3. Clica em "Criar Usuário"

**O que acontece no backend:**
- Sistema cria usuário em `auth.users` com:
  - Email: joao@empresa.com
  - Senha: **Temporaria@123** (padrão, sem gerar aleatória)
- Sistema cria registro em `profiles` com:
  - Nome: João Silva
  - Email: joao@empresa.com
  - Cargo: Caixa
  - **precisa_mudar_senha: true** ← FLAG IMPORTANTE!

**Toast mostrado ao Admin:**
```
✅ Usuário criado com sucesso!

Email: joao@empresa.com
Cargo: Caixa
Senha Temporária: Temporaria@123

⚠️ Na próxima login, o usuário será obrigado 
   a criar uma nova senha pessoal
```

---

### ETAPA 2: ADMIN COMPARTILHA CREDENCIAIS

Admin compartilha com o novo usuário:
- ✅ URL do sistema: https://cep.empresa.com
- ✅ Email: joao@empresa.com
- ✅ Senha temporária: **Temporaria@123**

**Nota importante:** Nenhum email é enviado automaticamente!

---

### ETAPA 3: NOVO USUÁRIO FAZ PRIMEIRO LOGIN

**Na tela de autenticação:**

1. Usuário acessa: https://cep.empresa.com
2. Preenche credenciais:
   - Email: joao@empresa.com
   - Senha: Temporaria@123
3. Clica em "Entrar"

**O que acontece:**
- Supabase autentica o usuário
- Sistema busca o registro em `profiles`
- Sistema identifica: `precisa_mudar_senha = true`
- **Tela de login é substituída pela tela de mudança de senha obrigatória**

---

### ETAPA 4: USUÁRIO CRIA NOVA SENHA PESSOAL (OBRIGATÓRIO)

**Tela "Criar Senha Pessoal" aparece com:**

1. Campo: **Senha Atual (Temporária)**
   - Usuário digita: Temporaria@123

2. Campo: **Nova Senha**
   - Requisitos exibidos:
     - ✅ Mínimo 8 caracteres
     - ✅ Pelo menos 1 letra maiúscula
     - ✅ Pelo menos 1 letra minúscula
     - ✅ Pelo menos 1 número
     - ✅ Pelo menos 1 caractere especial (! @ # $ % ^ & *)

3. Campo: **Confirmar Nova Senha**
   - Usuário digita novamente para confirmação

4. Clica em "Criar Senha Pessoal"

**Exemplo de senha válida:**
- ✅ Correto: `MinhaS3nh@NovaSegura`
- ❌ Fraco: `123456` (sem maiúscula, minúscula, caractere especial)
- ❌ Fraco: `abcdefgh` (sem número, maiúscula, caractere especial)

**O que acontece no backend:**
- Sistema atualiza senha em `auth.users`
- Sistema marca: `precisa_mudar_senha = false` em `profiles`
- Sistema redireciona para a home (`/`)

**Toast exibido:**
```
✅ Senha alterada com sucesso!
```

---

### ETAPA 5: PRIMEIRO ACESSO AO SISTEMA

Após criar a nova senha:

1. Usuário é redirecionado para a home
2. **Menu exibe apenas opções do seu cargo**
   - ✅ Cargo "Caixa" vê: Vendas, Financeiro, Dashboard, Performance Vendas
   - ✅ Cargo "Avaliadora" vê: Avaliação, Atendimentos Histórico
   - ✅ Cargo "Geral" vê: Vendas, Avaliação, Financeiro, etc.

**Próximos logins:**
- Email: joao@empresa.com
- Senha: **MinhaS3nh@NovaSegura** (nova, pessoal)
- Sistema NÃO pede mudança de senha novamente

---

## 🔧 Mudanças Técnicas Implementadas

### 1. **UserContext.tsx**
- ❌ Removido fallback para 'admin' quando perfil não existe
- ✅ Agora usa 'geral' como fallback (mais seguro)
- ✅ Adicionado campo `precisa_mudar_senha` na interface UserProfile
- ✅ Busca do perfil agora inclui esta flag

### 2. **GestaoUsuariosCard.tsx**
- ❌ Removida geração de senha aleatória
- ✅ Usa senha padrão: **Temporaria@123**
- ✅ Mensagem esclarece que usuário muda senha no primeiro login
- ✅ Removed referência a envio de email

### 3. **Auth.tsx**
- ✅ Detecta se usuário tem `precisa_mudar_senha = true`
- ✅ Redireciona para novo componente **MudarSenhaObrigatoria** se necessário
- ✅ Só permite acesso ao sistema após mudar senha

### 4. **MudarSenhaObrigatoria.tsx** (NOVO)
- ✅ Componente que força mudança de senha no primeiro login
- ✅ Valida força de senha
- ✅ Mostra/oculta senhas com ícone de olho
- ✅ Confirma digitação de nova senha
- ✅ Atualiza flag `precisa_mudar_senha = false` após sucesso

### 5. **Migration SQL** (20260203_add_precisa_mudar_senha.sql)
- ✅ Adiciona coluna `precisa_mudar_senha` a `profiles`
- ✅ Define valor padrão como TRUE
- ✅ Cria índice para otimizar queries

---

## 🔐 Segurança Implementada

| Aspecto | Implementação |
|--------|---------------|
| **Sem envio de email** | ✅ Admin compartilha manualmente |
| **Senha temporária padrão** | ✅ Temporaria@123 (simples, fácil memorizar) |
| **Força de senha** | ✅ Validação em cliente + validação Supabase |
| **Obrigação de trocar** | ✅ Sistema bloqueia até mudar |
| **Cargo correto** | ✅ Removido fallback inseguro para admin |
| **Sem profile admin por padrão** | ✅ Novos usuários começam como 'geral' |

---

## 📊 Permissões por Cargo (Atualizado)

| Menu/Função | Admin | Caixa | Avaliadora | Geral | Social Media | MKT |
|---|---|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Vendas | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Performance Vendas | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Avaliação | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Histórico Atendimentos | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Financeiro | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Estoque | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Marketing | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Configurações | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 🐛 Problemas Corrigidos

### ✅ Problema 1: Admin para Todos
**Antes:** Novos usuários recebiam cargo 'admin' por padrão se perfil não existisse  
**Depois:** Usam 'geral' como padrão (muito mais seguro)

### ✅ Problema 2: Senha Aleatória
**Antes:** Gerava senhas como `k9m2p1q8a7d3` (difícil de compartilhar verbalmente)  
**Depois:** Usa `Temporaria@123` (padrão, simples, fácil comunicar)

### ✅ Problema 3: Sem Obrigação de Trocar Senha
**Antes:** Usuário podia ficar com senha temporária  
**Depois:** Sistema bloqueia até criar senha pessoal

### ✅ Problema 4: Envio de Email
**Antes:** Tentava enviar email (questões jurídicas)  
**Depois:** Apenas aviso ao admin para compartilhar manualmente

---

## 🚀 Próximas Etapas Opcionais

- [ ] Implementar 2FA (autenticação de dois fatores)
- [ ] Adicionar auditoria de primeira mudança de senha
- [ ] Notificação ao usuário quando perfil foi criado
- [ ] Dashboard de últimos usuários criados
- [ ] Exportar credenciais temporárias em PDF para impressão

---

## 📞 Exemplos de Uso

### Admin criando novo usuário (Caixa):
```
1. Vai para Configurações
2. Clica "+ Novo Usuário"
3. Preenche:
   - Nome: Maria Silva
   - Email: maria@empresa.com
   - Cargo: Caixa
4. Clica "Criar"
5. Toast mostra: Senha Temporária: Temporaria@123
6. Admin compartilha via WhatsApp/verbalmente:
   "Maria, sua conta foi criada. 
    Email: maria@empresa.com
    Senha: Temporaria@123
    Na primeira vez, você muda a senha"
```

### Novo usuário fazendo primeiro login:
```
1. Acessa: https://cep.empresa.com
2. Preenche:
   - Email: maria@empresa.com
   - Senha: Temporaria@123
3. Clica "Entrar"
4. Sistema detecta precisa_mudar_senha = true
5. Tela de "Criar Senha Pessoal" aparece
6. Maria preenche:
   - Senha Atual: Temporaria@123
   - Nova Senha: M@ria2024Segura
   - Confirma: M@ria2024Segura
7. Clica "Criar Senha Pessoal"
8. Pronto! Acesso ao dashboard de Caixa
9. Próximos logins usa: maria@empresa.com / M@ria2024Segura
```

---

**Versão:** 2.0  
**Data Atualização:** 3 de Fevereiro de 2026  
**Status:** ✅ Implementado e Testado
