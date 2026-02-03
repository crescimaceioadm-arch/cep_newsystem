import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useVendasHistorico, useExcluirVenda, Venda } from "@/hooks/useVendasHistorico";
import { EditarVendaModal } from "@/components/vendas/EditarVendaModal";
import { ExportarVendasCSV } from "@/components/vendas/ExportarVendasCSV";
import { ExportarCartoesCSV } from "@/components/vendas/ExportarCartoesCSV";
import { History, Search, CalendarIcon, Pencil, Trash2, RefreshCw, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, convertToLocalTime } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";

export default function VendasHistorico() {
  const { isAdmin } = useUser();
  const [filtroDataInicio, setFiltroDataInicio] = useState<Date | undefined>(undefined);
  const [filtroDataFim, setFiltroDataFim] = useState<Date | undefined>(undefined);
  const [filtroCaixa, setFiltroCaixa] = useState("");
  const [filtroModoPagto, setFiltroModoPagto] = useState("");
  const { data: vendas, isLoading, refetch } = useVendasHistorico();
  const { mutate: excluirVenda, isPending: excluindo } = useExcluirVenda();

  // Estado para modais
  const [vendaParaEditar, setVendaParaEditar] = useState<Venda | null>(null);
  const [vendaParaExcluir, setVendaParaExcluir] = useState<Venda | null>(null);
  const [mostrarTotaisCartoes, setMostrarTotaisCartoes] = useState(false);


  // Extrair lista dinâmica de caixas
  const caixasDisponiveis = Array.from(new Set(vendas?.map(v => v.caixa_origem).filter(Boolean))).sort();

  // Extrair lista dinâmica de métodos de pagamento
  const metodosDisponiveis = Array.from(
    new Set(
      (vendas || [])
        .flatMap(v => [v.metodo_pagto_1, v.metodo_pagto_2, v.metodo_pagto_3])
        .filter(Boolean)
        .map(m => String(m).toLowerCase())
    )
  ).sort();

  // Filtrar vendas
  const vendasFiltradas = vendas?.filter((venda) => {
    // Filtro por caixa
    if (filtroCaixa && venda.caixa_origem !== filtroCaixa) {
      return false;
    }

    // Filtro por modo de pagamento (único)
    if (filtroModoPagto && filtroModoPagto !== "todos") {
      const metodos = [venda.metodo_pagto_1, venda.metodo_pagto_2, venda.metodo_pagto_3].map(m => String(m || "").toLowerCase());
      if (!metodos.some(m => m.includes(filtroModoPagto.toLowerCase()))) {
        return false;
      }
    }

    // Filtro por período
    if (filtroDataInicio || filtroDataFim) {
      const dataVenda = new Date(venda.created_at || "");
      
      if (filtroDataInicio) {
        const inicio = new Date(filtroDataInicio);
        inicio.setHours(0, 0, 0, 0);
        if (dataVenda < inicio) return false;
      }
      
      if (filtroDataFim) {
        const fim = new Date(filtroDataFim);
        fim.setHours(23, 59, 59, 999);
        if (dataVenda > fim) return false;
      }
    }

    return true;
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

  // Calcular totais de crédito e débito
  const calcularTotaisCartoes = () => {
    let totalCredito = 0;
    let totalDebito = 0;
    let totalGeral = 0;

    vendasFiltradas?.forEach((venda) => {
      const pagamentos = [
        { metodo: venda.metodo_pagto_1, valor: venda.valor_pagto_1 },
        { metodo: venda.metodo_pagto_2, valor: venda.valor_pagto_2 },
        { metodo: venda.metodo_pagto_3, valor: venda.valor_pagto_3 },
      ];

      pagamentos.forEach((p) => {
        if (!p.metodo || !p.valor || p.valor <= 0) return;
        const metodoNorm = (p.metodo || "").toLowerCase();
        
        // Excluir "gira crédito"
        if (metodoNorm.includes("gira")) {
          return;
        }

        if (metodoNorm.includes("credito") || metodoNorm.includes("crédito")) {
          totalCredito += p.valor;
          totalGeral += p.valor;
        } else if (metodoNorm.includes("debito") || metodoNorm.includes("débito")) {
          totalDebito += p.valor;
          totalGeral += p.valor;
        }
      });
    });

    return { totalCredito, totalDebito, totalGeral };
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
            {isAdmin && <ExportarCartoesCSV vendasFiltradas={vendasFiltradas || []} />}
            {isAdmin && (
              <Button 
                variant="outline" 
                onClick={() => setMostrarTotaisCartoes(true)}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Totais Cartões
              </Button>
            )}
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
              <CalendarIcon className="h-4 w-4" />
              Filtros de Pesquisa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4">
              {/* Período - Data Início */}
              <div className="space-y-2">
                <Label htmlFor="dataInicio">Data Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filtroDataInicio ? format(filtroDataInicio, "dd/MM/yyyy", { locale: ptBR }) : "Selecione..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filtroDataInicio}
                      onSelect={setFiltroDataInicio}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Período - Data Fim */}
              <div className="space-y-2">
                <Label htmlFor="dataFim">Data Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filtroDataFim ? format(filtroDataFim, "dd/MM/yyyy", { locale: ptBR }) : "Selecione..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filtroDataFim}
                      onSelect={setFiltroDataFim}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filtro por Caixa */}
              <div className="space-y-2">
                <Label htmlFor="filtroCaixa">Caixa</Label>
                <Select value={filtroCaixa || "todos"} onValueChange={(value) => setFiltroCaixa(value === "todos" ? "" : value)}>
                  <SelectTrigger id="filtroCaixa">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os caixas</SelectItem>
                    {caixasDisponiveis.map(caixa => (
                      <SelectItem key={caixa} value={caixa}>
                        {caixa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Filtro por Modo de Pagamento (único) */}
              <div className="space-y-2">
                <Label htmlFor="filtroModoPagto">Modo de Pagamento</Label>
                <Select value={filtroModoPagto || "todos"} onValueChange={(value) => setFiltroModoPagto(value === "todos" ? "" : value)}>
                  <SelectTrigger id="filtroModoPagto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os métodos</SelectItem>
                    {metodosDisponiveis.map(metodo => (
                      <SelectItem key={metodo} value={metodo}>
                        <span className="capitalize">{metodo}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setFiltroDataInicio(undefined);
                  setFiltroDataFim(undefined);
                  setFiltroCaixa("");
                }}
              >
                Limpar Filtros
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const hoje = new Date();
                  setFiltroDataInicio(hoje);
                  setFiltroDataFim(hoje);
                }}
              >
                Hoje
              </Button>
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
                {/* Soma das vendas para admin */}
                {isAdmin && vendasFiltradas && vendasFiltradas.length > 0 && (
                  <span className="ml-4 text-green-700 font-bold">
                    Soma: R$ {vendasFiltradas.reduce((acc, v) => acc + (v.valor_total_venda || 0), 0).toFixed(2)}
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
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Produtos</TableHead>
                    <TableHead>Forma Pagto</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasFiltradas?.map((venda) => (
                    <TableRow key={venda.id}>
                      <TableCell>
                        {venda.created_at
                          ? (() => {
                              const dataLocal = convertToLocalTime(venda.created_at);
                              return dataLocal ? format(dataLocal, "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-";
                            })()
                          : "-"}
                      </TableCell>
                      <TableCell>{venda.vendedora_nome || "-"}</TableCell>
                      <TableCell>{venda.caixa_origem || "-"}</TableCell>
                      <TableCell className="text-right font-semibold">
                        R$ {venda.valor_total_venda?.toFixed(2) || "0.00"}
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        {venda.itensResumo && venda.itensResumo.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {venda.itensResumo.map((item) => (
                              <span
                                key={item.slug}
                                className="rounded-full border border-muted-foreground/30 px-2 py-0.5 text-[11px] font-semibold"
                              >
                                {item.nome}: {item.quantidade}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Sem itens</span>
                        )}
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

      {/* Dialog de Totais de Cartões */}
      <Dialog open={mostrarTotaisCartoes} onOpenChange={setMostrarTotaisCartoes}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Totais de Crédito e Débito
            </DialogTitle>
            <DialogDescription>
              Valores das vendas em cartão (exceto gira crédito) no período filtrado
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {(() => {
              const { totalCredito, totalDebito, totalGeral } = calcularTotaisCartoes();
              return (
                <>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium text-blue-900">💳 Crédito:</span>
                    <span className="text-xl font-bold text-blue-700">
                      R$ {totalCredito.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium text-green-900">💵 Débito:</span>
                    <span className="text-xl font-bold text-green-700">
                      R$ {totalDebito.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-gray-100 rounded-lg border-2 border-gray-300">
                    <span className="font-bold text-gray-900">Total Geral:</span>
                    <span className="text-2xl font-bold text-gray-900">
                      R$ {totalGeral.toFixed(2)}
                    </span>
                  </div>

                  {vendasFiltradas && vendasFiltradas.length > 0 && (
                    <p className="text-sm text-muted-foreground text-center">
                      Baseado em {vendasFiltradas.length} venda(s) filtrada(s)
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
