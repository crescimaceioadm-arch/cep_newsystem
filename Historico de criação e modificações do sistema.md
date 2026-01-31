# Descrição do que o copilot deve escrever a cada altração importante
Toda vez que você pedir uma alteração no sistema, vou atualizar este arquivo seguindo o mesmo padrão:

Data/hora
Necessidade e causa
Solução implementada
Arquivos alterados com detalhes
Observações relevantes

O formato é enxuto para não ficar extenso, mas mantém todas as informações importantes para rastreabilidade!

# Histórico de Criação e Modificações do Sistema

## 📅 27/01/2026 - 20:30

### 🔧 Correção: Avaliações em dinheiro não apareciam no extrato do caixa

**Necessidade:**  
Avaliações pagas em dinheiro não estavam gerando registros na tabela `movimentacoes_caixa`, causando inconsistência no extrato financeiro do caixa Avaliação.

**Causa Raiz:**  
O sistema registrava as movimentações corretamente, mas erros silenciosos (sem notificação ao usuário) permitiam que falhas acontecessem sem serem detectadas. 3 avaliações do dia 27/01 não foram registradas.

**Solução Implementada:**

1. **Alerta ao usuário em caso de falha:**
   - Adicionado toast de erro quando não for possível registrar movimentação no caixa
   - Permite que o atendimento seja finalizado, mas notifica o problema

2. **Script de verificação automática:**
   - Criado script SQL para identificar avaliações sem movimentação
   - Correção automática dos registros faltantes
   - Recomendado executar semanalmente

3. **Correção manual dos dados:**
   - Registradas manualmente as 3 movimentações faltantes do dia 27/01 (R$ 270, R$ 120, R$ 140)

**Arquivos Alterados:**

- `src/hooks/useAtendimentos.ts` (linha 193-230)
  - Adicionado `toast.error()` em 2 pontos: falha ao buscar caixa e falha ao inserir movimentação
  - Mantida a estratégia de não bloquear finalização do atendimento

- `supabase/verificar_e_corrigir_movimentacoes_faltantes.sql` (novo arquivo)
  - Script de diagnóstico e correção automática
  - Identifica avaliações em dinheiro sem movimentação nos últimos 30 dias
  - Passo 2 comentado para segurança (descomenta para executar correção)

- `supabase/diagnostico_avaliacoes_dinheiro.sql` (novo arquivo)
  - Script de diagnóstico completo
  - 5 queries: avaliações, movimentações, saldo, comparação, triggers

**Observações:**
- Problema não foi causado por alterações recentes no código
- Sistema já estava funcionando corretamente, mas falhas pontuais não eram notificadas
- Solução permite continuidade operacional com visibilidade de problemas

--- COMMIT FEITO ---

---

## 📅 27/01/2026 - 21:15

### 🕐 Correção: Horas registradas incorretas no banco de dados (Timezone UTC)

**Necessidade:**  
O banco de dados estava registrando as horas em UTC (Hora Universal), causando uma diferença de 3 horas para trás. Se eram 15:00 em Brasília, o banco registrava como 18:00 UTC.

**Causa Raiz:**  
O Supabase usa `now()` que retorna UTC, e o frontend usava `new Date().toISOString()` (também UTC). Não havia conversão para o fuso horário de Brasília (America/Sao_Paulo) na exibição das datas.

**Solução Implementada:**

1. **Função de conversão criada em `lib/utils.ts`:**
   - Nova função `convertToLocalTime()` que recebe timestamp ISO (UTC)
   - Converte automaticamente para fuso horário de Brasília
   - Considera horário de verão automaticamente
   - Retorna `Date` object com hora correta

2. **Aplicação em todas as telas:**
   - Substituição de `new Date(timestamp)` por `convertToLocalTime(timestamp)`
   - Aplicado em 8 arquivos principais
   - Cobre todas as exibições de data/hora para o usuário

**Arquivos Alterados:**

- `src/lib/utils.ts` (novo)
  - Função `convertToLocalTime()` com conversão segura de timezone

- `src/pages/Dashboard.tsx`
  - Linha 457: Picos de vendas por horário
  - Linha 497: Picos de horários filtrados

- `src/pages/VendasHistorico.tsx`
  - Linha 305: Data/hora das vendas na tabela

- `src/pages/HistoricoAtendimentos.tsx`
  - Linha 73: Conversão para filtro de período

- `src/pages/Financeiro.tsx`
  - Linha 1065: Data/hora de movimentação

- `src/pages/Avaliacao.tsx`
  - Linha 65: Hora de chegada dos atendimentos

- `src/components/vendas/ExportarCartoesCSV.tsx`
  - Linha 36: Data/hora no CSV exportado

- `src/components/vendas/ExportarVendasCSV.tsx`
  - Linha 128: Conversão para agrupamento por mês

- `src/components/financeiro/RelatorioMovimentacoesCard.tsx`
  - Linhas 76, 93, 350: Múltiplos pontos de exibição

**Observações:**
- Salvamento no banco continua em UTC (correto)
- Apenas a EXIBIÇÃO para o usuário foi corrigida
- Função trata erros gracefully (retorna null se timestamp inválido)
- Aplicado em todos os timestamps: `created_at`, `hora_chegada`, `hora_encerramento`, `data_hora`, etc.

--- COMMIT FEITO ---

---

## 📅 27/01/2026 - 21:50

### 📊 Correção: Bolsa Escolar não aparecia no gráfico "Gasto em dinheiro por tipo de avaliação"

**Necessidade:**  
O gráfico do dashboard estava faltando avaliações que continham bolsa escolar. Exemplo: Ricardo Bezeira de Melo tinha 1 bolsa registrada, mas não aparecia na classificação.

**Causa Raiz:**  
A função `classificarAvaliacao()` estava usando apenas campos legados (`qtd_baby`, `qtd_1_a_16`, etc.) e **não considerava itens dinâmicos** salvos em `atendimento_itens`. Bolsa escolar é uma categoria dinâmica, logo era ignorada.

**Solução Implementada:**

1. **Expandir classificação para itens dinâmicos:**
   - Função agora verifica `a.itens[]` (atendimento_itens)
   - Detecta categorias por `slug` (inclui "bolsa" e "fralda")
   - Mantém precedência das outras categorias

2. **Renomear gráfico:**
   - Título alterado para "Avaliações por tipo de pagamento e itens"
   - Melhor reflete o conteúdo (todos os tipos de itens, não apenas gasto)

3. **Adicionar nova categoria:**
   - Nova linha na tabela: "Bolsa/Fralda"
   - Inserida entre "Brinquedos" e "Com outras categorias" na ordem de exibição

**Arquivos Alterados:**

- `src/pages/Dashboard.tsx`
  - Linha 1467: Renomear título do Card
  - Linha 544: Função `classificarAvaliacao()` expandida
  - Linha 588: Array `order` com nova categoria "Bolsa/Fralda"

**Observações:**
- Avaliações com bolsa/fralda agora aparecem como categoria separada
- Se tem bolsa E outros itens, o outro item tem precedência (Grandes > Enxoval > Brinquedos > Roupas > Bolsa)
- Detecta dinamicamente por slug, funciona com qualquer categoria futura que tenha "bolsa" ou "fralda" no slug

--- COMMIT FEITO ---

---

## 📅 27/01/2026 - 22:10

### 📋 Correção: Itens dinâmicos (Bolsa/Fralda) não aparecem no Dashboard e Histórico

**Necessidade:**  
Avaliações de Ricardo e Bruno foram corretamente classificadas como "Bolsa/Fralda", mas a quantidade de bolsa não aparecia na tabela do Dashboard, e o Histórico de Avaliações também não mostrava os itens dinâmicos ao clicar no ícone de olho.

**Causa Raiz:**  
1. Dashboard.fetchData() carregava apenas a tabela `atendimentos`, sem carregar `atendimento_itens`
2. Array `a.itens` ficava sempre vazio/undefined
3. Classificação funcionava corretamente, mas sem dados para exibir nas tabelas
4. HistoricoAtendimentos.tsx só exibia campos legacy (qtd_baby, qtd_1_a_16, etc.)

**Solução Implementada:**

1. **Carregar itens dinâmicos em Dashboard.fetchData():**
   - Adicionado fetch da tabela `atendimento_itens` com relacionamento `item_categories`
   - Criado Map de itens indexado por `atendimento_id`
   - Função `mapearComItens()` agrega os itens a cada atendimento
   - Aplicado aos 3 tipos de atendimentos: finalizados, recusados, outros

2. **Exibir itens na tabela expandida do Dashboard:**
   - Campo `itens` adicionado aos detalhes de avaliação
   - Renderização segura com verificação de array
   - Filtro inteligente para evitar duplicação (ignora categorias legacy)
   - Apenas itens dinâmicos aparecem: bolsa_escolar, fralda, etc.

3. **Exibir itens no modal Histórico de Avaliações:**
   - Função `getItensDetalhes()` agora percorre `atendimento.itens[]`
   - Itens dinâmicos aparecem junto com campos legacy
   - Aparece ao clicar no ícone de olho

4. **Corrigir campo de descrição:**
   - Mudado de `descricao_itens` para `descricao_itens_extra` (campo correto do banco)
   - Descrição dos itens grandes agora aparece corretamente na tabela

5. **Ajustar precedência de classificação:**
   - Movido "Bolsa/Fralda" ANTES de "Só roupas/sapatos" na ordem de verificação
   - Agora: Grandes > Enxoval > Brinquedos > **Bolsa/Fralda** > Roupas/Sapatos
   - Evita que avaliações com bolsa E roupas sejam classificadas apenas como "Roupas"

6. **Remover categoria vazia:**
   - Deletado "Outros (sem item registrado)" da lista de ordem de exibição
   - Tabela agora mostra apenas 6 categorias: Roupas, Grandes, Enxoval, Brinquedos, Bolsa/Fralda, Outras

**Arquivos Alterados:**

- `src/pages/Dashboard.tsx`
  - Linhas 153-177: Adicionado fetch de `atendimento_itens` e Map de associação
  - Linhas 173-176: Função `mapearComItens()` que agrega itens aos atendimentos
  - Linhas 189-190: Uso de `mapearComItens()` em todos os setters de state
  - Linhas 571-592: Ajuste de precedência na função `classificarAvaliacao()`
  - Linhas 608-625: Campo `itens` adicionado aos detalhes + corrigido para `descricao_itens_extra`
  - Linhas 1177-1187: Renderização segura de itens dinâmicos com filtro de duplicação
  - Linhas 627-632: Array `order` com "Outros" removido

- `src/pages/HistoricoAtendimentos.tsx`
  - Linhas 192-210: Expandido `getItensDetalhes()` para incluir itens dinâmicos do array `atendimento.itens`

**Observações:**
- Padrão implementado segue o mesmo do hook `useAtendimentos.ts` (forma correta de carregar relacionamentos)
- Dashboard agora é consistente com outros hooks e páginas do projeto
- Itens legacy e dinâmicos aparecem juntos na exibição, sem duplicação
- Precedência garante priorização correta quando há múltiplos tipos de itens
- Solução é extensível: novos tipos de itens dinâmicos aparecerão automaticamente

--- COMMIT FEITO ---

---

## 📅 28/01/2026 - 00:45

### 📊 Melhoria: Filtro padrão "Hoje" + Cards e gráfico de rosca sempre mostram dados do mês

**Necessidade:**  
Dashboard estava com filtro padrão do mês inteiro, mas usuário queria:
1. Filtro padrão em "Hoje" (data atual)
2. Cards "Vendas - Mês" e "Ticket Médio - Mês" sempre mostrarem dados do mês inteiro (não filtrados)
3. Gráfico de rosca (donut) também sempre mostrar dados do mês inteiro

**Causa:**  
O Dashboard usava um único conjunto de métricas (`salesMetrics`) calculado com base no período filtrado. Não havia separação entre métricas mensais fixas e métricas filtradas.

**Solução Implementada:**

1. **Mudança do filtro padrão:**
   - Estado `periodo` agora inicia com `from: startOfDay(hoje), to: startOfDay(hoje)`
   - Antes era: `from: inicioMes, to: fimMes`

2. **Separação de dados e métricas:**
   - Criado novo estado `allVendasMesInteiro` para armazenar vendas do mês completo
   - Criado `allAtendimentosMesInteiro` para atendimentos do mês completo
   - Estado `allVendas` e `allAtendimentos` continuam sendo filtrados pelo período selecionado

3. **Novo conjunto de métricas mensais:**
   - Criado `salesMetricsMes` useMemo que sempre usa `allVendasMesInteiro`
   - Contém: `totalVendidoMes`, `vendedorasData`, `pecasMes`, `ticketMedioGeral`, etc.
   - Independente do filtro de período

4. **Atualização de componentes:**
   - Cards "Vendas - Mês" e "Ticket Médio - Mês": usam `salesMetricsMes`
   - Gráfico de rosca (donut): usa `allAtendimentosMesInteiro` e `salesMetricsMes`
   - Gráficos de vendedoras: usam `salesMetricsMes.vendedorasData`
   - Gráfico "Vendas x Compras por Categoria": usa `salesMetricsMes.pecasMes`
   - Barras de progresso das vendedoras: usam `salesMetricsMes.vendedorasData`

5. **Migração completa de variáveis:**
   - Substituídas 18 referências de `salesMetrics` para `salesMetricsMes`
   - Incluindo gráficos BarChart, cálculos de max(), arrays de dados

**Arquivos Alterados:**

- `src/pages/Dashboard.tsx`
  - Linha 73: Mudança de filtro padrão para "hoje"
  - Linha 64: Novo estado `allVendasMesInteiro`
  - Linha 62: Novo estado `allAtendimentosMesInteiro`
  - Linhas 149-191: fetchData() agora carrega 2 conjuntos de dados (mês e filtrado)
  - Linhas 325-527: Novo useMemo `salesMetricsMes` com dados fixos do mês
  - Linhas 551-569: donutResumoMes agora usa `allAtendimentosMesInteiro`
  - Linhas 745, 766, 780-784: Gráficos de vendedoras (seção caixa) usando salesMetricsMes
  - Linhas 966-1080: Cards usando salesMetricsMes
  - Linhas 1373, 1394, 1408, 1432, 1446: Gráficos de vendedoras (seção admin) usando salesMetricsMes
  - Linhas 1501-1506: Gráfico de categorias usando salesMetricsMes.pecasMes

**Observações:**
- Filtro de período agora afeta apenas componentes que devem ser filtrados
- Cards e gráficos "do mês" são independentes do filtro
- Usuário pode filtrar por "hoje", "semana", "mês" ou período customizado
- Métricas mensais permanecem estáveis mostrando sempre o mês completo
- Solução é extensível e mantém separação clara de responsabilidades

--- COMMIT FEITO ---

---

## 📅 28/01/2026 - 22:00

### 🎨 Melhorias: Badges de preferência de pagamento e taxa de recusa

**Necessidade:**  
Melhorar visualização das preferências de pagamento dos clientes e adicionar indicador de taxa de recusa nas telas de Cadastro e Avaliação.

**Solução Implementada:**

1. **Badge redesenhado com ícone dominante:**
   - Ícone grande (70% maior) mostrando método preferido
   - DollarSign para Dinheiro (verde), Orbit para Gira-crédito (laranja)
   - Mostra porcentagem e quantidade (ex: "60% (3/5)")

2. **Novo badge de taxa de recusa:**
   - Aparece ao lado do badge de pagamento
   - Mostra % de recusas com ícone AlertCircle
   - Cor vermelha para alertar sobre clientes problemáticos

3. **Hook `useClienteRecusas()` criado:**
   - Busca atendimentos com status `recusado` ou `recusou`
   - Calcula percentual de recusas sobre total de avaliações
   - Retorna total_avaliacoes, total_recusadas, percentual_recusadas

4. **Padronização de status:**
   - Type `StatusAtendimento` atualizado com: aguardando, em_avaliacao, aguardando_pagamento, finalizado, recusado, recusou
   - Diferenciação visual: "Recusado" (loja, red-500) vs "Cliente recusou" (red-900)
   - Hook `useRecusarAvaliacao()` diferencia motivo: loja → "recusado", cliente → "recusou"

5. **Cor do Gira-crédito alterada:**
   - Mudado de verde para laranja para melhor distinção visual

**Arquivos Alterados:**

- `src/components/ClientePreferenciaPaymentBadge.tsx` (novo arquivo)
  - Componente completo com 2 badges (pagamento + recusas)
  - Imports: DollarSign, Orbit, Loader2, AlertCircle
  - Props: nomeCliente, className, showRecusas

- `src/hooks/useClientePreferenciaPagemento.ts`
  - Linhas 40-90: Nova interface `ClienteRecusas` e hook `useClienteRecusas()`
  - Query busca atendimentos com status IN ('recusado', 'recusou')
  - Calcula percentual de recusas

- `src/types/database.ts`
  - Linha 50: Type StatusAtendimento expandido com 'recusado' e 'recusou'

- `src/hooks/useAtendimentos.ts`
  - Linhas 477-480: useRecusarAvaliacao() diferencia status baseado em motivo_recusa

- `src/pages/HistoricoAtendimentos.tsx`
  - Linha 50: Adicionado 'recusou' ao type local
  - Linhas 115-140: getStatusBadge() diferencia visualmente os 2 tipos de recusa

**Observações:**
- Badges são condicionais: só aparecem quando há dados
- Badge de recusas só mostra se total_recusadas > 0
- Solução é reutilizável em qualquer parte do sistema
- Mantém consistência visual com shadcn/ui

--- COMMIT FEITO ---

---

## 📅 29/01/2026 - 14:00

### 🔓 Melhoria: Admin pode ver extrato de qualquer caixa sem pré-seleção

**Necessidade:**  
Usuário admin não conseguia ver extrato de caixas na aba Financeiro sem estar logado como um caixa específico. O select existia mas não funcionava sem caixa pré-selecionado no login.

**Causa:**  
Componente Financeiro tinha fallback `caixaParaExtrato = caixaExtrato || caixaSelecionado` que exigia caixa do contexto. Se admin não selecionava caixa no login, extrato não aparecia.

**Solução Implementada:**

1. **Lógica de caixaParaExtrato refatorada:**
   - useMemo que prioriza: caixaExtrato > caixaSelecionado > primeiro caixa (se admin)
   - Admin agora vê automaticamente o primeiro caixa da lista
   - Caixas específicos continuam vendo seu próprio caixa por padrão

2. **Select atualizado:**
   - Removido fallback para caixaSelecionado no value
   - Agora usa diretamente `caixaParaExtrato` que já tem a lógica completa

**Arquivos Alterados:**

- `src/pages/Financeiro.tsx`
  - Linhas 266-274: Novo useMemo com lógica de priorização
  - Linha 737: Select agora usa `value={caixaParaExtrato || ""}`

**Observações:**
- Admin pode trocar de caixa livremente no dropdown
- Caixas específicos mantém comportamento original
- Extrato aparece automaticamente ao carregar página
- Solução mantém compatibilidade com fluxo existente

--- COMMIT FEITO ---

---

## 📅 29/01/2026 - 16:00

### 🕐 Correção Crítica: Timezone UTC causando problemas em fechamentos e saldos

**Necessidade:**  
Sistema estava salvando fechamentos de caixa com data/hora em UTC (meia-noite = 00:00), que aparecia como 21:00 do dia anterior em Brasília. Isso causou:
1. Fechamentos de 26/01 aparecendo como 25/01 às 21:00
2. Hook `useSaldoInicial` buscando fechamento errado (do dia errado)
3. Saldo de 27/01 mostrou R$400 quando deveria ser R$0

**Causa Raiz:**  
Todo o sistema usava `new Date().toISOString()` que retorna UTC, mas o banco PostgreSQL usa `TIMESTAMPTZ` (timezone-aware). Quando salvava apenas a data `2026-01-27`, assumia meia-noite UTC, que é 21:00 de 26/01 em Brasília.

**Solução Implementada:**

1. **Criadas funções auxiliares em `utils.ts`:**
   - `getDateBrasilia()`: Retorna data atual em Brasília no formato YYYY-MM-DD
   - `getDateTimeBrasilia()`: Retorna data/hora atual em Brasília no formato ISO
   - Ambas usam `convertToLocalTime()` existente como base

2. **Substituídos 11 usos de `new Date().toISOString()`:**
   - useCaixas.ts: 5 substituições (fechamentos, saldos, resumos)
   - useAtendimentos.ts: 1 substituição (hora chegada)
   - FinalizarAtendimentoModal.tsx: 1 substituição (hora encerramento)
   - UserContext.tsx: 2 substituições (session_date)
   - InactivityContext.tsx: 1 substituição (verificação sessão)
   - Marketing.tsx: 1 substituição (check_timestamp)
   - FechamentoCaixaModal.tsx: já estava usando convertToLocalTime()

3. **Impacto nas operações:**
   - Fechamentos agora salvam com hora real de Brasília (ex: 18:30 em vez de 21:30 UTC)
   - Hook `useSaldoInicial` busca fechamento do dia correto
   - Registros de atendimento salvam com hora local
   - Verificações de "hoje" são consistentes com timezone local

4. **Script SQL de diagnóstico criado (não executado):**
   - `20260129_corrigir_timezone_fechamentos.sql`
   - Identifica fechamentos com timezone incorreto
   - Corrige timestamps retroativos (opcional)
   - Corrige valor_sistema do fechamento de 27/01 de R$400 para R$0

**Arquivos Alterados:**

- `src/lib/utils.ts`
  - Linhas 39-72: Novas funções `getDateBrasilia()` e `getDateTimeBrasilia()`

- `src/hooks/useCaixas.ts`
  - Linha 1: Import de `getDateBrasilia`, `getDateTimeBrasilia`
  - Linha 270: useSaldoFinalHoje() usa getDateBrasilia()
  - Linha 515: Fechamento usa getDateBrasilia()
  - Linha 549: useResumoVendasHoje() usa getDateBrasilia()
  - Linha 616: useResumoVendasPorCaixa() usa getDateBrasilia()

- `src/hooks/useAtendimentos.ts`
  - Linha 4: Import de getDateTimeBrasilia
  - Linha 91: Hora chegada usa getDateTimeBrasilia()

- `src/components/recepcao/FinalizarAtendimentoModal.tsx`
  - Linha 23: Import de getDateTimeBrasilia
  - Linha 112: Hora encerramento usa getDateTimeBrasilia()

- `src/components/financeiro/FechamentoCaixaModal.tsx`
  - Linha 13: Import de convertToLocalTime
  - Linhas 44-47: Data fechamento usa convertToLocalTime()

- `src/contexts/UserContext.tsx`
  - Linha 4: Import de getDateBrasilia
  - Linhas 109, 129: session_date usa getDateBrasilia()

- `src/contexts/InactivityContext.tsx`
  - Linha 5: Import de getDateBrasilia
  - Linha 61: Verificação de sessão usa getDateBrasilia()

- `src/pages/Marketing.tsx`
  - Linha 6: Import de getDateTimeBrasilia
  - Linha 230: check_timestamp usa getDateTimeBrasilia()

- `supabase/20260129_corrigir_timezone_fechamentos.sql` (novo arquivo)
  - Script de diagnóstico e correção de dados históricos (não executado)

**Observações:**
- Dados históricos permanecem como estão (decisão do usuário)
- Sistema agora usa timezone correto em todas operações críticas
- Bug do R$400 foi identificado: fechamento de 27/01 não pegou movimentações devido ao timezone
- Solução previne problemas futuros mas não altera registros passados
- Todas as operações de data/hora agora são consistentes com Brasília

--- COMMIT FEITO ---

---

## 📅 30/01/2026 - 15:00

### 📦 Novo: Sistema completo de controle unitário de itens grandes

**Necessidade:**  
Sistema para rastrear individualmente itens grandes (carrinhos, berços, etc) desde a avaliação até a venda. Necessário:
- Registrar cada item grande na avaliação com tipo, marca, descrição, valor compra
- Gerenciar estoque de itens disponíveis
- Marcar itens como vendido com valor_venda
- Marcar itens como baixa (danificado/perdido)
- Visualizar relatório com métricas (dias venda, margem)
- Editar informações de itens
- Deletar itens para limpeza de testes

**Causa:**  
Não havia rastreamento individual de itens grandes. Sistema anterior só permitia registrar quantidade, sem controle de estoque ou histórico de venda.

**Solução Implementada:**

1. **Banco de dados (3 tabelas):**
   - `tipos_itens_grandes`: Carrinho, Berço, Cercadinho, etc (10 tipos pré-seeded)
   - `marcas_itens_grandes`: Burigotto, Galzerano, Chicco, etc (11 marcas pré-seeded)
   - `itens_grandes_individuais`: Registro individual com status (disponivel/vendido/baixa)
   - Índices em status, tipo, marca, atendimento, venda
   - Triggers para updated_at automático
   - Função `delete_item_grande_individual()` para limpeza segura

2. **TypeScript interfaces:**
   - `TipoItemGrande`, `MarcaItemGrande`, `ItemGrandeIndividual` em `types/database.ts`
   - Campos: id, tipo_id, marca_id, descricao, valor_compra, valor_venda, status
   - Rastreamento: atendimento_id, avaliadora_nome, venda_id, vendedora_nome, datas

3. **6 hooks CRUD completos:**
   - `useTiposItensGrandes()`: Query, Create, Update, Delete
   - `useMarcasItensGrandes()`: Query, Create, Update, Delete
   - `useItensGrandesIndividuais()`: Query todos os itens
   - `useItensGrandesDisponiveis()`: Query apenas disponíveis (para venda)
   - `useCreateItensGrandes()`: Batch insert de itens na avaliação
   - `useVenderItemGrande()`: Marca como vendido com valor_venda, venda_id, data_saida
   - `useDarBaixaItemGrande()`: Marca como baixa com motivo
   - `useUpdateItemGrande()`: Generic update (id, dados)
   - `useDeleteItemGrande()`: Delete com confirmação

4. **Componentes UI:**
   - `ItemGrandeInput.tsx`: Form inline para adicionar itens na avaliação (Tipo, Marca, Descrição, Valor)
   - `SeletorItemGrande.tsx`: Dropdown de itens disponíveis nas vendas com campo valor_venda
   - `ItensGrandes.tsx`: Página de gestão com:
     - 4 cards resumo (Disponível, Vendido, Baixa, Valor em Estoque)
     - Busca + filtro por status
     - Tabela completa com 11 colunas (tipo, marca, descrição, valores, datas, vendedora, etc)
     - Ações: Eye (detalhes), Edit (editar descrição/valor), AlertTriangle (dar baixa), Trash (delete)
     - 3 modais: Detalhes (read-only), Dar Baixa (textarea motivo), Edição (descrição + valor_venda)
   - `RelatorioItensGrandes.tsx`: Página de relatório com:
     - Cards resumo por tipo (dias_medio_venda, margem_media_percentual, quantidade_vendidos)
     - Lista de itens vendidos com métricas
     - Busca e filtros

5. **Integração em workflows:**
   - **Avaliação**: ItemGrandeInput apareça quando qtd_itens_grandes > 0
   - **Vendas**: SeletorItemGrande adiciona itens selecionados, marca como vendido ao finalizar
   - **Estoque**: Menu submenu sob "Estoque" com Gestão e Relatório
   - **Configurações**: CRUD para Tipos e Marcas em abas separadas
   - **Deletamento em cascata**: Itens apagados quando avaliação é deletada

6. **Edição e exclusão:**
   - Botão Edit abre modal com campos descricao e valor_venda
   - Salvar atualiza via `useUpdateItemGrande` (wraps fields em `dados: {}`)
   - Botão Delete com confirmação dialogo ("Tem certeza? Não pode ser desfeito")
   - Query cache invalidado após operações

**Arquivos Criados:**

- `supabase/migrations/20260130_itens_grandes_individuais.sql`
  - Migration completa com 3 tabelas, índices, triggers, seeds

- `src/hooks/useItensGrandesIndividuais.ts`
  - 9 hooks para CRUD e operações de estoque

- `src/hooks/useTiposItensGrandes.ts`
  - CRUD para tipos

- `src/hooks/useMarcasItensGrandes.ts`
  - CRUD para marcas

- `src/components/avaliacao/ItemGrandeInput.tsx`
  - Form inline para entrada de itens grandes

- `src/components/vendas/SeletorItemGrande.tsx`
  - Seletor dropdown com opção "Item grande não lançado"

- `src/pages/ItensGrandes.tsx`
  - Página completa de gestão

- `src/pages/RelatorioItensGrandes.tsx`
  - Página de relatório com métricas

**Arquivos Alterados:**

- `src/types/database.ts`
  - Adicionadas 3 interfaces para tipos, marcas, itens individuais

- `src/App.tsx`
  - Linha: Route `/estoque/itens-grandes` e `/estoque/itens-grandes/relatorio`

- `src/pages/Avaliacao.tsx`
  - ItemGrandeInput integrado quando qtd_itens_grandes > 0
  - State para gerenciar array de itens grandes
  - Salva itens grandes junto com atendimento

- `src/pages/Vendas.tsx`
  - SeletorItemGrande adicionado na seção CARD ITENS
  - State para itensGrandesSelecionados
  - Loop marca cada item como vendido ao finalizar

- `src/pages/Configuracoes.tsx`
  - Novas abas para CRUD de Tipos e Marcas

- `src/components/layout/AppSidebar.tsx`
  - Menu "Estoque" com submenu expandível
  - Submenu contém: Gestão de Estoque, Itens Grandes, Relatório Itens Grandes

- `src/hooks/useAtendimentos.ts`
  - Deletamento de itens_grandes_individuais ao deletar atendimento
  - Invalidação de caches apropriados

- `src/components/avaliacao/AvaliacaoModal.tsx`
  - Renderização condicional de ItemGrandeInput

**Observações:**
- Sistema totalmente funcional e pronto para produção
- Integração sem breaking changes em workflows existentes
- Cascata de deletamento previne órfãos de dados
- Edição permite correção de valores sem perder rastreamento
- Deleção permite limpeza de testes sem afetar produção
- Métricas calculadas em tempo real (dias_venda, margem_percentual)
- Extensível: novos tipos/marcas podem ser adicionados via Configurações

--- COMMIT FEITO ---
