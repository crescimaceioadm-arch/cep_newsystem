# 🚀 GUIA RÁPIDO: Como Aplicar as Alterações

## ⚡ Passos para Ativar o Sistema

### **PASSO 1: Aplicar Migration no Supabase**

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)
4. Clique em **"New Query"**
5. Copie TODO o conteúdo do arquivo:
   ```
   supabase/migrations/20250114_add_fechamento_approval_fields.sql
   ```
6. Cole no editor
7. Clique em **"Run"** (F5)
8. ✅ Deve aparecer: "Success. No rows returned"

**⚠️ IMPORTANTE:** Se der erro, verifique se a tabela `fechamentos_caixa` existe!

---

### **PASSO 2: Verificar se Funcionou**

Execute esta query no SQL Editor para confirmar:

```sql
-- Verificar se as colunas foram criadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'fechamentos_caixa'
  AND column_name IN ('status', 'requer_revisao', 'aprovado_por', 'data_aprovacao', 'motivo_rejeicao')
ORDER BY column_name;
```

**Deve retornar 5 linhas** ✅

---

### **PASSO 3: Testar no Sistema**

#### **Teste 1: Fechamento com Divergência (Operador de Caixa)**

1. Faça login como **operador de caixa**
2. Vá em **Financeiro**
3. Clique em **"Realizar Fechamento"** em qualquer caixa
4. No campo "Valor Físico", insira um valor **diferente** do valor do sistema
   - Exemplo: Sistema mostra R$ 100,00 → Você digita R$ 95,00
5. Tente clicar em "Confirmar Fechamento" → **DEVE BLOQUEAR** ❌
6. Aparece mensagem em vermelho: *"Justificativa obrigatória quando há diferença"*
7. Preencha o campo **Justificativa** com algo como:
   ```
   Faltaram R$ 5,00 na gaveta. Possível troco errado.
   ```
8. Clique em "Confirmar Fechamento" → **DEVE FUNCIONAR** ✅
9. Aparece toast: *"Fechamento registrado! Aguardando aprovação do admin."*

#### **Teste 2: Aprovação (Admin)**

1. Faça login como **admin**
2. Vá em **Financeiro**
3. Observe que agora tem **4 tabs** (não 2):
   - Transferência
   - Movimentação Manual
   - **Aprovações** ← NOVA!
   - **Relatório** ← NOVA!
4. Clique na tab **"Aprovações"**
5. Deve aparecer o fechamento pendente com:
   - Nome do caixa
   - Data
   - Valor do sistema vs Valor físico
   - Diferença destacada em vermelho/azul
   - Justificativa do operador
6. Clique em **"Aprovar"** → Toast: "Fechamento aprovado com sucesso!" ✅
7. O card desaparece da lista de pendências

#### **Teste 3: Relatório (Admin)**

1. Ainda logado como **admin**
2. Clique na tab **"Relatório"**
3. Deve aparecer:
   - **Card grande no topo** com:
     - % de dias perfeitos (ex: 87.5%)
     - Barra de progresso visual verde
     - Contador de dias perfeitos vs total
   - **Histórico abaixo**:
     - Datas com todos os caixas corretos: apenas ✅ verde
     - Datas com divergência: lista apenas os caixas problemáticos ❌
4. Teste o filtro: mude de "Últimos 30 dias" para "Últimos 7 dias"
5. O relatório deve recarregar instantaneamente ✅

---

### **PASSO 4 (OPCIONAL): Teste de Rejeição**

1. Faça outro fechamento com divergência (como operador)
2. Vá em **Aprovações** (como admin)
3. Clique em **"Rejeitar"**
4. Abre um dialog pedindo **"Motivo da Rejeição"**
5. Tente clicar em "Confirmar" sem preencher → **BLOQUEADO** ❌
6. Preencha algo como:
   ```
   Valores não conferem. Favor recontar o dinheiro.
   ```
7. Clique em "Confirmar Rejeição" → **SUCESSO** ✅
8. Toast: "Fechamento rejeitado com sucesso!"
9. O fechamento some da lista de pendências

**⚠️ NOTA:** O operador precisará **refazer** o fechamento (funcionalidade futura)

---

## 🔍 Troubleshooting

### Problema: "Column 'status' does not exist"

**Solução:** A migration não foi aplicada. Volte ao PASSO 1.

### Problema: Tab "Aprovações" não aparece

**Solução:** Verifique se está logado como **admin**. Apenas admins veem essas tabs.

### Problema: Justificativa não está obrigatória

**Solução:** 
1. Recarregue a página (F5)
2. Verifique se há erros no console do navegador (F12)
3. Confirme que os arquivos foram salvos corretamente

### Problema: % de dias perfeitos mostra "0%"

**Solução:** É normal se não há fechamentos anteriores. Faça alguns fechamentos com valores corretos (sem divergência) para popular os dados.

---

## 📊 Dados de Teste (Opcional)

Se quiser popular o banco com dados de exemplo para testar o relatório:

```sql
-- Inserir fechamentos de exemplo (últimos 7 dias)
INSERT INTO fechamentos_caixa (caixa_id, data_fechamento, valor_sistema, valor_contado, diferenca, status, justificativa)
SELECT 
  c.id,
  CURRENT_DATE - (n || ' days')::interval,
  100.00,
  CASE WHEN n % 3 = 0 THEN 95.00 ELSE 100.00 END, -- Divergência a cada 3 dias
  CASE WHEN n % 3 = 0 THEN 5.00 ELSE 0.00 END,
  CASE WHEN n % 3 = 0 THEN 'pendente_aprovacao' ELSE 'aprovado' END,
  CASE WHEN n % 3 = 0 THEN 'Falta de R$ 5,00 - Troco errado' ELSE NULL END
FROM caixas c
CROSS JOIN generate_series(1, 7) AS n
LIMIT 21; -- 7 dias × 3 caixas

-- Verificar
SELECT COUNT(*) as total_fechamentos FROM fechamentos_caixa;
```

---

## ✅ Checklist Final

Marque conforme for testando:

- [ ] Migration aplicada no Supabase
- [ ] Colunas novas confirmadas no banco
- [ ] Fechamento com divergência BLOQUEIA sem justificativa
- [ ] Fechamento com divergência FUNCIONA com justificativa
- [ ] Toast aparece: "Aguardando aprovação do admin"
- [ ] Tab "Aprovações" aparece para admin
- [ ] Tab "Relatório" aparece para admin
- [ ] Aprovação funciona e remove da lista
- [ ] Rejeição funciona e exige motivo
- [ ] % de dias perfeitos calcula corretamente
- [ ] Histórico mostra apenas caixas problemáticos

---

## 🎉 Pronto!

Se todos os itens acima foram testados e funcionaram, o sistema está **100% operacional**!

**Dúvidas?** Consulte o arquivo `IMPLEMENTACAO_SISTEMA_APROVACAO_FECHAMENTOS.md` para detalhes técnicos.

---

**Última atualização:** 14/01/2026
