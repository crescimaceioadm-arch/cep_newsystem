import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
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
import { useAtendimentos, useDeleteAtendimento } from "@/hooks/useAtendimentos";
import { useUser } from "@/contexts/UserContext";
import { ClipboardList, CalendarIcon, RefreshCw, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type StatusAtendimento = 'aguardando' | 'em_avaliacao' | 'aguardando_pagamento' | 'finalizado' | 'recusado';

export default function HistoricoAtendimentos() {
  const [filtroData, setFiltroData] = useState<Date>(new Date());
  const [atendimentoParaExcluir, setAtendimentoParaExcluir] = useState<any>(null);
  const [deletando, setDeletando] = useState(false);
  
  const { data: atendimentos, isLoading, refetch } = useAtendimentos();
  const deleteAtendimento = useDeleteAtendimento();
  const { cargo } = useUser();
  const isAdmin = cargo === 'admin';

  // Filtrar atendimentos pela data selecionada
  const atendimentosFiltrados = atendimentos?.filter((atendimento) => {
    const dataAtendimento = atendimento.hora_chegada || atendimento.created_at;
    if (!dataAtendimento) return false;
    
    const dataFormatada = format(filtroData, "yyyy-MM-dd");
    return dataAtendimento.startsWith(dataFormatada);
  });

  const getStatusBadge = (status: StatusAtendimento) => {
    const statusConfig: Record<StatusAtendimento, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      aguardando: { label: "Aguardando", variant: "outline" },
      em_avaliacao: { label: "Em Avaliação", variant: "secondary" },
      aguardando_pagamento: { label: "Aguard. Pagamento", variant: "outline" },
      finalizado: { label: "Finalizado", variant: "default" },
      recusado: { label: "Recusado", variant: "destructive" },
    };

    const config = statusConfig[status] || { label: status, variant: "outline" as const };
    
    return (
      <Badge 
        variant={config.variant}
        className={cn(
          status === 'finalizado' && "bg-green-500 hover:bg-green-600 text-white",
          status === 'recusado' && "bg-red-500 hover:bg-red-600 text-white",
          (status === 'aguardando' || status === 'aguardando_pagamento') && "bg-yellow-500 hover:bg-yellow-600 text-white",
          status === 'em_avaliacao' && "bg-blue-500 hover:bg-blue-600 text-white"
        )}
      >
        {config.label}
      </Badge>
    );
  };

  const formatHora = (dataHora: string | null) => {
    if (!dataHora) return "-";
    try {
      return format(new Date(dataHora), "HH:mm", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  const formatValor = (valor: number | null) => {
    if (valor === null || valor === undefined) return "-";
    return `R$ ${valor.toFixed(2)}`;
  };

  const getPagamento = (atendimento: any) => {
    return atendimento.pagamento_1_metodo || atendimento.tipo_pagamento || "-";
  };

  const handleConfirmarExclusao = async () => {
    if (!atendimentoParaExcluir) return;
    setDeletando(true);
    try {
      await deleteAtendimento.mutateAsync(atendimentoParaExcluir.id);
      toast.success("Atendimento excluído com sucesso!");
    } catch (error) {
      toast.error("Erro ao excluir atendimento");
    } finally {
      setDeletando(false);
      setAtendimentoParaExcluir(null);
    }
  };

  return (
    <MainLayout title="Histórico de Avaliações">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Histórico de Avaliações</h1>
            <p className="text-muted-foreground">Conferência de lançamentos de compras e avaliações</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Filtro de Data */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Selecionar Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[200px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(filtroData, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filtroData}
                    onSelect={(date) => date && setFiltroData(date)}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                onClick={() => setFiltroData(new Date())}
                className="text-sm"
              >
                Hoje
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Atendimentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Atendimentos do Dia
              {atendimentosFiltrados && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({atendimentosFiltrados.length} {atendimentosFiltrados.length === 1 ? "registro" : "registros"})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Carregando atendimentos...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Avaliadora</TableHead>
                    {isAdmin && <TableHead className="text-center">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atendimentosFiltrados?.map((atendimento) => (
                    <TableRow key={atendimento.id}>
                      <TableCell className="font-mono">
                        {formatHora(atendimento.hora_chegada)}
                      </TableCell>
                      <TableCell>{atendimento.nome_cliente || "-"}</TableCell>
                      <TableCell>
                        {getStatusBadge(atendimento.status as StatusAtendimento)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatValor(atendimento.valor_total_negociado)}
                      </TableCell>
                      <TableCell>{getPagamento(atendimento)}</TableCell>
                      <TableCell>{(atendimento as any).avaliadora_nome || "-"}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setAtendimentoParaExcluir(atendimento)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {(!atendimentosFiltrados || atendimentosFiltrados.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-8">
                        Nenhum atendimento encontrado para esta data
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!atendimentoParaExcluir} onOpenChange={(open) => !open && setAtendimentoParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o atendimento de{" "}
              <strong>{atendimentoParaExcluir?.nome_cliente}</strong>?
              <br /><br />
              <span className="text-destructive font-medium">
                Esta ação irá reverter os valores financeiros associados e não pode ser desfeita.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExclusao}
              disabled={deletando}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletando ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
