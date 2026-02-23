# Documentação Completa do Sistema - CeP (Centro de Pequenos)

**Data:** 23 de Fevereiro de 2026  
**Objetivo:** Documentação técnica completa do sistema atual para servir de base para criação de um novo sistema mais robusto e comercializável.

---

## 📋 Índice

1. [Descrição do Sistema](#descrição-do-sistema)
2. [Stack Tecnológica](#stack-tecnológica)
3. [Principais Funcionalidades](#principais-funcionalidades)
4. [Telas e Funcionalidades](#telas-e-funcionalidades)
5. [Arquitetura e Estrutura](#arquitetura-e-estrutura)
6. [Arquivos e Funções Principais](#arquivos-e-funções-principais)
7. [Sistema de Indicadores e Métricas](#sistema-de-indicadores-e-métricas)
8. [Banco de Dados](#banco-de-dados)
9. [Sistema de Permissões](#sistema-de-permissões)
10. [Fluxos Principais](#fluxos-principais)

---

## 📖 Descrição do Sistema

### Visão Geral
O sistema **CeP** (Centro de Pequenos) é uma plataforma de gestão completa para um brechó infantil. O sistema gerencia todo o ciclo operacional do negócio, desde a recepção e avaliação de itens trazidos por clientes, passando pelo controle de estoque, vendas, gestão financeira (caixas), até marketing e análises de performance.

### Modelo de Negócio
- **Compra de Itens**: Clientes trazem roupas e itens infantis para avaliação
- **Avaliação**: Equipe avalia os itens e oferece pagamento em dinheiro ou crédito (GIRA)
- **Vendas**: Os itens aprovados entram no estoque e são vendidos
- **Pagamentos**: Clientes podem receber em dinheiro ou GIRA (crédito na loja)
- **Gestão de Caixas**: Sistema complexo de múltiplos caixas com controle de saldo e fechamentos diários

### Usuários do Sistema
- **Admin**: Acesso total ao sistema
- **Caixa**: Gestão financeira e vendas
- **Avaliadora**: Recepção e avaliação de itens
- **Geral**: Acesso a múltiplas funcionalidades (recepcão, vendas, avaliação)
- **Social Media**: Gestão de marketing e redes sociais
- **Marketing (MKT)**: Planejamento de marketing

---

## 🛠 Stack Tecnológica

### Frontend
- **Framework**: React 18.3.1
- **Build Tool**: Vite 5.4.19
- **Linguagem**: TypeScript 5.8.3
- **Roteamento**: React Router DOM 6.30.1
- **Gerenciamento de Estado**: 
  - React Context API (UserContext, CaixaContext, InactivityContext)
  - TanStack React Query 5.83.0 (cache e sincronização de dados)

### UI/UX
- **Design System**: shadcn/ui (componentes baseados em Radix UI)
- **Estilização**: Tailwind CSS 3.4.17
- **Ícones**: Lucide React 0.462.0
- **Gráficos**: Recharts 2.15.4
- **Formulários**: React Hook Form 7.61.1 + Zod 3.25.76
- **Notificações**: Sonner 1.7.4

### Backend/Database
- **BaaS**: Supabase
  - **Banco de Dados**: PostgreSQL (via Supabase)
  - **Autenticação**: Supabase Auth
  - **Real-time**: Supabase Realtime
  - **Storage**: Supabase Storage
  - **RLS**: Row Level Security (controle de acesso)

### Bibliotecas Auxiliares
- **Datas**: date-fns 3.6.0
- **Validação**: Zod 3.25.76
- **Class Utils**: clsx 2.1.1, tailwind-merge 2.6.0
- **Testes**: Vitest 4.0.17, Testing Library

### Deploy
- **Plataforma**: Vercel (configurado via vercel.json)

---

## 🎯 Principais Funcionalidades

### 1. Gestão de Atendimentos
- Criar novo atendimento ao cliente
- Acompanhar status do atendimento (aguardando, em avaliação, aguardando pagamento, finalizado)
- Sistema de fila com tempo de espera
- Avaliação de itens trazidos pelos clientes
- Múltiplas formas de pagamento (dinheiro, PIX, cartão, GIRA)
- Histórico completo de atendimentos
- Preferência de pagamento do cliente (dinheiro vs GIRA)
- Sistema de recusa (pela loja ou pelo cliente)

### 2. Gestão de Vendas
- Registro de vendas com múltiplos itens
- Suporte a múltiplas formas de pagamento
- Vinculação de vendedora responsável
- Controle de estoque em tempo real
- Histórico de vendas com filtros
- Exportação de relatórios (CSV)
- Sistema de itens grandes individualizados

### 3. Controle Financeiro
- Gestão de 3 caixas independentes (Caixa 1, 2 e 3)
- Saldo inicial e saldo final por dia
- Movimentações detalhadas por tipo:
  - Vendas
  - Pagamentos de avaliação
  - Entradas manuais
  - Saídas manuais
  - Transferências entre caixas
- Sistema de fechamento de caixa com aprovação
- Justificativa de diferenças
- Histórico de fechamentos
- Relatórios financeiros detalhados

### 4. Gestão de Estoque
- Controle de estoque por categoria
- Entrada automática via atendimentos
- Saída automática via vendas
- Ajustes manuais com histórico
- Visualização de movimentações por período
- Categorias dinâmicas configuráveis
- Sistema de itens grandes (rastreamento individual)

### 5. Dashboard e Indicadores
- Indicadores em tempo real
- Métricas de hoje vs mês
- Performance por equipe (avaliadora/vendedora)
- Análise de pagamentos (dinheiro vs GIRA)
- Gráficos de evolução
- Ranking de colaboradores
- Metas e acompanhamento

### 6. Marketing
- Planejamento de conteúdo semanal
- Calendário de postagens
- Gestão de eventos de marketing
- Controle de produção de conteúdo
- Acompanhamento de responsáveis
- Tipos de postagem padronizados

### 7. Configurações
- Gestão de usuários e permissões
- Configuração de categorias de itens
- Definição de valores padrão
- Gestão de colaboradores
- Logs de atividades do sistema

---

## 🖥 Telas e Funcionalidades

### 1. **Auth** (`/auth`)
- **Arquivo**: `src/pages/Auth.tsx`
- **Função**: Autenticação de usuários
- **Recursos**:
  - Login com email/senha
  - Integração com Supabase Auth
  - Redirecionamento baseado em cargo

### 2. **Admin Home** (`/`)
- **Arquivo**: `src/pages/AdminHome.tsx`
- **Função**: Página inicial para administradores
- **Recursos**:
  - Visão geral do sistema
  - Acesso rápido a funcionalidades principais

### 3. **Cockpit Real-Time** (`/cockpit-real-time`)
- **Arquivo**: `src/pages/CockpitRealTime.tsx`
- **Função**: Visão em tempo real de todas as avaliações em andamento
- **Recursos**:
  - Lista de todos os atendimentos não finalizados
  - Agrupamento por cliente
  - Tempo de espera em tempo real
  - Status de cada avaliação
  - Preferência de pagamento do cliente
  - Resumo dos itens sendo avaliados
  - Informações detalhadas de pagamento

### 4. **Recepção** (`/recepcao`)
- **Arquivo**: `src/pages/Recepcao.tsx`
- **Função**: Gestão da fila de atendimento
- **Recursos**:
  - Criar novo atendimento
  - Visualizar fila de espera
  - Acompanhar tempo de espera
  - Iniciar avaliação
  - Finalizar atendimento
  - Excluir atendimento
  - Badges de preferência do cliente (💰 Dinheiro, 🟡 GIRA, ⚠️ Recusa)
  - Filtros por status

### 5. **Avaliação** (`/avaliacao`)
- **Arquivo**: `src/pages/Avaliacao.tsx`
- **Função**: Avaliação de itens trazidos por clientes
- **Recursos**:
  - Lista de atendimentos "em avaliação"
  - Seleção de categorias e quantidades (sistema dinâmico)
  - Cálculo automático de valores
  - Múltiplas formas de pagamento
  - Registro de itens grandes individuais
  - Finalização com atualização automática de estoque
  - Opção de recusa (loja ou cliente)

### 6. **Histórico de Atendimentos** (`/atendimentos/historico`)
- **Arquivo**: `src/pages/HistoricoAtendimentos.tsx`
- **Função**: Visualização de histórico completo de atendimentos
- **Recursos**:
  - Filtros por data, cliente, avaliadora
  - Visualização detalhada de cada atendimento
  - Exportação de dados

### 7. **Clientes Insights** (`/recepcao/clientes`)
- **Arquivo**: `src/pages/ClientesInsights.tsx`
- **Função**: Análise de comportamento de clientes
- **Recursos**:
  - Histórico de avaliações por cliente
  - Preferências de pagamento
  - Análise de recusas
  - Métricas de relacionamento

### 8. **Vendas** (`/vendas`)
- **Arquivo**: `src/pages/Vendas.tsx`
- **Função**: Registro de vendas
- **Recursos**:
  - Seleção de itens por categoria (sistema dinâmico)
  - Controle de quantidades
  - Validação de estoque disponível
  - Múltiplas formas de pagamento (PIX, Débito, Crédito, Dinheiro, GIRA)
  - Seleção de vendedora responsável
  - Sistema de itens grandes
  - Descrição de itens extras
  - Validação de valores
  - Integração automática com caixa selecionado
  - Exportação de vendas (CSV)

### 9. **Histórico de Vendas** (`/vendas/historico`)
- **Arquivo**: `src/pages/VendasHistorico.tsx`
- **Função**: Visualização e gestão de vendas realizadas
- **Recursos**:
  - Listagem completa de vendas
  - Filtros por data, vendedora, forma de pagamento
  - Edição de vendas
  - Exclusão de vendas (com reverter estoque)
  - Visualização detalhada
  - Exportação de relatórios

### 10. **Financeiro** (`/financeiro`)
- **Arquivo**: `src/pages/Financeiro.tsx`
- **Função**: Gestão financeira completa de caixas
- **Recursos**:
  - Visualização de saldo de cada caixa (Caixa 1, 2, 3)
  - Saldo inicial do dia (baseado em fechamento anterior)
  - Movimentações do dia
  - Movimentações de dinheiro (filtro especial)
  - Saldo final calculado
  - Abertura de caixa para avaliação
  - Transferência entre caixas
  - Entrada/saída manual com justificativa
  - Fechamento de caixa (com aprovação obrigatória)
  - Ajuste de saldo (apenas Admins)
  - Aprovação de fechamentos (sistema de aprovação)
  - Relatórios de fechamentos
  - Relatório de movimentações
  - Gráficos de evolução de saldo
  - Exclusão de movimentações (com logs)
  - Edição de movimentações

### 11. **Estoque** (`/estoque`)
- **Arquivo**: `src/pages/Estoque.tsx`
- **Função**: Controle de estoque
- **Recursos**:
  - Visualização por categoria
  - Quantidade atual
  - Movimentações do período (compras/vendas)
  - Ajustes manuais
  - Filtro por período (hoje, semana, mês atual, mês passado)
  - Visualização colorida por categoria
  - Link para itens grandes

### 12. **Itens Grandes** (`/estoque/itens-grandes`)
- **Arquivo**: `src/pages/ItensGrandes.tsx`
- **Função**: Gestão de itens grandes individualizados
- **Recursos**:
  - Registro individual de cada item grande
  - Controle por tipo (carrinho, cadeirinha, etc.)
  - Controle por marca
  - Valor de compra e venda
  - Status (disponível, vendido, baixa)
  - Rastreamento de entrada e saída
  - Vínculo com atendimento de compra
  - Vínculo com venda
  - Observações

### 13. **Relatório Itens Grandes** (`/estoque/itens-grandes/relatorio`)
- **Arquivo**: `src/pages/RelatorioItensGrandes.tsx`
- **Função**: Relatórios de itens grandes
- **Recursos**:
  - Filtros por período, tipo, marca, status
  - Análise financeira
  - Lucro por item
  - Exportação

### 14. **Dashboard** (`/dashboard`)
- **Arquivo**: `src/pages/Dashboard.tsx`
- **Função**: Painel de indicadores e análises
- **Recursos**:
  - Seletor de período (hoje, semana, mês)
  - **Aba Equipe**:
    - Ranking de avaliadoras (dinheiro e GIRA)
    - Ranking de vendedoras
    - Rainha do Mês (melhor avaliadora em dinheiro)
  - **Aba Financeiro**:
    - Comparativo Hoje vs Mês (dinheiro e GIRA)
    - Evolução diária de compras e vendas
    - Análise de métodos de pagamento
    - Gráficos de categorias
  - **Aba Estoque**:
    - Gráficos de compras por categoria
    - Gráficos de vendas por categoria
    - Análise de giro de estoque
  - **Aba Metas**:
    - Configuração de metas de gasto em dinheiro
    - Acompanhamento por avaliadora
    - Percentual de alcance

### 15. **Performance de Vendas** (`/performance-vendas`)
- **Arquivo**: `src/pages/PerformanceVendas.tsx`
- **Função**: Análise detalhada de performance de vendas
- **Recursos**:
  - Seletor de período customizável
  - Quick filters (hoje, semana, mês)
  - **Ranking de Vendedoras**:
    - Total em dinheiro
    - Total de peças vendidas
    - Ticket médio
    - Total de vendas realizadas
  - **Análise por Categoria**:
    - Vendas por vendedora e categoria
    - Gráficos detalhados
  - **Métricas Gerais**:
    - Total de vendas do período
    - Total de peças
    - Ticket médio geral

### 16. **Marketing** (`/marketing`)
- **Arquivo**: `src/pages/Marketing.tsx`
- **Função**: Planejamento e controle de marketing
- **Recursos**:
  - **Visualização Semanal**:
    - Calendário de postagens
    - Grid de planejamento
  - **Tipos de Postagem**:
    - Reels, Stories, Feed, Carrossel, Divulgação
  - **Gestão de Eventos**:
    - Criar/editar/excluir eventos
    - Definir responsável
    - Horários de postagem programados
    - Check de produção
    - Data de produção
    - Horário real de postagem
  - **Calendário Visual**:
    - Visualização mensal
    - Eventos por dia
    - Cores por categoria
  - **Filtros**:
    - Por responsável
    - Por data de postagem
    - Por data de produção

### 17. **Configurações** (`/configuracoes`)
- **Arquivo**: `src/pages/Configuracoes.tsx`
- **Função**: Configurações do sistema
- **Recursos**:
  - **Usuários**:
    - Criar/editar/excluir usuários
    - Definir cargo
    - Sistema de permissões individuais
    - Forçar alteração de senha
  - **Categorias de Itens**:
    - Criar/editar categorias
    - Definir tipo (compra, venda, ambos)
    - Configurar se requer valor
    - Configurar se requer descrição
    - Ordenação
    - Ativar/desativar
  - **Colaboradores**:
    - Cadastro de equipe
    - Função (Avaliadora, Vendedora, Marketing)
    - Ativo/inativo
  - **Valores Padrão**:
    - Configurar valores de referência para categorias

### 18. **Logs de Atividades** (`/logs-atividades`)
- **Arquivo**: `src/pages/LogsAtividades.tsx`
- **Função**: Auditoria e rastreamento de ações
- **Recursos**:
  - Log de todas as ações importantes
  - Filtros por usuário, tipo de ação, data
  - Detalhes completos da ação
  - Registro automático de:
    - Criação/edição/exclusão de atendimentos
    - Criação/edição/exclusão de vendas
    - Movimentações de caixa
    - Fechamentos e aprovações
    - Ajustes de estoque
    - Alterações de configuração

### 19. **Not Found** (`/*`)
- **Arquivo**: `src/pages/NotFound.tsx`
- **Função**: Página de erro 404
- **Recursos**:
  - Mensagem de página não encontrada
  - Link para retornar

---

## 🏗 Arquitetura e Estrutura

### Estrutura de Diretórios

```
src/
├── components/          # Componentes React reutilizáveis
│   ├── auth/           # Componentes de autenticação
│   ├── avaliacao/      # Componentes da tela de avaliação
│   ├── configuracoes/  # Componentes de configurações
│   ├── estoque/        # Componentes de estoque
│   ├── financeiro/     # Componentes financeiros
│   ├── layout/         # Layout e navegação
│   ├── marketing/      # Componentes de marketing
│   ├── notifications/  # Sistema de notificações
│   ├── recepcao/       # Componentes de recepção
│   ├── ui/            # Componentes UI base (shadcn)
│   └── vendas/        # Componentes de vendas
├── contexts/          # React Contexts
│   ├── CaixaContext.tsx      # Contexto de seleção de caixa
│   ├── InactivityContext.tsx # Contexto de inatividade
│   └── UserContext.tsx       # Contexto de usuário e permissões
├── hooks/             # Custom React Hooks
│   ├── useAtendimentos.ts
│   ├── useCaixas.ts
│   ├── useCargos.ts
│   ├── useClientePreferenciaPagemento.ts
│   ├── useColaboradores.ts
│   ├── useEstoque.ts
│   ├── useEventosMarketing.ts
│   ├── useItemCategories.ts
│   ├── useItensGrandesIndividuais.ts
│   ├── useLogAtividade.ts
│   ├── useMarcasItensGrandes.ts
│   ├── usePermissoesUsuario.ts
│   ├── useTiposItensGrandes.ts
│   ├── useVendas.ts
│   ├── useVendasHistorico.ts
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── integrations/      # Integrações externas
│   └── supabase/
│       └── client.ts  # Cliente Supabase
├── lib/               # Funções utilitárias
│   └── utils.ts       # Helpers gerais
├── pages/             # Páginas da aplicação
├── types/             # Definições de tipos TypeScript
│   └── database.ts    # Tipos do banco de dados
├── App.tsx            # Componente raiz
└── main.tsx           # Entry point
```

### Padrões Arquiteturais

1. **Component-Based Architecture**
   - Componentes isolados e reutilizáveis
   - Separação de responsabilidades
   - Props tipadas com TypeScript

2. **Context API para Estado Global**
   - UserContext: autenticação e permissões
   - CaixaContext: seleção de caixa ativo
   - InactivityContext: controle de sessão

3. **React Query para Gerenciamento de Dados**
   - Cache automático
   - Sincronização com servidor
   - Mutations com invalidação de cache
   - Optimistic updates

4. **Custom Hooks para Lógica de Negócio**
   - Encapsulamento de lógica complexa
   - Reutilização de código
   - Separação de concerns

---

## 📁 Arquivos e Funções Principais

### 1. Gestão de Usuários e Autenticação

#### `src/contexts/UserContext.tsx`
**Função**: Gerenciamento de sessão, autenticação e permissões

**Principais Exports**:
- `UserProvider`: Provider do contexto
- `useUser()`: Hook para acessar dados do usuário
- `ROLE_PERMISSIONS`: Mapeamento de permissões por cargo
- `DEFAULT_ROUTE`: Rota padrão por cargo

**Funcionalidades**:
```typescript
interface UserContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  cargo: UserRole;
  loading: boolean;
  isAdmin: boolean;
  isCaixa: boolean;
  isAvaliadora: boolean;
  isGeral: boolean;
  hasPermission: (permissao: TipoPermissao) => boolean;
  logout: () => Promise<void>;
}
```

**Cargos Disponíveis**:
- `admin`: Acesso total
- `caixa`: Gestão financeira e vendas
- `avaliadora`: Recepção e avaliação
- `geral`: Múltiplas funcionalidades
- `social_media`: Marketing
- `mkt`: Marketing e dashboard

### 2. Gestão de Caixas

#### `src/contexts/CaixaContext.tsx`
**Função**: Gerenciamento de seleção de caixa ativo

**Principais Exports**:
- `CaixaProvider`: Provider do contexto
- `useCaixa()`: Hook para acessar caixa selecionado

**Funcionalidades**:
```typescript
interface CaixaContextType {
  caixaSelecionado: CaixaOption | null; // "Caixa 1" | "Caixa 2" | "Caixa 3"
  setCaixaSelecionado: (caixa: CaixaOption) => void;
  limparCaixa: () => void;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  initializeCaixaForRole: (cargo: UserRole | null, userId: string | null) => void;
}
```

#### `src/hooks/useCaixas.ts`
**Função**: Hooks para operações de caixa e movimentações financeiras

**Principais Exports**:
- `useCaixas()`: Buscar todos os caixas
- `useMovimentacoesCaixa()`: Buscar movimentações de um caixa
- `useMovimentacoesDinheiro()`: Buscar apenas movimentações em dinheiro
- `useSaldoInicial()`: Calcular saldo inicial do dia
- `useSaldoFinalHoje()`: Calcular saldo final do dia
- `useTransferenciaCaixa()`: Transferir entre caixas
- `useMovimentacaoManual()`: Entrada/saída manual
- `useDeleteMovimentacao()`: Excluir movimentação
- `useEditarMovimentacao()`: Editar movimentação

**Lógica de Saldo Inicial** (crítico):
```typescript
// Prioridade para cálculo de saldo inicial:
// 1. Fechamento aprovado do dia anterior (valor_contado)
// 2. Fechamento mais recente anterior
// 3. Zero como fallback
```

**Tipos de Movimentação**:
- `venda`: Entrada por venda
- `pagamento_avaliacao`: Saída por pagamento de avaliação
- `entrada`: Entrada manual
- `saida`: Saída manual
- `transferencia_entre_caixas`: Transferência interna

### 3. Gestão de Atendimentos

#### `src/hooks/useAtendimentos.ts`
**Função**: CRUD e lógica de atendimentos

**Principais Exports**:
- `useAtendimentos()`: Buscar todos os atendimentos
- `useAtendimentosByStatus()`: Filtrar por status
- `useCreateAtendimento()`: Criar novo atendimento
- `useUpdateAtendimento()`: Atualizar atendimento
- `useDeleteAtendimento()`: Excluir atendimento
- `useAtendimentosDinheiroFinalizados()`: Atendimentos finalizados em dinheiro

**Status de Atendimento**:
```typescript
type StatusAtendimento = 
  | 'aguardando'              // Na fila
  | 'em_avaliacao'            // Em processo de avaliação
  | 'aguardando_pagamento'    // Aguardando pagamento
  | 'finalizado'              // Concluído
  | 'recusado'                // Recusado pela loja
  | 'recusou';                // Cliente recusou
```

**Fluxo de Atendimento**:
1. Cliente chega (status: `aguardando`)
2. Inicia avaliação (status: `em_avaliacao`)
3. Avaliação concluída (status: `aguardando_pagamento`)
4. Pagamento efetuado (status: `finalizado`)
5. OU recusa (status: `recusado` ou `recusou`)

### 4. Gestão de Vendas

#### `src/hooks/useVendas.ts`
**Função**: Operações de vendas

**Principais Exports**:
- `useVendas()`: Buscar todas as vendas
- `useVendasHoje()`: Vendas do dia
- `useFinalizarVenda()`: Criar nova venda

**Processo de Venda**:
1. Seleção de itens e quantidades
2. Validação de estoque
3. Cálculo de valor total
4. Registro de formas de pagamento
5. Seleção de vendedora
6. Atualização automática de:
   - Estoque (baixa)
   - Caixa (movimentação de entrada)

#### `src/hooks/useVendasHistorico.ts`
**Função**: Histórico e edição de vendas

**Principais Exports**:
- `useVendasHistorico()`: Buscar histórico com filtros
- `useAtualizarVenda()`: Editar venda existente
- `useExcluirVenda()`: Excluir venda (com reverter estoque e caixa)

### 5. Gestão de Estoque

#### `src/hooks/useEstoque.ts`
**Função**: Controle de estoque

**Principais Exports**:
- `useEstoque()`: Buscar estoque atual
- `useAjustarEstoque()`: Ajustar quantidade (entrada/saída manual)

**Triggers Automáticos** (PostgreSQL):
- Atendimento finalizado → Adiciona ao estoque
- Venda criada → Remove do estoque
- Ajustes manuais → Registra histórico

### 6. Sistema de Categorias

#### `src/hooks/useItemCategories.ts`
**Função**: Gerenciamento de categorias dinâmicas

**Principais Exports**:
- `useItemCategories()`: Buscar categorias
- `useCreateCategory()`: Criar categoria
- `useUpdateCategory()`: Atualizar categoria
- `useDeleteCategory()`: Excluir categoria

**Propriedades de Categoria**:
```typescript
interface ItemCategoria {
  id: string;
  slug: string;
  nome: string;
  tipo: 'compra' | 'venda' | 'ambos';
  requer_valor: boolean;
  requer_descricao: boolean;
  ordem: number;
  ativo: boolean;
}
```

### 7. Sistema de Preferências de Cliente

#### `src/hooks/useClientePreferenciaPagemento.ts`
**Função**: Análise de comportamento de pagamento do cliente

**Principais Exports**:
- `useClientePreferenciaPagamento()`: Preferência de um cliente
- `useClientesPreferenciaBatch()`: Batch de múltiplos clientes
- `useClientesRecusasBatch()`: Histórico de recusas

**Lógica de Preferência**:
- Analisa histórico de atendimentos finalizados
- Calcula porcentagem de dinheiro vs GIRA
- Classifica como: "dinheiro", "gira", "misto"

### 8. Gestão de Colaboradores

#### `src/hooks/useColaboradores.ts`
**Função**: CRUD de colaboradores

**Principais Exports**:
- `useColaboradores()`: Todos os colaboradores
- `useColaboradoresByFuncao()`: Filtrar por função
- `useCreateColaborador()`: Criar colaborador
- `useUpdateColaborador()`: Atualizar colaborador
- `useDeleteColaborador()`: Excluir colaborador

**Funções Disponíveis**:
- Avaliadora
- Vendedora
- Marketing

### 9. Sistema de Permissões

#### `src/hooks/usePermissoesUsuario.ts`
**Função**: Permissões granulares por usuário

**Principais Exports**:
- `usePermissoesUsuario()`: Permissões de um usuário
- `useTodasPermissoesUsuarios()`: Todas as permissões
- `useSalvarPermissao()`: Salvar permissão individual
- `useDeletarPermissao()`: Remover permissão
- `useSalvarPermissoesLote()`: Salvar múltiplas permissões

**Tipos de Permissão**:
```typescript
type TipoPermissao = 
  | 'aprovar_fechamento'
  | 'excluir_movimentacao'
  | 'ajustar_saldo'
  | 'editar_venda'
  | 'excluir_venda'
  | 'ajustar_estoque'
  // ... outras permissões
```

### 10. Sistema de Logs

#### `src/hooks/useLogAtividade.ts`
**Função**: Auditoria e rastreamento

**Principais Exports**:
- `useLogsAtividades()`: Buscar logs com filtros
- `useRegistrarLog()`: Registrar nova atividade
- `useLogAtividade()`: Hook helper para log automático

**Estrutura de Log**:
```typescript
interface LogAtividade {
  id: string;
  user_id: string;
  tipo_acao: string;          // create, update, delete, approve, etc
  tabela_afetada: string;     // atendimentos, vendas, caixas, etc
  registro_id: string | null;
  detalhes: object | null;    // JSON com detalhes da ação
  ip_address: string | null;
  created_at: string;
}
```

### 11. Itens Grandes

#### `src/hooks/useItensGrandesIndividuais.ts`
**Função**: Rastreamento individual de itens grandes

**Principais Exports**:
- `useItensGrandesIndividuais()`: Buscar itens
- `useCreateItemGrandeIndividual()`: Criar item
- `useUpdateItemGrandeIndividual()`: Atualizar item
- `useDeleteItemGrandeIndividual()`: Excluir item
- `useRegistrarVendaItemGrande()`: Registrar venda

**Estrutura de Item Grande**:
```typescript
interface ItemGrandeIndividual {
  id: string;
  tipo_id: string;              // FK para tipos_itens_grandes
  marca_id: string;             // FK para marcas_itens_grandes
  descricao: string;
  valor_compra: number;
  valor_venda: number | null;
  observacoes: string | null;
  status: 'disponivel' | 'vendido' | 'baixa';
  
  // Rastreamento de entrada
  atendimento_id: string | null;
  data_entrada: string;
  avaliadora_nome: string | null;
  
  // Rastreamento de saída
  venda_id: string | null;
  data_venda: string | null;
  vendedora_nome: string | null;
}
```

### 12. Marketing

#### `src/hooks/useEventosMarketing.ts`
**Função**: Gestão de eventos e postagens de marketing

**Principais Exports**:
- `useEventosMarketing()`: Buscar eventos
- `useCreateEvento()`: Criar evento
- `useUpdateEvento()`: Atualizar evento
- `useDeleteEvento()`: Excluir evento

### 13. Utilitários de Data e Hora

#### `src/lib/utils.ts`
**Funções Críticas**:

```typescript
// Converter UTC para horário de Brasília
function convertToLocalTime(utcString: string): Date

// Obter data atual em Brasília (formato YYYY-MM-DD)
function getDateBrasilia(): string

// Obter data e hora atual em Brasília (ISO string)
function getDateTimeBrasilia(): string

// Converter para UTC para salvar no banco
function getDateTimeUTC(): string

// Obter range de datas em Brasília
function getBrasiliaRange(inicio: Date, fim: Date): { start: string; end: string }
```

**Importante**: Todo o sistema usa timezone de Brasília (America/Sao_Paulo) para garantir consistência.

---

## 📊 Sistema de Indicadores e Métricas

### 1. Dashboard Principal (`src/pages/Dashboard.tsx`)

#### Métricas Calculadas

**Métricas de Hoje**:
```typescript
interface MetricasHoje {
  dinheiro: number;      // Total pago em dinheiro nas avaliações
  gira: number;          // Total pago em GIRA nas avaliações
  qtdDinheiro: number;   // Quantidade de atendimentos com dinheiro
  qtdGira: number;       // Quantidade de atendimentos com GIRA
  recusados: number;     // Total de atendimentos recusados
  totalClientes: number; // Total de atendimentos finalizados
}
```

**Métricas do Mês**:
- Mesma estrutura das métricas do dia
- Calculadas para todo o mês corrente

**Cálculo de Performance por Avaliadora**:
```typescript
interface PerformanceAvaliadora {
  nome: string;
  dinheiro: number;      // Total de dinheiro avaliado
  gira: number;          // Total de GIRA avaliado
  qtd: number;           // Quantidade de atendimentos
  ticketMedio: number;   // Valor médio por atendimento
}
```

**Cálculo de Performance por Vendedora**:
```typescript
interface PerformanceVendedora {
  nome: string;
  totalVendas: number;    // Valor total vendido
  qtdVendas: number;      // Número de vendas
  qtdPecas: number;       // Total de peças vendidas
  ticketMedio: number;    // Valor médio por venda
}
```

**Rainha do Mês**:
- Avaliadora com maior total em dinheiro no mês
- Exibida com badge especial 👑

**Análise de Categorias**:
```typescript
interface CompraPorCategoria {
  categoria: string;
  quantidade: number;
  valor: number;
}
```

**Gráficos**:
1. Comparativo Hoje vs Mês (Dinheiro e GIRA)
2. Evolução Diária de Compras e Vendas
3. Gráfico de Pizza - Distribuição de Pagamentos
4. Gráfico de Pizza - Compras por Categoria
5. Gráfico de Barras - Vendas por Categoria

### 2. Performance de Vendas (`src/pages/PerformanceVendas.tsx`)

#### Indicadores Principais

**Ranking de Vendedoras**:
```typescript
interface VendedoraPerformance {
  nome: string;
  totalDinheiro: number;    // Valor total vendido
  totalPecas: number;       // Total de peças
  ticketMedio: number;      // Ticket médio
  qtdVendas: number;        // Número de vendas
}
```

**Análise por Categoria por Vendedora**:
```typescript
interface CategoriaVendedora {
  vendedora: string;
  categorias: {
    [categoria: string]: {
      quantidade: number;
      valor: number;
    }
  }
}
```

**Métricas Gerais do Período**:
- Total de vendas (R$)
- Total de peças vendidas
- Ticket médio geral
- Número total de vendas

**Gráficos**:
1. Ranking de vendedoras (barras horizontais)
2. Gráfico de categorias por vendedora
3. Evolução temporal das vendas

### 3. Cockpit Real-Time (`src/pages/CockpitRealTime.tsx`)

#### Indicadores em Tempo Real

**Métricas Instantâneas**:
- Total de atendimentos em aberto
- Clientes únicos sendo atendidos
- Tempo médio de espera
- Tempo máximo de espera

**Visualização por Cliente**:
```typescript
interface ClienteCockpit {
  nome: string;
  avaliacoes: Atendimento[];
  tempoEsperaMedio: number;
  statusGeral: string;
  preferenciaPagamento: 'dinheiro' | 'gira' | 'misto' | null;
  historicoRecusas: number;
}
```

### 4. Indicadores Financeiros (`src/pages/Financeiro.tsx`)

#### Métricas de Caixa

**Por Caixa**:
```typescript
interface MetricasCaixa {
  nome: string;               // "Caixa 1", "Caixa 2", "Caixa 3"
  saldoInicial: number;       // Saldo inicial do dia
  entradasDia: number;        // Total de entradas
  saidasDia: number;          // Total de saídas
  saldoFinal: number;         // Saldo calculado
  statusFechamento: 'aberto' | 'fechado' | 'pendente_aprovacao';
}
```

**Movimentações**:
```typescript
interface Movimentacao {
  tipo: 'venda' | 'pagamento_avaliacao' | 'entrada' | 'saida' | 'transferencia_entre_caixas';
  valor: number;
  motivo: string;
  data_hora: string;
}
```

**Análise de Fechamentos**:
- Diferenças entre valor sistema vs contado
- Histórico de aprovações
- Justificativas de diferenças
- Taxa de aprovação

**Gráficos**:
1. Evolução de saldo por caixa
2. Distribuição de tipos de movimentação
3. Comparativo de entradas vs saídas

### 5. Indicadores de Estoque (`src/pages/Estoque.tsx`)

#### Métricas de Estoque

**Por Categoria**:
```typescript
interface EstoqueMetrica {
  categoria: string;
  quantidadeAtual: number;
  comprasPeriodo: number;      // Entradas no período
  vendasPeriodo: number;       // Saídas no período
  giro: number;                // Taxa de giro (vendas/estoque)
  tendencia: 'subindo' | 'descendo' | 'estavel';
}
```

**Análises**:
- Categorias com maior giro
- Categorias com estoque baixo
- Categorias com estoque parado
- Comparativo de compras vs vendas

### 6. Indicadores de Cliente (`src/pages/ClientesInsights.tsx`)

#### Análise de Comportamento

**Por Cliente**:
```typescript
interface ClienteInsight {
  nome: string;
  totalAtendimentos: number;
  totalDinheiro: number;
  totalGira: number;
  preferencia: 'dinheiro' | 'gira' | 'misto';
  taxaRecusa: number;          // % de recusas
  ticketMedio: number;
  ultimoAtendimento: Date;
  frequencia: number;          // Dias entre atendimentos
}
```

### 7. Cálculos e Fórmulas Importantes

#### Ticket Médio
```typescript
ticketMedio = totalVendas / quantidadeVendas
```

#### Taxa de Giro de Estoque
```typescript
taxaGiro = vendasPeriodo / quantidadeAtual
```

#### Percentual de Meta
```typescript
percentualMeta = (valorAtual / valorMeta) * 100
```

#### Saldo Final de Caixa
```typescript
saldoFinal = saldoInicial + entradas - saidas
```

#### Diferença em Fechamento
```typescript
diferenca = valorContado - valorSistema
```

---

## 💾 Banco de Dados

### Estrutura de Tabelas Principais

#### 1. **atendimentos**
Armazena todos os atendimentos de clientes

**Campos principais**:
- `id` (PK)
- `nome_cliente`
- `hora_chegada`
- `hora_encerramento`
- `status` (aguardando, em_avaliacao, aguardando_pagamento, finalizado, recusado, recusou)
- `motivo_recusa` (loja, cliente)
- `valor_total_negociado`
- `desconto_aplicado`
- `pagamento_1_metodo`, `pagamento_1_valor`, `pagamento_1_banco`
- `pagamento_2_metodo`, `pagamento_2_valor`, `pagamento_2_banco`
- `pagamento_3_metodo`, `pagamento_3_valor`, `pagamento_3_banco`
- `origem_avaliacao` (presencial, whatsapp)
- `avaliadora_nome`
- `descricao_itens_extra`
- `created_at`, `updated_at`

**Relações**:
- 1:N com `atendimento_itens`

#### 2. **atendimento_itens**
Itens de cada atendimento (sistema dinâmico)

**Campos principais**:
- `id` (PK)
- `atendimento_id` (FK → atendimentos)
- `categoria_id` (FK → item_categories)
- `quantidade`
- `valor_total`

#### 3. **vendas**
Registro de vendas

**Campos principais**:
- `id` (PK)
- `valor_total_venda`
- `metodo_pagto_1`, `valor_pagto_1`, `bandeira_cartao_1`
- `metodo_pagto_2`, `valor_pagto_2`, `bandeira_cartao_2`
- `metodo_pagto_3`, `valor_pagto_3`, `bandeira_cartao_3`
- `vendedora_nome`
- `caixa_nome`
- `descricao_itens_extra`
- `created_at`

**Relações**:
- 1:N com `venda_itens`
- 1:N com `venda_itens_grandes`

#### 4. **venda_itens**
Itens de cada venda (sistema dinâmico)

**Campos principais**:
- `id` (PK)
- `venda_id` (FK → vendas)
- `categoria_id` (FK → item_categories)
- `quantidade`

#### 5. **item_categories**
Categorias dinâmicas de itens

**Campos principais**:
- `id` (PK)
- `slug`
- `nome`
- `tipo` (compra, venda, ambos)
- `requer_valor`
- `requer_descricao`
- `ordem`
- `ativo`

#### 6. **estoque**
Controle de estoque por categoria

**Campos principais**:
- `id` (PK)
- `categoria`
- `categoria_id` (FK → item_categories)
- `quantidade_atual`
- `updated_at`

**Triggers**:
- Atualização automática em atendimentos finalizados
- Atualização automática em vendas

#### 7. **caixas**
Cadastro de caixas

**Campos principais**:
- `id` (PK)
- `nome` (Caixa 1, Caixa 2, Caixa 3)
- `saldo_seed_caixas` (seed inicial - não usar para cálculos)
- `updated_at`

#### 8. **movimentacoes_caixa**
Todas as movimentações financeiras

**Campos principais**:
- `id` (PK)
- `caixa_origem_id` (FK → caixas, nullable)
- `caixa_destino_id` (FK → caixas, nullable)
- `tipo` (venda, pagamento_avaliacao, entrada, saida, transferencia_entre_caixas)
- `valor`
- `motivo`
- `data_hora`
- `created_at`

**Triggers**:
- Criação automática em vendas (tipo: venda)
- Criação automática em atendimentos finalizados (tipo: pagamento_avaliacao)

#### 9. **fechamentos_caixa**
Fechamentos diários de caixa

**Campos principais**:
- `id` (PK)
- `caixa_id` (FK → caixas)
- `data_fechamento`
- `valor_sistema` (calculado)
- `valor_contado` (informado)
- `diferenca` (calculado)
- `justificativa`
- `status` (aprovado, pendente_aprovacao, rejeitado)
- `requer_revisao`
- `aprovado_por` (FK → profiles)
- `data_aprovacao`
- `motivo_rejeicao`
- `detalhes_pagamentos` (JSON)
- `created_at`
- `created_by` (FK → profiles)

#### 10. **itens_grandes_individuais**
Rastreamento individual de itens grandes

**Campos principais**:
- `id` (PK)
- `tipo_id` (FK → tipos_itens_grandes)
- `marca_id` (FK → marcas_itens_grandes)
- `descricao`
- `valor_compra`
- `valor_venda`
- `observacoes`
- `status` (disponivel, vendido, baixa)
- `atendimento_id` (FK → atendimentos)
- `data_entrada`
- `avaliadora_nome`
- `venda_id` (FK → vendas)
- `data_venda`
- `vendedora_nome`
- `created_at`, `updated_at`

#### 11. **profiles**
Perfil de usuários (extensão de auth.users)

**Campos principais**:
- `id` (PK, FK → auth.users)
- `cargo` (admin, caixa, avaliadora, geral, social_media, mkt)
- `nome`
- `email`
- `precisa_mudar_senha`
- `created_at`, `updated_at`

#### 12. **permissoes_usuario**
Permissões granulares por usuário

**Campos principais**:
- `id` (PK)
- `user_id` (FK → profiles)
- `permissao` (tipo de permissão)
- `concedida` (boolean)
- `created_at`, `updated_at`

#### 13. **colaboradores**
Cadastro de colaboradores

**Campos principais**:
- `id` (PK)
- `nome`
- `funcao` (Avaliadora, Vendedora, Marketing)
- `ativo`
- `created_at`, `updated_at`

#### 14. **log_atividades**
Auditoria de ações no sistema

**Campos principais**:
- `id` (PK)
- `user_id` (FK → profiles)
- `tipo_acao` (create, update, delete, approve, etc)
- `tabela_afetada`
- `registro_id`
- `detalhes` (JSONB)
- `ip_address`
- `created_at`

#### 15. **eventos_marketing**
Eventos e postagens de marketing

**Campos principais**:
- `id` (PK)
- `titulo`
- `descricao`
- `categoria` (Reels, Stories, Feed, Carrossel, Divulgação)
- `data_postagem`
- `data_producao`
- `produzido`
- `responsavel`
- `horarios_postagem` (array)
- `horario_real_postagem`
- `check_timestamp`
- `created_at`

#### 16. **preferencia_cliente_pagamento**
Cache de preferências de pagamento

**Campos principais**:
- `nome_cliente` (PK)
- `total_dinheiro`
- `total_gira`
- `qtd_dinheiro`
- `qtd_gira`
- `percentual_dinheiro`
- `preferencia` (dinheiro, gira, misto)
- `updated_at`

**Funções RPC**:
- `buscar_avaliacoes_clientes`: Busca histórico de avaliações
- `reconciliar_preferencia_cliente`: Recalcula preferências

#### 17. **metas_gasto_dinheiro**
Metas de gasto em dinheiro por avaliadora

**Campos principais**:
- `id` (PK)
- `colaborador_id` (FK → colaboradores)
- `mes` (YYYY-MM)
- `meta_valor`
- `created_at`, `updated_at`

### RLS (Row Level Security)

O sistema usa RLS para controle de acesso:
- Usuários só veem dados que têm permissão
- Políticas baseadas em `auth.uid()`
- Diferentes políticas para SELECT, INSERT, UPDATE, DELETE

### Triggers e Functions Importantes

1. **sync_estoque_after_atendimento**
   - Atualiza estoque quando atendimento é finalizado

2. **sync_estoque_after_venda**
   - Atualiza estoque quando venda é criada

3. **criar_movimentacao_venda**
   - Cria movimentação de caixa automaticamente em vendas

4. **criar_movimentacao_atendimento**
   - Cria movimentação de caixa em atendimentos finalizados

5. **delete_user_rpc**
   - Function para exclusão segura de usuário

---

## 🔐 Sistema de Permissões

### Permissões por Cargo (Base)

```typescript
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    '/', '/recepcao', '/recepcao/clientes', '/vendas', '/avaliacao', 
    '/atendimentos/historico', '/vendas/historico', '/financeiro', 
    '/estoque', '/dashboard', '/configuracoes', '/auth', '/marketing', 
    '/performance-vendas', '/logs-atividades', '/cockpit-real-time'
  ],
  caixa: [
    '/recepcao', '/vendas', '/vendas/historico', '/atendimentos/historico', 
    '/financeiro', '/dashboard', '/auth', '/performance-vendas'
  ],
  avaliadora: [
    '/recepcao', '/avaliacao', '/atendimentos/historico', '/auth'
  ],
  geral: [
    '/', '/recepcao', '/vendas', '/avaliacao', '/atendimentos/historico', 
    '/vendas/historico', '/financeiro', '/auth', '/marketing', '/performance-vendas'
  ],
  social_media: [
    '/marketing', '/auth'
  ],
  mkt: [
    '/marketing', '/auth', '/dashboard'
  ],
};
```

### Permissões Granulares

Além das permissões por cargo, o sistema permite permissões individuais:

**Tipos de Permissão**:
- `aprovar_fechamento`: Aprovar fechamentos de caixa
- `excluir_movimentacao`: Excluir movimentações de caixa
- `ajustar_saldo`: Ajustar saldo de caixa manualmente
- `editar_venda`: Editar vendas existentes
- `excluir_venda`: Excluir vendas
- `ajustar_estoque`: Fazer ajustes manuais de estoque
- `gerenciar_usuarios`: Criar/editar/excluir usuários
- `ver_logs`: Acessar logs de atividades

**Verificação de Permissão**:
```typescript
// Via contexto
const { hasPermission } = useUser();
if (hasPermission('aprovar_fechamento')) {
  // Mostrar botão de aprovação
}

// Permissão é verificada como:
// 1. Permissão individual do usuário (se existir)
// 2. Permissão do cargo (fallback)
```

### Componentes de Proteção

**RequireRole**:
```tsx
<Route path="/financeiro" element={
  <RequireRole>
    <Financeiro />
  </RequireRole>
} />
```

**CaixaGuard**:
- Modal forçado para selecionar caixa
- Aplicado globalmente via CaixaContext

---

## 🔄 Fluxos Principais

### 1. Fluxo de Atendimento Completo

```
1. Cliente chega na loja
   └─> Recepcionista cria atendimento (/recepcao)
       └─> Status: "aguardando"

2. Avaliadora inicia avaliação
   └─> Clica em "Iniciar Avaliação" (/avaliacao)
       └─> Status: "em_avaliacao"

3. Avaliadora seleciona itens e quantidades
   └─> Sistema dinâmico de categorias
   └─> Pode adicionar itens grandes individuais
   └─> Sistema calcula valor baseado em quantidades

4. Avaliadora informa formas de pagamento
   └─> Dinheiro, PIX, Débito, Crédito, GIRA
   └─> Pode combinar até 3 formas
   └─> Valida se total bate

5. Finaliza atendimento
   └─> Status: "finalizado"
   └─> Triggers automáticos:
       ├─> Atualiza estoque (+)
       └─> Cria movimentação de caixa (-)

6. OU Recusa
   └─> Seleciona motivo (loja ou cliente)
   └─> Status: "recusado" ou "recusou"
   └─> Não afeta estoque nem caixa
```

### 2. Fluxo de Venda Completo

```
1. Cliente quer comprar
   └─> Vendedora inicia venda (/vendas)

2. Seleciona itens e quantidades
   └─> Sistema valida estoque disponível
   └─> Pode adicionar itens grandes
   └─> Informa descrição de itens extras

3. Informa valor total
   └─> Valor digitado manualmente

4. Registra formas de pagamento
   └─> Até 3 formas diferentes
   └─> Valida se total bate

5. Seleciona vendedora responsável
   └─> Da lista de colaboradoras

6. Finaliza venda
   └─> Triggers automáticos:
       ├─> Atualiza estoque (-)
       ├─> Cria movimentação de caixa (+)
       └─> Registra venda com todos os detalhes
```

### 3. Fluxo de Fechamento de Caixa

```
1. Final do dia - Conferência física
   └─> Operador conta dinheiro real

2. Abre fechamento de caixa (/financeiro)
   └─> Seleciona caixa
   └─> Sistema mostra:
       ├─> Saldo inicial (do dia)
       ├─> Movimentações do dia
       └─> Saldo final calculado

3. Informa valor contado
   └─> Digita valor físico
   └─> Sistema calcula diferença

4. Justifica diferença (se houver)
   └─> Campo obrigatório se diferença > 0
   └─> Pode adicionar detalhes de pagamentos

5. Submete fechamento
   └─> Status: "pendente_aprovacao"
   └─> Sistema marca como "requer_revisao" se diferença grande

6. Admin aprova/rejeita
   └─> Se aprovado:
       ├─> Status: "aprovado"
       └─> Este valor vira saldo inicial do dia seguinte
   └─> Se rejeitado:
       ├─> Status: "rejeitado"
       └─> Precisa refazer

7. Próximo dia
   └─> Saldo inicial = valor_contado do fechamento aprovado anterior
```

### 4. Fluxo de Transferência entre Caixas

```
1. Admin identifica necessidade
   └─> Ex: Caixa 1 com muito dinheiro

2. Abre modal de transferência (/financeiro)
   └─> Seleciona caixa origem
   └─> Seleciona caixa destino
   └─> Informa valor
   └─> Adiciona motivo

3. Confirma transferência
   └─> Sistema cria 2 movimentações:
       ├─> Saída no caixa origem
       └─> Entrada no caixa destino
   └─> Tipo: "transferencia_entre_caixas"
```

### 5. Fluxo de Ajuste de Estoque

```
1. Admin identifica inconsistência
   └─> Ex: Inventário físico diferente do sistema

2. Abre modal de ajuste (/estoque)
   └─> Seleciona categoria
   └─> Escolhe tipo: Entrada ou Saída
   └─> Informa quantidade
   └─> Adiciona justificativa

3. Confirma ajuste
   └─> Atualiza quantidade em estoque
   └─> Registra em histórico
   └─> Cria log de atividade
```

### 6. Fluxo de Item Grande

```
📥 ENTRADA (Compra):
1. Durante avaliação
   └─> Avaliadora identifica item grande
   └─> Abre modal de item grande
   └─> Preenche:
       ├─> Tipo (carrinho, cadeirinha, etc)
       ├─> Marca
       ├─> Descrição
       ├─> Valor de compra
       └─> Observações
   └─> Sistema vincula ao atendimento
   └─> Status: "disponivel"

📤 SAÍDA (Venda):
1. Durante venda
   └─> Vendedora seleciona item grande disponível
   └─> Sistema adiciona à venda
   
2. Ao finalizar venda
   └─> Sistema atualiza item:
       ├─> Status: "vendido"
       ├─> Vincula venda_id
       ├─> Registra vendedora
       └─> Data de venda

📊 RELATÓRIO:
   └─> Lucro = valor_venda - valor_compra
   └─> Análise por tipo, marca, período
```

### 7. Fluxo de Saldo de Caixa (Crítico)

```
🌅 INÍCIO DO DIA:
1. Sistema busca saldo inicial
   └─> Prioridade:
       ├─> Fechamento APROVADO do dia anterior (valor_contado)
       ├─> Fechamento mais recente anterior
       └─> Zero (fallback)

💰 DURANTE O DIA:
1. Cada operação cria movimentação:
   ├─> Vendas → Entrada
   ├─> Pagamentos de avaliação → Saída
   ├─> Entradas manuais → Entrada
   ├─> Saídas manuais → Saída
   └─> Transferências → Saída/Entrada

2. Saldo final calculado:
   └─> saldo_final = saldo_inicial + entradas - saidas

🌙 FINAL DO DIA:
1. Fechamento
   └─> valor_sistema = saldo_final calculado
   └─> valor_contado = informado pelo usuário
   └─> diferenca = valor_contado - valor_sistema

2. Se aprovado
   └─> valor_contado vira saldo_inicial do próximo dia
```

### 8. Fluxo de Preferência de Cliente

```
ATUALIZAÇÃO AUTOMÁTICA:
1. Cliente finaliza atendimento
   └─> Sistema analisa todas as avaliações finalizadas
   └─> Calcula:
       ├─> Total em dinheiro
       ├─> Total em GIRA
       ├─> Percentual de cada
       └─> Classifica preferência

VISUALIZAÇÃO:
1. Recepção e Cockpit
   └─> Mostra badge:
       ├─> 💰 se preferência = dinheiro (>70%)
       ├─> 🟡 se preferência = gira (>70%)
       └─> ➖ se misto

INSIGHTS:
1. Página de clientes
   └─> Análise detalhada
   └─> Histórico completo
   └─> Padrões de comportamento
```

---

## 🚀 Próximos Passos para Novo Sistema

### Pontos Fortes a Manter
1. ✅ Sistema de categorias dinâmicas
2. ✅ Controle granular de permissões
3. ✅ Rastreamento de itens grandes
4. ✅ Múltiplas formas de pagamento
5. ✅ Sistema de aprovação de fechamentos
6. ✅ Logs de auditoria completos
7. ✅ Análise de preferência de clientes
8. ✅ Dashboard rico em indicadores
9. ✅ Sistema de timezone Brasília

### Melhorias Sugeridas
1. 🔄 Migração para arquitetura de microserviços
2. 🔄 API REST/GraphQL dedicada
3. 🔄 Websockets para real-time verdadeiro
4. 🔄 Sistema de notificações push
5. 🔄 Aplicativo mobile nativo
6. 🔄 Integração com WhatsApp Business API
7. 🔄 Sistema de fidelidade de clientes
8. 🔄 BI avançado com previsões
9. 🔄 Backup automático e disaster recovery
10. 🔄 Multi-tenancy para comercialização

### Tecnologias Recomendadas para Novo Sistema
- **Backend**: Node.js + NestJS ou Python + FastAPI
- **Frontend Web**: React + Next.js 14+ (App Router)
- **Mobile**: React Native ou Flutter
- **Banco de Dados**: PostgreSQL (manter) + Redis (cache)
- **Real-time**: Socket.io ou Pusher
- **Queue**: Bull ou RabbitMQ
- **Storage**: S3-compatible (MinIO ou AWS S3)
- **Monitoring**: Sentry + Datadog
- **Analytics**: Metabase ou Superset

---

## 📝 Conclusão

Este documento serve como referência completa do sistema atual **CeP**. Toda a lógica de negócio, fluxos, indicadores e estruturas estão documentados para facilitar a criação de um novo sistema mais robusto e comercializável.

**Contato**: Sistema desenvolvido para Centro de Pequenos (CeP)  
**Data de Criação da Documentação**: 23 de Fevereiro de 2026
