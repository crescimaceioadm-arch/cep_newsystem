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
import { useTiposItensGrandes } from "@/hooks/useTiposItensGrandes";
import { useMarcasItensGrandes } from "@/hooks/useMarcasItensGrandes";
import { Plus, Trash2 } from "lucide-react";

export interface ItemGrandeFormData {
  tipo_id: string;
  marca_id: string;
  descricao: string;
  valor_compra: number;
}

interface ItemGrandeInputProps {
  itens: ItemGrandeFormData[];
  onChange: (itens: ItemGrandeFormData[]) => void;
}

export function ItemGrandeInput({ itens, onChange }: ItemGrandeInputProps) {
  const { data: tipos } = useTiposItensGrandes();
  const { data: marcas } = useMarcasItensGrandes();

  const tiposAtivos = (tipos || []).filter(t => t.ativo);
  const marcasAtivas = (marcas || []).filter(m => m.ativo);

  const adicionarItem = () => {
    onChange([
      ...itens,
      {
        tipo_id: "",
        marca_id: "",
        descricao: "",
        valor_compra: 0,
      },
    ]);
  };

  const removerItem = (index: number) => {
    onChange(itens.filter((_, i) => i !== index));
  };

  const atualizarItem = (index: number, campo: keyof ItemGrandeFormData, valor: any) => {
    const novosItens = [...itens];
    novosItens[index] = { ...novosItens[index], [campo]: valor };
    onChange(novosItens);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-lg font-semibold">Itens Grandes Individuais</Label>
        <Button type="button" onClick={adicionarItem} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Item
        </Button>
      </div>

      {itens.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum item adicionado. Clique em "Adicionar Item" para começar.
        </p>
      )}

      {itens.map((item, index) => (
        <div key={index} className="rounded-md border p-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-end">
            <div className="space-y-1.5 lg:col-span-3">
              <Label className="text-xs">Tipo</Label>
              <Select
                value={item.tipo_id}
                onValueChange={(value) => atualizarItem(index, "tipo_id", value)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposAtivos.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 lg:col-span-3">
              <Label className="text-xs">Marca</Label>
              <Select
                value={item.marca_id}
                onValueChange={(value) => atualizarItem(index, "marca_id", value)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione a marca" />
                </SelectTrigger>
                <SelectContent>
                  {marcasAtivas.map((marca) => (
                    <SelectItem key={marca.id} value={marca.id}>
                      {marca.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 lg:col-span-4">
              <Label className="text-xs">Modelo/Descrição</Label>
              <Input
                placeholder="Ex: modelo, cor, estado..."
                value={item.descricao}
                onChange={(e) => atualizarItem(index, "descricao", e.target.value)}
                className="h-10"
              />
            </div>

            <div className="space-y-1.5 lg:col-span-2">
              <Label className="text-xs">Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={item.valor_compra || ""}
                onChange={(e) => atualizarItem(index, "valor_compra", parseFloat(e.target.value) || 0)}
                className="h-10"
              />
            </div>
          </div>

          <div className="flex justify-end mt-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removerItem(index)}
              className="h-8 w-8 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
