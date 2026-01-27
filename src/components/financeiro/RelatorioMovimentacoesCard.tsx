import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRelatorioMovimentacoesManual } from "@/hooks/useCaixas";
import { useAtendimentosDinheiroFinalizados } from "@/hooks/useAtendimentosDinheiroFinalizados";
import { Search, ArrowDown, ArrowUp, ArrowLeftRight, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function RelatorioMovimentacoesCard() {
  const [dataInicio, setDataInicio] = useState(() => {
    // Padrão: 7 dias atrás
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split("T")[0];
  });
  const [dataFim, setDataFim] = useState(() => {
    // Padrão: hoje
    const date = new Date();
    return date.toISOString().split("T")[0];
  });
  const [termoBusca, setTermoBusca] = useState("");
  const [termoBuscaAtivo, setTermoBuscaAtivo] = useState("");
  const [tiposAtivos, setTiposAtivos] = useState<string[]>(["entrada", "saida", "transferencia_entre_caixas"]);


  const { data: movimentacoes, isLoading, error } = useRelatorioMovimentacoesManual(
    dataInicio,
    dataFim,
    termoBuscaAtivo,
    tiposAtivos
  );

  // Hook para avaliações pagas em dinheiro e finalizadas
  const { data: avaliacoesDinheiro, isLoading: loadingAvaliacao } = useAtendimentosDinheiroFinalizados(dataInicio, dataFim);

  const handleBuscar = () => {
    setTermoBuscaAtivo(termoBusca);
  };

  const handleLimpar = () => {
    setTermoBusca("");
    setTermoBuscaAtivo("");
  };

  const toggleTipo = (tipo: string) => {
    setTiposAtivos((prev) => {
      if (prev.includes(tipo)) {
        // Se já está ativo, remove (mas mantém pelo menos 1 tipo)
        const novos = prev.filter((t) => t !== tipo);
        return novos.length > 0 ? novos : prev;
      } else {
        // Se não está ativo, adiciona
        return [...prev, tipo];
      }
    });
  };

  const exportarCSV = () => {
    // Unifica saídas manuais e avaliações pagas em dinheiro
    const saidas = (movimentacoes || []).filter(mov => mov.tipo === "saida");
    const avaliacoes = (avaliacoesDinheiro || []).map(att => {
      // Data: usar hora_encerramento ou hora_chegada
      const data = format(new Date(att.hora_encerramento || att.hora_chegada), "dd/MM/yyyy HH:mm", { locale: ptBR });
      // Descrição: "Pagamento avaliação - Cliente"
      const descricao = `Pagamento avaliação - ${(att.nome_cliente || "Cliente").replace(/,/g, ";")}`;
      // Valor: soma dos pagamentos em dinheiro (negativo, pois é saída)
      let valor = 0;
      if (att.pagamento_1_metodo?.toLowerCase() === "dinheiro") valor += att.pagamento_1_valor || 0;
      if (att.pagamento_2_metodo?.toLowerCase() === "dinheiro") valor += att.pagamento_2_valor || 0;
      if (att.pagamento_3_metodo?.toLowerCase() === "dinheiro") valor += att.pagamento_3_valor || 0;
      return {
        data,
        descricao,
        valor: -Math.abs(valor),
      };
    });

    // Linhas de saídas manuais
    const linhasSaidas = saidas.map((mov) => {
      const data = format(new Date(mov.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR });
      const descricao = (mov.motivo || "").replace(/,/g, ";").replace(/\n/g, " ");
      const valor = -Math.abs(mov.valor).toFixed(2);
      return `${data},"${descricao}",${valor}`;
    });

    // Linhas de avaliações
    const linhasAvaliacoes = avaliacoes.map((a) => {
      return `${a.data},"${a.descricao}",${a.valor.toFixed(2)}`;
    });

    // Cabeçalho do CSV
    const cabecalho = "Data,Descrição,Valor\n";
    const linhas = [...linhasSaidas, ...linhasAvaliacoes].sort().join("\n");
    const csvContent = cabecalho + linhas;

    // Nome do arquivo com datas do filtro
    const dataInicioStr = dataInicio || "inicio";
    const dataFimStr = dataFim || "fim";
    const nomeArquivo = `movimentacoes_saidas_avaliacoes_${dataInicioStr}_a_${dataFimStr}.csv`;

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", nomeArquivo);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "entrada":
        return <ArrowDown className="h-4 w-4 text-green-600" />;
      case "saida":
        return <ArrowUp className="h-4 w-4 text-red-600" />;
      case "transferencia_entre_caixas":
        return <ArrowLeftRight className="h-4 w-4 text-blue-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "entrada":
        return "Entrada";
      case "saida":
        return "Saída";
      case "transferencia_entre_caixas":
        return "Transferência";
      default:
        return tipo;
    }
  };

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case "entrada":
        return "default";
      case "saida":
        return "destructive";
      case "transferencia_entre_caixas":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatarValor = (valor: number, tipo: string) => {
    const sinal = tipo === "saida" ? "-" : "+";
    const cor = tipo === "saida" ? "text-red-600" : "text-green-600";
    return <span className={`font-semibold ${cor}`}>{sinal} R$ {valor.toFixed(2)}</span>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Relatório de Movimentações Manuais
            </CardTitle>
            <CardDescription>
              Consulta de entradas, saídas e transferências registradas manualmente
            </CardDescription>
          </div>
          <div className="flex flex-col items-end">
            <Button 
              onClick={exportarCSV} 
              variant="outline" 
              size="sm"
              disabled={!movimentacoes || movimentacoes.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV avaliações e movimentações em dinheiro
            </Button>
            {/* Se o texto do botão ficar muito grande, pode-se optar por um comentário explicativo abaixo: */}
            {/* <span className="text-xs text-muted-foreground mt-1">Inclui saídas manuais e avaliações pagas em dinheiro</span> */}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filtros */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Data Inicial */}
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data Inicial</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            {/* Data Final */}
            <div className="space-y-2">
              <Label htmlFor="dataFim">Data Final</Label>
              <Input
                id="dataFim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>

            {/* Busca por descrição */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="busca">Buscar na Descrição</Label>
              <div className="flex gap-2">
                <Input
                  id="busca"
                  type="text"
                  placeholder="Ex: sangria, suprimento, ajuste..."
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
                />
                <Button onClick={handleBuscar} variant="default">
                  <Search className="h-4 w-4 mr-2" />
                  Filtrar
                </Button>
                {termoBuscaAtivo && (
                  <Button onClick={handleLimpar} variant="outline">
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Filtro por Tipo */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo de Movimentação</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tipo-entrada"
                  checked={tiposAtivos.includes("entrada")}
                  onCheckedChange={() => toggleTipo("entrada")}
                />
                <label htmlFor="tipo-entrada" className="text-sm cursor-pointer flex items-center gap-1">
                  <ArrowDown className="h-3 w-3 text-green-600" />
                  Entradas
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tipo-saida"
                  checked={tiposAtivos.includes("saida")}
                  onCheckedChange={() => toggleTipo("saida")}
                />
                <label htmlFor="tipo-saida" className="text-sm cursor-pointer flex items-center gap-1">
                  <ArrowUp className="h-3 w-3 text-red-600" />
                  Saídas
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tipo-transferencia"
                  checked={tiposAtivos.includes("transferencia_entre_caixas")}
                  onCheckedChange={() => toggleTipo("transferencia_entre_caixas")}
                />
                <label htmlFor="tipo-transferencia" className="text-sm cursor-pointer flex items-center gap-1">
                  <ArrowLeftRight className="h-3 w-3 text-blue-600" />
                  Transferências
                </label>
              </div>
            </div>
          </div>

          {/* Indicador de filtro ativo */}
          {termoBuscaAtivo && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              🔍 Filtrando por: <strong>"{termoBuscaAtivo}"</strong>
            </div>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            Carregando movimentações...
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
            ❌ Erro ao carregar: {error.message}
          </div>
        )}

        {/* Tabela de Resultados */}
        {!isLoading && !error && movimentacoes && (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Caixa(s)</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Descrição/Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentacoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma movimentação manual encontrada no período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    movimentacoes.map((mov) => {
                      const origemNome = mov.caixa_origem?.[0]?.nome || "-";
                      const destinoNome = mov.caixa_destino?.[0]?.nome || "-";
                      
                      let caixaTexto = "";
                      if (mov.tipo === "transferencia_entre_caixas") {
                        caixaTexto = `${origemNome} → ${destinoNome}`;
                      } else if (mov.tipo === "entrada") {
                        caixaTexto = destinoNome;
                      } else {
                        caixaTexto = origemNome;
                      }

                      return (
                        <TableRow key={mov.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(mov.data_hora), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getTipoBadgeVariant(mov.tipo) as any}>
                              <span className="flex items-center gap-1">
                                {getTipoIcon(mov.tipo)}
                                {getTipoLabel(mov.tipo)}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell>{caixaTexto}</TableCell>
                          <TableCell className="text-right">
                            {formatarValor(mov.valor, mov.tipo)}
                          </TableCell>
                          <TableCell className="max-w-md">
                            <span className="text-sm text-muted-foreground">
                              {mov.motivo || <em>Sem descrição</em>}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Resumo */}
            {movimentacoes.length > 0 && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  <strong>{movimentacoes.length}</strong> movimentação(ões) encontrada(s)
                </span>
                <div className="flex gap-4">
                  <span className="text-green-700">
                    ↓ Entradas: <strong>{movimentacoes.filter(m => m.tipo === "entrada").length}</strong>
                  </span>
                  <span className="text-red-700">
                    ↑ Saídas: <strong>{movimentacoes.filter(m => m.tipo === "saida").length}</strong>
                  </span>
                  <span className="text-blue-700">
                    ↔ Transferências: <strong>{movimentacoes.filter(m => m.tipo === "transferencia_entre_caixas").length}</strong>
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
