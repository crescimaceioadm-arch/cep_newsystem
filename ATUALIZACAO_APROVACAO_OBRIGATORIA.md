# 🔒 ATUALIZAÇÃO: Aprovação Obrigatória para Saldo

## 📅 Data: 14 de Janeiro de 2026

---

## ✅ O Que Foi Alterado

### **ANTES (Comportamento Original)**
```
1. Caixa fecha com divergência
2. Valor físico é registrado imediatamente
3. Próximo dia usa esse valor como saldo inicial
4. Admin aprova/rejeita depois (apenas para auditoria)
```

### **AGORA (Novo Comportamento)**
```
1. Caixa fecha com divergência
2. Status: "pendente_aprovacao" 🔒
3. Próximo dia IGNORA este fechamento
4. Usa o último fechamento APROVADO como saldo inicial
5. Admin aprova → Valor passa a valer ✅
6. Admin rejeita → Operador deve refazer ❌
```

---

## 🔄 Fluxo Completo

### **Cenário 1: Caixa Batendo Perfeitamente**
```
Dia 13/01:
- Fechamento: R$ 100,00 (sistema) = R$ 100,00 (físico)
- Status: "aprovado" (automático)
- Sem justificativa necessária

Dia 14/01:
- Saldo inicial: R$ 100,00 ✅
- Funciona normalmente
```

### **Cenário 2: Caixa com Divergência (Pendente Aprovação)**
```
Dia 13/01:
- Fechamento: R$ 100,00 (sistema) ≠ R$ 95,00 (físico)
- Status: "pendente_aprovacao" ⏳
- Justificativa: "Faltaram R$ 5,00 - Troco errado"

Dia 14/01 (ANTES da aprovação):
- Sistema IGNORA o fechamento de R$ 95,00
- Busca o último fechamento APROVADO (ex: dia 12/01 = R$ 80,00)
- Saldo inicial: R$ 80,00 (do dia 12/01) 🔒
- Movimentações do dia 13/01 ficam em "limbo" temporário

Admin aprova (mesmo dia 14/01):
- Status muda para "aprovado" ✅
- Próximo acesso atualiza: Saldo inicial passa para R$ 95,00
- Sistema recalcula automaticamente

Dia 15/01:
- Saldo inicial: R$ 95,00 (agora aprovado) ✅
- Funciona normalmente
```

### **Cenário 3: Caixa com Divergência (Rejeitado)**
```
Dia 13/01:
- Fechamento: R$ 100,00 (sistema) ≠ R$ 95,00 (físico)
- Status: "pendente_aprovacao" ⏳

Admin rejeita:
- Status muda para "rejeitado" ❌
- Motivo: "Valores não conferem, recontar"
- Operador precisa REFAZER o fechamento

Operador refaz:
- Novo fechamento: R$ 100,00 = R$ 100,00 (bateu agora)
- Status: "aprovado" (automático, sem divergência)
- OU
- Novo fechamento: R$ 100,00 ≠ R$ 98,00 (nova divergência)
- Status: "pendente_aprovacao" novamente
- Aguarda nova aprovação do admin
```

---

## 🔧 Modificações Técnicas

### **1. Hook `useSaldoInicial` (arquivo: `src/hooks/useCaixas.ts`)**

**Antes:**
```typescript
.from("fechamentos_caixa")
.eq("caixa_id", caixaId)
.eq("data_fechamento", diaAnterior)
// Buscava QUALQUER fechamento
```

**Depois:**
```typescript
.from("fechamentos_caixa")
.eq("caixa_id", caixaId)
.eq("data_fechamento", diaAnterior)
.eq("status", "aprovado") // 🆕 SÓ fechamentos aprovados
```

### **2. Modal de Fechamento (arquivo: `src/components/financeiro/FechamentoCaixaModal.tsx`)**

Adicionado aviso visual:
```
⚠️ Importante: Este fechamento precisará de aprovação do administrador. 
O saldo do próximo dia só será ajustado após a aprovação.
```

---

## 📊 Impactos no Sistema

### ✅ **Vantagens**

1. **Controle Total do Admin**
   - Nenhum valor divergente é aceito sem sua autorização
   - Previne erros de contagem que afetam todo o fluxo

2. **Rastreabilidade**
   - Histórico completo de quem aprovou/rejeitou
   - Data e hora de cada ação

3. **Integridade dos Dados**
   - Saldo inicial sempre confiável
   - Evita "efeito cascata" de erros

### ⚠️ **Pontos de Atenção**

1. **Dependência de Aprovação**
   - Se você não aprovar, o caixa do dia seguinte fica "congelado" no último valor aprovado
   - **Recomendação:** Aprovar/rejeitar no mesmo dia

2. **Período de Transição**
   - Entre o fechamento e a aprovação, relatórios podem mostrar valores "antigos"
   - Isso é temporário até a aprovação

3. **Múltiplos Dias Pendentes**
   - Se vários dias ficarem pendentes, o saldo pode ficar bem defasado
   - **Solução:** Aprovar em ordem cronológica

---

## 🎯 Como Usar

### **Para o Operador de Caixa:**

1. Faça o fechamento normalmente
2. Se houver divergência:
   - ⚠️ Justificativa é **OBRIGATÓRIA**
   - Sistema avisará: "Aguardando aprovação do admin"
3. Continue trabalhando no próximo dia normalmente
4. Aguarde aprovação do admin

### **Para o Admin:**

1. Acesse **Financeiro → Tab "Aprovações"**
2. Veja os fechamentos pendentes
3. Para cada fechamento:
   - Analise: valores, diferença, justificativa
   - **APROVAR:** Clique em "Aprovar" → Valores passam a valer
   - **REJEITAR:** Clique em "Rejeitar" → Preencha motivo → Operador refaz

4. Monitore o **Relatório**:
   - % de dias perfeitos
   - Histórico de divergências

---

## 🧪 Teste Recomendado

1. **Faça um fechamento com divergência**
   - Ex: Sistema R$ 100,00 → Físico R$ 95,00
   - Justificativa: "Teste de aprovação"

2. **Tente abrir o caixa no dia seguinte**
   - Verifique que o saldo inicial NÃO é R$ 95,00
   - Deve ser o último valor aprovado

3. **Aprove o fechamento (como admin)**
   - Tab "Aprovações" → Aprovar

4. **Recarregue e verifique**
   - Saldo deve atualizar para R$ 95,00

---

## 📝 Resumo

| Item | Antes | Agora |
|------|-------|-------|
| Divergência aceita? | ✅ Imediatamente | ⏳ Após aprovação |
| Saldo próximo dia | Usa valor físico | Usa último aprovado |
| Controle admin | Apenas auditoria | **Bloqueante** |
| Justificativa | Opcional | **Obrigatória** |

---

**Última atualização:** 14/01/2026  
**Status:** ✅ Implementado e pronto para uso
