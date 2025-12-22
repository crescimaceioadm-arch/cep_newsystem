import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";

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

const BANDEIRAS_CARTAO = ["Visa", "Master", "Hipercard", "Elo", "Amex"];

const precisaBandeira = (metodo: string) => {
  return metodo.includes("Crédito") || metodo.includes("Débito");
};

export interface Pagamento {
  metodo: string;
  valor: string; // Armazenar como string para evitar arredondamentos
  bandeira?: string;
}

interface PagamentoInputProps {
  pagamentos: Pagamento[];
  onChange: (pagamentos: Pagamento[]) => void;
}

export function PagamentoInput({ pagamentos, onChange }: PagamentoInputProps) {
  // Normaliza entrada monetária e evita ruído de ponto flutuante
  const sanitizeMoney = (value: string) => value.replace(/[^0-9.,-]/g, "").replace(",", ".");
  const roundToCents = (value: string) => {
    const num = Number.parseFloat(sanitizeMoney(value));
    if (Number.isNaN(num)) return "";
    const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
    return rounded.toFixed(2);
  };

  const adicionarPagamento = () => {
    if (pagamentos.length < 3) {
      onChange([...pagamentos, { metodo: "PIX", valor: "", bandeira: undefined }]);
    }
  };

  const removerPagamento = (index: number) => {
    onChange(pagamentos.filter((_, i) => i !== index));
  };

  const atualizarPagamento = (index: number, campo: keyof Pagamento, valor: string) => {
    const novos = [...pagamentos];
    if (campo === "valor") {
      novos[index].valor = valor;
    } else if (campo === "bandeira") {
      novos[index].bandeira = valor;
    } else {
      novos[index].metodo = valor;
      if (!precisaBandeira(valor)) {
        novos[index].bandeira = undefined;
      }
    }
    onChange(novos);
  };

  const handleBlurValor = (index: number, valorStr: string) => {
    if (!valorStr) return;
    const rounded = roundToCents(valorStr);
    atualizarPagamento(index, "valor", rounded);
  };

  const totalPagamentos = pagamentos.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);

  return (
    <div className="space-y-3">
      {pagamentos.map((pagamento, index) => (
        <div key={index} className="flex flex-wrap gap-2 items-center">
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

          {precisaBandeira(pagamento.metodo) && (
            <Select
              value={pagamento.bandeira || ""}
              onValueChange={(v) => atualizarPagamento(index, "bandeira", v)}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="Bandeira" />
              </SelectTrigger>
              <SelectContent>
                {BANDEIRAS_CARTAO.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="relative flex-1 min-w-[100px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
            <Input
              type="text"
              inputMode="decimal"
              value={pagamento.valor}
              onChange={(e) => atualizarPagamento(index, "valor", sanitizeMoney(e.target.value))}
              onBlur={(e) => handleBlurValor(index, e.target.value)}
              className="pl-10"
              placeholder="0.00"
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
