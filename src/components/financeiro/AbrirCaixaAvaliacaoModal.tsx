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
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY_AVALIACAO = "caixa_avaliacao_aberto";

interface AbrirCaixaAvaliacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saldoSistema: number;
  isLoading: boolean;
  onSuccess: () => void;
}

export function AbrirCaixaAvaliacaoModal({
  open,
  onOpenChange,
  saldoSistema,
  isLoading,
  onSuccess,
}: AbrirCaixaAvaliacaoModalProps) {
  const [valorInformado, setValorInformado] = useState("");
  const [validando, setValidando] = useState(false);

  const sanitizeMoney = (value: string) => 
    value.replace(/[^0-9.,-]/g, "").replace(",", ".");

  const roundToCents = (value: string) => {
    const num = Number.parseFloat(sanitizeMoney(value));
    if (Number.isNaN(num)) return "";
    const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
    return rounded.toFixed(2);
  };

  const handleValidar = () => {
    setValidando(true);
    
    const valorNormalizado = roundToCents(valorInformado);
    const valorNumber = valorNormalizado ? parseFloat(valorNormalizado) : NaN;

    if (!Number.isFinite(valorNumber)) {
      toast.error("Informe um valor válido");
      setValidando(false);
      return;
    }

    // Comparar com o saldo do sistema (com tolerância de 0.01 por arredondamento)
    const diferenca = Math.abs(valorNumber - saldoSistema);
    
    if (diferenca < 0.01) {
      // Valores iguais - pode abrir o caixa
      localStorage.setItem(STORAGE_KEY_AVALIACAO, "1");
      toast.success("Caixa de Avaliação aberto com sucesso!");
      onSuccess();
      onOpenChange(false);
      setValorInformado("");
    } else {
      // Valores diferentes - não pode abrir
      toast.error(
        `Divergência detectada! Valor informado: R$ ${valorNumber.toFixed(2)} | Valor do sistema: R$ ${saldoSistema.toFixed(2)}`,
        { duration: 6000 }
      );
    }
    
    setValidando(false);
  };

  const handleFechar = () => {
    setValorInformado("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Abrir Caixa de Avaliação</DialogTitle>
          <DialogDescription>
            Informe o valor disponível no caixa para validação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informação do Sistema */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-900">Saldo do Sistema</p>
            </div>
            {isLoading ? (
              <p className="text-sm text-blue-700">Carregando...</p>
            ) : (
              <p className="text-2xl font-bold text-blue-700">
                R$ {saldoSistema.toFixed(2)}
              </p>
            )}
          </div>

          {/* Input de Valor */}
          <div className="space-y-2">
            <Label htmlFor="valor">Valor disponível no caixa</Label>
            <Input
              id="valor"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={valorInformado}
              onChange={(e) => setValorInformado(sanitizeMoney(e.target.value))}
              onBlur={(e) => {
                if (e.target.value) {
                  setValorInformado(roundToCents(e.target.value));
                }
              }}
              disabled={isLoading}
            />
          </div>

          {/* Informativo */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800">
                <p className="font-medium mb-1">⚠️ Importante:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>O valor informado deve corresponder exatamente ao saldo do sistema</li>
                  <li>Se houver divergência, o caixa não será aberto</li>
                  <li>Transações envolvendo Avaliação serão bloqueadas até a correção</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleFechar} disabled={validando}>
            Cancelar
          </Button>
          <Button 
            onClick={handleValidar} 
            disabled={!valorInformado || isLoading || validando}
          >
            {validando ? "Validando..." : "Validar e Abrir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook para verificar se o caixa de avaliação está aberto
export function useCaixaAvaliacaoAberto() {
  const [isAberto, setIsAberto] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(STORAGE_KEY_AVALIACAO) === "1";
    } catch {
      return false;
    }
  });

  const abrirCaixa = () => {
    localStorage.setItem(STORAGE_KEY_AVALIACAO, "1");
    setIsAberto(true);
  };

  const fecharCaixa = () => {
    localStorage.setItem(STORAGE_KEY_AVALIACAO, "0");
    setIsAberto(false);
  };

  return { isAberto, abrirCaixa, fecharCaixa };
}
