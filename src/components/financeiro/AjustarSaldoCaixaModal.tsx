import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAjustarSaldoAdmin, useSaldoFinalHoje } from "@/hooks/useCaixas";
import { Wallet, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AjustarSaldoCaixaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caixaId: string;
  caixaNome: string;
  onSuccess?: () => void;
}

export function AjustarSaldoCaixaModal({
  open,
  onOpenChange,
  caixaId,
  caixaNome,
  onSuccess,
}: AjustarSaldoCaixaModalProps) {
  const { data: saldoData } = useSaldoFinalHoje(caixaId);
  const [saldoDesejado, setSaldoDesejado] = useState("");
  const ajustarSaldo = useAjustarSaldoAdmin();

  const saldoAtual = saldoData?.saldoFinal ?? 0;

  // Pré-preencher com o saldo atual quando o modal abre
  useEffect(() => {
    if (open && saldoAtual >= 0) {
      setSaldoDesejado(saldoAtual.toFixed(2));
    }
  }, [open, saldoAtual]);

  const saldoDesejadoNum = parseFloat(saldoDesejado) || 0;
  const diferenca = saldoDesejadoNum - saldoAtual;
  const tipo = diferenca > 0 ? "ENTRADA" : diferenca < 0 ? "SAÍDA" : "NENHUMA";
  const temDiferenca = Math.abs(diferenca) >= 0.01;

  const handleAjustar = () => {
    if (!temDiferenca) {
      toast.info("Saldo já está correto");
      onOpenChange(false);
      return;
    }

    if (!Number.isFinite(saldoDesejadoNum) || saldoDesejadoNum < 0) {
      toast.error("Informe um valor válido (>= 0)");
      return;
    }

    ajustarSaldo.mutate(
      {
        caixaId,
        saldoDesejado: saldoDesejadoNum,
        saldoAtual,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSaldoDesejado(saldoDesejadoNum.toFixed(2));
          onSuccess?.();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600" />
            Ajustar Saldo
          </DialogTitle>
          <DialogDescription>
            Caixa: <span className="font-semibold text-foreground">{caixaNome}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Saldo Atual */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Saldo Atual (Calculado)</Label>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-lg font-bold text-blue-900">
                R$ {saldoAtual.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Saldo Desejado */}
          <div className="space-y-2">
            <Label htmlFor="saldo-desejado" className="text-sm font-medium">
              Novo Saldo
            </Label>
            <Input
              id="saldo-desejado"
              type="number"
              step="0.01"
              min="0"
              value={saldoDesejado}
              onChange={(e) => setSaldoDesejado(e.target.value)}
              placeholder="0.00"
              className="font-mono text-lg"
            />
          </div>

          {/* Diferença Preview */}
          {temDiferenca && (
            <div className={`p-3 rounded-lg border ${
              diferenca > 0
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}>
              <p className="text-sm text-muted-foreground">Movimentação a Ser Criada</p>
              <p className={`text-lg font-bold ${
                diferenca > 0 ? "text-green-700" : "text-red-700"
              }`}>
                {tipo}: R$ {Math.abs(diferenca).toFixed(2)}
              </p>
            </div>
          )}

          {/* Info Box */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Uma movimentação de <strong>{tipo}</strong> será criada com motivo:
              <br />
              <em>"Ajuste manual de saldo feito pelo admin"</em>
              <br />
              <br />
              Isso aparecerá no extrato e será totalmente auditável.
            </AlertDescription>
          </Alert>

          {!temDiferenca && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ℹ️ O saldo desejado é igual ao saldo atual. Nenhuma alteração será feita.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={ajustarSaldo.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAjustar}
            disabled={!temDiferenca || ajustarSaldo.isPending}
            className={
              diferenca > 0
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }
          >
            {ajustarSaldo.isPending ? "Ajustando..." : "Confirmar Ajuste"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
