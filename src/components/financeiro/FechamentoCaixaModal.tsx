import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFechamentoCaixa, useResumoVendasHoje, Caixa } from "@/hooks/useCaixas";
import { Banknote, CreditCard, Smartphone } from "lucide-react";

interface FechamentoCaixaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caixa: Caixa | null;
}

export function FechamentoCaixaModal({
  open,
  onOpenChange,
  caixa,
}: FechamentoCaixaModalProps) {
  const [valorContado, setValorContado] = useState("");
  const { data: resumo, isLoading } = useResumoVendasHoje();
  const { mutate: fecharCaixa, isPending } = useFechamentoCaixa();

  const valorSistema = caixa?.saldo_atual || 0;
  const valorContadoNum = parseFloat(valorContado) || 0;
  const diferenca = valorSistema - valorContadoNum;

  const handleConfirmar = () => {
    if (!caixa) return;

    fecharCaixa(
      {
        caixaId: caixa.id,
        valorSistema: valorSistema,
        valorContado: valorContadoNum,
      },
      {
        onSuccess: () => {
          setValorContado("");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fechamento - {caixa?.nome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo do Dia */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Resumo de Vendas Hoje</h4>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
                  <Banknote className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Dinheiro</p>
                    <p className="font-semibold text-green-600">
                      R$ {resumo?.totalDinheiro.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg">
                  <Smartphone className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">PIX</p>
                    <p className="font-semibold text-blue-600">
                      R$ {resumo?.totalPix.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-purple-500/10 rounded-lg">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cartão</p>
                    <p className="font-semibold text-purple-600">
                      R$ {resumo?.totalCartao.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Valor Sistema */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Saldo no Sistema</p>
            <p className="text-2xl font-bold">R$ {valorSistema.toFixed(2)}</p>
          </div>

          {/* Input Valor Contado */}
          <div className="space-y-2">
            <Label htmlFor="valorContado">Valor Físico em Gaveta (Contagem)</Label>
            <Input
              id="valorContado"
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              value={valorContado}
              onChange={(e) => setValorContado(e.target.value)}
            />
          </div>

          {/* Diferença */}
          {valorContado && (
            <div
              className={`p-4 rounded-lg ${
                diferenca === 0
                  ? "bg-green-500/10"
                  : diferenca > 0
                  ? "bg-yellow-500/10"
                  : "bg-red-500/10"
              }`}
            >
              <p className="text-sm text-muted-foreground">Diferença</p>
              <p
                className={`text-2xl font-bold ${
                  diferenca === 0
                    ? "text-green-600"
                    : diferenca > 0
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {diferenca > 0 ? "+" : ""}R$ {diferenca.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {diferenca === 0
                  ? "Caixa batendo!"
                  : diferenca > 0
                  ? "Falta dinheiro na gaveta"
                  : "Sobra dinheiro na gaveta"}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={!valorContado || isPending}
          >
            {isPending ? "Fechando..." : "Confirmar Fechamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
