import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { startOfMonth, endOfMonth, endOfDay, isToday, format, isSameDay, parseISO, startOfWeek, endOfWeek, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, BarChart3, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { convertToLocalTime } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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

export default function PerformanceVendas() {
  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);

  const [periodo, setPeriodo] = useState<DateRange>({ from: startOfDay(hoje), to: startOfDay(hoje) });
  const [allVendas, setAllVendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const quickRanges = {
    hoje: { from: startOfDay(hoje), to: startOfDay(hoje) },
    semana: { from: startOfWeek(hoje, { weekStartsOn: 1 }), to: endOfWeek(hoje, { weekStartsOn: 1 }) },
    mes: { from: inicioMes, to: fimMes }
  } as const;

  const applyQuickRange = (key: keyof typeof quickRanges) => {
    const range = quickRanges[key];
    setPeriodo({ from: range.from, to: range.to });
  };

  const isQuickRangeActive = (key: keyof typeof quickRanges) => {
    const range = quickRanges[key];
    return (
      periodo?.from && periodo?.to &&
      isSameDay(periodo.from, range.from) &&
      isSameDay(periodo.to, range.to)
    );
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const inicio = periodo?.from ? periodo.from : inicioMes;
      const fim = periodo?.to ? periodo.to : fimMes;

      const { data: vendas } = await supabase
        .from("vendas")
        .select("*")
        .gte("created_at", inicio.toISOString())
        .lte("created_at", endOfDay(fim).toISOString());

      // Pegar IDs das vendas do período
      const vendaIds = (vendas || []).map(v => v.id);

      // Buscar itens APENAS das vendas deste período
      let itensVenda: any[] = [];
      if (vendaIds.length > 0) {
        const { data } = await supabase
          .from("venda_itens")
          .select("venda_id, quantidade, item_categories(*)")
          .in("venda_id", vendaIds);
        itensVenda = data || [];
      }

      // Armazenar itens por venda_id
      const itensPorVenda = new Map<string, any[]>();
      (itensVenda || []).forEach((item) => {
        const list = itensPorVenda.get(item.venda_id) || [];
        list.push({
          quantidade: item.quantidade,
          categoria: item.item_categories as any
        });
        itensPorVenda.set(item.venda_id, list);
      });

      // Adicionar itens às vendas
      const vendasComItens = (vendas || []).map((v) => ({
        ...v,
        itens: itensPorVenda.get(v.id) || []
      }));

      setAllVendas(vendasComItens);
      setLoading(false);
    }
    fetchData();
  }, [periodo]);

  // Métricas de vendedoras (exatamente como no Dashboard)
  const salesMetrics = useMemo(() => {
    const vendedorasMap = new Map();

    allVendas.forEach((venda) => {
      const nome = venda.vendedora_nome || "Sem vendedora";
      const valor = Number(venda.valor_total_venda || 0);
      const ehHoje = isSameDay(parseISO(venda.created_at), hoje);

      const current = vendedorasMap.get(nome) || {
        valorMes: 0,
        qtdMes: 0,
        valorHoje: 0,
        qtdHoje: 0
      };

      current.valorMes += valor;
      current.qtdMes += 1;

      if (ehHoje) {
        current.valorHoje += valor;
        current.qtdHoje += 1;
      }

      vendedorasMap.set(nome, current);
    });

    const vendedorasData = Array.from(vendedorasMap, ([nome, data]) => ({
      nome,
      ...data,
      ticketMedio: data.qtdMes > 0 ? data.valorMes / data.qtdMes : 0
    })).sort((a, b) => b.valorMes - a.valorMes);

    return { vendedorasData };
  }, [allVendas]);

  // Processar dados de categorias por vendedora
  const categoriasPorVendedora = useMemo(() => {
    const vendedorasMap: Record<string, any> = {};

    allVendas.forEach((venda) => {
      const vendedora = venda.vendedora_nome || "Sem vendedora";

      if (!vendedorasMap[vendedora]) {
        vendedorasMap[vendedora] = {
          sapatinhos: { qtdItens: 0, qtdVendas: 0 },
          fantasias: { qtdItens: 0, qtdVendas: 0 },
          enxoval: { qtdItens: 0, qtdVendas: 0 }
        };
      }

      // Processar itens da venda
      (venda.itens || []).forEach((item: any) => {
        const slug = item.categoria?.slug?.toLowerCase().trim() || "";
        const quantidade = Number(item.quantidade || 0);

        if (slug.includes("calcados") || slug.includes("sapato")) {
          vendedorasMap[vendedora].sapatinhos.qtdItens += quantidade;
          vendedorasMap[vendedora].sapatinhos.qtdVendas += 1;
        } else if (slug.includes("fantasia")) {
          vendedorasMap[vendedora].fantasias.qtdItens += quantidade;
          vendedorasMap[vendedora].fantasias.qtdVendas += 1;
        } else if (slug.includes("enxoval")) {
          vendedorasMap[vendedora].enxoval.qtdItens += quantidade;
          vendedorasMap[vendedora].enxoval.qtdVendas += 1;
        }
      });
    });

    return vendedorasMap;
  }, [allVendas]);

  // Processar P.A e distribuição de itens por venda
  const peAsDistribuicao = useMemo(() => {
    const vendedorasMap: Record<string, any> = {};

    allVendas.forEach((venda) => {
      const vendedora = venda.vendedora_nome || "Sem vendedora";

      if (!vendedorasMap[vendedora]) {
        vendedorasMap[vendedora] = {
          totalItens: 0,
          totalVendas: 0,
          um_item: 0,
          dois_a_tres_itens: 0,
          quatro_a_dez: 0,
          acima_dez: 0
        };
      }

      // Contar total de itens nesta venda
      let qtdItensVenda = 0;
      (venda.itens || []).forEach((item: any) => {
        qtdItensVenda += Number(item.quantidade || 0);
      });

      // Atualizar totais
      vendedorasMap[vendedora].totalItens += qtdItensVenda;
      vendedorasMap[vendedora].totalVendas += 1;

      // Distribuir em faixas
      if (qtdItensVenda === 1) {
        vendedorasMap[vendedora].um_item += 1;
      } else if (qtdItensVenda >= 2 && qtdItensVenda <= 3) {
        vendedorasMap[vendedora].dois_a_tres_itens += 1;
      } else if (qtdItensVenda >= 4 && qtdItensVenda <= 10) {
        vendedorasMap[vendedora].quatro_a_dez += 1;
      } else if (qtdItensVenda > 10) {
        vendedorasMap[vendedora].acima_dez += 1;
      }
    });

    // Calcular P.A
    return Object.entries(vendedorasMap).reduce((acc, [nome, data]) => {
      acc[nome] = {
        ...data,
        pa: data.totalVendas > 0 ? (data.totalItens / data.totalVendas).toFixed(2) : "0.00"
      };
      return acc;
    }, {} as Record<string, any>);
  }, [allVendas]);

  if (loading) {
    return (
      <MainLayout title="Performance de Vendas">
        <div className="flex justify-center items-center h-96">
          <p className="text-lg text-muted-foreground">Carregando dados...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Performance de Vendas">
      <div className="space-y-6">
        {/* Cabeçalho com seletor de período */}
        <div className="flex flex-col justify-between items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Performance de Vendas</h2>
            <p className="text-muted-foreground">{format(hoje, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
          </div>

          {/* Seletor de período universal */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={isQuickRangeActive("hoje") ? "default" : "outline"}
              onClick={() => applyQuickRange("hoje")}
            >
              Hoje
            </Button>
            <Button
              size="sm"
              variant={isQuickRangeActive("semana") ? "default" : "outline"}
              onClick={() => applyQuickRange("semana")}
            >
              Semana
            </Button>
            <Button
              size="sm"
              variant={isQuickRangeActive("mes") ? "default" : "outline"}
              onClick={() => applyQuickRange("mes")}
            >
              Mês
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[260px] justify-start text-left font-normal">
                  {periodo?.from && periodo?.to
                    ? `${format(periodo.from, "dd/MM/yyyy", { locale: ptBR })} — ${format(periodo.to, "dd/MM/yyyy", { locale: ptBR })}`
                    : "Selecionar período"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={periodo?.from}
                  selected={periodo}
                  onSelect={(range: DateRange | undefined) => {
                    if (range?.from && range?.to) {
                      setPeriodo(range);
                    }
                  }}
                  disabled={(date) => date > hoje}
                  locale={ptBR}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Gráficos de Categorias por Vendedora (3 colunas) */}
        {(() => {
          const vendedoras = salesMetrics.vendedorasData;
          const cards = [];

          // Adicionar "Oportunidades Perdidas" (Sem vendedora) - esquerda - SEMPRE
          const oportunidadesPerdidas = categoriasPorVendedora["Sem vendedora"] || {
            sapatinhos: { qtdItens: 0, qtdVendas: 0 },
            fantasias: { qtdItens: 0, qtdVendas: 0 },
            enxoval: { qtdItens: 0, qtdVendas: 0 }
          };
          cards.push({
            nome: "Oportunidades Perdidas",
            dados: oportunidadesPerdidas,
            key: "oportunidades"
          });

          // Adicionar Vendedora 1
          if (vendedoras[0]) {
            cards.push({
              nome: vendedoras[0].nome,
              dados: categoriasPorVendedora[vendedoras[0].nome] || {
                sapatinhos: { qtdItens: 0, qtdVendas: 0 },
                fantasias: { qtdItens: 0, qtdVendas: 0 },
                enxoval: { qtdItens: 0, qtdVendas: 0 }
              },
              key: "vendedora1"
            });
          }

          // Adicionar Vendedora 2
          if (vendedoras[1]) {
            cards.push({
              nome: vendedoras[1].nome,
              dados: categoriasPorVendedora[vendedoras[1].nome] || {
                sapatinhos: { qtdItens: 0, qtdVendas: 0 },
                fantasias: { qtdItens: 0, qtdVendas: 0 },
                enxoval: { qtdItens: 0, qtdVendas: 0 }
              },
              key: "vendedora2"
            });
          }

          // Adicionar Vendedora 4 (se existir)
          if (vendedoras[3]) {
            cards.push({
              nome: vendedoras[3].nome,
              dados: categoriasPorVendedora[vendedoras[3].nome] || {
                sapatinhos: { qtdItens: 0, qtdVendas: 0 },
                fantasias: { qtdItens: 0, qtdVendas: 0 },
                enxoval: { qtdItens: 0, qtdVendas: 0 }
              },
              key: "vendedora4"
            });
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((card) => {
                // Preparar dados para o gráfico horizontal
                const chartData = [
                  {
                    categoria: "Sapatinhos",
                    "Qtd Itens": card.dados?.sapatinhos?.qtdItens || 0,
                    "Qtd Vendas": card.dados?.sapatinhos?.qtdVendas || 0
                  },
                  {
                    categoria: "Fantasias",
                    "Qtd Itens": card.dados?.fantasias?.qtdItens || 0,
                    "Qtd Vendas": card.dados?.fantasias?.qtdVendas || 0
                  },
                  {
                    categoria: "Enxoval",
                    "Qtd Itens": card.dados?.enxoval?.qtdItens || 0,
                    "Qtd Vendas": card.dados?.enxoval?.qtdVendas || 0
                  }
                ];

                return (
                  <Card key={card.key}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{card.nome}</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" />
                          <YAxis dataKey="categoria" type="category" width={75} tick={{ fontSize: 12 }} />
                          <Tooltip content={<CustomTooltip type="number" />} />
                          <Legend />
                          <Bar dataKey="Qtd Itens" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                          <Bar dataKey="Qtd Vendas" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })()}

        {/* Cards de Vendedoras com Desempenho */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {salesMetrics.vendedorasData.map((vendedora, index) => {
            const maxValorMes = Math.max(...salesMetrics.vendedorasData.map(v => v.valorMes));
            const maxQtdMes = Math.max(...salesMetrics.vendedorasData.map(v => v.qtdMes));
            const maxValorHoje = Math.max(...salesMetrics.vendedorasData.map(v => v.valorHoje));
            const maxQtdHoje = Math.max(...salesMetrics.vendedorasData.map(v => v.qtdHoje));

            return (
              <Card key={index} className="border-2 hover:shadow-lg transition-all">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                      {vendedora.nome.charAt(0)}
                    </div>
                    <div className="text-base font-bold">{vendedora.nome}</div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Valor Total Mês */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-600">Valor Total - Mês</span>
                        <span className="text-sm font-bold text-blue-700">{formatCurrency(vendedora.valorMes)}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                          style={{ width: `${Math.min((vendedora.valorMes / Math.max(...salesMetrics.vendedorasData.map(v => v.valorMes)) * 100), 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Quantidade Mês */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-600">Quantidade - Mês</span>
                        <span className="text-sm font-bold text-purple-700">{vendedora.qtdMes} vendas</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-500"
                          style={{ width: `${Math.min((vendedora.qtdMes / Math.max(...salesMetrics.vendedorasData.map(v => v.qtdMes)) * 100), 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Distribuição de Itens por Venda */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-gray-700">Vendas com Poucos Itens</div>
                      
                      {/* 1 Item */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-600">Vendas com 1 item</span>
                          <span className="text-xs font-bold text-gray-700">{peAsDistribuicao[vendedora.nome]?.um_item || 0}</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all duration-500"
                            style={{ width: `${(peAsDistribuicao[vendedora.nome]?.um_item || 0) / (vendedora.qtdMes || 1) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* 2 a 3 Itens */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-600">Vendas com 2 a 3 itens</span>
                          <span className="text-xs font-bold text-gray-700">{peAsDistribuicao[vendedora.nome]?.dois_a_tres_itens || 0}</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all duration-500"
                            style={{ width: `${(peAsDistribuicao[vendedora.nome]?.dois_a_tres_itens || 0) / (vendedora.qtdMes || 1) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* 4 a 10 Itens */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-600">Vendas com 4 a 10 itens</span>
                          <span className="text-xs font-bold text-gray-700">{peAsDistribuicao[vendedora.nome]?.quatro_a_dez || 0}</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 transition-all duration-500"
                            style={{ width: `${(peAsDistribuicao[vendedora.nome]?.quatro_a_dez || 0) / (vendedora.qtdMes || 1) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Acima de 10 Itens */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-600">Vendas acima de 10 itens</span>
                          <span className="text-xs font-bold text-gray-700">{peAsDistribuicao[vendedora.nome]?.acima_dez || 0}</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 transition-all duration-500"
                            style={{ width: `${(peAsDistribuicao[vendedora.nome]?.acima_dez || 0) / (vendedora.qtdMes || 1) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* P.A + Ticket Médio */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div className="bg-orange-50 p-2 rounded">
                        <div className="text-[10px] text-orange-700 font-semibold">P.A</div>
                        <div className="text-lg font-bold text-orange-900">{peAsDistribuicao[vendedora.nome]?.pa || "0.00"}</div>
                        <div className="text-[9px] text-orange-600 mt-0.5">peças/venda</div>
                      </div>
                      <div className="bg-indigo-50 p-2 rounded">
                        <div className="text-[10px] text-indigo-700 font-semibold">Ticket Médio</div>
                        <div className="text-lg font-bold text-indigo-900">{formatCurrency(vendedora.ticketMedio)}</div>
                        <div className="text-[9px] text-indigo-600 mt-0.5">por venda</div>
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

        {/* Gráficos de Performance de Vendas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <BarChart data={salesMetrics.vendedorasData}>
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
                <BarChart data={salesMetrics.vendedorasData}>
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

        {/* Gráfico Performance da Equipe */}
        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center">
              <Users className="w-5" /> Performance da Equipe (Vendas)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesMetrics.vendedorasData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="nome" angle={-15} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="valorMes" name="Valor Total" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                <Bar dataKey="valorHoje" name="Valor Hoje" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
