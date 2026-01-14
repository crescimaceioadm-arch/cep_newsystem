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
import { Textarea } from "@/components/ui/textarea";
import { useFechamentoCaixa, useResumoVendasPorCaixa, useSaldoFinalHoje, Caixa } from "@/hooks/useCaixas";
import { useUser } from "@/contexts/UserContext";
import { Banknote, CreditCard, Smartphone, Wallet, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

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
  const { cargo } = useUser();
  const isAdmin = cargo === 'admin';
  const [valorContado, setValorContado] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [dataFechamento, setDataFechamento] = useState("");
  const { data: resumo, isLoading, refetch } = useResumoVendasPorCaixa(caixa?.nome || null);
  const { data: saldoData, refetch: refetchSaldo } = useSaldoFinalHoje(caixa?.id || null);
  const { mutate: fecharCaixa, isPending } = useFechamentoCaixa();

  // Reset ao abrir - também atualiza o saldo do caixa
  useEffect(() => {
    if (open) {
      setValorContado("");
      setJustificativa("");
      const hoje = new Date().toISOString().split("T")[0];
      setDataFechamento(hoje);
      refetch();
      refetchSaldo();
    }
  }, [open, refetch, refetchSaldo]);

  // Usa o valor ao vivo do hook em vez do objeto estático das props
  const valorSistema = saldoData?.saldoFinal ?? caixa?.saldo_atual ?? 0;
  const roundToCents = (value: string) => {
    const num = Number.parseFloat(value.replace(/[^0-9.,-]/g, "").replace(",", "."));
    if (Number.isNaN(num)) return "";
    const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
    return rounded.toFixed(2);
  };
  const valorContadoNum = parseFloat(valorContado) || 0;
  const diferenca = valorContadoNum - valorSistema;
  const temDiferenca = Math.abs(diferenca) >= 0.01;
  const justificativaObrigatoria = temDiferenca && !justificativa.trim();

  const handleConfirmar = () => {
    if (!caixa) return;
    if (justificativaObrigatoria) return;

    // 🔒 NOVA LÓGICA: Se há diferença, status fica pendente de aprovação
    const statusFechamento = temDiferenca ? 'pendente_aprovacao' : 'aprovado';

    fecharCaixa(
      {
        caixaId: caixa.id,
        valorSistema: valorSistema,
        valorContado: valorContadoNum,
        justificativa: justificativa.trim() || null,
        dataFechamento: dataFechamento,
        status: statusFechamento, // 🆕 Novo campo
        detalhesPagamentos: resumo ? {
          dinheiro: resumo.totalDinheiro,
          pix: resumo.totalPix,
          debito: resumo.totalDebito,
          credito: resumo.totalCredito,
          giraCredito: resumo.totalGiraCredito,
        } : undefined,
      },
      {
        onSuccess: () => {
          setValorContado("");
          setJustificativa("");
          setDataFechamento("");
          onOpenChange(false);
          
          // Exibir mensagem apropriada
          if (temDiferenca) {
            toast.success("Fechamento registrado! Aguardando aprovação do admin.", { duration: 4000 });
          }
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Fechamento - {caixa?.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Saldo do Sistema - Destaque */}
          <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dinheiro em Caixa (Sistema)</p>
                <p className="text-3xl font-bold text-primary">R$ {valorSistema.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Valor esperado após vendas, sangrias e suprimentos
                </p>
              </div>
              <Banknote className="h-10 w-10 text-primary/50" />
            </div>
          </div>

          {/* Resumo de Vendas do Dia por Método */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-muted-foreground">Vendas de Hoje ({caixa?.nome})</h4>
              <Button variant="ghost" size="sm" onClick={() => refetch()}>
                <RefreshCcw className="h-3 w-3" />
              </Button>
            </div>
            
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {/* PIX */}
                <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg">
                  <Smartphone className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">PIX</p>
                    <p className="font-semibold text-blue-600">
                      R$ {(resumo?.totalPix || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Débito */}
                <div className="flex items-center gap-2 p-3 bg-orange-500/10 rounded-lg">
                  <CreditCard className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Débito</p>
                    <p className="font-semibold text-orange-600">
                      R$ {(resumo?.totalDebito || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Crédito */}
                <div className="flex items-center gap-2 p-3 bg-purple-500/10 rounded-lg">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Crédito</p>
                    <p className="font-semibold text-purple-600">
                      R$ {(resumo?.totalCredito || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Gira Crédito */}
                <div className="flex items-center gap-2 p-3 bg-teal-500/10 rounded-lg">
                  <RefreshCcw className="h-4 w-4 text-teal-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Gira Crédito</p>
                    <p className="font-semibold text-teal-600">
                      R$ {(resumo?.totalGiraCredito || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Dinheiro (Vendas) */}
                <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg col-span-2">
                  <Banknote className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Dinheiro (Vendas do Dia)</p>
                    <p className="font-semibold text-green-600">
                      R$ {(resumo?.totalDinheiro || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fechamento em Dinheiro - Informativo Compacto */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-amber-900 font-medium">💰 Dinheiro Esperado:</span>
              <span className="font-bold text-amber-700">
                R$ {((saldoData?.saldoInicial || 0) + (resumo?.totalDinheiro || 0)).toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-amber-700 mt-1">
              Inicial R$ {(saldoData?.saldoInicial || 0).toFixed(2)} + Vendas R$ {(resumo?.totalDinheiro || 0).toFixed(2)}
            </p>
          </div>

          {/* Input Data de Fechamento - Apenas para Admin */}
          {isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="dataFechamento" className="text-base font-medium">
                Data do Fechamento *
              </Label>
              <Input
                id="dataFechamento"
                type="date"
                value={dataFechamento}
                onChange={(e) => setDataFechamento(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Data para registrar o fechamento. Permite datas anteriores.
              </p>
            </div>
          )}

          {/* Input Valor Contado */}
          <div className="space-y-2">
            <Label htmlFor="valorContado" className="text-base font-medium">
              Valor Físico em Gaveta (Contagem) *
            </Label>
            <Input
              id="valorContado"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              className="text-lg"
              value={valorContado}
              onChange={(e) => setValorContado(e.target.value.replace(/[^0-9.,-]/g, "").replace(",", "."))}
              onBlur={(e) => {
                if (e.target.value) {
                  setValorContado(roundToCents(e.target.value));
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Conte o dinheiro físico na gaveta e insira o valor aqui
            </p>
          </div>

          {/* Diferença */}
          {valorContado && (
            <div
              className={`p-4 rounded-lg border-2 ${
                !temDiferenca
                  ? "bg-green-500/10 border-green-500/30"
                  : diferenca > 0
                  ? "bg-blue-500/10 border-blue-500/30"
                  : "bg-red-500/10 border-red-500/30"
              }`}
            >
              <p className="text-sm text-muted-foreground">Diferença (Físico - Sistema)</p>
              <p
                className={`text-2xl font-bold ${
                  !temDiferenca
                    ? "text-green-600"
                    : diferenca > 0
                    ? "text-blue-600"
                    : "text-red-600"
                }`}
              >
                {diferenca > 0 ? "+" : ""}R$ {diferenca.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {!temDiferenca
                  ? "✅ Caixa batendo perfeitamente!"
                  : diferenca > 0
                  ? "ℹ️ Sobra de dinheiro na gaveta"
                  : "⚠️ Falta de dinheiro na gaveta"}
              </p>
            </div>
          )}

          {/* Campo Justificativa */}
          <div className="space-y-2">
            <Label htmlFor="justificativa" className="text-base font-medium">
              Justificativa {temDiferenca && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="justificativa"
              placeholder={temDiferenca 
                ? "Obrigatório: explique o motivo da diferença..." 
                : "Opcional: adicione observações sobre o fechamento..."
              }
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              className={justificativaObrigatoria ? "border-destructive" : ""}
              rows={3}
            />
            {justificativaObrigatoria && (
              <p className="text-xs text-destructive">
                ⚠️ Justificativa obrigatória quando há diferença entre valores
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={!valorContado || isPending || justificativaObrigatoria}
          >
            {isPending ? "Fechando..." : "Confirmar Fechamento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
