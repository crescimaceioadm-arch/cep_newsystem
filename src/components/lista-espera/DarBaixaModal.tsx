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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useDeleteListaEspera } from "@/hooks/useListaEspera";
import type { ListaEsperaCliente } from "@/types/database";

interface DarBaixaModalProps {
  cliente: ListaEsperaCliente | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DarBaixaModal({ cliente, open, onOpenChange }: DarBaixaModalProps) {
  const deleteMutation = useDeleteListaEspera();
  const [motivoBaixa, setMotivoBaixa] = useState<'atendido' | 'cancelado'>('atendido');

  const handleSubmit = () => {
    if (!cliente) return;

    deleteMutation.mutate(
      {
        id: cliente.id,
        motivoBaixa: motivoBaixa,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setMotivoBaixa('atendido');
        },
      }
    );
  };

  if (!cliente) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dar Baixa na Lista de Espera</DialogTitle>
          <DialogDescription>
            Confirme a baixa do cliente <strong>{cliente.nome_cliente}</strong> da lista de espera.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Motivo da Baixa</Label>
            <RadioGroup
              value={motivoBaixa}
              onValueChange={(value) => setMotivoBaixa(value as 'atendido' | 'cancelado')}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="atendido" id="atendido" />
                <Label htmlFor="atendido" className="cursor-pointer font-normal">
                  Cliente foi atendido (item encontrado e vendido)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cancelado" id="cancelado" />
                <Label htmlFor="cancelado" className="cursor-pointer font-normal">
                  Cliente cancelou/desistiu da espera
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="text-muted-foreground">
              O registro será mantido no histórico para consultas futuras.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Processando..." : "Confirmar Baixa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
