# Sistema de Gestão Jatiuca

## Visão Geral
O Sistema de Gestão Jatiuca é uma aplicação web desenvolvida para gerenciar operações administrativas, financeiras e de atendimento de um estabelecimento. O sistema centraliza o controle de usuários, permissões, movimentações de caixa, preferências de pagamento de clientes, avaliações e integrações com o Supabase para persistência de dados.

## Especificações Técnicas
- **Frontend:** React (TypeScript), Vite, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, autenticação, funções SQL)
- **Gerenciamento de Estado:** Context API, React Hooks
- **Testes:** Vitest
- **Build:** Vite
- **Deploy:** Vercel

## Principais Funcionalidades
- Controle de usuários e permissões
- Gestão de atendimentos e avaliações
- Fechamento e movimentação de caixa
- Preferência de pagamento por cliente
- Relatórios financeiros e operacionais
- Integração com Supabase para autenticação e banco de dados

## Estrutura de Pastas e Arquivos

- **public/**: Arquivos públicos acessíveis diretamente (ex: robots.txt)
- **src/**: Código-fonte principal da aplicação
  - **components/**: Componentes React reutilizáveis (ex: formulários, tabelas, alertas)
  - **contexts/**: Contextos globais do React para estado compartilhado
  - **hooks/**: Hooks customizados para lógica de negócio e integração
  - **integrations/**: Integrações externas (ex: Supabase)
  - **lib/**: Funções utilitárias e helpers
  - **pages/**: Páginas principais da aplicação
  - **test/**: Testes automatizados
  - **types/**: Tipos TypeScript compartilhados (ex: interfaces de banco)
- **supabase/**: Scripts SQL para manutenção, correções e estrutura do banco
- **.md (Markdown)**: Documentação de correções, guias, histórico e instruções
- **package.json / pnpm-lock.yaml / bun.lockb**: Gerenciamento de dependências
- **tsconfig*.json**: Configurações do TypeScript
- **vite.config.ts / vitest.config.ts**: Configurações de build e testes
- **vercel.json**: Configuração de deploy

## Principais Arquivos
- **src/App.tsx**: Componente raiz da aplicação
- **src/main.tsx**: Ponto de entrada do React
- **src/components/financeiro/AlertaFechamentosFaltantes.tsx**: Alerta para caixas sem fechamento
- **src/hooks/useCaixas.ts**: Lógica de movimentação e fechamento de caixa
- **src/types/database.ts**: Tipos e interfaces do banco de dados
- **supabase/20260206_reconciliar_preferencia_cliente.sql**: Script para reconciliação de preferências de pagamento de clientes
- **README.md**: Documentação principal do projeto

## Modo de Funcionamento
O sistema é acessado via navegador, com autenticação de usuários pelo Supabase. Usuários com permissões adequadas podem registrar atendimentos, movimentar e fechar caixas, consultar relatórios e ajustar preferências de clientes. As operações críticas são registradas e auditadas. Scripts SQL em supabase/ são usados para manutenção e ajustes no banco de dados.

---
Este documento é um resumo técnico e funcional do Sistema de Gestão Jatiuca.