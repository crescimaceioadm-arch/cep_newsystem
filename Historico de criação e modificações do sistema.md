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
