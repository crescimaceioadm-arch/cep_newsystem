/**
 * Card de Reconciliação de Caixa
 * 
 * Verifica e corrige vendas em dinheiro que não geraram movimentação
 * (útil quando o trigger falha silenciosamente)
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { reconciliarVendasSemMovimentacao } from "@/lib/registrarMovimentacaoCaixa";
import { RefreshCw, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export function ReconciliacaoCaixaCard() {
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState<{
    vendasCorrigidas: number;
    erros: string[];
  } | null>(null);

  const executarReconciliacao = async () => {
    setExecutando(true);
    setResultado(null);

    try {
      // Reconciliar últimos 7 dias
      const dataFim = new Date();
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - 7);

      console.log("[ReconciliacaoCaixa] Iniciando reconciliação...");
      
      const result = await reconciliarVendasSemMovimentacao(
        dataInicio.toISOString(),
        dataFim.toISOString()
      );

      setResultado(result);

      if (result.vendasCorrigidas > 0) {
        toast.success(
          `${result.vendasCorrigidas} venda(s) corrigida(s) com sucesso!`
        );
      } else if (result.erros.length === 0) {
        toast.success("Nenhuma inconsistência encontrada!");
      } else {
        toast.error(`Erros ao reconciliar: ${result.erros.length}`);
      }
    } catch (error) {
      console.error("[ReconciliacaoCaixa] Erro:", error);
      toast.error("Erro ao executar reconciliação");
      setResultado({
        vendasCorrigidas: 0,
        erros: [error instanceof Error ? error.message : String(error)],
      });
    } finally {
      setExecutando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Reconciliação de Caixa
        </CardTitle>
        <CardDescription>
          Verifica vendas em dinheiro sem movimentação nos últimos 7 dias e corrige automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Quando usar:</strong>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              <li>Suspeita de venda em dinheiro não registrada no caixa</li>
              <li>Diferença inexplicável entre sistema e físico</li>
              <li>Rotina de manutenção mensal</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Button
          onClick={executarReconciliacao}
          disabled={executando}
          className="w-full"
          variant="outline"
        >
          {executando ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Verificando vendas...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Executar Reconciliação (Últimos 7 dias)
            </>
          )}
        </Button>

        {resultado && (
          <div className="space-y-3 mt-4">
            {resultado.vendasCorrigidas > 0 && (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  <strong>{resultado.vendasCorrigidas} venda(s) corrigida(s)!</strong>
                  <br />
                  As movimentações foram registradas e os saldos atualizados.
                </AlertDescription>
              </Alert>
            )}

            {resultado.vendasCorrigidas === 0 && resultado.erros.length === 0 && (
              <Alert className="border-blue-500 bg-blue-50">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700">
                  <strong>Tudo certo!</strong>
                  <br />
                  Nenhuma inconsistência encontrada.
                </AlertDescription>
              </Alert>
            )}

            {resultado.erros.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Erros encontrados:</strong>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                    {resultado.erros.slice(0, 5).map((erro, i) => (
                      <li key={i}>{erro}</li>
                    ))}
                    {resultado.erros.length > 5 && (
                      <li>...e mais {resultado.erros.length - 5} erro(s)</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground mt-4 space-y-1">
          <p>
            <strong>Como funciona:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Busca vendas com pagamento em dinheiro</li>
            <li>Verifica se existe movimentação correspondente</li>
            <li>Se não existir, cria automaticamente</li>
            <li>Atualiza o saldo do caixa</li>
            <li>Evita duplicações (seguro executar múltiplas vezes)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
