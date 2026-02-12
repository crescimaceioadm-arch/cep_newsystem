# Descrição do que o copilot deve escrever a cada alteração importante
Toda vez que você pedir uma alteração no sistema, vou atualizar este arquivo seguindo o mesmo padrão:

Data/hora
Necessidade e causa
Solução implementada
Arquivos alterados com detalhes
Observações relevantes

O formato é enxuto para não ficar extenso, mas mantém todas as informações importantes para rastreabilidade!

# Journal Fevereiro

## 📅 11/02/2026 - 00:00

### 🧰 Popup de abertura de caixa (com status e avaliacao)

**Necessidade:**  
Melhorar o popup inicial para abrir caixas com resumo de status, opcao de abrir o caixa Avaliacao e bloqueio quando houver fechamento pendente de aprovacao.

**Solução Implementada:**  
- Pergunta "Qual caixa quer abrir?" no modal de selecao.  
- Resumo de status dos caixas, incluindo Avaliacao.  
- Opcao "Quer abrir o caixa da Avaliacao?" com status "Caixa aberto" enquanto ativo.  
- Bloqueio de abertura quando o fechamento do dia estiver pendente de aprovacao.

**Arquivos Alterados:**
- `src/components/layout/SelecionarCaixaModal.tsx`
	- Busca fechamentos do dia para montar status por caixa.
	- Controle de abertura do caixa Avaliacao com localStorage.
	- Bloqueio de abertura quando status esta pendente de aprovacao.

**Observações:**
- O status "Caixa aberto" fica ativo ate o fechamento do dia.

---

## 📅 06/02/2026 - 00:00

### 🗂️ Início do Journal de Fevereiro

**Necessidade:**  
Criar um diário dedicado para registrar as alterações a partir de fevereiro.

**Solução Implementada:**  
- Criado o arquivo de journal mensal para centralizar mudanças a partir desta data.

**Arquivos Alterados:**
- Journal Fevereiro.md (novo arquivo)

**Observações:**
- As próximas alterações serão registradas aqui.

---

## 📅 06/02/2026 - 00:00

### 📊 Correções e ajustes na Performance de Vendas

**Necessidade:**  
Gráficos de performance em “Hoje” estavam vazios. Vendas recentes não tinham itens em `venda_itens`. Também era necessário ajustar a UI (Oportunidades Perdidas e percentuais por faixa) e formatar o Ticket Médio com 2 casas decimais.

**Causa Raiz:**  
Inserção em `venda_itens` falhava por RLS (403), impedindo a criação de itens de venda. Isso zerava P.A e gráficos de categorias. Além disso, o nome “Cliente não atendido” não era agrupado com “Sem vendedora”.

**Solução Implementada:**  
1. **RLS e backfill de itens:**
	- Ajuste de permissões para permitir INSERT em `venda_itens`.
	- Backfill de itens com base nos campos `qtd_*_vendida`.
2. **UI/UX e dados:**
	- “Cliente não atendido” passou a ser tratado como “Sem vendedora” no gráfico de Oportunidades Perdidas.
	- Percentuais adicionados nas linhas “Vendas com Poucos Itens”.
	- Ticket Médio formatado com 2 casas decimais.
3. **Limpeza de debug:**
	- Removidos logs de investigação no frontend.
	- Arquivos SQL auxiliares apagados após uso.

**Arquivos Alterados:**

- `src/pages/PerformanceVendas.tsx`
  - Mapear “Cliente não atendido” → “Sem vendedora”.
  - Adicionar percentuais por faixa de itens.
  - Formatar Ticket Médio com 2 casas decimais.
  - Remover logs de debug.

- `src/hooks/useVendas.ts`
  - Tratamento de erro ao inserir em `venda_itens`.
  - Remoção de logs detalhados de debug.

**Observações:**
- Backfill executado no banco para corrigir vendas sem itens em 04/02 e 05/02.
- Os arquivos SQL usados para diagnóstico e backfill foram removidos após a correção.

---

## 📅 06/02/2026 - 00:00

### 🧭 Nova página: Cockpit real time (admin)

**Necessidade:**  
Criar uma nova home page para o admin com foco em alertas de avaliações abertas e histórico por cliente.

**Solução Implementada:**  
1. **Nova página Cockpit real time:**
	 - Bloco de avaliações com clientes em aberto.
	 - Destaque para clientes com preferência Gira crédito ou mais de 3 avaliações finalizadas.
	 - Expansão por cliente para histórico de atendimentos.
2. **Admin como home padrão:**
	 - Admin redireciona para /cockpit-real-time ao acessar a home.
3. **Permissões e menu:**
	 - Nova rota protegida e item no menu.
	 - Permissão de menu adicionada.

**Arquivos Alterados:**

- `src/pages/CockpitRealTime.tsx`
	- Página do Cockpit real time com bloco de avaliações e histórico expansível.

- `src/pages/AdminHome.tsx`
	- Redireciona admin para /cockpit-real-time; outros cargos veem Dashboard.

- `src/App.tsx`
	- Nova rota /cockpit-real-time e home apontando para AdminHome.

- `src/contexts/UserContext.tsx`
	- Rota padrão do admin ajustada.
	- Permissão do Cockpit adicionada às rotas do admin.

- `src/hooks/usePermissoesUsuario.ts`
	- Permissão menu:/cockpit-real-time adicionada.

- `src/components/layout/AppSidebar.tsx`
	- Item de menu para Cockpit real time.

- `src/components/configuracoes/ControlePerfisMenuCard.tsx`
	- Menu Cockpit real time adicionado às permissões por perfil.

**Observações:**
- Acesso restrito ao admin via permissões de rota.

---

## 📅 06/02/2026 - 00:00

### 🧾 Ajustes no Cockpit real time (layout e histórico)

**Necessidade:**  
Tela mais minimalista, com bloco de avaliações ocupando metade da tela, histórico completo por cliente e destaque de tempo de espera.

**Solução Implementada:**  
- Layout em grid com bloco de avaliações ocupando 1/2 da tela.
- Histórico completo com: modalidade de pagamento, valor pago e itens por categoria.
- Tempo de espera em avaliações abertas, destacando em vermelho acima de 25 minutos.

**Arquivos Alterados:**
- `src/pages/CockpitRealTime.tsx`
	- Layout minimalista em meia tela.
	- Histórico expandido com pagamentos, valor e categorias.
	- Cálculo e destaque de tempo de espera.

**Observações:**
- Exibição de itens usa `atendimento.itens` com agrupamento por categoria.

---

## 📅 06/02/2026 - 00:00

### 📌 Cockpit: WhatsApp e histórico completo por cliente

**Necessidade:**  
Exibir se a avaliação é por WhatsApp (substituindo tempo de espera pela data de abertura) e garantir que o histórico traga todas as avaliações do cliente, mesmo com variações de nome.

**Solução Implementada:**  
- Indicador de WhatsApp no bloco de avaliações em aberto, mostrando data de abertura.  
- Normalização de nomes de clientes para consolidar histórico completo.  

**Arquivos Alterados:**
- `src/pages/CockpitRealTime.tsx`
	- Normalização de nomes para mapear histórico completo.
	- Badge de WhatsApp com data de abertura substituindo tempo de espera.

**Observações:**
- A normalização remove espaços extras e padroniza caixa para evitar divergências.

---

## 📅 06/02/2026 - 00:00

### ✅ Cockpit: Preferência calculada por atendimentos

**Necessidade:**  
Corrigir divergências entre o Cockpit e a tabela `cliente_pagamento_preferencia` (ex.: LARISSA com 2 finalizadas no SQL e 4 no Cockpit).

**Solução Implementada:**  
- Preferência de pagamento e total de avaliações passaram a ser calculadas diretamente a partir dos atendimentos finalizados, garantindo consistência com o histórico real.

**Arquivos Alterados:**
- `src/pages/CockpitRealTime.tsx`
	- Cálculo de preferências com base em `atendimentos` (status `finalizado`).
	- Detecção de Gira crédito pelos métodos de pagamento.

**Observações:**
- Elimina dependência de dados desatualizados da tabela de preferência.

---

## 📅 06/02/2026 - 00:00

### 🔁 Cockpit: Preferência volta ao banco

**Necessidade:**  
Garantir que o Cockpit use todo o histórico disponível no banco, já que nem todos os atendimentos são carregados no app.

**Solução Implementada:**  
- Revertido o cálculo local de preferências para usar a tabela `cliente_pagamento_preferencia` via hook batch.

**Arquivos Alterados:**
- `src/pages/CockpitRealTime.tsx`
	- Preferências carregadas do banco com `useClientesPreferenciaBatch`.
	- Removido cálculo baseado apenas nos atendimentos carregados.

**Observações:**
- Mantém consistência com o histórico completo armazenado no banco.

---

## 📅 06/02/2026 - 00:00

### 🔧 SQL: Atualização robusta por nome

**Necessidade:**  
Garantir que a atualização da preferência não crie linha duplicada por variações de nome (espaços/caixa), corrigindo casos como LARISSA.

**Solução Implementada:**  
- Seção 4 do SQL passou a atualizar por `LOWER(TRIM(nome_cliente))` e inserir apenas se não existir.

**Arquivos Alterados:**
- `supabase/20260206_reconciliar_preferencia_cliente.sql`
	- Update por match normalizado e insert condicionado.

**Observações:**
- Execute a seção 4 para corrigir a cliente.

---

## 📅 06/02/2026 - 00:00

### 🔁 SQL: Rebuild preferências (seguro)

**Necessidade:**  
Recalcular a tabela `cliente_pagamento_preferencia` com base nos atendimentos finalizados, sem risco de perda permanente.

**Solução Implementada:**  
- Script de rebuild completo com transação e backup temporário.

**Arquivos Alterados:**
- `supabase/20260206_rebuild_preferencia_pagamento.sql`
	- Backup temporário, truncate e rebuild em transação.

**Observações:**
- Enquanto a transação não for commitada, é possível dar rollback.

---

## 📅 06/02/2026 - 00:00

### 🧭 Cockpit: Avaliações presenciais em aberto

**Necessidade:**  
Exibir, ao lado do bloco principal, todas as avaliações presenciais em aberto com tempo de espera e preferência.

**Solução Implementada:**  
- Adicionado card com lista de avaliações presenciais em aberto, mostrando nome, tempo aberto e preferência.

**Arquivos Alterados:**
- `src/pages/CockpitRealTime.tsx`
	- Novo card “Avaliações presenciais em aberto”.
	- Reuso do mapa de preferências para exibição.

**Observações:**
- Considera presencial quando `origem_avaliacao` não é `whatsapp`.

---

## 📅 06/02/2026 - 00:00

### 🧾 SQL: Preferência só por avaliações

**Necessidade:**  
Corrigir divergências na preferência de pagamento ao considerar apenas avaliações finalizadas na reconciliação do cliente.

**Solução Implementada:**  
- Ajuste do SQL de reconciliação para filtrar `tipo_atendimento = 'avaliacao'`.

**Arquivos Alterados:**
- `supabase/20260206_reconciliar_preferencia_cliente.sql`
	- Filtros adicionados nas consultas e na atualização.

**Observações:**
- Execute a seção 4 para atualizar a linha da cliente no banco.

---

## 📅 06/02/2026 - 00:00

### 🧭 Menu: Dashboard voltou a aparecer

**Necessidade:**  
Após criar o Cockpit, o item de Dashboard no menu levava para a home (`/`) e redirecionava para o Cockpit.

**Solução Implementada:**  
- Ajustado o menu para apontar diretamente para `/dashboard`.

**Arquivos Alterados:**
- `src/components/layout/AppSidebar.tsx`
	- URLs do Dashboard corrigidas.

**Observações:**
- O Dashboard continua acessível pela rota `/dashboard`.

