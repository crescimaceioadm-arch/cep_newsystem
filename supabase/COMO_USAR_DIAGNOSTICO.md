# 🔍 GUIA: Como Usar o Script de Diagnóstico

## 📋 **INFORMAÇÕES DO PROBLEMA**

**Data do incidente:** 09/01/2026  
**Caixa afetado:** Caixa 1  
**Venda:** R$ 261,00 (PIX R$ 161 + Dinheiro R$ 100)  
**Sintomas:**
- Venda não apareceu no extrato
- R$ 100 em dinheiro não foram somados ao saldo
- Sistema mostrou -R$ 50, mas físico tinha R$ 100
- Diferença: +R$ 150

---

## 🚀 **PASSO A PASSO - ACESSO AO SUPABASE**

### **1. Acessar o Supabase**
1. Abra seu navegador
2. Acesse: https://supabase.com
3. Faça login na sua conta
4. Selecione o projeto: **CeP Sistema** (ou nome do seu projeto)

### **2. Abrir o Editor SQL**
1. No menu lateral esquerdo, clique em **"SQL Editor"** (ícone </>)
2. Clique em **"New query"** (botão + no canto superior)

---

## 📝 **EXECUTANDO AS QUERIES**

### **FASE 1: INVESTIGAÇÃO (Partes 1-5)**

#### **Passo 1: Copiar o Script**
1. Abra o arquivo: `supabase/diagnostico_caixa_09jan.sql`
2. Copie **SOMENTE as Partes 1 a 5** (linhas 1 até antes da Parte 6)

#### **Passo 2: Executar no SQL Editor**
1. Cole o código no SQL Editor do Supabase
2. Clique em **"Run"** (ou pressione Ctrl+Enter / Cmd+Enter)
3. Aguarde a execução (pode demorar alguns segundos)

#### **Passo 3: Analisar os Resultados**
Os resultados virão em **várias abas/tabelas**. Analise cada uma:

##### **Resultado 1: "VENDA ENCONTRADA"**
- ✅ **Se aparecer:** Anote o `id` da venda
- ❌ **Se estiver vazio:** A venda pode ter valor diferente ou data errada

##### **Resultado 2: "TODAS AS VENDAS CAIXA 1 - 09/01"**
- Procure por vendas próximas a R$ 261
- Identifique a venda correta manualmente

##### **Resultado 3: "DINHEIRO POR VENDA - 09/01"**
- Confirme qual venda tem R$ 100 em dinheiro
- Anote o `id` dessa venda

##### **Resultado 4: "MOVIMENTAÇÕES TIPO VENDA - 09/01"**
- ✅ **Se aparecer movimentação de R$ 100:** Problema pode estar em outro lugar
- ❌ **Se estiver vazio:** Confirmado! O trigger não criou a movimentação

##### **Resultado 5: "STATUS DO TRIGGER"**
- ✅ **Status: ATIVO:** Trigger existe mas falhou
- ❌ **Status: DESABILITADO ou vazio:** Trigger não está funcionando

##### **Resultado 6: "⚠️ VENDAS COM DINHEIRO SEM MOVIMENTAÇÃO"**
- 🎯 **ESTE É O MAIS IMPORTANTE!**
- Se aparecer a venda aqui com "❌ SEM MOVIMENTAÇÃO", **problema confirmado!**

---

### **FASE 2: CORREÇÃO (Parte 6)**

⚠️ **ATENÇÃO:** Execute SOMENTE se confirmou o problema na Fase 1!

#### **Passo 1: Identificar o ID da Venda**
- Do resultado anterior, copie o `id` da venda com problema
- Exemplo: `550e8400-e29b-41d4-a716-446655440000`

#### **Passo 2: Preparar o Script de Correção**
1. Abra o arquivo `diagnostico_caixa_09jan.sql`
2. Vá até a **Parte 6.2** (linha ~250)
3. Encontre: `'VENDA_ID_AQUI'`
4. Substitua por: `'SEU_ID_DA_VENDA'` (com aspas simples!)

**Exemplo:**
```sql
-- ANTES:
WHERE v.id = 'VENDA_ID_AQUI'

-- DEPOIS:
WHERE v.id = '550e8400-e29b-41d4-a716-446655440000'
```

#### **Passo 3: Fazer Backup**
1. Execute **SOMENTE** a query da **Parte 6.1** (backup)
2. Copie o resultado JSON completo
3. Salve em um arquivo .txt de segurança

#### **Passo 4: Executar a Correção**
1. **Descomente** a query da Parte 6.2:
   - Remova o `/*` no início
   - Remova o `*/` no final
2. Execute a query
3. Verifique a mensagem: **"INSERT 1"** = Sucesso!

#### **Passo 5: Validar a Correção**
1. **Descomente** a query da Parte 6.3
2. Execute
3. Deve aparecer a nova movimentação com "Correção manual"

---

### **FASE 3: AUDITORIA FINAL (Parte 8)**

#### **Passo 1: Recalcular o Saldo**
1. Execute a query **8.1**
2. Compare:
   - `saldo_final_calculado` (o que deveria ser)
   - `saldo_fisico_contado` (o que foi contado)
   - Agora devem estar **próximos ou iguais!**

#### **Passo 2: Verificar se Corrigiu**
```
Antes da correção:
- Saldo inicial: -50 ou 0
- Entradas: 0 (venda não estava)
- Saldo final: -50

Depois da correção:
- Saldo inicial: -50
- Entradas: 100 (venda corrigida!)
- Saldo final: 50 (mais próximo dos 100 físicos)
```

---

## 🔧 **REABILITAR O TRIGGER (Se Necessário)**

Se o trigger estiver desabilitado:

1. Abra uma **nova query** no SQL Editor
2. Cole:
```sql
ALTER TABLE vendas ENABLE TRIGGER trg_venda_dinheiro;
```
3. Execute

Para verificar se funcionou:
```sql
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'trg_venda_dinheiro';
```
- Resultado esperado: `tgenabled = 'O'` (ativo)

---

## 📊 **INTERPRETANDO OS RESULTADOS**

### **Cenário 1: Trigger não disparou**
**Sintomas:**
- Venda existe ✅
- Movimentação não existe ❌
- Trigger está ativo ✅

**Causa:** Bug pontual no trigger (race condition, erro silencioso)

**Solução:** Inserir movimentação manualmente (Parte 6.2)

---

### **Cenário 2: Trigger desabilitado**
**Sintomas:**
- Venda existe ✅
- Movimentação não existe ❌
- Trigger **não** está ativo ❌

**Causa:** Trigger foi desabilitado (acidentalmente ou por erro)

**Solução:** 
1. Reabilitar trigger (comandos acima)
2. Inserir movimentação manualmente (Parte 6.2)

---

### **Cenário 3: Venda não existe**
**Sintomas:**
- Venda **não** existe ❌

**Causa:** Venda não foi registrada corretamente

**Solução:** Investigar logs do sistema, pode ter havido erro ao salvar

---

## ⚠️ **AVISOS IMPORTANTES**

### **Antes de Executar a Correção:**
1. ✅ Confirme que tem o ID correto da venda
2. ✅ Faça backup (Parte 6.1)
3. ✅ Verifique que a movimentação realmente não existe
4. ✅ Execute em horário de baixo movimento (recomendado)

### **Não Execute se:**
- ❌ Não tiver certeza do problema
- ❌ A movimentação já existir
- ❌ Não tiver feito backup
- ❌ Não souber reverter (guarde o backup!)

---

## 🔄 **COMO REVERTER (Se Necessário)**

Se algo der errado, você pode deletar a movimentação criada:

```sql
-- Use o ID da movimentação criada (da verificação 6.3)
DELETE FROM movimentacoes_caixa 
WHERE id = 'ID_DA_MOVIMENTACAO_CRIADA';
```

---

## 📞 **DÚVIDAS COMUNS**

### **Q: Posso executar tudo de uma vez?**
**R:** NÃO! Execute em fases:
1. Investigação (Partes 1-5)
2. Correção (Parte 6) - SOMENTE se confirmado
3. Auditoria (Parte 8)

### **Q: Como sei se funcionou?**
**R:** Execute a Parte 8.1 - o saldo deve estar correto

### **Q: E se o problema for em outro dia?**
**R:** Substitua todas as ocorrências de `'2026-01-09'` pela data correta

### **Q: Posso executar várias vezes?**
**R:** A investigação (Partes 1-5) SIM. A correção (Parte 6) NÃO - execute apenas uma vez!

---

## ✅ **CHECKLIST FINAL**

Após executar tudo, verifique:

- [ ] Venda aparece na tabela `vendas`
- [ ] Movimentação existe em `movimentacoes_caixa`
- [ ] Trigger está ativo
- [ ] Saldo recalculado está correto
- [ ] Extrato mostra a entrada de R$ 100
- [ ] Não há outras vendas com o mesmo problema

---

## 🛡️ **PREVENÇÃO FUTURA**

Execute esta query **DIARIAMENTE** para detectar problemas:

```sql
-- Salve como "Auditoria Diária"
SELECT 
  v.id,
  v.caixa_origem,
  v.valor_total_venda,
  v.created_at,
  COALESCE(
    CASE WHEN LOWER(TRIM(v.metodo_pagto_1)) = 'dinheiro' THEN v.valor_pagto_1 ELSE 0 END +
    CASE WHEN LOWER(TRIM(v.metodo_pagto_2)) = 'dinheiro' THEN v.valor_pagto_2 ELSE 0 END +
    CASE WHEN LOWER(TRIM(v.metodo_pagto_3)) = 'dinheiro' THEN v.valor_pagto_3 ELSE 0 END,
    0
  ) as total_dinheiro
FROM vendas v
LEFT JOIN movimentacoes_caixa mc ON (
  mc.tipo = 'venda' 
  AND mc.motivo LIKE '%' || v.id || '%'
)
WHERE v.created_at >= CURRENT_DATE - INTERVAL '1 day'
  AND COALESCE(
    CASE WHEN LOWER(TRIM(v.metodo_pagto_1)) = 'dinheiro' THEN v.valor_pagto_1 ELSE 0 END +
    CASE WHEN LOWER(TRIM(v.metodo_pagto_2)) = 'dinheiro' THEN v.valor_pagto_2 ELSE 0 END +
    CASE WHEN LOWER(TRIM(v.metodo_pagto_3)) = 'dinheiro' THEN v.valor_pagto_3 ELSE 0 END,
    0
  ) > 0
  AND mc.id IS NULL;
```

**Se retornar alguma linha:** Há vendas com dinheiro sem movimentação!

---

## 🎯 **RESUMO RÁPIDO**

1. **Investigar:** Execute Partes 1-5 do SQL
2. **Confirmar:** Verifique se venda existe mas movimentação não
3. **Corrigir:** Substitua ID e execute Parte 6.2
4. **Validar:** Execute Parte 8.1 e confirme saldo
5. **Monitorar:** Execute auditoria diária

**Tempo estimado:** 10-15 minutos

---

**Arquivo gerado automaticamente para diagnóstico de inconsistência no Caixa 1 - 09/01/2026**
