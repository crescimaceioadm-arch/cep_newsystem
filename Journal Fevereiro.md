# Descrição do que o copilot deve escrever a cada alteração importante
Toda vez que você pedir uma alteração no sistema, vou atualizar este arquivo seguindo o mesmo padrão:

Data/hora
Necessidade e causa
Solução implementada
Arquivos alterados com detalhes
Observações relevantes

O formato é enxuto para não ficar extenso, mas mantém todas as informações importantes para rastreabilidade!

# Journal Fevereiro

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
