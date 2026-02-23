import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useMatchesPendentes, useAceitarMatch, useRecusarMatch } from "@/hooks/useListaEspera";
import { Bell, Check, X, Package } from "lucide-react";
import { useState } from "react";
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

export function MatchesAlert() {
  const { data: matches, isLoading } = useMatchesPendentes();
  const aceitarMatch = useAceitarMatch();
  const recusarMatch = useRecusarMatch();
  
  const [motivoRecusaModal, setMotivoRecusaModal] = useState(false);
  const [matchSelecionado, setMatchSelecionado] = useState<string | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState("");

  if (isLoading || !matches || matches.length === 0) {
    return null;
  }

  const handleAceitar = (matchId: string) => {
    aceitarMatch.mutate(matchId);
  };

  const handleRecusar = (matchId: string) => {
    setMatchSelecionado(matchId);
    setMotivoRecusaModal(true);
  };

  const confirmarRecusa = () => {
    if (matchSelecionado) {
      recusarMatch.mutate(
        { matchId: matchSelecionado, motivo: motivoRecusa },
        {
          onSuccess: () => {
            setMotivoRecusaModal(false);
            setMatchSelecionado(null);
            setMotivoRecusa("");
          },
        }
      );
    }
  };

  return (
    <>
      <Alert className="border-2 border-amber-500 bg-amber-50 dark:bg-amber-950">
        <Bell className="h-5 w-5 text-amber-600 animate-pulse" />
        <AlertTitle className="text-amber-900 dark:text-amber-100 text-lg font-bold flex items-center gap-2">
          🔔 ALERTAS - {matches.length} NOVO{matches.length > 1 ? 'S' : ''} MATCH{matches.length > 1 ? 'ES' : ''} ENCONTRADO{matches.length > 1 ? 'S' : ''}!
          <Badge className="bg-red-500 text-white animate-pulse">
            {matches.length}
          </Badge>
        </AlertTitle>
        <AlertDescription>
          <div className="mt-4 space-y-3">
            {matches.map((match) => (
              <Card key={match.id} className="border-amber-300 bg-white dark:bg-gray-800">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    {/* Cliente e Item Desejado */}
                    <div>
                      <p className="font-bold text-lg text-gray-900 dark:text-gray-100">
                        {match.cliente?.nome_cliente}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <Package className="h-4 w-4" />
                        <span>Deseja:</span>
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-6">
                        {match.item_desejado?.tipo?.nome}
                        {match.item_desejado?.cor && ` - ${match.item_desejado.cor}`}
                        {match.item_desejado?.descricao && (
                          <span className="block text-xs text-gray-500">
                            {match.item_desejado.descricao}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Item que Chegou */}
                    <div>
                      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
                        <Check className="h-4 w-4" />
                        <span>Chegou:</span>
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-6">
                        {match.item_estoque?.tipo?.nome}
                        {match.item_estoque?.marca?.nome && ` - ${match.item_estoque.marca.nome}`}
                      </p>
                      <p className="text-xs text-gray-500 ml-6">
                        {match.item_estoque?.descricao}
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-white"
                        onClick={() => handleAceitar(match.id)}
                        disabled={aceitarMatch.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Serve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRecusar(match.id)}
                        disabled={recusarMatch.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Não Serve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </AlertDescription>
      </Alert>

      {/* Modal de Motivo de Recusa */}
      <Dialog open={motivoRecusaModal} onOpenChange={setMotivoRecusaModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da Recusa</DialogTitle>
            <DialogDescription>
              Por que este item não serve ao cliente? (opcional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="motivo">Motivo</Label>
              <Textarea
                id="motivo"
                placeholder="Ex: Cor diferente, modelo não compatível, etc."
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMotivoRecusaModal(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarRecusa} disabled={recusarMatch.isPending}>
              Confirmar Recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
