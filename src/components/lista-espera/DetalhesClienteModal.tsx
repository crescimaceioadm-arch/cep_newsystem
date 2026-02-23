import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ListaEsperaCliente } from "@/types/database";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMatchesPorCliente } from "@/hooks/useListaEspera";
import { Package, Phone, CreditCard, Calendar, Check, X } from "lucide-react";

interface DetalhesClienteModalProps {
  cliente: ListaEsperaCliente | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DetalhesClienteModal({
  cliente,
  open,
  onOpenChange,
}: DetalhesClienteModalProps) {
  const { data: matches } = useMatchesPorCliente(cliente?.id || null);

  if (!cliente) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aguardando":
        return <Badge className="bg-blue-500">Aguardando</Badge>;
      case "notificado":
        return <Badge className="bg-green-500">Notificado</Badge>;
      case "atendido":
        return <Badge className="bg-gray-500">Atendido</Badge>;
      case "cancelado":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMatchStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      case "aceito":
        return <Badge className="bg-green-500">Aceito</Badge>;
      case "recusado":
        return <Badge variant="destructive">Recusado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Cliente</span>
            {getStatusBadge(cliente.status)}
          </DialogTitle>
          <DialogDescription>
            Informações completas do cadastro na lista de espera
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dados do Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{cliente.nome_cliente}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Telefone
                  </p>
                  <p className="font-medium">{cliente.telefone}</p>
                </div>
                {cliente.cpf && (
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <CreditCard className="h-3 w-3" /> CPF
                    </p>
                    <p className="font-medium">{cliente.cpf}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Cadastro
                  </p>
                  <p className="font-medium">
                    {format(new Date(cliente.created_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
              {cliente.observacoes && (
                <div>
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="text-sm">{cliente.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Itens Desejados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Itens Desejados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cliente.itens && cliente.itens.length > 0 ? (
                <div className="space-y-3">
                  {cliente.itens
                    .sort((a, b) => a.ordem - b.ordem)
                    .map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 border rounded-lg"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.tipo?.nome || "Item"}</p>
                          {item.cor && (
                            <p className="text-sm text-muted-foreground">
                              Cor: {item.cor}
                            </p>
                          )}
                          {item.descricao && (
                            <p className="text-sm text-muted-foreground">
                              {item.descricao}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={
                            item.status === "match_encontrado"
                              ? "default"
                              : "outline"
                          }
                        >
                          {item.status === "aguardando" && "Aguardando"}
                          {item.status === "match_encontrado" && "Match!"}
                          {item.status === "recusado_pelo_usuario" && "Recusado"}
                        </Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum item cadastrado
                </p>
              )}
            </CardContent>
          </Card>

          {/* Histórico de Matches */}
          {matches && matches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico de Matches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-start gap-3 p-3 border rounded-lg"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {match.status === "aceito" ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : match.status === "recusado" ? (
                          <X className="h-5 w-5 text-red-500" />
                        ) : (
                          <Package className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">
                            {match.item_estoque?.tipo?.nome}
                            {match.item_estoque?.marca?.nome &&
                              ` - ${match.item_estoque.marca.nome}`}
                          </p>
                          {getMatchStatusBadge(match.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {match.item_estoque?.descricao}
                        </p>
                        {match.motivo_recusa && (
                          <p className="text-sm text-red-600 mt-1">
                            Motivo: {match.motivo_recusa}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(
                            new Date(match.created_at),
                            "dd/MM/yyyy 'às' HH:mm",
                            { locale: ptBR }
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
