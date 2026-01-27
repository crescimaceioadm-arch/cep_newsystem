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

---

