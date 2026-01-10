# Sistema Seguro de Registro de Movimentação de Caixa

## 📋 Resumo

Implementado sistema **robusto e à prova de falhas** para garantir que vendas em dinheiro sejam SEMPRE registradas no caixa, sem depender exclusivamente de triggers do banco de dados.

---

## ❌ Problema Anterior

**TRIGGER SILENCIOSO:**
- O sistema dependia 100% do trigger `trg_venda_dinheiro`
- Se o trigger falhasse (bug, race condition, desabilitado temporariamente), nenhum erro era reportado
- Venda era registrada mas movimentação de caixa NÃO
- Resultado: saldo incorreto, extrato incompleto

**CASO REAL (09/01/2026):**
```
Venda: R$ 261 (PIX R$ 161 + Dinheiro R$ 100)
Problema: R$ 100 em dinheiro NÃO foi registrado no caixa
Causa: Trigger falhou silenciosamente
```

---

## ✅ Solução Implementada

### 1. Registro Direto no Código da Aplicação

**Arquivo:** `src/lib/registrarMovimentacaoCaixa.ts`

**Função Principal:** `registrarMovimentacaoCaixa()`

**O que faz:**
- Calcula total em dinheiro da venda
- Busca o caixa de destino
- **Verifica se já existe movimentação** (evita duplicação)
- Insere registro em `movimentacoes_caixa`
- Atualiza `saldo_atual` do caixa
- **Retorna sucesso/erro detalhado**

**Vantagens:**
- ✅ Execução garantida (roda no código TypeScript)
- ✅ Logs detalhados de cada etapa
- ✅ Tratamento de erros explícito
- ✅ Proteção contra duplicação
- ✅ Não falha a venda se houver erro (apenas alerta)

### 2. Integração no Hook de Vendas

**Arquivo:** `src/hooks/useVendas.ts` (modificado)

**Fluxo NOVO:**
```typescript
1. Inserir venda no banco de dados
2. ✅ CHAMAR registrarMovimentacaoCaixa() DIRETAMENTE
3. Se sucesso: continuar normalmente
4. Se erro: alertar usuário mas NÃO falhar a venda
5. Atualizar estoque
```

**Código:**
```typescript
const resultadoMovimentacao = await registrarMovimentacaoCaixa({
  vendaId: vendaInserida.id,
  caixaOrigem: venda.caixa_origem || "Caixa 1",
  pagamentos: venda.pagamentos,
  dataHoraVenda: vendaInserida.created_at,
});

if (!resultadoMovimentacao.success) {
  console.error("⚠️ Falha ao registrar movimentação:", resultadoMovimentacao.error);
  toast.warning(`Venda registrada mas problema no caixa. Registre manualmente R$ ${resultadoMovimentacao.valorRegistrado}`);
}
```

### 3. Sistema de Reconciliação

**Arquivo:** `src/lib/registrarMovimentacaoCaixa.ts`

**Função:** `reconciliarVendasSemMovimentacao(dataInicio, dataFim)`

**O que faz:**
- Busca TODAS as vendas com dinheiro no período
- Para cada venda, verifica se existe movimentação
- Se NÃO existir, cria automaticamente
- Retorna relatório: `{ vendasCorrigidas: number, erros: [] }`

**Uso:**
- Executar diariamente (automático ou manual)
- Antes de cada fechamento de caixa
- Quando suspeitar de inconsistências

### 4. Interface de Reconciliação

**Arquivo:** `src/components/financeiro/ReconciliacaoCaixaCard.tsx`

**Localização:** Página **Configurações** (apenas Admin)

**Funcionalidades:**
- Botão "Executar Reconciliação (Últimos 7 dias)"
- Feedback visual detalhado:
  - ✅ Vendas corrigidas
  - ℹ️ Nenhuma inconsistência encontrada
  - ❌ Erros (se houver)
- Seguro executar múltiplas vezes (não duplica)

---

## 🔧 Como Usar

### Para Desenvolvedores

**1. Nova venda:**
```typescript
// Automático - já integrado no useFinalizarVenda()
// Nada precisa ser alterado no código de vendas
```

**2. Reconciliação manual:**
```typescript
import { reconciliarVendasSemMovimentacao } from "@/lib/registrarMovimentacaoCaixa";

const resultado = await reconciliarVendasSemMovimentacao(
  "2026-01-01T00:00:00Z",
  "2026-01-31T23:59:59Z"
);

console.log(`Corrigidas: ${resultado.vendasCorrigidas}`);
console.log(`Erros: ${resultado.erros.length}`);
```

### Para Usuários (Admin)

**1. Rotina Diária:**
- Acessar **Configurações** → Seção "Manutenção de Caixa"
- Clicar em "Executar Reconciliação"
- Verificar resultado

**2. Quando usar:**
- ✅ Suspeita de venda em dinheiro não registrada
- ✅ Diferença inexplicável entre saldo do sistema e físico
- ✅ Rotina de manutenção mensal
- ✅ Após atualização do sistema

**3. Segurança:**
- ⚠️ Não duplica movimentações (verifica antes de inserir)
- ⚠️ Pode executar quantas vezes quiser sem risco

---

## 📊 Comparação: Antes vs. Depois

| Aspecto | ANTES (só trigger) | DEPOIS (código + trigger) |
|---------|-------------------|---------------------------|
| **Garantia de execução** | ❌ Depende do trigger | ✅ Código garante |
| **Detecção de falhas** | ❌ Silencioso | ✅ Logs + alertas |
| **Recuperação automática** | ❌ Manual | ✅ Reconciliação |
| **Proteção duplicação** | ⚠️ Parcial | ✅ Total |
| **Rastreabilidade** | ❌ Logs mínimos | ✅ Logs completos |
| **Interface de correção** | ❌ SQL direto | ✅ UI amigável |

---

## 🔍 Monitoramento e Diagnóstico

### Logs no Console (F12)

Toda operação gera logs detalhados:

```
[registrarMovimentacaoCaixa] Venda abc123: R$ 100 em dinheiro
[registrarMovimentacaoCaixa] ✅ Movimentação inserida: id=xyz789, valor=R$100
[registrarMovimentacaoCaixa] ✅ Saldo atualizado: 50 + 100 = 150
```

### Alertas para Usuário

- **Sucesso silencioso:** Nenhuma notificação (tudo OK)
- **Movimentação duplicada:** Log no console (informativo)
- **Erro ao registrar:** Toast amarelo com valor a registrar manualmente

### Query SQL de Diagnóstico

Execute no Supabase SQL Editor para encontrar vendas problemáticas:

```sql
-- Vendas com dinheiro SEM movimentação (últimos 30 dias)
WITH vendas_dinheiro AS (
  SELECT 
    v.id,
    v.caixa_origem,
    v.created_at,
    COALESCE(
      CASE WHEN LOWER(TRIM(v.metodo_pagto_1)) = 'dinheiro' THEN v.valor_pagto_1 ELSE 0 END +
      CASE WHEN LOWER(TRIM(v.metodo_pagto_2)) = 'dinheiro' THEN v.valor_pagto_2 ELSE 0 END +
      CASE WHEN LOWER(TRIM(v.metodo_pagto_3)) = 'dinheiro' THEN v.valor_pagto_3 ELSE 0 END,
      0
    ) as total_dinheiro
  FROM vendas v
  WHERE v.created_at >= NOW() - INTERVAL '30 days'
    AND COALESCE(
      CASE WHEN LOWER(TRIM(v.metodo_pagto_1)) = 'dinheiro' THEN v.valor_pagto_1 ELSE 0 END +
      CASE WHEN LOWER(TRIM(v.metodo_pagto_2)) = 'dinheiro' THEN v.valor_pagto_2 ELSE 0 END +
      CASE WHEN LOWER(TRIM(v.metodo_pagto_3)) = 'dinheiro' THEN v.valor_pagto_3 ELSE 0 END,
      0
    ) > 0
)
SELECT 
  vd.*,
  CASE 
    WHEN mc.id IS NULL THEN '❌ SEM MOVIMENTAÇÃO'
    ELSE '✅ OK'
  END as status
FROM vendas_dinheiro vd
LEFT JOIN movimentacoes_caixa mc ON (
  mc.tipo = 'venda' 
  AND mc.motivo LIKE '%' || vd.id || '%'
)
WHERE mc.id IS NULL
ORDER BY vd.created_at DESC;
```

---

## 🚨 O que fazer se encontrar vendas sem movimentação

### Opção 1: Interface Gráfica (Recomendado)
1. Login como Admin
2. Ir em **Configurações**
3. Seção "Manutenção de Caixa"
4. Clicar em "Executar Reconciliação"
5. Aguardar resultado

### Opção 2: SQL Direto (Avançado)
```sql
-- Use o script existente: supabase/diagnostico_caixa_09jan.sql
-- Parte 5: Identifica vendas problemáticas
-- Parte 6: Correção manual
```

---

## 🎯 Benefícios da Nova Solução

### Técnicos
- ✅ **Redundância:** Código + Trigger (dupla proteção)
- ✅ **Idempotência:** Executar múltiplas vezes não causa problemas
- ✅ **Observabilidade:** Logs detalhados em cada etapa
- ✅ **Recuperabilidade:** Sistema de reconciliação automática
- ✅ **Testabilidade:** Funções isoladas e testáveis

### Operacionais
- ✅ **Confiabilidade:** Vendas sempre registradas
- ✅ **Rastreabilidade:** Histórico completo de operações
- ✅ **Auditoria:** Verificação periódica automatizada
- ✅ **Recuperação:** Correção automática de inconsistências
- ✅ **Interface amigável:** Sem necessidade de SQL

### Financeiros
- ✅ **Precisão:** Saldo sempre correto
- ✅ **Integridade:** Extrato completo
- ✅ **Confiança:** Fechamentos confiáveis
- ✅ **Compliance:** Auditoria facilitada

---

## 📝 Checklist de Implementação

- [x] Criar função `registrarMovimentacaoCaixa()`
- [x] Criar função `reconciliarVendasSemMovimentacao()`
- [x] Integrar no hook `useFinalizarVenda()`
- [x] Criar componente `ReconciliacaoCaixaCard`
- [x] Adicionar na página Configurações (admin only)
- [x] Testar registro de venda em dinheiro
- [x] Testar reconciliação de vendas antigas
- [x] Testar proteção contra duplicação
- [x] Documentar solução

---

## 🔮 Próximos Passos (Opcional)

### Melhorias Futuras

1. **Agendamento Automático:**
   - Executar reconciliação diariamente às 6h
   - Enviar relatório por email/notificação

2. **Dashboard de Monitoramento:**
   - Gráfico de inconsistências ao longo do tempo
   - Alertas proativos

3. **Logs Estruturados:**
   - Salvar logs em tabela `auditoria_movimentacoes`
   - Rastreio completo de todas as operações

4. **Webhook de Notificação:**
   - Avisar admin quando houver correção automática
   - Slack/Discord/Email

---

## 🆘 Suporte

**Se encontrar problemas:**

1. Verificar logs no console do navegador (F12)
2. Executar reconciliação manual
3. Consultar `supabase/diagnostico_caixa_09jan.sql` Parte 5
4. Contatar desenvolvedor com logs detalhados

**Logs importantes:**
- `[registrarMovimentacaoCaixa]` - Operações de registro
- `[reconciliarVendas]` - Operações de correção
- `[useFinalizarVenda]` - Processo completo de venda

---

## ✅ Conclusão

O sistema agora é **robusto, confiável e à prova de falhas silenciosas de trigger**. Todas as vendas em dinheiro são garantidas de serem registradas, com sistema de recuperação automática e interface amigável para verificação.

**Dúvidas? Verifique os comentários no código ou execute a reconciliação!**
