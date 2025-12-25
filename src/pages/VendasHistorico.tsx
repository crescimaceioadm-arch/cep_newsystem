import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useVendasHistorico, useExcluirVenda, Venda } from "@/hooks/useVendasHistorico";
import { EditarVendaModal } from "@/components/vendas/EditarVendaModal";
import { ExportarVendasCSV } from "@/components/vendas/ExportarVendasCSV";
import { History, Search, CalendarIcon, Pencil, Trash2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";

export default function VendasHistorico() {
  const { isAdmin } = useUser();
  const [filtroCaixa, setFiltroCaixa] = useState("");
  const [filtroData, setFiltroData] = useState<Date | undefined>(undefined);
  const { data: vendas, isLoading, refetch } = useVendasHistorico();
  const { mutate: excluirVenda, isPending: excluindo } = useExcluirVenda();

  // Estado para modais
  const [vendaParaEditar, setVendaParaEditar] = useState<Venda | null>(null);
  const [vendaParaExcluir, setVendaParaExcluir] = useState<Venda | null>(null);

  // Filtrar vendas
  const vendasFiltradas = vendas?.filter((venda) => {
    // Filtro por caixa de origem (exato)
    const matchCaixa =
      !filtroCaixa || venda.caixa_origem === filtroCaixa;

    // Filtro de data
    const matchData =
      !filtroData ||
      venda.data_venda?.startsWith(format(filtroData, "yyyy-MM-dd"));

    return matchCaixa && matchData;
  });

  const handleConfirmarExclusao = () => {
    if (vendaParaExcluir) {
      excluirVenda(vendaParaExcluir.id, {
        onSuccess: () => {
          setVendaParaExcluir(null);
        },
      });
    }
  };

  const getMetodoPagtoResumo = (venda: Venda) => {
    const metodos = [venda.metodo_pagto_1, venda.metodo_pagto_2, venda.metodo_pagto_3].filter(Boolean);
    return metodos.length > 0 ? metodos.join(", ") : "-";
  };

  return (
    <MainLayout title="Histórico de Vendas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Histórico de Vendas</h1>
            <p className="text-muted-foreground">Visualize, edite ou exclua vendas registradas</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && <ExportarVendasCSV />}
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {/* Filtro por caixa */}
              <div className="w-[200px]">
                <Select value={filtroCaixa || "todos"} onValueChange={(value) => setFiltroCaixa(value === "todos" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar caixa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os caixas</SelectItem>
                    <SelectItem value="Caixa 1">Caixa 1</SelectItem>
                    <SelectItem value="Caixa 2">Caixa 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Seletor de Data */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !filtroData && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filtroData ? format(filtroData, "dd/MM/yyyy", { locale: ptBR }) : "Filtrar por data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filtroData}
                    onSelect={setFiltroData}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Limpar filtros */}
              {(filtroCaixa || filtroData) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFiltroCaixa("");
                    setFiltroData(undefined);
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Vendas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Vendas Registradas
              {vendasFiltradas && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({vendasFiltradas.length} {vendasFiltradas.length === 1 ? "venda" : "vendas"})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Carregando vendas...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Vendedora</TableHead>
                    <TableHead>Caixa Origem</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Forma Pagto</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasFiltradas?.map((venda) => (
                    <TableRow key={venda.id}>
                      <TableCell>
                        {venda.data_venda
                          ? format(new Date(venda.data_venda), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "-"}
                      </TableCell>
                      <TableCell>{venda.vendedora_nome || "-"}</TableCell>
                      <TableCell>{venda.caixa_origem || "-"}</TableCell>
                      <TableCell>{venda.cliente_nome || "-"}</TableCell>
                      <TableCell className="text-right font-semibold">
                        R$ {venda.valor_total_venda?.toFixed(2) || "0.00"}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {getMetodoPagtoResumo(venda)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setVendaParaEditar(venda)}
                            title="Editar venda"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setVendaParaExcluir(venda)}
                              title="Excluir venda"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!vendasFiltradas || vendasFiltradas.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhuma venda encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Edição */}
      <EditarVendaModal
        open={!!vendaParaEditar}
        onOpenChange={(open) => !open && setVendaParaEditar(null)}
        venda={vendaParaEditar}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!vendaParaExcluir} onOpenChange={(open) => !open && setVendaParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Tem certeza que deseja excluir esta venda?</p>
              <p className="font-medium">
                Valor: R$ {vendaParaExcluir?.valor_total_venda?.toFixed(2) || "0.00"}
              </p>
              <p className="text-sm text-muted-foreground">
                ⚠️ Isso vai afetar o saldo do caixa. Os triggers SQL ajustarão automaticamente.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExclusao}
              disabled={excluindo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {excluindo ? "Excluindo..." : "Confirmar Exclusão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
