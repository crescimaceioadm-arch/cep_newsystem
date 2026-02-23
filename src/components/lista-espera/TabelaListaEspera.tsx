import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Ban } from "lucide-react";
import type { ListaEsperaCliente } from "@/types/database";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TabelaListaEsperaProps {
  clientes: ListaEsperaCliente[];
  onVisualizar: (cliente: ListaEsperaCliente) => void;
  onEditar: (cliente: ListaEsperaCliente) => void;
  onBaixa: (cliente: ListaEsperaCliente) => void;
}

export function TabelaListaEspera({
  clientes,
  onVisualizar,
  onEditar,
  onBaixa,
}: TabelaListaEsperaProps) {
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

  const formatItensDesejados = (cliente: ListaEsperaCliente) => {
    if (!cliente.itens || cliente.itens.length === 0) {
      return "Nenhum item";
    }

    return cliente.itens
      .map((item) => {
        let texto = item.tipo?.nome || "Item";
        if (item.cor) texto += ` ${item.cor}`;
        return texto;
      })
      .join(", ");
  };

  if (clientes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum cliente na lista de espera
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Itens Desejados</TableHead>
            <TableHead className="text-center">Matches</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Cadastro</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.map((cliente) => (
            <TableRow key={cliente.id}>
              <TableCell className="font-medium">{cliente.nome_cliente}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {cliente.telefone}
              </TableCell>
              <TableCell className="max-w-xs truncate text-sm">
                {formatItensDesejados(cliente)}
              </TableCell>
              <TableCell className="text-center">
                {cliente.matches_pendentes && cliente.matches_pendentes > 0 ? (
                  <Badge className="bg-red-500 text-white animate-pulse">
                    {cliente.matches_pendentes}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell>{getStatusBadge(cliente.status)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(cliente.created_at), "dd/MM/yyyy", {
                  locale: ptBR,
                })}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onVisualizar(cliente)}
                    title="Visualizar"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditar(cliente)}
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onBaixa(cliente)}
                    title="Dar Baixa"
                  >
                    <Ban className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
