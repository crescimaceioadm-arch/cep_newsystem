import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAtendimentos, useDeleteAtendimento } from "@/hooks/useAtendimentos";
import { useUser } from "@/contexts/UserContext";
import { AvaliacaoModal } from "@/components/avaliacao/AvaliacaoModal";
import { ClipboardList, CalendarIcon, RefreshCw, Trash2, Eye, Pencil, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type StatusAtendimento = 'aguardando' | 'em_avaliacao' | 'aguardando_pagamento' | 'finalizado' | 'recusado';

export default function HistoricoAtendimentos() {
  const [filtroDataInicio, setFiltroDataInicio] = useState<Date | undefined>(undefined);
  const [filtroDataFim, setFiltroDataFim] = useState<Date | undefined>(undefined);
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroValorMin, setFiltroValorMin] = useState("");
  const [filtroValorMax, setFiltroValorMax] = useState("");
  const [filtroPagamento, setFiltroPagamento] = useState<string>("todos");
  const [atendimentoParaExcluir, setAtendimentoParaExcluir] = useState<any>(null);
  const [deletando, setDeletando] = useState(false);
  const [detalhesAtendimento, setDetalhesAtendimento] = useState<any>(null);
  const [atendimentoParaEditar, setAtendimentoParaEditar] = useState<any>(null);
  const [isAvaliacaoModalOpen, setIsAvaliacaoModalOpen] = useState(false);
  
  const { data: atendimentos, isLoading, refetch } = useAtendimentos();
  const deleteAtendimento = useDeleteAtendimento();
  const { cargo } = useUser();
  const isAdmin = cargo === 'admin';

  // Filtrar atendimentos com múltiplos critérios
  const atendimentosFiltrados = atendimentos?.filter((atendimento) => {
    // Filtro por período
    if (filtroDataInicio || filtroDataFim) {
      const dataAtendimento = new Date(atendimento.hora_chegada || atendimento.created_at || "");
      
      if (filtroDataInicio) {
        const inicio = new Date(filtroDataInicio);
        inicio.setHours(0, 0, 0, 0);
        if (dataAtendimento < inicio) return false;
      }
      
      if (filtroDataFim) {
        const fim = new Date(filtroDataFim);
        fim.setHours(23, 59, 59, 999);
        if (dataAtendimento > fim) return false;
      }
    }

    // Filtro por nome (case-insensitive)
    if (filtroNome.trim() && !atendimento.nome_cliente?.toLowerCase().includes(filtroNome.toLowerCase().trim())) {
      return false;
    }

    // Filtro por valor
    const valor = atendimento.valor_total_negociado || 0;
    if (filtroValorMin && parseFloat(filtroValorMin) > valor) return false;
    if (filtroValorMax && parseFloat(filtroValorMax) < valor) return false;

    // Filtro por pagamento
    if (filtroPagamento !== "todos") {
      const metodos = [
        atendimento.pagamento_1_metodo?.toLowerCase() || "",
        atendimento.pagamento_2_metodo?.toLowerCase() || "",
        atendimento.pagamento_3_metodo?.toLowerCase() || "",
      ];
      
      const metodoBuscado = filtroPagamento.toLowerCase();
      const encontrou = metodos.some(metodo => metodo === metodoBuscado);
      
      if (!encontrou) return false;
    }

    return true;
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

  const formatDataHora = (dataHora: string | null | undefined) => {
    if (!dataHora) return "-";
    try {
      return format(new Date(dataHora), "dd/MM HH:mm", { locale: ptBR });
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

  const getPagamentosDetalhes = (atendimento: any) => {
    const pagamentos = [
      {
        metodo: atendimento.metodo_pagto_1 || atendimento.pagamento_1_metodo,
        valor: atendimento.valor_pagto_1 ?? atendimento.pagamento_1_valor,
      },
      {
        metodo: atendimento.metodo_pagto_2 || atendimento.pagamento_2_metodo,
        valor: atendimento.valor_pagto_2 ?? atendimento.pagamento_2_valor,
      },
      {
        metodo: atendimento.metodo_pagto_3 || atendimento.pagamento_3_metodo,
        valor: atendimento.valor_pagto_3 ?? atendimento.pagamento_3_valor,
      },
    ];

    return pagamentos
      .filter((p) => (p.metodo || "").trim() || (p.valor ?? 0) > 0)
      .map((p, idx) => ({
        label: p.metodo || `Pagamento ${idx + 1}`,
        valor: p.valor ?? 0,
      }));
  };

  const getItensDetalhes = (atendimento: any) => {
    const itens = [
      { label: "Roupas Baby", qtd: atendimento.qtd_baby },
      { label: "Roupas 1 a 16", qtd: atendimento.qtd_1_a_16 },
      { label: "Calçados", qtd: atendimento.qtd_calcados },
      { label: "Brinquedos", qtd: atendimento.qtd_brinquedos },
      { label: "Itens Médios", qtd: atendimento.qtd_itens_medios },
      { label: "Itens Grandes", qtd: atendimento.qtd_itens_grandes },
    ];

    return itens.filter((i) => (i.qtd ?? 0) > 0);
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

  const exportarCSV = () => {
    if (!atendimentosFiltrados || atendimentosFiltrados.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    // Cabeçalho do CSV
    const cabecalho = "Data de fechamento;Cliente;Valor\n";

    // Linhas de dados
    const linhas = atendimentosFiltrados.map((att) => {
      const data = formatDataHora(att.hora_encerramento || att.hora_chegada || att.created_at);
      const cliente = (att.nome_cliente || "").replace(/;/g, ","); // Remove ponto-e-vírgula
      const valor = `-${(att.valor_total_negociado || 0).toFixed(2).replace(".", ",")}`;
      return `${data};${cliente};${valor}`;
    }).join("\n");

    // Criar o conteúdo CSV
    const csvContent = cabecalho + linhas;

    // Gerar datas do filtro para nome do arquivo
    let dataInicioStr = filtroDataInicio ? format(filtroDataInicio, "yyyy-MM-dd") : "inicio";
    let dataFimStr = filtroDataFim ? format(filtroDataFim, "yyyy-MM-dd") : "fim";

    // Criar o blob e fazer download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `historico_avaliacoes_${dataInicioStr}_a_${dataFimStr}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Arquivo exportado com sucesso!");
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

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Filtros de Pesquisa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

              {/* Nome do Cliente */}
              <div className="space-y-2">
                <Label htmlFor="filtroNome">Nome do Cliente</Label>
                <Input
                  id="filtroNome"
                  type="text"
                  placeholder="Digite o nome..."
                  value={filtroNome}
                  onChange={(e) => setFiltroNome(e.target.value)}
                />
              </div>

              {/* Valor Mínimo */}
              <div className="space-y-2">
                <Label htmlFor="valorMin">Valor Mínimo</Label>
                <Input
                  id="valorMin"
                  type="number"
                  placeholder="R$ 0,00"
                  value={filtroValorMin}
                  onChange={(e) => setFiltroValorMin(e.target.value)}
                  step="0.01"
                  min="0"
                />
              </div>

              {/* Valor Máximo */}
              <div className="space-y-2">
                <Label htmlFor="valorMax">Valor Máximo</Label>
                <Input
                  id="valorMax"
                  type="number"
                  placeholder="R$ 0,00"
                  value={filtroValorMax}
                  onChange={(e) => setFiltroValorMax(e.target.value)}
                  step="0.01"
                  min="0"
                />
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-2">
                <Label htmlFor="filtroPagamento">Forma de Pagamento</Label>
                <Select value={filtroPagamento} onValueChange={setFiltroPagamento}>
                  <SelectTrigger id="filtroPagamento">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="gira crédito">Gira Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-2 mt-4 flex-wrap">
              <Button
                variant="outline"
                onClick={() => {
                  setFiltroDataInicio(undefined);
                  setFiltroDataFim(undefined);
                  setFiltroNome("");
                  setFiltroValorMin("");
                  setFiltroValorMax("");
                  setFiltroPagamento("todos");
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
              {isAdmin && (
                <Button
                  variant="default"
                  onClick={exportarCSV}
                  disabled={!atendimentosFiltrados || atendimentosFiltrados.length === 0}
                  className="ml-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              )}
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
                    <TableHead>Abertura</TableHead>
                    <TableHead>Fechamento</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Avaliadora</TableHead>
                    <TableHead className="text-center">Detalhes</TableHead>
                    {isAdmin && <TableHead className="text-center">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atendimentosFiltrados?.map((atendimento) => (
                    <TableRow key={atendimento.id}>
                      <TableCell className="font-mono">
                        {formatDataHora(atendimento.hora_chegada || atendimento.created_at)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatDataHora((atendimento as any).hora_encerramento)}
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
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDetalhesAtendimento(atendimento)}
                          aria-label="Ver detalhes da avaliação"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-center space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                              setAtendimentoParaEditar(atendimento);
                              setIsAvaliacaoModalOpen(true);
                            }}
                            aria-label="Editar avaliação"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
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
                      <TableCell colSpan={isAdmin ? 9 : 8} className="text-center text-muted-foreground py-8">
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

      {/* Modal de detalhes da avaliação */}
      <Dialog open={!!detalhesAtendimento} onOpenChange={(open) => !open && setDetalhesAtendimento(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Avaliação</DialogTitle>
            <DialogDescription>
              Peças negociadas, pagamentos e observações desta avaliação.
            </DialogDescription>
          </DialogHeader>

          {detalhesAtendimento && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-semibold">{detalhesAtendimento.nome_cliente || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Abertura</p>
                  <p className="font-mono">{formatDataHora(detalhesAtendimento?.hora_chegada || detalhesAtendimento?.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fechamento</p>
                  <p className="font-mono">{formatDataHora(detalhesAtendimento?.hora_encerramento)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor negociado</p>
                  <p className="font-semibold">{formatValor(detalhesAtendimento?.valor_total_negociado)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avaliadora</p>
                  <p className="font-semibold">{detalhesAtendimento.avaliadora_nome || "-"}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Peças avaliadas</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {getItensDetalhes(detalhesAtendimento).map((item) => (
                    <div key={item.label} className="flex justify-between rounded-md border px-3 py-2">
                      <span>{item.label}</span>
                      <span className="font-mono font-semibold">{item.qtd}</span>
                    </div>
                  ))}
                  {getItensDetalhes(detalhesAtendimento).length === 0 && (
                    <p className="text-muted-foreground">Nenhuma quantidade registrada.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Pagamentos</h4>
                <div className="space-y-1 text-sm">
                  {getPagamentosDetalhes(detalhesAtendimento).map((p, idx) => (
                    <div key={`${p.label}-${idx}`} className="flex justify-between rounded-md border px-3 py-2">
                      <span>{p.label}</span>
                      <span className="font-mono font-semibold">{formatValor(p.valor)}</span>
                    </div>
                  ))}
                  {getPagamentosDetalhes(detalhesAtendimento).length === 0 && (
                    <p className="text-muted-foreground">Nenhum pagamento informado.</p>
                  )}
                </div>
              </div>

              {detalhesAtendimento.descricao_itens_extra && (
                <div className="space-y-1 text-sm">
                  <h4 className="font-semibold text-sm">Observações</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {detalhesAtendimento.descricao_itens_extra}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      {/* Modal de edição de avaliação para admin */}
      <AvaliacaoModal
        atendimento={atendimentoParaEditar}
        open={isAvaliacaoModalOpen}
        onOpenChange={(open) => {
          setIsAvaliacaoModalOpen(open);
          if (!open) {
            setAtendimentoParaEditar(null);
            refetch(); // Recarrega os dados após edição
          }
        }}
        isEditing={true}
      />
    </MainLayout>
  );
}
