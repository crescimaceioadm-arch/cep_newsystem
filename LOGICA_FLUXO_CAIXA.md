# Lógica de Fluxo de Caixa - Documentação Completa

## 1. MODO DE FUNCIONAMENTO ATUAL

### 1.1 Estrutura Base de Dados

**Tabela: `caixas`**
- `id` (UUID): Identificador único
- `nome` (text): "Caixa 1", "Caixa 2", "Caixa 3", "Avaliação"
- `saldo_seed_caixas` (numeric): Valor de "seed" (backup, NÃO deve ser usado para cálculos)
- `updated_at`: Timestamp

**Tabela: `fechamentos_caixa`**
- `id`: Identificador único
- `caixa_id`: FK para caixas
- `data_fechamento`: Data/hora do fechamento (timestamp com hora!)
- `valor_contado`: Valor físico contado (valor real em dinheiro)
- `valor_sistema`: Valor calculado pelo sistema
- `diferenca`: valor_contado - valor_sistema
- `status`: "aprovado" | "pendente_aprovacao" | "rejeitado"
- `criado_por` (UUID): Usuário que criou o fechamento

**Tabela: `movimentacoes_caixa`**
- `id`: Identificador único
- `caixa_origem_id`: FK caixa que SAI o dinheiro (NULL se vem de cliente)
- `caixa_destino_id`: FK caixa que RECEBE dinheiro
- `tipo`: "venda" | "entrada" | "saida" | "transferencia_entre_caixas" | "pagamento_avaliacao"
- `valor`: Valor da movimentação
- `motivo`: Descrição (ex: "Venda #id-da-venda")
- `data_hora`: Timestamp da movimentação

**Tabela: `vendas`**
- `id`: Identificador único
- `caixa_origem`: Nome do caixa ("Caixa 1", "Caixa 2", etc) - STRING!
- `metodo_pagto_1/2/3`: Método de pagamento ("dinheiro", "pix", "débito", etc)
- `valor_pagto_1/2/3`: Valor de cada pagamento
- Campos de estoque (qtd_baby_vendida, qtd_1_a_16_vendida, etc)
- `valor_total_venda`: Total da venda
- `created_at`: Timestamp da venda

### 1.2 Fórmula de Cálculo de Saldo

```
SALDO_FINAL_HOJE = SALDO_INICIAL + TOTAL_ENTRADAS - TOTAL_SAIDAS

Onde:
- SALDO_INICIAL = valor_contado do fechamento_caixa do dia anterior (status = aprovado)
- TOTAL_ENTRADAS = SUM(movimentações type=venda e caixa_destino_id=caixa) + 
                   SUM(movimentações type=entrada e caixa_destino_id=caixa) +
                   SUM(movimentações type=transferencia_entre_caixas e caixa_destino_id=caixa) +
                   SUM(movimentações type=pagamento_avaliacao e caixa_destino_id=caixa)
- TOTAL_SAIDAS = SUM(movimentações type=saida e caixa_origem_id=caixa) +
                 SUM(movimentações type=transferencia_entre_caixas e caixa_origem_id=caixa) +
                 SUM(movimentações type=pagamento_avaliacao e caixa_origem_id=caixa)
```

### 1.3 Fluxo de Dados - Venda em Dinheiro (EXEMPLO)

1. **Usuário cria venda no Financeiro ou Vendas**
   - Seleciona `caixa_origem` (contexto: useCaixa)
   - Pagamentos incluem "dinheiro"
   - Clica "Finalizar Venda"

2. **useFinalizarVenda()** é chamado
   - Insere em `vendas` com `caixa_origem = "Caixa 1"` (String!)
   - Insere itens em `venda_itens`
   - Chama `registrarMovimentacaoCaixa()` se há dinheiro

3. **registrarMovimentacaoCaixa()**
   - Recebe `caixaOrigem` = "Caixa 1" (String)
   - **BUG ANTERIOR**: Convertia para ID buscando por `.eq("nome", caixaOrigem)`
   - Insere em `movimentacoes_caixa` tipo="venda"
   - Caixa_destino_id = ID encontrado

4. **Trigger no banco** (opcional/backup)
   - Atualiza `saldo_seed_caixas` da tabela caixas

5. **React Query** 
   - Invalida ["movimentacoes_dinheiro", "saldo_final_hoje"]
   - Frontend recalcula `useSaldoFinalHoje()`

6. **useSaldoFinalHoje()** executa
   - Chama `useSaldoInicial()` para buscar saldo inicial
   - Chama `useMovimentacoesDinheiro()` para buscar movs de hoje
   - Calcula e retorna novo saldo

---

## 2. VARIÁVEIS QUE INFLUENCIAM O SALDO

### 2.1 Fatores de Cálculo

| Fator | Impactado por | Descrição |
|-------|-------------|-----------|
| **Saldo Inicial** | Data anterior | SEMPRE vem do fechamento_caixa do dia anterior (status=aprovado) |
| **Movimentações de Hoje** | Tipo de operação | Vendas, entradas manuais, saídas, transferências |
| **Status do Fechamento** | Admin | Só fechamentos "aprovado" contam como saldo_inicial |
| **Data/Hora do Sistema** | Servidor | Determina qual é "hoje" em Brasília |
| **Caixa Selecionado** | Contexto (CaixaContext) | Determina qual caixa está sendo consultado |
| **Fuso Horário** | Constante | UTC no banco, Brasília no frontend |

### 2.2 Variáveis NÃO Esperadas (Mas Existentes)

| Variável | Localização | Status | Risco |
|----------|------------|--------|-------|
| `saldo_seed_caixas` | caixas table | Atualizado por trigger | ⚠️ NÃO deve ser usado, apenas backup |
| `saldo_atual` | *REMOVIDO* | Histórico | ✅ Foi eliminado |
| `valor_sistema` | fechamentos_caixa | Calculado | ℹ️ Para auditoria apenas |
| `criado_por` | fechamentos_caixa | FK usuário | ℹ️ Para rastreamento |

### 2.3 Datas/Condições Especiais

- **Fins de Semana**: Nenhum impacto especial. Fechamentos funcionam igual
- **Feriados**: Nenhum impacto especial. Sistema não tem calendário de feriados
- **Troca de Dia (00:00)**: Saldo_inicial muda para o novo fechamento
- **CRUD de Vendas Passadas**: Afeta saldo do dia da venda (não de hoje)

---

## 3. MAPEAMENTO DE ARQUIVOS E FUNÇÕES COM VINCULO A SALDO

### 3.1 HOOKS - src/hooks/useCaixas.ts (LOCAL PRINCIPAL)

#### **useSaldoInicial(caixaId, dataInicio)**
- **Linhas**: 45-185
- **Responsabilidade**: Buscar saldo inicial (fechamento do dia anterior)
- **Prioridades**:
  1. Fechamento APROVADO do dia anterior
  2. Fechamento PENDENTE do dia anterior
  3. Fechamento APROVADO mais antigo
  4. Fechamento PENDENTE mais antigo
  5. Retorna 0 se nenhum
- **Erros Conhecidos**:
  - ❌ Tentava usar `.order("created_at")` - coluna não existe
  - ⚠️ Acumula múltiplas queries se não houver resultado
- **Retorna**: `{ valor, fonte, data_fechamento }`

#### **useMovimentacoesDinheiro(caixaId, dataInicio, dataFim)**
- **Linhas**: 205-300
- **Responsabilidade**: Buscar movimentações em dinheiro de um período
- **Filtros**:
  - Range de datas: dataHoraInicio até dataHoraFim
  - Apenas registros da caixa consultada (origem ou destino)
- **Tipos Contabilizados**:
  - "venda": ENTRADA se destinada ao caixa
  - "entrada": ENTRADA se destinada ao caixa
  - "saida": SAIDA se originou da caixa
  - "transferencia_entre_caixas": ENTRADA (destino) ou SAIDA (origem)
  - "pagamento_avaliacao": Complexo (origem/destino)
- **Retorna**: Array de movimentações

#### **useSaldoFinalHoje(caixaId)**
- **Linhas**: 310-390
- **Responsabilidade**: CÁLCULO FINAL - saldo inicial + movs de hoje
- **Executa**:
  1. `useSaldoInicial(caixaId, hoje)`
  2. `useMovimentacoesDinheiro(caixaId, hoje, hoje)`
  3. Soma com lógica de tipos
  4. Retorna `saldo_inicial + entradas - saidas`
- **Logs**: Extremamente detalhado (para debug)
- **Retorna**: `{ saldo_final, debugInfo }`

#### **useCaixa()**
- **Linhas**: 37-42
- **Responsabilidade**: Fetch todos os caixas com seus dados
- **Impacto**: Alimenta lista de seleção de caixa
- **Retorna**: Array de caixas com saldo_seed_caixas

#### **useAjustarSaldoAdmin()**
- **Linhas**: 390-480 (aproximado)
- **Responsabilidade**: Criar movimentação para ajuste manual de saldo
- **Executa**:
  1. Calcula diferença: saldoDesejado - saldoAtual
  2. Define tipo: "entrada" (se +) ou "saida" (se -)
  3. Insere em movimentacoes_caixa
  4. Invalida queries para recalcular
- **Impacto**: Cria movimentação (não toca em saldo_seed_caixas)

#### **useFinalizarFechamento()**
- **Responsabilidade**: Criar fechamento após admin contar caixa
- **Executa**:
  1. Busca saldo final do dia (movs até fim do dia)
  2. Insere em fechamentos_caixa com status="pendente_aprovacao"
  3. Admin aprova e status muda para "aprovado"
- **Impacto**: Define saldo_inicial do próximo dia

#### **useDeleteMovimentacao(), useEditarMovimentacao()**
- **Responsabilidade**: Deletar/editar movimentação
- **Impacto**: 
  - DELETE: Remove registros, invalida queries
  - EDIT: Altera valor/tipo, invalida queries
- **Erro Anterior**: Tentava atualizar saldo_atual (removido)

### 3.2 CONTEXTOS - Influenciam Qual Caixa é Consultado

#### **CaixaContext** (src/contexts/CaixaContext.tsx)
- **Linhas**: Completo
- **Responsabilidade**: Gerenciar qual `caixaSelecionado` está ativo
- **Variáveis**:
  - `caixaSelecionado`: "Caixa 1" | "Caixa 2" | "Caixa 3" | "Avaliação"
  - `showModal`: Mostrar seletor
- **Armazenamento**: localStorage chave "caixa_selecionado"
- **Impacto**: DEFINE qual caixa tem seu saldo calculado

#### **UserContext** (src/contexts/UserContext.tsx)
- **vinculo**: Determina se user é `isAdmin`
- **Impacto**: Apenas admins kunnen criar fechamentos

### 3.3 PÁGINAS QUE USAM SALDO

#### **Financeiro** (src/pages/Financeiro.tsx)
- **Linhas**: Completo
- **Responsabilidade**: Dashboard principal de caixa
- **O que mostra**:
  - 3 cards com `useSaldoFinalHoje()` para cada caixa
  - Status do fechamento (aberto/fechado)
  - Botão "Realizar Fechamento"
  - Botão "Ajustar Saldo" (admin only)
  - Extrato com movimentações do dia
- **Fluxo**:
  1. Carrega usa caixaSelecionado do context
  2. Busca saldo_final_hoje
  3. Busca lista de caixas
  4. Busca status de fechamento
  5. Busca movimento do dia (extrato)
- **Erros Humanos Encontrados**:
  - User esquece de fechar caixa (saldo_inicial do próximo dia fica em 0)
  - User altera caixa sem finalizar operações
  - Admin aprova fechamento com diferença grande

#### **Extrato** (src/pages/Extrato.tsx) - Presumido
- **Responsabilidade**: Mostrar histórico de movimentações
- **O que usa**: 
  - `useMovimentacoesDinheiro()` com range de datas customizado
  - Permite filtrar por data, tipo, caixa
- **Impacto**: Auditoria de saldo

#### **Vendas** (src/pages/Vendas.tsx)
- **Linhas**: 93-160 (handleFinalizarVenda)
- **Responsabilidade**: Criar vendas com pagamento
- **Seleção de Caixa**:
  - `caixaSelecionado` vem de CaixaContext
  - Passa como `caixa_origem: caixaSelecionado || "Caixa 1"`
  - **BUG ANTERIOR**: Fallback "Caixa 1" era problemático
- **Impacto**: Origem de todas as vendas em dinheiro

#### **Configurações** (src/pages/Configuracoes.tsx)
- **Presumido**: Pode ter opções de reset de saldo
- **Impacto**: Risco de exclusão de dados

### 3.4 BIBLIOTECAS - src/lib/

#### **registrarMovimentacaoCaixa.ts**
- **Responsabilidade**: Converter venda em movimentação_caixa
- **Fluxo**:
  1. Recebe `caixaOrigem` (String: "Caixa 1")
  2. Busca caixa por `.eq("nome", caixaOrigem)`
  3. Insere movimentação com caixa_destino_id
  4. Retorna sucesso/erro
- **Erros Conhecidos**:
  - ⚠️ Se nome de caixa mudar, queries quebram
  - ⚠️ Não valida se caixa existe antes de inserir
- **Chamado por**: useFinalizarVenda()

#### **utils.ts**
- **getDateBrasilia()**: Retorna data em Brasília (YYYY-MM-DD)
- **getDateTimeBrasilia()**: Retorna datetime em Brasília (ISO)
- **getBrasiliaRange()**: Retorna range de datas (início e fim de um dia)
- **Impacto**: Determina qual é "hoje" e "ontem"

---

## 4. POSSIBILIDADES DE ERRO HUMANO

### 4.1 Erros de Operação

| Erro | Como Acontece | Impacto | Como Evitar |
|------|---------------|--------|------------|
| **Não fechar caixa** | Admin deixa Financeiro sem clicar "Finalizar Fechamento" | Saldo_inicial próximo dia = 0 | Avisar ao fechar app |
| **Aprovar fechamento com diferença** | Admin aprova `valor_contado ≠ valor_sistema` | Saldo desajustado acumula | Bloquear aprovação se diferença > X |
| **Alterar caixa no meio da operação** | User clica trocar caixa enquanto criando venda | Venda em caixa errado | Bloquear mudança de caixa se há operação em curso |
| **Ajuste de saldo mal calculado** | Admin usa "Ajustar Saldo" com valor errado | Saldo incorreto | Mostrar preview clara do resultado |
| **Deletar venda antiga** | Admin deleta venda de dia passado | Saldo do dia anterior muda (errado!) | Avisar que afeta saldo passado |
| **Editar valor de venda** | Admin corrige valor em venda anterior | Movimentação fica desatualizada | Criar nova movimentação, não editar |

### 4.2 Erros de Sistema

| Erro | Como Acontece | Impacto | Status |
|------|---------------|--------|--------|
| **Coluna criada_at não existe** | Código tenta `.order("created_at")` | Query falha, saldo = 0 | ✅ CORRIGIDO (removidas linhas) |
| **caixa_origem é String, caixa_id é UUID** | Confusão entre nome e ID | Lookup falha | ⚠️ CRITICO - pode registrar wrong caixa |
| **RLS bloqueando leitura** | Política de segurança muito restrita | Dados não carregam | ⚠️ Possível se houver RLS |
| **Timezone mismatch** | Frontend Brasília, banco UTC | Datas não batem | ⚠️ Constante vigilância |
| **Fallback para "Caixa 1"** | `caixa_origem || "Caixa 1"` | Todas vendas sem seleção → Caixa 1 | ⚠️ CRITICO |

### 4.3 Erros de Data/Hora

| Erro | Causa | Impacto |
|------|-------|--------|
| **Relógio do servidor desajustado** | Adm não sincroniza horário | Datas "hoje" estão erradas |
| **Vendas criadas com timestamp errado** | Browser com hora errada | Movimentação registrada outro dia |
| **Fechamento com data futura** | Admin entra data manual (se permitir) | Saldo futuro é consultado como "hoje" |

### 4.4 Erros de Dados Históricos

| Erro | Causa | Impacto |
|------|-------|--------|
| **Histórico de movimentações deletado** | Limpeza de banco malfeita | Saldo anterior fica inconsistente |
| **Fechamentos antigos alterados** | Admin edita fechamento passado | Saldo_inicial de todos os dias depois muda |
| **Caixa renomeada** | Alguém muda "Caixa 1" para "Caixa A" | registrarMovimentacaoCaixa não encontra por nome! |

---

## 5. RESUMO CRÍTICO

### ⚠️ PROBLEMAS ESTRUTURAIS IDENTIFICADOS

1. **caixa_origem é String, caixa_id é UUID**
   - Causa conversão perigosa em registrarMovimentacaoCaixa
   - Se nome for alterado, todas as queries quebram
   - Solução: Usar ID direto na venda

2. **Múltiplas Prioridades em useSaldoInicial()**
   - Lógica complexa aumenta chance de erro
   - Muitas queries de fallback
   - Solução: Simplificar para 1-2 prioridades

3. **saldo_seed_caixas nunca deveria ser consultado**
   - Cria confusão sobre "fonte da verdade"
   - Triggers o atualizam (redundância)
   - Solução: Documentar claramente que é BACKUP

4. **React Query invalidation é crítico**
   - Sem invalidação, saldo não recalcula
   - É invisível para usuário se falhar
   - Solução: Adicionar warnings se query falha

5. **Sem log de auditoria de ajustes de saldo**
   - Admin pode ajustar sem rastro claro
   - Solução: Registrar quem, quando, de/para em cada ajuste

---

## 6. PRÓXIMOS PASSOS PARA REFATORAÇÃO

Baseado nesta documentação:

1. **Simplificar useSaldoInicial()**
   - Apenas: Buscar fechamento aprovado do dia anterior
   - Se não houver: Log de AVISO, retorna 0

2. **Corrigir caixa_origem em vendas**
   - Trocar de String para UUID
   - Migração histórica de dados

3. **Remover saldo_seed_caixas de todos os cálculos**
   - Manter triggers para auditoria
   - Documentar que é backup não-confiável

4. **Adicionar validações em pontos críticos**
   - Caixa existe?
   - Fechamento anterior existe?
   - User é admin?

5. **Melhorar logs e alertas**
   - Usuário vê quando saldo é 0 por falta de fechamento
   - Admin vê risk quando aprova diferença grande
