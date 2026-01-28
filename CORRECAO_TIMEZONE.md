# 🕐 Correção de Timezone - Hora Errada no Banco de Dados

## Problema Identificado

O banco de dados está registrando horas em **UTC** (Coordinated Universal Time), mas o sistema no Brasil deveria usar o horário de **Brasília (UTC-3 ou UTC-2 em horário de verão)**.

### Causa

1. **Supabase usa UTC por padrão**: Quando você usa `now()` ou `DEFAULT now()` no SQL, está registrando em UTC
2. **Frontend também usa UTC**: O código JavaScript usa `new Date().toISOString()` que retorna em UTC
3. **Falta de conversão na exibição**: As datas eram exibidas sem converter de UTC para o horário local de Brasília

**Resultado**: Se eram 15:00 em Brasília, o banco registrava 18:00 UTC (3 horas adiantado).

## Solução Implementada

### 1. Função de Conversão Adicionada em `lib/utils.ts`

```typescript
export function convertToLocalTime(isoString?: string | null): Date | null
```

Esta função:
- Recebe um timestamp ISO (UTC)
- Converte para o fuso horário de **Brasília (America/Sao_Paulo)**
- Considera automaticamente o horário de verão
- Retorna um objeto `Date` com a hora correta

### 2. Como Usar

Em qualquer lugar onde exibir uma data/hora do banco:

```typescript
import { format } from "date-fns";
import { convertToLocalTime } from "@/lib/utils";

// Antes (errado):
const horario = format(new Date(venda.created_at), "dd/MM HH:mm");

// Depois (correto):
const horarioLocal = convertToLocalTime(venda.created_at);
if (horarioLocal) {
  const horario = format(horarioLocal, "dd/MM HH:mm");
}
```

## Próximas Etapas

Para aplicar esta correção em todo o sistema:

1. **Dashboard.tsx**: Converter `new Date(venda.created_at)` para `convertToLocalTime(venda.created_at)`
2. **VendasHistorico.tsx**: Converter datas de exibição
3. **HistoricoAtendimentos.tsx**: Converter datas de abertura/fechamento
4. **Financeiro.tsx**: Converter datas de movimentação
5. **Todos os componentes**: Que usem `new Date(timestamp)` para exibição

## Importante ⚠️

- **Não alterar**: A forma como salva no banco (usar `new Date().toISOString()` está correto)
- **Apenas converter**: Ao EXIBIR as datas para o usuário
- **Todos os timestamps**: `created_at`, `updated_at`, `hora_chegada`, `hora_encerramento`, `data_hora`, etc.

## Verificação

Teste abrindo o banco de dados:
- Compare a hora no Supabase (UTC) com a hora no navegador
- Deve haver uma diferença de 3 horas (ou 2 em horário de verão)
- Após aplicar a conversão, as horas devem estar iguais
