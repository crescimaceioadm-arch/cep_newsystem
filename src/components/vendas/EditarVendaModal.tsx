import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useAtualizarVenda, Venda } from "@/hooks/useVendasHistorico";
import { useColaboradoresByFuncao } from "@/hooks/useColaboradores";
import { useCaixas } from "@/hooks/useCaixas";
import { Pencil } from "lucide-react";

const METODOS_PAGAMENTO = [
  "Dinheiro",
  "PIX",
  "Gira crédito",
  "Débito",
  "Crédito à vista",
  "Crédito 2x",
  "Crédito 3x",
  "Crédito 4x",
  "Crédito 5x",
  "Crédito 6x",
  "Crédito 7x",
  "Crédito 8x",
  "Crédito 9x",
  "Crédito 10x",
];

interface EditarVendaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venda: Venda | null;
}

export function EditarVendaModal({ open, onOpenChange, venda }: EditarVendaModalProps) {
  const { data: vendedoras } = useColaboradoresByFuncao("Vendedora");
  const { data: caixas } = useCaixas();
  const { mutate: atualizarVenda, isPending } = useAtualizarVenda();

  // Estados do formulário
  const [vendedora, setVendedora] = useState("");
  const [cliente, setCliente] = useState("");
  const [metodoPagto, setMetodoPagto] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [caixaOrigem, setCaixaOrigem] = useState("");

  // Preencher campos ao abrir
  useEffect(() => {
    if (venda && open) {
      setVendedora(venda.vendedora_nome || "");
      setCliente(venda.cliente_nome || "");
      setMetodoPagto(venda.metodo_pagto_1 || "");
      setValorTotal(venda.valor_total_venda?.toFixed(2) || "");
      setCaixaOrigem(venda.caixa_origem || "");
    }
  }, [venda, open]);

  const handleSalvar = () => {
    if (!venda) return;

    const valorNum = parseFloat(valorTotal) || 0;

    atualizarVenda(
      {
        id: venda.id,
        dados: {
          vendedora_nome: vendedora || null,
          cliente_nome: cliente || null,
          metodo_pagto_1: metodoPagto || null,
          valor_total_venda: valorNum,
          caixa_origem: caixaOrigem || null,
        },
        vendaOriginal: venda,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Venda
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vendedora */}
          <div className="space-y-2">
            <Label>Vendedora</Label>
            <Select value={vendedora} onValueChange={setVendedora}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {vendedoras?.map((v) => (
                  <SelectItem key={v.id} value={v.nome}>
                    {v.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cliente */}
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Input
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Nome do cliente"
            />
          </div>

          {/* Forma de Pagamento */}
          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select value={metodoPagto} onValueChange={setMetodoPagto}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {METODOS_PAGAMENTO.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor Total */}
          <div className="space-y-2">
            <Label>Valor Total (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
              onBlur={(e) => {
                if (e.target.value) {
                  setValorTotal(parseFloat(e.target.value).toFixed(2));
                }
              }}
              placeholder="0.00"
            />
          </div>

          {/* Caixa de Origem */}
          <div className="space-y-2">
            <Label>Caixa de Origem</Label>
            <Select value={caixaOrigem} onValueChange={setCaixaOrigem}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {caixas?.map((c) => (
                  <SelectItem key={c.id} value={c.nome}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
