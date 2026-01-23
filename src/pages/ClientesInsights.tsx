import { Fragment, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAtendimentos } from "@/hooks/useAtendimentos";
import { useUser } from "@/contexts/UserContext";
import { AlertTriangle, ChevronDown, ChevronUp, Filter, Loader2, Users } from "lucide-react";

interface EventoCliente {
  id: string;
  data: string;
  valor: number;
  categorias: Array<{ nome: string; quantidade: number }>;
  pagamentos: string[];
}

interface ClienteResumo {
  key: string;
  nome: string;
  cpf?: string | null;
  historico: EventoCliente[];
}

interface ClienteFiltrado extends ClienteResumo {
  historicoFiltrado: EventoCliente[];
  totalVendas: number;
  totalValor: number;
  ultimoContato: string | null;
  itensPorCategoria: Record<string, number>;
}

const moedaBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const normalizarTexto = (value?: string | null) => (value || "").trim().toLowerCase();

const categoriasLegadas = [
  { campo: "qtd_baby", nome: "Baby" },
  { campo: "qtd_1_a_16", nome: "1 a 16" },
  { campo: "qtd_calcados", nome: "Calçados" },
  { campo: "qtd_brinquedos", nome: "Brinquedos" },
  { campo: "qtd_itens_medios", nome: "Itens Médios" },
  { campo: "qtd_itens_grandes", nome: "Itens Grandes" },
] as const;

export default function ClientesInsights() {
  const navigate = useNavigate();
  const { isAdmin } = useUser();
  const { data: atendimentos, isLoading: loadingAtendimentos, error: erroAtendimentos, refetch: refetchAtendimentos } = useAtendimentos();

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroCpf, setFiltroCpf] = useState("");
  const [filtroPagamento, setFiltroPagamento] = useState("qualquer");
  const [filtroCategoria, setFiltroCategoria] = useState("qualquer");
  const [clienteAberto, setClienteAberto] = useState<string | null>(null);

  const pagamentosAvaliacao = useMemo(() => {
    const set = new Set<string>();
    (atendimentos || []).forEach((a: any) => {
      [a.pagamento_1_metodo, a.pagamento_2_metodo, a.pagamento_3_metodo].forEach((m: string | null | undefined) => {
        if (m) set.add(m);
      });
    });
    return Array.from(set.values());
  }, [atendimentos]);

  const categoriasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    (atendimentos || []).forEach((a: any) => {
      categoriasLegadas.forEach((c) => {
        const quantidade = a[c.campo];
        if (quantidade && quantidade > 0) set.add(c.nome);
      });
      (a.itens || []).forEach((item: any) => {
        const nome = (item.categoria as any)?.nome || item.categoria_id;
        if (nome) set.add(nome);
      });
    });
    return Array.from(set.values());
  }, [atendimentos]);

  const clientes = useMemo(() => {
    const map = new Map<string, ClienteResumo>();

    const ensureCliente = (nome: string, cpf?: string | null) => {
      const key = `${normalizarTexto(nome)}|${cpf || ""}`;
      if (!map.has(key)) {
        map.set(key, { key, nome: nome || "Cliente sem nome", cpf: cpf || null, historico: [] });
      }
      return map.get(key)!;
    };

    (atendimentos || []).forEach((a: any) => {
      const nome = a.nome_cliente || "Cliente";
      const cpf = a.cliente_cpf || null;
      const cliente = ensureCliente(nome, cpf);
      const dataEvento = a.hora_encerramento || a.updated_at || a.hora_chegada;

      const categoriasEvento: Array<{ nome: string; quantidade: number }> = [];
      if (a.itens && a.itens.length > 0) {
        a.itens.forEach((item: any) => {
          const nomeCategoria = (item.categoria as any)?.nome || item.categoria_id;
          if (nomeCategoria && item.quantidade > 0) {
            categoriasEvento.push({ nome: nomeCategoria, quantidade: item.quantidade });
          }
        });
      } else {
        categoriasLegadas.forEach((c) => {
          const quantidade = a[c.campo];
          if (quantidade && quantidade > 0) {
            categoriasEvento.push({ nome: c.nome, quantidade });
          }
        });
      }

      const pagamentos = [a.pagamento_1_metodo, a.pagamento_2_metodo, a.pagamento_3_metodo].filter(Boolean) as string[];

      cliente.historico.push({
        id: a.id,
        data: dataEvento,
        valor: a.valor_total_negociado || 0,
        categorias: categoriasEvento,
        pagamentos,
      });
    });

    return Array.from(map.values());
  }, [atendimentos]);

  const clientesFiltrados: ClienteFiltrado[] = useMemo(() => {
    const startDate = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
    const endDate = dataFim ? new Date(`${dataFim}T23:59:59`) : null;

    return clientes
      .map((cliente) => {
        const historicoFiltrado = cliente.historico.filter((evt) => {
          if (!evt.data) return false;
          const dataEvt = new Date(evt.data);
          if (startDate && dataEvt < startDate) return false;
          if (endDate && dataEvt > endDate) return false;
          if (filtroCategoria && filtroCategoria !== "qualquer") {
            const temCategoria = evt.categorias.some((c) => normalizarTexto(c.nome) === normalizarTexto(filtroCategoria));
            if (!temCategoria) return false;
          }
          if (filtroPagamento && filtroPagamento !== "qualquer") {
            const temPagamento = evt.pagamentos.some((p) => normalizarTexto(p) === normalizarTexto(filtroPagamento));
            if (!temPagamento) return false;
          }
          return true;
        });

        if (filtroPagamento && filtroPagamento !== "qualquer" && !historicoFiltrado.length) return null;
        if (!historicoFiltrado.length) return null;

        if (filtroNome && !normalizarTexto(cliente.nome).includes(normalizarTexto(filtroNome))) return null;
        if (filtroCpf && !normalizarTexto(cliente.cpf || "").includes(normalizarTexto(filtroCpf))) return null;

        const totalCompras = historicoFiltrado.length;
        const totalValor = historicoFiltrado.reduce((sum, h) => sum + (h.valor || 0), 0);

        const ultimoContatoDate = historicoFiltrado.reduce((latest: Date | null, h) => {
          const current = new Date(h.data);
          if (!latest || current > latest) return current;
          return latest;
        }, null);

        const itensPorCategoria: Record<string, number> = {};
        historicoFiltrado.forEach((h) => {
          h.categorias.forEach((cat) => {
            const key = cat.nome;
            itensPorCategoria[key] = (itensPorCategoria[key] || 0) + (cat.quantidade || 0);
          });
        });

        return {
          ...cliente,
          historicoFiltrado,
          totalVendas: totalCompras,
          totalValor,
          ultimoContato: ultimoContatoDate ? ultimoContatoDate.toISOString() : null,
          itensPorCategoria,
        };
      })
      .filter((c): c is ClienteFiltrado => Boolean(c))
      .sort((a, b) => {
        if (b.totalVendas !== a.totalVendas) return b.totalVendas - a.totalVendas;
        const dataA = a.ultimoContato ? new Date(a.ultimoContato).getTime() : 0;
        const dataB = b.ultimoContato ? new Date(b.ultimoContato).getTime() : 0;
        return dataB - dataA;
      });
  }, [clientes, dataInicio, dataFim, filtroCategoria, filtroPagamento, filtroNome, filtroCpf]);

  const topClientes = clientesFiltrados.slice(0, 3);

  const loading = loadingAtendimentos;
  const hasError = Boolean(erroAtendimentos);

  const renderData = (value: string | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return format(parsed, "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  if (!isAdmin) {
    return (
      <MainLayout title="Clientes">
        <Card className="border-destructive/50">
          <CardHeader className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle>Acesso restrito</CardTitle>
          </CardHeader>
          <CardContent>
            Esta área é exclusiva para administradores.
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  if (hasError) {
    console.error("Erro ao carregar dados do ranking", erroVendas || erroAtendimentos);
    return (
      <MainLayout title="Ranking de Clientes">
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Erro ao carregar dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Verifique a conexão com o Supabase ou se o usuário tem permissão para ler atendimentos.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                refetchAtendimentos();
              }}>
                Tentar novamente
              </Button>
              <Button variant="secondary" onClick={() => navigate("/recepcao")}>Voltar</Button>
            </div>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Ranking de Clientes">
      <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes do Cadastro</h1>
          <p className="text-muted-foreground">Ranking de compras (atendimentos) e histórico detalhado para admins</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/recepcao")}>Voltar</Button>
          <Button variant="secondary" onClick={() => {
            setDataInicio("");
            setDataFim("");
            setFiltroNome("");
            setFiltroCpf("");
            setFiltroCategoria("qualquer");
            setFiltroPagamento("qualquer");
          }}>
            Limpar filtros
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle>Filtros</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Data início</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Data fim</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input placeholder="Buscar cliente" value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>CPF</Label>
            <Input placeholder="Somente números" value={filtroCpf} onChange={(e) => setFiltroCpf(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Pagamento da avaliação</Label>
            <Select value={filtroPagamento} onValueChange={setFiltroPagamento}>
              <SelectTrigger>
                <SelectValue placeholder="Qualquer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="qualquer">Qualquer</SelectItem>
                {pagamentosAvaliacao.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Categoria vendida</Label>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Qualquer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="qualquer">Qualquer</SelectItem>
                {categoriasDisponiveis.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-amber-800">Top 1</CardTitle>
            <Users className="h-4 w-4 text-amber-700" />
          </CardHeader>
          <CardContent>
            {topClientes[0] ? (
              <div>
                <p className="text-xl font-bold text-amber-900">{topClientes[0].nome}</p>
                <p className="text-sm text-amber-700">{topClientes[0].totalVendas} compras</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-blue-800">Top 2</CardTitle>
            <Users className="h-4 w-4 text-blue-700" />
          </CardHeader>
          <CardContent>
            {topClientes[1] ? (
              <div>
                <p className="text-xl font-bold text-blue-900">{topClientes[1].nome}</p>
                <p className="text-sm text-blue-700">{topClientes[1].totalVendas} compras</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-emerald-800">Top 3</CardTitle>
            <Users className="h-4 w-4 text-emerald-700" />
          </CardHeader>
          <CardContent>
            {topClientes[2] ? (
              <div>
                <p className="text-xl font-bold text-emerald-900">{topClientes[2].nome}</p>
                <p className="text-sm text-emerald-700">{topClientes[2].totalVendas} compras</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes filtrados ({clientesFiltrados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando dados...</div>
          ) : clientesFiltrados.length === 0 ? (
            <p className="text-muted-foreground">Nenhum cliente encontrado com os filtros atuais.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead className="text-right">Qtd. compras</TableHead>
                  <TableHead className="text-right">Total pago</TableHead>
                  <TableHead className="text-right">Último contato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientesFiltrados.map((cliente) => {
                  const aberto = clienteAberto === cliente.key;
                  return (
                    <Fragment key={cliente.key}>
                      <TableRow className="hover:bg-muted/40 cursor-pointer" onClick={() => setClienteAberto(aberto ? null : cliente.key)}>
                        <TableCell className="font-semibold flex items-center gap-2">
                          {cliente.nome}
                          <Badge variant="secondary">{cliente.historicoFiltrado.length} registros</Badge>
                        </TableCell>
                        <TableCell>{cliente.cpf || "-"}</TableCell>
                        <TableCell className="text-right">{cliente.totalVendas}</TableCell>
                        <TableCell className="text-right">{moedaBRL.format(cliente.totalValor)}</TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-1">
                          <span>{renderData(cliente.ultimoContato)}</span>
                          {aberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </TableCell>
                      </TableRow>
                      {aberto && (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(cliente.itensPorCategoria).map(([nome, quantidade]) => (
                                  <Badge key={nome} variant="outline">{nome}: {quantidade}</Badge>
                                ))}
                                {Object.keys(cliente.itensPorCategoria).length === 0 && (
                                  <span className="text-sm text-muted-foreground">Sem itens registrados</span>
                                )}
                              </div>
                              <div className="overflow-x-auto rounded-md border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Data</TableHead>
                                      <TableHead>Tipo</TableHead>
                                      <TableHead>Valor</TableHead>
                                      <TableHead>Pagamento</TableHead>
                                      <TableHead>Itens por categoria</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {cliente.historicoFiltrado.map((evt) => (
                                      <TableRow key={evt.id}>
                                        <TableCell className="whitespace-nowrap">{renderData(evt.data)}</TableCell>
                                        <TableCell>Compra</TableCell>
                                        <TableCell>{moedaBRL.format(evt.valor || 0)}</TableCell>
                                        <TableCell>
                                          <div className="flex flex-wrap gap-1">
                                            {evt.pagamentos.length > 0 ? evt.pagamentos.map((p) => (
                                              <Badge key={p} variant="secondary">{p}</Badge>
                                            )) : <span className="text-xs text-muted-foreground">-</span>}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex flex-wrap gap-1">
                                            {evt.categorias.length > 0 ? evt.categorias.map((cat) => (
                                              <Badge key={`${evt.id}-${cat.nome}`} variant="outline">{cat.nome}: {cat.quantidade}</Badge>
                                            )) : <span className="text-xs text-muted-foreground">-</span>}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
