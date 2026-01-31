import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useItensGrandesDisponiveis } from "@/hooks/useItensGrandesIndividuais";
import { Search, X } from "lucide-react";

export interface ItemGrandeSelecionado {
  item_id: string;
  valor_venda: number;
}

interface SeletorItemGrandeProps {
  itensSelecionados: ItemGrandeSelecionado[];
  onChange: (itens: ItemGrandeSelecionado[]) => void;
}

export function SeletorItemGrande({ itensSelecionados, onChange }: SeletorItemGrandeProps) {
  const { data: itensDisponiveis } = useItensGrandesDisponiveis();
  const [busca, setBusca] = useState("");

  const adicionarCampo = () => {
    onChange([...itensSelecionados, { item_id: "", valor_venda: 0 }]);
  };

  const removerCampo = (index: number) => {
    onChange(itensSelecionados.filter((_, i) => i !== index));
  };

  const atualizarItem = (index: number, campo: "item_id" | "valor_venda", valor: any) => {
    const novosItens = [...itensSelecionados];
    novosItens[index] = { ...novosItens[index], [campo]: valor };
    onChange(novosItens);
  };

  const itensJaSelecionados = itensSelecionados.map(i => i.item_id).filter(Boolean);
  
  const itensFiltrados = (itensDisponiveis || []).filter(item => {
    if (itensJaSelecionados.includes(item.id)) return false;
    
    if (!busca) return true;
    
    const termoBusca = busca.toLowerCase();
    const tipo = item.tipo?.nome?.toLowerCase() || "";
    const marca = item.marca?.nome?.toLowerCase() || "";
    const descricao = item.descricao?.toLowerCase() || "";
    
    return tipo.includes(termoBusca) || marca.includes(termoBusca) || descricao.includes(termoBusca);
  });

  const getItemLabel = (itemId: string) => {
    const item = itensDisponiveis?.find(i => i.id === itemId);
    if (!item) return "";
    return `${item.tipo?.nome} ${item.marca?.nome} - ${item.descricao}`;
  };

  const totalVendas = itensSelecionados.reduce((sum, item) => sum + (Number(item.valor_venda) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-lg font-semibold">Itens Grandes</Label>
        <Button type="button" onClick={adicionarCampo} size="sm" variant="outline">
          Adicionar Item Grande
        </Button>
      </div>

      {itensSelecionados.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum item grande selecionado. Clique em "Adicionar Item Grande" para incluir.
        </p>
      )}

      {itensSelecionados.map((itemSel, index) => (
        <Card key={index}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-2">
                <Label>Item {index + 1} *</Label>
                <div className="relative">
                  <Select
                    value={itemSel.item_id}
                    onValueChange={(value) => atualizarItem(index, "item_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o item">
                        {itemSel.item_id ? getItemLabel(itemSel.item_id) : "Selecione o item"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar tipo, marca ou descrição..."
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            className="pl-8"
                          />
                        </div>
                      </div>
                      <SelectItem value="nao-lancado">
                        <span className="text-muted-foreground italic">Item grande não lançado</span>
                      </SelectItem>
                      {itensFiltrados.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Nenhum item disponível
                        </div>
                      ) : (
                        itensFiltrados.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {item.tipo?.nome} {item.marca?.nome}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {item.descricao} - R$ {item.valor_compra.toFixed(2)}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="w-40 space-y-2">
                <Label>Valor Venda (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={itemSel.valor_venda || ""}
                  onChange={(e) => atualizarItem(index, "valor_venda", parseFloat(e.target.value) || 0)}
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removerCampo(index)}
                className="mt-8 text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {itensSelecionados.length > 0 && (
        <div className="p-4 rounded-lg border bg-primary/5 border-primary">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total Itens Grandes:</span>
            <span className="text-xl font-bold">R$ {totalVendas.toFixed(2)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {itensSelecionados.length} {itensSelecionados.length === 1 ? "item" : "itens"} selecionado(s)
          </p>
        </div>
      )}
    </div>
  );
}
