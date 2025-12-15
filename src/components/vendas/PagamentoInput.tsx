import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";

const METODOS_PAGAMENTO = [
  "Dinheiro",
  "PIX",
  "Cartão de Débito",
  "Cartão de Crédito",
  "Transferência (TED/DOC)",
];

interface Pagamento {
  metodo: string;
  valor: number;
}

interface PagamentoInputProps {
  pagamentos: Pagamento[];
  onChange: (pagamentos: Pagamento[]) => void;
}

export function PagamentoInput({ pagamentos, onChange }: PagamentoInputProps) {
  const adicionarPagamento = () => {
    if (pagamentos.length < 3) {
      onChange([...pagamentos, { metodo: "Pix", valor: 0 }]);
    }
  };

  const removerPagamento = (index: number) => {
    onChange(pagamentos.filter((_, i) => i !== index));
  };

  const atualizarPagamento = (index: number, campo: keyof Pagamento, valor: string | number) => {
    const novos = [...pagamentos];
    if (campo === "valor") {
      novos[index].valor = typeof valor === 'string' ? parseFloat(valor) || 0 : valor;
    } else {
      novos[index].metodo = valor as string;
    }
    onChange(novos);
  };

  const totalPagamentos = pagamentos.reduce((sum, p) => sum + p.valor, 0);

  return (
    <div className="space-y-3">
      {pagamentos.map((pagamento, index) => (
        <div key={index} className="flex gap-2 items-center">
          <Select
            value={pagamento.metodo}
            onValueChange={(v) => atualizarPagamento(index, "metodo", v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METODOS_PAGAMENTO.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={pagamento.valor || ""}
              onChange={(e) => atualizarPagamento(index, "valor", e.target.value)}
              className="pl-10"
              placeholder="0,00"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removerPagamento(index)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {pagamentos.length < 3 && (
        <Button
          type="button"
          variant="outline"
          onClick={adicionarPagamento}
          className="w-full"
        >
          + Adicionar Pagamento
        </Button>
      )}

      {pagamentos.length > 0 && (
        <div className="pt-2 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Pagamentos:</span>
            <span className="font-semibold">R$ {totalPagamentos.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
