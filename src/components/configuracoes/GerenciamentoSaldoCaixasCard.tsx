import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAlterarSaldoAdmin } from "@/hooks/useCaixas";
import { useCaixas } from "@/hooks/useCaixas";
import { Wallet, Save } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function GerenciamentoSaldoCaixasCard() {
  const { data: caixas, isLoading } = useCaixas();
  const alterarSaldo = useAlterarSaldoAdmin();
  
  const [caixaEditando, setCaixaEditando] = useState<any>(null);
  const [novoSaldo, setNovoSaldo] = useState("");
  const [dialogAberto, setDialogAberto] = useState(false);

  const handleAbrirDialog = (caixa: any) => {
    setCaixaEditando(caixa);
    setNovoSaldo(caixa.saldo_atual.toFixed(2));
    setDialogAberto(true);
  };

  const handleConfirmar = () => {
    if (!caixaEditando) return;
    
    const novoValor = parseFloat(novoSaldo);
    
    if (!Number.isFinite(novoValor) || novoValor < 0) {
      toast.error("Informe um valor válido");
      return;
    }

    alterarSaldo.mutate(
      {
        caixaId: caixaEditando.id,
        novoSaldo: novoValor,
        saldoAnterior: caixaEditando.saldo_atual,
      },
      {
        onSuccess: () => {
          setDialogAberto(false);
          setCaixaEditando(null);
          setNovoSaldo("");
        },
      }
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600" />
            Gerenciamento de Saldos de Caixas
          </CardTitle>
          <CardDescription>
            Altere o saldo atual dos caixas. Uma movimentação será registrada automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando caixas...</p>
          ) : !caixas || caixas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum caixa disponível</p>
          ) : (
            <div className="space-y-3">
              {caixas.map((caixa) => (
                <div
                  key={caixa.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">{caixa.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      Saldo atual: <span className="font-mono font-bold">R$ {caixa.saldo_atual.toFixed(2)}</span>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAbrirDialog(caixa)}
                    disabled={alterarSaldo.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-900">
              <strong>ℹ️ Como funciona:</strong>
            </p>
            <ul className="text-xs text-blue-800 mt-2 space-y-1 list-disc list-inside">
              <li>Altere o valor do saldo atual</li>
              <li>Uma movimentação será criada automaticamente</li>
              <li>O motivo será: "Alteração do saldo feita pelo admin"</li>
              <li>O extrato refletirá a mudança</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de edição */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar saldo - {caixaEditando?.nome}</DialogTitle>
            <DialogDescription>
              Informe o novo saldo. Uma movimentação será registrada automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Saldo anterior</Label>
              <Input
                disabled
                value={`R$ ${caixaEditando?.saldo_atual.toFixed(2)}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="novo_saldo">Novo saldo (R$)</Label>
              <Input
                id="novo_saldo"
                type="number"
                step="0.01"
                min="0"
                value={novoSaldo}
                onChange={(e) => setNovoSaldo(e.target.value)}
                placeholder="0.00"
              />
            </div>

            {caixaEditando && novoSaldo && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                <p className="text-xs text-amber-900">
                  <strong>Diferença:</strong> R${" "}
                  {(parseFloat(novoSaldo) - caixaEditando.saldo_atual).toFixed(2)}
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Uma movimentação de{" "}
                  {parseFloat(novoSaldo) > caixaEditando.saldo_atual
                    ? "ENTRADA"
                    : "SAÍDA"}{" "}
                  será registrada com motivo "Alteração do saldo feita pelo admin"
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogAberto(false)}
              disabled={alterarSaldo.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmar}
              disabled={
                !novoSaldo ||
                alterarSaldo.isPending ||
                parseFloat(novoSaldo) < 0
              }
            >
              {alterarSaldo.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
