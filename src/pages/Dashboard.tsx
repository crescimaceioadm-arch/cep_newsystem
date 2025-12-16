import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { format, subDays, startOfDay, endOfDay, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CalendarIcon, 
  ShoppingBag, 
  ShoppingCart, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  Package
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { DateRange } from "react-day-picker";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const COLORS = ["#8b5cf6", "#22c55e", "#f59e0b", "#3b82f6", "#ef4444", "#6b7280"];

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const [metaVenda, setMetaVenda] = useState(() => 
    localStorage.getItem("dashboard_meta_venda") || ""
  );
  const [metaCompra, setMetaCompra] = useState(() => 
    localStorage.getItem("dashboard_meta_compra") || ""
  );

  const [salesData, setSalesData] = useState<any[]>([]);
  const [allAtendimentos, setAllAtendimentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem("dashboard_meta_venda", metaVenda);
  }, [metaVenda]);

  useEffect(() => {
    localStorage.setItem("dashboard_meta_compra", metaCompra);
  }, [metaCompra]);

  useEffect(() => {
    async function fetchData() {
      if (!dateRange?.from || !dateRange?.to) return;
      
      setLoading(true);
      
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();

      const { data: vendas } = await supabase
        .from("vendas")
        .select("*")
        .gte("data_venda", startDate)
        .lte("data_venda", endDate);

      setSalesData(vendas || []);

      // Buscar TODOS os atendimentos do período (não só finalizados)
      const { data: atendimentos } = await supabase
        .from("atendimentos")
        .select("*")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      setAllAtendimentos(atendimentos || []);
      setLoading(false);
    }

    fetchData();
  }, [dateRange]);

  // Cálculos de KPIs
  const kpis = useMemo(() => {
    const finalizados = allAtendimentos.filter(a => a.status === "finalizado");
    const recusados = allAtendimentos.filter(a => a.status === "recusado");

    // Entrada de peças (compras finalizadas)
    const entradaPecas = finalizados.reduce((acc, a) => {
      return acc + 
        (a.qtd_baby || 0) + 
        (a.qtd_1_a_16 || 0) + 
        (a.qtd_calcados || 0) + 
        (a.qtd_brinquedos || 0) + 
        (a.qtd_itens_medios || 0) + 
        (a.qtd_itens_grandes || 0);
    }, 0);

    // Saída de peças (vendas)
    const saidaPecas = salesData.reduce((acc, v) => {
      return acc + 
        (v.qtd_baby || 0) + 
        (v.qtd_1_a_16 || 0) + 
        (v.qtd_calcados || 0) + 
        (v.qtd_brinquedos || 0) + 
        (v.qtd_itens_medios || 0) + 
        (v.qtd_itens_grandes || 0);
    }, 0);

    // Total gasto em compras
    const totalGasto = finalizados.reduce((acc, a) => acc + (a.valor_total_negociado || 0), 0);

    // Taxa de conversão
    const totalAvaliacoes = allAtendimentos.length;
    const taxaConversao = totalAvaliacoes > 0 
      ? ((finalizados.length / totalAvaliacoes) * 100).toFixed(1) 
      : "0";

    // Tempo médio geral (apenas para finalizados com hora_encerramento)
    const temposValidos = finalizados
      .filter(a => a.hora_chegada && a.hora_encerramento)
      .map(a => differenceInMinutes(new Date(a.hora_encerramento), new Date(a.hora_chegada)));
    
    const tempoMedioGeral = temposValidos.length > 0 
      ? Math.round(temposValidos.reduce((a, b) => a + b, 0) / temposValidos.length)
      : 0;

    // Recusas por motivo
    const recusaLoja = recusados.filter(a => a.motivo_recusa === "loja").length;
    const recusaCliente = recusados.filter(a => a.motivo_recusa === "cliente").length;
    const recusaNaoEspec = recusados.filter(a => !a.motivo_recusa).length;

    // Peças por categoria (compradas)
    const pecasPorCategoria = {
      baby: finalizados.reduce((acc, a) => acc + (a.qtd_baby || 0), 0),
      infantil: finalizados.reduce((acc, a) => acc + (a.qtd_1_a_16 || 0), 0),
      calcados: finalizados.reduce((acc, a) => acc + (a.qtd_calcados || 0), 0),
      brinquedos: finalizados.reduce((acc, a) => acc + (a.qtd_brinquedos || 0), 0),
    };

    // Performance por avaliadora
    const avaliadoras = new Map<string, { qtd: number; tempos: number[]; total: number }>();
    finalizados.forEach(a => {
      const nome = a.avaliadora_nome || "Não especificada";
      const current = avaliadoras.get(nome) || { qtd: 0, tempos: [], total: 0 };
      current.qtd++;
      current.total += (a.valor_total_negociado || 0);
      if (a.hora_chegada && a.hora_encerramento) {
        current.tempos.push(differenceInMinutes(new Date(a.hora_encerramento), new Date(a.hora_chegada)));
      }
      avaliadoras.set(nome, current);
    });

    const performanceAvaliadoras = Array.from(avaliadoras.entries()).map(([nome, data]) => ({
      nome,
      qtd: data.qtd,
      tempoMedio: data.tempos.length > 0 
        ? Math.round(data.tempos.reduce((a, b) => a + b, 0) / data.tempos.length)
        : 0,
      total: data.total,
    })).sort((a, b) => b.qtd - a.qtd);

    return {
      entradaPecas,
      saidaPecas,
      balancoPecas: entradaPecas - saidaPecas,
      totalGasto,
      totalAvaliacoes,
      finalizados: finalizados.length,
      taxaConversao,
      tempoMedioGeral,
      recusaLoja,
      recusaCliente,
      recusaNaoEspec,
      pecasPorCategoria,
      performanceAvaliadoras,
    };
  }, [allAtendimentos, salesData]);

  // Dados para gráficos
  const recusasChartData = [
    { name: "Recusado Loja", value: kpis.recusaLoja },
    { name: "Recusado Cliente", value: kpis.recusaCliente },
    { name: "Não Especificado", value: kpis.recusaNaoEspec },
  ].filter(d => d.value > 0);

  const categoriasChartData = [
    { name: "Baby", value: kpis.pecasPorCategoria.baby },
    { name: "Infantil (1-16)", value: kpis.pecasPorCategoria.infantil },
    { name: "Calçados", value: kpis.pecasPorCategoria.calcados },
    { name: "Brinquedos", value: kpis.pecasPorCategoria.brinquedos },
  ].filter(d => d.value > 0);

  const handleMetaBlur = (setter: (v: string) => void, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setter(num.toFixed(2));
    }
  };

  return (
    <MainLayout title="Dashboard Gerencial">
      <div className="space-y-6">
        {/* Filtros e Metas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Configurações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Período de Análise</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                            {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                          </>
                        ) : (
                          format(dateRange.from, "dd/MM/yy", { locale: ptBR })
                        )
                      ) : (
                        <span>Selecione</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaVenda">Meta Venda (R$)</Label>
                <Input
                  id="metaVenda"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={metaVenda}
                  onChange={(e) => setMetaVenda(e.target.value)}
                  onBlur={() => handleMetaBlur(setMetaVenda, metaVenda)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaCompra">Meta Compra (R$)</Label>
                <Input
                  id="metaCompra"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={metaCompra}
                  onChange={(e) => setMetaCompra(e.target.value)}
                  onBlur={() => handleMetaBlur(setMetaCompra, metaCompra)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs - Balanço de Estoque */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Entrada (Compradas)
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-8 w-16 bg-muted rounded" />
              ) : (
                <div className="text-3xl font-bold text-green-600">{kpis.entradaPecas}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">peças adquiridas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saída (Vendidas)
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-8 w-16 bg-muted rounded" />
              ) : (
                <div className="text-3xl font-bold text-red-600">{kpis.saidaPecas}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">peças vendidas</p>
            </CardContent>
          </Card>

          <Card className={cn(
            "border-2",
            kpis.balancoPecas >= 0 ? "border-green-500/30" : "border-red-500/30"
          )}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Balanço de Estoque
              </CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-8 w-16 bg-muted rounded" />
              ) : (
                <div className={cn(
                  "text-3xl font-bold",
                  kpis.balancoPecas >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {kpis.balancoPecas >= 0 ? "+" : ""}{kpis.balancoPecas}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">diferença no período</p>
            </CardContent>
          </Card>
        </div>

        {/* KPIs - Financeiro e Eficiência */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Gasto (R$)
              </CardTitle>
              <ShoppingBag className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-8 w-20 bg-muted rounded" />
              ) : (
                <div className="text-2xl font-bold">
                  R$ {kpis.totalGasto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Dinheiro + PIX + Gira</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Avaliações
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-8 w-16 bg-muted rounded" />
              ) : (
                <div className="text-2xl font-bold">{kpis.totalAvaliacoes}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">{kpis.finalizados} finalizados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taxa de Conversão
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-8 w-16 bg-muted rounded" />
              ) : (
                <div className="text-2xl font-bold">{kpis.taxaConversao}%</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">viraram compra</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tempo Médio
              </CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-8 w-16 bg-muted rounded" />
              ) : (
                <div className="text-2xl font-bold">{kpis.tempoMedioGeral} min</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">por atendimento</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* BarChart - Recusas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                Motivos de Recusa
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-[250px] bg-muted rounded" />
              ) : recusasChartData.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Nenhuma recusa no período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={recusasChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* PieChart - Categorias */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Peças por Categoria (Compradas)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-[250px] bg-muted rounded" />
              ) : categoriasChartData.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Nenhuma compra no período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoriasChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoriasChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Performance por Avaliadora</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse h-32 bg-muted rounded" />
            ) : kpis.performanceAvaliadoras.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">
                Nenhum dado de avaliadora no período
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Avaliadora</TableHead>
                    <TableHead className="text-center">Qtd Avaliações</TableHead>
                    <TableHead className="text-center">Tempo Médio</TableHead>
                    <TableHead className="text-right">Total Comprado (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpis.performanceAvaliadoras.map((av) => (
                    <TableRow key={av.nome}>
                      <TableCell className="font-medium">{av.nome}</TableCell>
                      <TableCell className="text-center">{av.qtd}</TableCell>
                      <TableCell className="text-center">{av.tempoMedio} min</TableCell>
                      <TableCell className="text-right">
                        R$ {av.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
