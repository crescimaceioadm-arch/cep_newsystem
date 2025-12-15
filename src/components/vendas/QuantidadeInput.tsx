import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

interface QuantidadeInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  estoqueAtual?: number;
}

export function QuantidadeInput({ label, value, onChange, estoqueAtual }: QuantidadeInputProps) {
  const increment = () => onChange(value + 1);
  const decrement = () => onChange(Math.max(0, value - 1));

  const estoqueInsuficiente = estoqueAtual !== undefined && value > estoqueAtual;

  return (
    <div className={`p-4 rounded-lg border ${estoqueInsuficiente ? 'border-destructive bg-destructive/5' : 'border-border bg-card'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm">{label}</span>
        {estoqueAtual !== undefined && (
          <span className={`text-xs ${estoqueInsuficiente ? 'text-destructive' : 'text-muted-foreground'}`}>
            Estoque: {estoqueAtual}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={decrement}
          disabled={value === 0}
          className="h-12 w-12"
        >
          <Minus className="h-5 w-5" />
        </Button>
        <span className="text-3xl font-bold min-w-[60px] text-center">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={increment}
          className="h-12 w-12"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
