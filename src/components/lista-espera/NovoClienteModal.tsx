import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTiposItensGrandes } from "@/hooks/useTiposItensGrandes";
import { useCreateListaEspera } from "@/hooks/useListaEspera";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface NovoClienteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ItemDesejado {
  tipo_id: string;
  descricao: string;
  cor: string;
  ordem: number;
}

export function NovoClienteModal({ open, onOpenChange }: NovoClienteModalProps) {
  const { data: tipos } = useTiposItensGrandes();
  const createMutation = useCreateListaEspera();

  const [nomeCliente, setNomeCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [itensDesejados, setItensDesejados] = useState<ItemDesejado[]>([
    { tipo_id: "", descricao: "", cor: "", ordem: 1 },
  ]);

  const resetForm = () => {
    setNomeCliente("");
    setTelefone("");
    setCpf("");
    setObservacoes("");
    setItensDesejados([{ tipo_id: "", descricao: "", cor: "", ordem: 1 }]);
  };

  const handleAddItem = () => {
    if (itensDesejados.length < 3) {
      setItensDesejados([
        ...itensDesejados,
        { tipo_id: "", descricao: "", cor: "", ordem: itensDesejados.length + 1 },
      ]);
    }
  };

  const handleRemoveItem = (index: number) => {
    const newItens = itensDesejados.filter((_, i) => i !== index);
    // Reajustar ordens
    const reordered = newItens.map((item, i) => ({ ...item, ordem: i + 1 }));
    setItensDesejados(reordered);
  };

  const handleItemChange = (index: number, field: keyof ItemDesejado, value: string) => {
    const newItens = [...itensDesejados];
    newItens[index] = { ...newItens[index], [field]: value };
    setItensDesejados(newItens);
  };

  const handleSubmit = () => {
    // Validações
    if (!nomeCliente.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    if (!telefone.trim()) {
      toast.error("Informe o telefone do cliente");
      return;
    }

    // Filtrar itens que têm tipo_id definido
    const itensValidos = itensDesejados.filter((item) => item.tipo_id);

    if (itensValidos.length === 0) {
      toast.error("Adicione pelo menos 1 item desejado");
      return;
    }

    createMutation.mutate(
      {
        nome_cliente: nomeCliente,
        telefone: telefone,
        cpf: cpf || undefined,
        observacoes: observacoes || undefined,
        itens: itensValidos,
      },
      {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Lista de Espera</DialogTitle>
          <DialogDescription>
            Cadastre um cliente na lista de espera por itens grandes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dados do Cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="nome">Nome do Cliente *</Label>
              <Input
                id="nome"
                placeholder="Nome completo"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="cpf">CPF (opcional)</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Informações adicionais sobre o cliente"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <Separator />

          {/* Itens Desejados */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-lg font-semibold">Itens Desejados</Label>
              {itensDesejados.length < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Item
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {itensDesejados.map((item, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>Item Desejado {index + 1}</span>
                      {itensDesejados.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Tipo *</Label>
                      <Select
                        value={item.tipo_id}
                        onValueChange={(value) =>
                          handleItemChange(index, "tipo_id", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {tipos?.map((tipo) => (
                            <SelectItem key={tipo.id} value={tipo.id}>
                              {tipo.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Descrição</Label>
                      <Input
                        placeholder="Ex: com capota, reclinável, etc."
                        value={item.descricao}
                        onChange={(e) =>
                          handleItemChange(index, "descricao", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <Label>Cor</Label>
                      <Input
                        placeholder="Ex: rosa, azul, bege"
                        value={item.cor}
                        onChange={(e) =>
                          handleItemChange(index, "cor", e.target.value)
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
