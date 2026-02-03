import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { startOfMonth, endOfMonth, endOfDay, format, startOfWeek, endOfWeek, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, BarChart3, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import type { DateRange } from "react-day-picker";

const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const CustomTooltip = ({ active, payload, label, type = "currency" }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-xl z-50">
        <p className="font-bold text-gray-700 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-600 capitalize">{entry.name}: {type === "currency" ? formatCurrency(entry.value) : `${entry.value} un`}</span>
          </div>
        ))}
        {payload.length > 1 && type === "currency" && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="font-bold text-gray-800">
              Total: {formatCurrency(payload.reduce((acc: any, curr: any) => acc + curr.value, 0))}
            </p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function PerfilVendas() {
  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);

  // Seletor de período (mês inteiro por padrão)
  const [periodo, setPeriodo] = useState<DateRange>({ from: inicioMes, to: fimMes });

  const quickRanges = {
    hoje: {
      from: startOfDay(hoje),
      to: startOfDay(hoje)
    },
    semana: {
      from: startOfWeek(hoje, { weekStartsOn: 1 }),
      to: endOfWeek(hoje, { weekStartsOn: 1 })
    },
    mes: {
      from: inicioMes,
      to: fimMes
    }
  } as const;

  const applyQuickRange = (key: keyof typeof quickRanges) => {
    const range = quickRanges[key];
    setPeriodo({ from: range.from, to: range.to });
  };

  // Buscar vendas do período
  const { data: allVendas = [] } = useQuery({
    queryKey: ["vendas_perfil", periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .gte("created_at", periodo.from?.toISOString() || inicioMes.toISOString())
        .lte("created_at", periodo.to?.toISOString() || fimMes.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Calcular métricas de vendedoras
  const salesMetricsMes = useMemo(() => {
    const vendedoras: Record<string, any> = {};

    allVendas.forEach((venda) => {
      const nome = venda.colaborador_nome || "Sem vendedor";
      if (!vendedoras[nome]) {
        vendedoras[nome] = {
          nome,
          valorMes: 0,
          qtdMes: 0,
          valorHoje: 0,
          qtdHoje: 0,
          ticketMedio: 0,
        };
      }

      const valor = venda.valor_total || 0;
      vendedoras[nome].valorMes += valor;
      vendedoras[nome].qtdMes += 1;

      const dataVenda = new Date(venda.created_at);
      const ehHoje = dataVenda.toDateString() === new Date().toDateString();
      if (ehHoje) {
        vendedoras[nome].valorHoje += valor;
        vendedoras[nome].qtdHoje += 1;
      }
    });

    const vendedorasData = Object.values(vendedoras).map((v) => ({
      ...v,
      ticketMedio: v.qtdMes > 0 ? v.valorMes / v.qtdMes : 0,
    }));

    return {
      vendedorasData: vendedorasData.sort((a, b) => b.valorMes - a.valorMes),
    };
  }, [allVendas]);

  return (
    <MainLayout title="Perfil Vendas">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Perfil de Vendas</h1>
          <p className="text-muted-foreground">Análise detalhada de desempenho por vendedora</p>
        </div>

        {/* Botões Rápidos de Período */}
        <div className="flex gap-2">
          <Button
            variant={periodo.from?.toDateString() === quickRanges.hoje.from.toDateString() ? "default" : "outline"}
            onClick={() => applyQuickRange("hoje")}
          >
            Hoje
          </Button>
          <Button
            variant={periodo.from?.toDateString() === quickRanges.semana.from.toDateString() ? "default" : "outline"}
            onClick={() => applyQuickRange("semana")}
          >
            Semana
          </Button>
          <Button
            variant={periodo.from?.toDateString() === quickRanges.mes.from.toDateString() ? "default" : "outline"}
            onClick={() => applyQuickRange("mes")}
          >
            Mês
          </Button>
        </div>

        {/* === GRÁFICOS DE BARRAS: VALOR E QUANTIDADE POR VENDEDORA === */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Gráfico: Total de Vendas por Vendedora */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex gap-2 items-center">
                <TrendingUp className="w-4" /> Total de Vendas por Vendedora
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Período: {periodo?.from && periodo?.to ? `${format(periodo.from, "dd/MM/yyyy", { locale: ptBR })} — ${format(periodo.to, "dd/MM/yyyy", { locale: ptBR })}` : "Mês atual"}
              </p>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesMetricsMes.vendedorasData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nome" angle={-15} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="valorMes" name="Valor Total" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico: Quantidade de Vendas por Vendedora */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex gap-2 items-center">
                <BarChart3 className="w-4" /> Quantidade de Vendas por Vendedora
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Período: {periodo?.from && periodo?.to ? `${format(periodo.from, "dd/MM/yyyy", { locale: ptBR })} — ${format(periodo.to, "dd/MM/yyyy", { locale: ptBR })}` : "Mês atual"}
              </p>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesMetricsMes.vendedorasData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nome" angle={-15} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip type="number" />} />
                  <Bar dataKey="qtdMes" name="Quantidade" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* === CARDS DE VENDEDORAS COM P.A === */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {salesMetricsMes.vendedorasData.map((vendedora, index) => {
            // Calcular P.A (Peças por Atendimento)
            const totalItensVendidos = allVendas
              .filter((v) => v.colaborador_nome === vendedora.nome)
              .reduce((sum, v) => sum + (v.qtd_item || 0), 0);
            const pa = vendedora.qtdMes > 0 ? (totalItensVendidos / vendedora.qtdMes).toFixed(2) : "0.00";

            return (
              <Card key={index} className="border-2 hover:shadow-lg transition-all">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                      {vendedora.nome.charAt(0)}
                    </div>
                    <div>
                      <div className="text-base font-bold">{vendedora.nome}</div>
                      <div className="text-xs text-gray-500">Ticket Médio: {formatCurrency(vendedora.ticketMedio)}</div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Valor Total */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-600">Valor Total</span>
                        <span className="text-sm font-bold text-blue-700">{formatCurrency(vendedora.valorMes)}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                          style={{ width: `${Math.min((vendedora.valorMes / Math.max(...salesMetricsMes.vendedorasData.map((v) => v.valorMes)) * 100), 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Quantidade */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-600">Quantidade</span>
                        <span className="text-sm font-bold text-purple-700">{vendedora.qtdMes} vendas</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-500"
                          style={{ width: `${Math.min((vendedora.qtdMes / Math.max(...salesMetricsMes.vendedorasData.map((v) => v.qtdMes)) * 100), 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* P.A (Peças por Atendimento) */}
                    <div className="bg-amber-50 p-2 rounded border border-amber-200">
                      <div className="text-xs text-amber-700 font-semibold mb-1">P.A (Peças por Atendimento)</div>
                      <div className="text-2xl font-bold text-amber-900">{pa}</div>
                      <div className="text-xs text-amber-600 mt-1">
                        {totalItensVendidos} peças / {vendedora.qtdMes} vendas
                      </div>
                    </div>

                    {/* Valor Hoje */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div className="bg-green-50 p-2 rounded">
                        <div className="text-[10px] text-gray-600">Hoje - Valor</div>
                        <div className="text-sm font-bold text-green-700">{formatCurrency(vendedora.valorHoje)}</div>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <div className="text-[10px] text-gray-600">Hoje - Qtd</div>
                        <div className="text-sm font-bold text-green-700">{vendedora.qtdHoje}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* === GRÁFICOS DE CATEGORIAS POR VENDEDORA === */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Quantidade de Calçados, Fantasias e São João por Vendedora */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex gap-2 items-center">
                <Package className="w-4" /> Categorias por Vendedora
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Período: {periodo?.from && periodo?.to ? `${format(periodo.from, "dd/MM/yyyy", { locale: ptBR })} — ${format(periodo.to, "dd/MM/yyyy", { locale: ptBR })}` : "Mês atual"}
              </p>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(() => {
                    return salesMetricsMes.vendedorasData.map((vendedora) => {
                      const vendasVendedora = allVendas.filter((v) => v.colaborador_nome === vendedora.nome);
                      const calcados = vendasVendedora.reduce((sum, v) => sum + (v.categoria_item?.toLowerCase() === "calçados" ? v.qtd_item || 0 : 0), 0);
                      const fantasias = vendasVendedora.reduce((sum, v) => sum + (v.categoria_item?.toLowerCase() === "fantasias" ? v.qtd_item || 0 : 0), 0);
                      const saoJoao = vendasVendedora.reduce((sum, v) => sum + (v.categoria_item?.toLowerCase() === "são joão" ? v.qtd_item || 0 : 0), 0);

                      return {
                        nome: vendedora.nome,
                        Calçados: calcados,
                        Fantasias: fantasias,
                        "São João": saoJoao,
                      };
                    });
                  })()}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nome" angle={-15} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip type="number" />} />
                  <Legend />
                  <Bar dataKey="Calçados" fill="#0088FE" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="Fantasias" fill="#00C49F" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="São João" fill="#FFBB28" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* P.A por Categoria por Vendedora */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex gap-2 items-center">
                <BarChart3 className="w-4" /> P.A por Categoria
              </CardTitle>
              <p className="text-xs text-muted-foreground">Peças por Atendimento por Categoria</p>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(() => {
                    return salesMetricsMes.vendedorasData.map((vendedora) => {
                      const vendasVendedora = allVendas.filter((v) => v.colaborador_nome === vendedora.nome);
                      const qtdVendas = vendedora.qtdMes;

                      const calcados = vendasVendedora.reduce((sum, v) => sum + (v.categoria_item?.toLowerCase() === "calçados" ? v.qtd_item || 0 : 0), 0);
                      const fantasias = vendasVendedora.reduce((sum, v) => sum + (v.categoria_item?.toLowerCase() === "fantasias" ? v.qtd_item || 0 : 0), 0);
                      const saoJoao = vendasVendedora.reduce((sum, v) => sum + (v.categoria_item?.toLowerCase() === "são joão" ? v.qtd_item || 0 : 0), 0);

                      return {
                        nome: vendedora.nome,
                        "PA Calçados": qtdVendas > 0 ? parseFloat((calcados / qtdVendas).toFixed(2)) : 0,
                        "PA Fantasias": qtdVendas > 0 ? parseFloat((fantasias / qtdVendas).toFixed(2)) : 0,
                        "PA São João": qtdVendas > 0 ? parseFloat((saoJoao / qtdVendas).toFixed(2)) : 0,
                      };
                    });
                  })()}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nome" angle={-15} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip type="number" />} />
                  <Legend />
                  <Bar dataKey="PA Calçados" fill="#0088FE" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="PA Fantasias" fill="#00C49F" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="PA São João" fill="#FFBB28" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* === GRÁFICO DE PICO DE VENDAS === */}
        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center">
              <TrendingUp className="w-5" /> Pico de Vendas por Hora
            </CardTitle>
            <p className="text-xs text-muted-foreground">Distribuição de vendas ao longo do dia</p>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(() => {
                  // Agrupar vendas por hora
                  const vendasPorHora: Record<number, number> = {};
                  for (let i = 0; i < 24; i++) {
                    vendasPorHora[i] = 0;
                  }

                  allVendas.forEach((venda) => {
                    if (venda.created_at) {
                      const hora = new Date(venda.created_at).getHours();
                      vendasPorHora[hora]++;
                    }
                  });

                  // Converter para array para o gráfico
                  return Object.entries(vendasPorHora).map(([hora, qtd]) => ({
                    hora: `${parseInt(hora).toString().padStart(2, "0")}h`,
                    vendas: qtd,
                  }));
                })()}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hora" />
                <YAxis />
                <Tooltip content={<CustomTooltip type="number" />} />
                <Bar dataKey="vendas" name="Vendas" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
