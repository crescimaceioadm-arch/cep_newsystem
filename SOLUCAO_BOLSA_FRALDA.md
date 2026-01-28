# Solução: Bolsa/Fralda aparecendo no Dashboard

## Problema
A avaliação do Ricardo com 1 bolsa estava aparecendo em "Só roupas/sapatos" em vez de "Bolsa/Fralda" no dashboard.

## Causa Raiz
A função `fetchData()` no Dashboard.tsx estava carregando apenas os atendimentos da tabela `atendimentos`, mas não estava carregando os itens relacionados da tabela `atendimento_itens`. Isso fazia com que `a.itens` fosse sempre undefined/vazio.

A função `classificarAvaliacao()` estava corretamente procurando por itens com slug "bolsa" ou "fralda", mas não encontrava nada porque os dados não eram carregados.

## Solução Implementada

### 1. Adicionar carregamento de `atendimento_itens` em fetchData()

```typescript
// 2b. Buscar itens de todas as avaliações (para classificação por bolsa/fralda)
const { data: itens } = await supabase
  .from("atendimento_itens")
  .select("*, item_categories(id, slug, nome)");

const itensByAtendimento = new Map<string, any[]>();
(itens || []).forEach((it: any) => {
  const list = itensByAtendimento.get(it.atendimento_id) || [];
  list.push({
    id: it.id,
    categoria_id: it.categoria_id,
    quantidade: it.quantidade,
    valor_total: it.valor_total,
    categoria: it.item_categories,
  });
  itensByAtendimento.set(it.atendimento_id, list);
});

// Mapear atendimentos com seus itens
const mapearComItens = (lista: any[]) =>
  (lista || []).map((a: any) => ({
    ...a,
    itens: itensByAtendimento.get(a.id) || [],
  }));
```

### 2. Usar a função mapearComItens ao settar os atendimentos

Mudança de:
```typescript
setAllAtendimentos([...(atendFinalizados || []), ...(atendRecusados || []), ...(atendOutros || [])]);
setAllAtendimentosMesInteiro(atendFinalizadosMes || []);
```

Para:
```typescript
setAllAtendimentos([...mapearComItens(atendFinalizados), ...mapearComItens(atendRecusados), ...mapearComItens(atendOutros)]);
setAllAtendimentosMesInteiro(mapearComItens(atendFinalizadosMes));
```

## Resultado
Agora quando o Dashboard carrega:
1. ✅ Todos os atendimentos vêm com seus itens associados (`a.itens` é populado)
2. ✅ A função `classificarAvaliacao()` consegue verificar o slug dos itens
3. ✅ Avaliações com bolsa/fralda são corretamente classificadas como "Bolsa/Fralda"
4. ✅ Avaliações com apenas roupas/sapatos continuam em "Só roupas/sapatos"

## Precedência de Classificação
1. Com Itens grandes (qtd_itens_grandes > 0)
2. Com Enxoval (qtd_itens_medios > 0)
3. Com Brinquedos (qtd_brinquedos > 0)
4. Só roupas/sapatos (qtd_baby + qtd_1_a_16 + qtd_calcados > 0)
5. **Bolsa/Fralda** (itens com slug contendo "bolsa" ou "fralda")
6. Com outras categorias (itens dinâmicos de outras categorias)
7. Outros (sem item registrado)

## Verificação
Para verificar que está funcionando:
1. Ir ao Dashboard
2. Localizar a avaliação do Ricardo Bezeira de Melo com bolsa
3. Verificar que agora aparece em "Bolsa/Fralda" em vez de "Só roupas/sapatos"

## Padrão Aplicado
Este padrão segue o mesmo que está implementado em `src/hooks/useAtendimentos.ts` (linhas 6-40):
- Fetches da tabela atendimento_itens com relationship a item_categories
- Mapeia itens por atendimento_id
- Retorna array de atendimentos com propriedade `itens` preenchida

Esta é a abordagem padrão do sistema para carregar relacionamentos no frontend.
