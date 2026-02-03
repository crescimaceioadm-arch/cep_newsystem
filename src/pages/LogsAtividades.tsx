import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLogsAtividades } from "@/hooks/useLogAtividade";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, FileText, Loader2, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function LogsAtividades() {
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroAcao, setFiltroAcao] = useState<string>("todas");
  const [filtroTabela, setFiltroTabela] = useState<string>("todas");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [busca, setBusca] = useState("");
  const [detalhesAberto, setDetalhesAberto] = useState<string | null>(null);
  const [mostrarDados, setMostrarDados] = useState(false);

  const { data: logs, isLoading } = useLogsAtividades({
    acao: filtroAcao !== "todas" ? filtroAcao : undefined,
    tabela_afetada: filtroTabela !== "todas" ? filtroTabela : undefined,
    data_inicio: dataInicio || undefined,
    data_fim: dataFim || undefined,
    limite: 500,
  });

  const logsFiltrados = useMemo(() => {
    if (!logs) return [];

    return logs.filter(log => {
      if (filtroUsuario && !log.user_nome.toLowerCase().includes(filtroUsuario.toLowerCase())) {
        return false;
      }

      if (busca) {
        const buscaLower = busca.toLowerCase();
        return (
          log.user_nome.toLowerCase().includes(buscaLower) ||
          log.acao.toLowerCase().includes(buscaLower) ||
          log.tabela_afetada.toLowerCase().includes(buscaLower) ||
          (log.detalhes && log.detalhes.toLowerCase().includes(buscaLower))
        );
      }

      return true;
    });
  }, [logs, filtroUsuario, busca]);

  const exportarCSV = () => {
    if (!logsFiltrados.length) return;

    const headers = ["Data/Hora", "Usuário", "Cargo", "Ação", "Tabela", "Detalhes", "IP"];
    const rows = logsFiltrados.map(log => [
      format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
      log.user_nome,
      log.user_cargo || "-",
      log.acao,
      log.tabela_afetada,
      log.detalhes || "-",
      log.ip_address || "-",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `logs_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAcaoBadge = (acao: string) => {
    const cores: Record<string, string> = {
      criar: "bg-green-500",
      editar: "bg-blue-500",
      deletar: "bg-red-500",
      finalizar: "bg-purple-500",
      recusar: "bg-orange-500",
      transferir: "bg-cyan-500",
      entrada: "bg-emerald-500",
      saida: "bg-rose-500",
      fechar: "bg-indigo-500",
      abrir: "bg-lime-500",
    };

    return (
      <Badge className={cores[acao] || "bg-gray-500"}>
        {acao.charAt(0).toUpperCase() + acao.slice(1)}
      </Badge>
    );
  };

  const logSelecionado = logs?.find(l => l.id === detalhesAberto);

  return (
    <MainLayout title="Logs de Atividades">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Auditoria do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Busca Geral</Label>
              <Input
                placeholder="Buscar em todos os campos..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Usuário</Label>
              <Input
                placeholder="Nome do usuário"
                value={filtroUsuario}
                onChange={e => setFiltroUsuario(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Ação</Label>
              <Select value={filtroAcao} onValueChange={setFiltroAcao}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="criar">Criar</SelectItem>
                  <SelectItem value="editar">Editar</SelectItem>
                  <SelectItem value="deletar">Deletar</SelectItem>
                  <SelectItem value="finalizar">Finalizar</SelectItem>
                  <SelectItem value="recusar">Recusar</SelectItem>
                  <SelectItem value="transferir">Transferir</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="fechar">Fechar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tabela</Label>
              <Select value={filtroTabela} onValueChange={setFiltroTabela}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="atendimentos">Atendimentos</SelectItem>
                  <SelectItem value="vendas">Vendas</SelectItem>
                  <SelectItem value="movimentacoes_caixa">Movimentações Caixa</SelectItem>
                  <SelectItem value="fechamentos_caixa">Fechamentos Caixa</SelectItem>
                  <SelectItem value="eventos_marketing">Eventos Marketing</SelectItem>
                  <SelectItem value="clientes">Clientes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2">
            <Button onClick={exportarCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Button
              onClick={() => {
                setFiltroUsuario("");
                setFiltroAcao("todas");
                setFiltroTabela("todas");
                setDataInicio("");
                setDataFim("");
                setBusca("");
              }}
              variant="outline"
            >
              Limpar Filtros
            </Button>
          </div>

          {/* Tabela */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum log encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    logsFiltrados.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium">{log.user_nome}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{log.user_cargo || "-"}</Badge>
                        </TableCell>
                        <TableCell>{getAcaoBadge(log.acao)}</TableCell>
                        <TableCell className="font-mono text-sm">{log.tabela_afetada}</TableCell>
                        <TableCell className="max-w-md truncate">{log.detalhes || "-"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{log.ip_address || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDetalhesAberto(log.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Mostrando {logsFiltrados.length} de {logs?.length || 0} registros
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={!!detalhesAberto} onOpenChange={() => setDetalhesAberto(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
          </DialogHeader>
          {logSelecionado && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Data/Hora</Label>
                    <p className="font-medium">
                      {format(new Date(logSelecionado.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Usuário</Label>
                    <p className="font-medium">{logSelecionado.user_nome}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Cargo</Label>
                    <Badge variant="secondary">{logSelecionado.user_cargo || "-"}</Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Ação</Label>
                    <div className="mt-1">{getAcaoBadge(logSelecionado.acao)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tabela</Label>
                    <p className="font-mono text-sm">{logSelecionado.tabela_afetada}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">IP Address</Label>
                    <p className="text-sm">{logSelecionado.ip_address || "-"}</p>
                  </div>
                </div>

                {logSelecionado.detalhes && (
                  <div>
                    <Label className="text-muted-foreground">Detalhes</Label>
                    <p className="mt-1">{logSelecionado.detalhes}</p>
                  </div>
                )}

                {logSelecionado.registro_id && (
                  <div>
                    <Label className="text-muted-foreground">ID do Registro</Label>
                    <p className="mt-1 font-mono text-sm">{logSelecionado.registro_id}</p>
                  </div>
                )}

                {logSelecionado.user_agent && (
                  <div>
                    <Label className="text-muted-foreground">User Agent</Label>
                    <p className="mt-1 text-xs text-muted-foreground break-all">{logSelecionado.user_agent}</p>
                  </div>
                )}

                {(logSelecionado.dados_antes || logSelecionado.dados_depois) && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-muted-foreground">Dados (JSON)</Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setMostrarDados(!mostrarDados)}
                      >
                        {mostrarDados ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {mostrarDados && (
                      <div className="space-y-2">
                        {logSelecionado.dados_antes && (
                          <div>
                            <p className="text-sm font-medium text-red-600">Antes:</p>
                            <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-40">
                              {JSON.stringify(logSelecionado.dados_antes, null, 2)}
                            </pre>
                          </div>
                        )}
                        {logSelecionado.dados_depois && (
                          <div>
                            <p className="text-sm font-medium text-green-600">Depois:</p>
                            <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-40">
                              {JSON.stringify(logSelecionado.dados_depois, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
