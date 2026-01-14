import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  useFechamentosPendentes,
  useAprovarFechamento,
  useRejeitarFechamento,
} from "@/hooks/useCaixas";
import { AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function AprovacaoFechamentosCard() {
  const { data: fechamentos, isLoading } = useFechamentosPendentes();
  const aprovarMutation = useAprovarFechamento();
  const rejeitarMutation = useRejeitarFechamento();

  const [dialogRejeitar, setDialogRejeitar] = useState(false);
  const [fechamentoSelecionado, setFechamentoSelecionado] = useState<any>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");

  const handleAprovar = (fechamentoId: string) => {
    aprovarMutation.mutate(fechamentoId);
  };

  const handleAbrirRejeitar = (fechamento: any) => {
    setFechamentoSelecionado(fechamento);
    setMotivoRejeicao("");
    setDialogRejeitar(true);
  };

  const handleConfirmarRejeitar = () => {
    if (!fechamentoSelecionado || !motivoRejeicao.trim()) return;

    rejeitarMutation.mutate(
      {
        fechamentoId: fechamentoSelecionado.id,
        motivo: motivoRejeicao.trim(),
      },
      {
        onSuccess: () => {
          setDialogRejeitar(false);
          setFechamentoSelecionado(null);
          setMotivoRejeicao("");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Fechamentos Pendentes de Aprovação
          </CardTitle>
          <CardDescription>Aguardando autorização do administrador</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!fechamentos || fechamentos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Fechamentos Pendentes de Aprovação
          </CardTitle>
          <CardDescription>Aguardando autorização do administrador</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <p className="text-sm font-medium">Nenhum fechamento pendente! ✨</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Fechamentos Pendentes de Aprovação
            <Badge variant="destructive" className="ml-2">
              {fechamentos.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Estes fechamentos possuem divergências e precisam de sua autorização
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fechamentos.map((fechamento: any) => {
              const diferenca = fechamento.diferenca || 0;
              const tipo = diferenca > 0 ? "sobra" : "falta";
              const corDiferenca = diferenca > 0 ? "text-blue-600" : "text-red-600";

              return (
                <div
                  key={fechamento.id}
                  className="p-4 border rounded-lg bg-gradient-to-r from-orange-50 to-amber-50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-lg">
                          {fechamento.caixa?.[0]?.nome || "Caixa"}
                        </h4>
                        <Badge variant="outline" className="bg-white">
                          {format(new Date(fechamento.data_fechamento), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </Badge>
                      </div>
                    </div>

                    <Badge variant={tipo === "sobra" ? "default" : "destructive"}>
                      {tipo === "sobra" ? "Sobra" : "Falta"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3 bg-white rounded border">
                      <p className="text-xs text-muted-foreground mb-1">Valor Sistema</p>
                      <p className="text-lg font-bold">
                        R$ {(fechamento.valor_sistema || 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded border">
                      <p className="text-xs text-muted-foreground mb-1">Valor Físico</p>
                      <p className="text-lg font-bold">
                        R$ {(fechamento.valor_contado || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded border mb-3">
                    <p className="text-xs text-muted-foreground mb-1">Diferença</p>
                    <p className={`text-xl font-bold ${corDiferenca}`}>
                      {diferenca > 0 ? "+" : ""}R$ {Math.abs(diferenca).toFixed(2)}
                    </p>
                  </div>

                  {fechamento.justificativa && (
                    <div className="p-3 bg-amber-50 rounded border border-amber-200 mb-3">
                      <p className="text-xs text-amber-900 font-medium mb-1">Justificativa:</p>
                      <p className="text-sm text-amber-800">{fechamento.justificativa}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAprovar(fechamento.id)}
                      disabled={aprovarMutation.isPending}
                      className="flex-1"
                      variant="default"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button
                      onClick={() => handleAbrirRejeitar(fechamento)}
                      disabled={rejeitarMutation.isPending}
                      className="flex-1"
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dialog para rejeitar */}
      <Dialog open={dialogRejeitar} onOpenChange={setDialogRejeitar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Fechamento</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O operador precisará refazer o fechamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo da Rejeição *</Label>
            <Textarea
              id="motivo"
              placeholder="Ex: Valores não conferem, necessário recontagem..."
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogRejeitar(false)}
              disabled={rejeitarMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmarRejeitar}
              disabled={!motivoRejeicao.trim() || rejeitarMutation.isPending}
            >
              {rejeitarMutation.isPending ? "Rejeitando..." : "Confirmar Rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
