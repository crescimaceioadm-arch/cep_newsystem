import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startOfMonth, endOfMonth, endOfDay, isToday, format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Crown, Users, TrendingUp, DollarSign, ShoppingBag, Package, CreditCard, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEstoque } from "@/hooks/useEstoque";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ptBR as dayPickerPtBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

// --- UTILITÁRIOS ---
const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// --- CORES (Mantendo as suas originais + Novas para vendas) ---
const COLORS = { 
  dinheiro: "#34d399", 
  gira: "#f7ca43",      
  recusado: "#f87171", 
  estoque: "#7da4ff",  
  compras: "#fbbf24",  
  vendas: "#8884d8",   // Nova cor para vendas
  qtd: "#82ca9d"       // Nova cor para qtd
};
const PIE_COLORS = ["#fbbf24", "#7da4ff", "#34d399", "#f7ca43", "#f87171", "#a78bfa"];
const SALES_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

// --- TOOLTIP PERSONALIZADO (SEU ORIGINAL) ---
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

export default function Dashboard() {
  const [allAtendimentos, setAllAtendimentos] = useState<any[]>([]);
  const [allVendas, setAllVendas] = useState<any[]>([]); // Estado Novo para Vendas
  const [loading, setLoading] = useState(true);
  const { data: estoque } = useEstoque();

  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);

    // Seletor de período (mês atual por padrão)
    const [periodo, setPeriodo] = useState<DateRange>({ from: inicioMes, to: fimMes });

  // --- FETCH DE DADOS (JUNTOS MAS SEPARADOS) ---
    useEffect(() => {
    async function fetchData() {
      setLoading(true);
            const inicio = periodo?.from ? periodo.from : inicioMes;
            const fim = periodo?.to ? periodo.to : fimMes;

            // 1. Busca Atendimentos
            // 1a. Finalizados usando a data de fechamento/encerramento dentro do período
            const { data: atendFinalizados } = await supabase
                .from("atendimentos")
                .select("*")
                .eq("status", "finalizado")
                .gte("hora_encerramento", inicio.toISOString())
                .lte("hora_encerramento", endOfDay(fim).toISOString());

            // 1b. Recusados usando a data de fechamento/encerramento dentro do período
            const { data: atendRecusados } = await supabase
                .from("atendimentos")
                .select("*")
                .eq("status", "recusado")
                .gte("hora_encerramento", inicio.toISOString())
                .lte("hora_encerramento", endOfDay(fim).toISOString());

            // 1c. Demais atendimentos (não-finalizados e não-recusados) usando a data de criação dentro do período
            const { data: atendOutros } = await supabase
                .from("atendimentos")
                .select("*")
                .neq("status", "finalizado")
                .neq("status", "recusado")
                .gte("created_at", inicio.toISOString())
                .lte("created_at", endOfDay(fim).toISOString());

      // 2. Busca Vendas (Novo código)
      const { data: vendas } = await supabase
        .from("vendas")
        .select("*")
                .gte("created_at", inicio.toISOString())
                .lte("created_at", endOfDay(fim).toISOString());

    setAllAtendimentos([...(atendFinalizados || []), ...(atendRecusados || []), ...(atendOutros || [])]);
      setAllVendas(vendas || []);
      setLoading(false);
    }
    fetchData();
    }, [periodo]);

  // ==================================================================================
  // LÓGICA 1: COMPRAS E AVALIAÇÕES (SEU CÓDIGO ORIGINAL INTACTO)
  // ==================================================================================
  
  const classificarPagamento = (item: any): "dinheiro" | "gira" => {
    const textoBusca = [
      item.pagamento_1_metodo, 
      item.pagamento_2_metodo, 
      item.pagamento_3_metodo, 
      item.pagamento_4_metodo,
      item.tipo_pagamento, 
      item.observacao
    ].join(" ").toLowerCase();
    
    const termosGira = ["gira", "crédito", "credito", "troca", "voucher", "permuta"];
    
    if (termosGira.some(termo => textoBusca.includes(termo))) {
      return "gira";
    }
    return "dinheiro";
  };

  const metrics = useMemo(() => {
        const finalizadosMes = allAtendimentos.filter(a => a.status === "finalizado");
        const finalizadosHoje = finalizadosMes.filter(a => {
            const dataFechamento = a.hora_encerramento || a.created_at;
            return dataFechamento ? isToday(new Date(dataFechamento)) : false;
        });
    const recusadosMes = allAtendimentos.filter(a => a.status === "recusado");

    const calcularTotais = (lista: any[]) => {
      let d = { dinheiro: 0, gira: 0, qtdDinheiro: 0, qtdGira: 0 };
      lista.forEach(item => {
        const val = Number(item.valor_total_negociado || 0);
        if (val > 0) {
            if (classificarPagamento(item) === "gira") { 
                d.gira += val; 
                d.qtdGira++; 
            } else { 
                d.dinheiro += val; 
                d.qtdDinheiro++; 
            }
        }
      });
      return { ...d, total: d.dinheiro + d.gira };
    };

    const metricasHoje = calcularTotais(finalizadosHoje);
    const metricasMes = calcularTotais(finalizadosMes);

    const mapAv = new Map();
    finalizadosMes.forEach(a => {
        const nome = a.avaliadora_nome || "N/A";
        const val = Number(a.valor_total_negociado || 0);
        const curr = mapAv.get(nome) || { d:0, g:0, r:0, valG:0 };
        if (classificarPagamento(a) === "gira") { curr.g++; curr.valG += val; } else { curr.d++; }
        mapAv.set(nome, curr);
    });
    recusadosMes.forEach(a => {
        const nome = a.avaliadora_nome || "N/A";
        const curr = mapAv.get(nome) || { d:0, g:0, r:0, valG:0 };
        curr.r++;
        mapAv.set(nome, curr);
    });
    
    const performanceData = Array.from(mapAv.entries()).map(([n, d]) => ({
        nome: n, aprovadoDinheiro: d.d, aprovadoGira: d.g, recusado: d.r, totalGiraValor: d.valG, total: d.d+d.g+d.r
    })).sort((a,b) => b.total - a.total);

    let rainha = { nome: "-", valor: 0, percentual: 0 };
    performanceData.forEach(d => {
        if(d.totalGiraValor > rainha.valor) rainha = { nome: d.nome, valor: d.totalGiraValor, percentual: ((d.aprovadoGira/(d.aprovadoDinheiro+d.aprovadoGira))*100)||0 };
    });

    const pieData = [
       { name: "Baby", value: finalizadosMes.reduce((acc, curr) => acc + (curr.qtd_baby || 0), 0) },
       { name: "Infantil", value: finalizadosMes.reduce((acc, curr) => acc + (curr.qtd_1_a_16 || 0), 0) },
       { name: "Calçados", value: finalizadosMes.reduce((acc, curr) => acc + (curr.qtd_calcados || 0), 0) },
       { name: "Brinquedos", value: finalizadosMes.reduce((acc, curr) => acc + (curr.qtd_brinquedos || 0), 0) },
    ].filter(d => d.value > 0);

    const comprasPorCat = {
        baby: finalizadosMes.reduce((acc, a) => acc + (a.qtd_baby || 0), 0),
        infantil: finalizadosMes.reduce((acc, a) => acc + (a.qtd_1_a_16 || 0), 0),
    };

    return { metricasHoje, metricasMes, performanceData, rainha, comprasPorCat, pieData };
  }, [allAtendimentos]);

  const dataFinanceiro = [
    { name: "Mês", dinheiro: metrics.metricasMes.dinheiro, gira: metrics.metricasMes.gira },
    { name: "Hoje", dinheiro: metrics.metricasHoje.dinheiro, gira: metrics.metricasHoje.gira },
  ];
  const dataQtd = [
    { name: "Mês", dinheiro: metrics.metricasMes.qtdDinheiro, gira: metrics.metricasMes.qtdGira },
    { name: "Hoje", dinheiro: metrics.metricasHoje.qtdDinheiro, gira: metrics.metricasHoje.qtdGira },
  ];
  
  const dataComparativo = [
    { name: "Baby", compras: metrics.comprasPorCat.baby, estoque: 0 },
    { name: "Infantil", compras: metrics.comprasPorCat.infantil, estoque: 0 },
  ];

  if (estoque) {
    estoque.forEach(e => {
        const cat = e.categoria.toLowerCase();
        if (cat.includes("baby")) dataComparativo[0].estoque = e.quantidade_atual;
        if (cat.includes("infantil") || cat.includes("16")) dataComparativo[1].estoque = e.quantidade_atual;
    });
  }

  // ==================================================================================
  // LÓGICA 2: VENDAS (NOVA LÓGICA EXPANDIDA)
  // ==================================================================================
  
  const salesMetrics = useMemo(() => {
    const vendasHoje = allVendas.filter(v => isSameDay(parseISO(v.created_at), hoje));

    // === KPIs PRINCIPAIS ===
    const totalVendidoHoje = vendasHoje.reduce((acc, curr) => acc + Number(curr.valor_total_venda || 0), 0);
    const totalVendidoMes = allVendas.reduce((acc, curr) => acc + Number(curr.valor_total_venda || 0), 0);
    const qtdVendasHoje = vendasHoje.length;
    const qtdVendasMes = allVendas.length;
    
    // === CONTAGEM DE PEÇAS POR CATEGORIA ===
    const contarPecasPorCategoria = (lista: any[]) => ({
      baby: lista.reduce((acc, curr) => acc + (curr.qtd_baby_vendida || 0), 0),
      infantil: lista.reduce((acc, curr) => acc + (curr.qtd_1_a_16_vendida || 0), 0),
      calcados: lista.reduce((acc, curr) => acc + (curr.qtd_calcados_vendida || 0), 0),
      brinquedos: lista.reduce((acc, curr) => acc + (curr.qtd_brinquedos_vendida || 0), 0),
      itens_medios: lista.reduce((acc, curr) => acc + (curr.qtd_itens_medios_vendida || 0), 0),
      itens_grandes: lista.reduce((acc, curr) => acc + (curr.qtd_itens_grandes_vendida || 0), 0),
    });
    
    const pecasHoje = contarPecasPorCategoria(vendasHoje);
    const pecasMes = contarPecasPorCategoria(allVendas);
    
    const totalPecasHoje = Object.values(pecasHoje).reduce((a, b) => a + b, 0);
    const totalPecasMes = Object.values(pecasMes).reduce((a, b) => a + b, 0);

    // === TICKET MÉDIO ===
    const ticketMedioGeral = qtdVendasMes > 0 ? totalVendidoMes / qtdVendasMes : 0;

    // === VENDAS POR VENDEDORA (DIA E MÊS) ===
    const vendedorasMap = new Map();
    
    allVendas.forEach(venda => {
        const nome = venda.vendedora_nome || "Sem Vendedora";
        const valor = Number(venda.valor_total_venda || 0);
        const ehHoje = isSameDay(parseISO(venda.created_at), hoje);
        
        const current = vendedorasMap.get(nome) || { 
          valorMes: 0, qtdMes: 0, valorHoje: 0, qtdHoje: 0 
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

    // === VENDAS EM GIRA-CRÉDITO ===
    let totalGiraCreditoMes = 0;
    let totalGiraCreditoHoje = 0;
    
    allVendas.forEach(venda => {
      const ehHoje = isSameDay(parseISO(venda.created_at), hoje);
      let valorGiraVenda = 0;
      
      // Verificar nos 3 métodos de pagamento
      [
        { metodo: venda.metodo_pagto_1, valor: venda.valor_pagto_1 },
        { metodo: venda.metodo_pagto_2, valor: venda.valor_pagto_2 },
        { metodo: venda.metodo_pagto_3, valor: venda.valor_pagto_3 },
      ].forEach(pag => {
        const metodo = (pag.metodo || "").toLowerCase();
        if (metodo.includes("gira") || metodo.includes("crédito") || metodo.includes("credito")) {
          valorGiraVenda += Number(pag.valor || 0);
        }
      });
      
      totalGiraCreditoMes += valorGiraVenda;
      if (ehHoje) {
        totalGiraCreditoHoje += valorGiraVenda;
      }
    });

    // === PICOS DE VENDAS POR HORÁRIO ===
    const vendasPorHora = new Map();
    allVendas.forEach(venda => {
      const hora = new Date(venda.created_at).getHours();
      const faixaHoraria = `${hora}h`;
      const valor = Number(venda.valor_total_venda || 0);
      vendasPorHora.set(faixaHoraria, (vendasPorHora.get(faixaHoraria) || 0) + valor);
    });
    
    const picosHorarios = Array.from(vendasPorHora, ([hora, valor]) => ({ 
      hora, 
      valor 
    })).sort((a, b) => {
      const horaA = parseInt(a.hora);
      const horaB = parseInt(b.hora);
      return horaA - horaB;
    });

    return { 
      totalVendidoHoje, 
      totalVendidoMes, 
      qtdVendasHoje,
      qtdVendasMes,
      pecasHoje,
      pecasMes,
      totalPecasHoje,
      totalPecasMes,
      ticketMedioGeral,
      vendedorasData,
      totalGiraCreditoMes,
      totalGiraCreditoHoje,
      picosHorarios
    };
  }, [allVendas, hoje]);

    // === Gráfico de barras: dias do mês (vendas vs gastos em dinheiro de avaliações) ===
    const barDiasMesData = useMemo(() => {
        const diasNoMes = fimMes.getDate();
        const data: { dia: string; vendido: number; gasto: number }[] = [];

        for (let d = 1; d <= diasNoMes; d++) {
            const dataDia = new Date(inicioMes.getFullYear(), inicioMes.getMonth(), d);

            const vendido = allVendas
                .filter((v) => isSameDay(parseISO(v.created_at), dataDia))
                .reduce((acc, v) => acc + Number(v.valor_total_venda || 0), 0);

                        const gasto = allAtendimentos
                                .filter((a) => {
                                    if (a.status !== "finalizado") return false;
                                    const dataRef = a.hora_encerramento || a.created_at;
                                    return dataRef ? isSameDay(parseISO(dataRef), dataDia) : false;
                                })
                                .reduce((acc, a) => acc + (classificarPagamento(a) === "dinheiro" ? Number(a.valor_total_negociado || 0) : 0), 0);

            data.push({ dia: String(d).padStart(2, "0"), vendido, gasto });
        }

        return data;
    }, [allVendas, allAtendimentos, inicioMes, fimMes]);

    // Totais do mês para o donut: vendas vs gastos em dinheiro (avaliações)
    const donutResumoMes = useMemo(() => {
        const totalVendasMes = salesMetrics.totalVendidoMes;
        const totalGastosDinheiroMes = allAtendimentos
            .filter((a) => a.status === "finalizado")
            .reduce((acc, a) => acc + (classificarPagamento(a) === "dinheiro" ? Number(a.valor_total_negociado || 0) : 0), 0);

        const percentual = totalVendasMes > 0 ? (totalGastosDinheiroMes / totalVendasMes) * 100 : 0;

        const data = [
            { name: "Gastos em dinheiro", value: totalGastosDinheiroMes, color: "#ef4444" },
            { name: "Demais vendas", value: Math.max(totalVendasMes - totalGastosDinheiroMes, 0), color: "#22c55e" },
        ];

        return { totalVendasMes, totalGastosDinheiroMes, percentual, data };
    }, [salesMetrics.totalVendidoMes, allAtendimentos]);

    // Tabela de gasto em dinheiro por grupos de avaliações (com base no período selecionado)
    const tabelaGastos = useMemo(() => {
        const finalizadosPeriodo = allAtendimentos.filter((a) => a.status === "finalizado");

        const ehDinheiro = (a: any) => classificarPagamento(a) === "dinheiro";

        const grupoGrandes = finalizadosPeriodo.filter((a) => (a.qtd_itens_grandes || 0) > 0);
        const grupoMediosOuBrinquedos = finalizadosPeriodo.filter(
            (a) => (a.qtd_itens_grandes || 0) === 0 && ((a.qtd_itens_medios || 0) > 0 || (a.qtd_brinquedos || 0) > 0)
        );
        const grupoRoupasESapatos = finalizadosPeriodo.filter((a) => {
            const grandes = (a.qtd_itens_grandes || 0) > 0;
            const medios = (a.qtd_itens_medios || 0) > 0;
            const brinquedos = (a.qtd_brinquedos || 0) > 0;
            const roupasOuSapatos = ((a.qtd_baby || 0) + (a.qtd_1_a_16 || 0) + (a.qtd_calcados || 0)) > 0;
            return !grandes && !medios && !brinquedos && roupasOuSapatos;
        });

        const totalGrupo = (lista: any[]) =>
            lista.filter(ehDinheiro).reduce((acc, a) => acc + Number(a.valor_total_negociado || 0), 0);

        const rows = [
            { categoria: "Com itens grandes", total: totalGrupo(grupoGrandes), quantidade: grupoGrandes.filter(ehDinheiro).length },
            { categoria: "Sem grandes, com médios ou brinquedos", total: totalGrupo(grupoMediosOuBrinquedos), quantidade: grupoMediosOuBrinquedos.filter(ehDinheiro).length },
            { categoria: "Só roupas/sapatos", total: totalGrupo(grupoRoupasESapatos), quantidade: grupoRoupasESapatos.filter(ehDinheiro).length },
        ];

        const totalGeral = rows.reduce((acc, r) => acc + r.total, 0);
        return { rows, totalGeral };
    }, [allAtendimentos]);


  // ==================================================================================
  // RENDERIZAÇÃO (TABS)
  // ==================================================================================
  return (
    <MainLayout title="Dashboard Estratégico">
      <div className="space-y-8 pb-10">
                {/* Gráficos no topo: à esquerda o donut de resumo; à direita barras por dia */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr items-stretch">
                    {/* Donut de resumo mensal */}
                    <Card className="h-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Resumo do mês: Vendas vs Gastos em dinheiro</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col md:flex-row items-center md:items-stretch gap-6 h-full">
                                <div className="w-full max-w-[260px] h-[260px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={donutResumoMes.data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
                                                {donutResumoMes.data.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip type="currency" />} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-2 flex-1">
                                    <div className="text-sm text-muted-foreground">Total de vendas no mês</div>
                                    <div className="text-2xl font-bold">{formatCurrency(donutResumoMes.totalVendasMes)}</div>
                                    <div className="text-sm text-muted-foreground">Gastos em dinheiro (avaliações)</div>
                                    <div className="text-lg font-semibold text-red-600">{formatCurrency(donutResumoMes.totalGastosDinheiroMes)}</div>
                                    <div className="text-sm text-muted-foreground">Percentual dos gastos sobre vendas</div>
                                    <div className="text-lg font-semibold">{donutResumoMes.percentual.toFixed(1)}%</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Gráfico mensal de Vendas vs Gastos (barras por dia) */}
                    <Card className="h-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Vendas (verde) vs Gastos em dinheiro (vermelho) - Mês</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[320px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barDiasMesData} margin={{ left: 8, right: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="dia" />
                                        <YAxis />
                                        <Tooltip content={<CustomTooltip type="currency" />} />
                                        <Legend />
                                        <Bar dataKey="vendido" name="Vendido" fill="#22c55e" />
                                        <Bar dataKey="gasto" name="Gastos (avaliações)" fill="#ef4444" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Visão Geral</h2>
            <p className="text-muted-foreground">{format(hoje, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
          </div>
        </div>

                {/* Seletor de período + Tabela de gastos por tipo de avaliação */}
                <Card>
                    <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <CardTitle className="text-sm font-medium">Gasto em dinheiro por tipo de avaliação</CardTitle>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-[260px] justify-start text-left font-normal">
                                    {periodo?.from && periodo?.to
                                        ? `${format(periodo.from, "dd/MM/yyyy", { locale: ptBR })} — ${format(periodo.to, "dd/MM/yyyy", { locale: ptBR })}`
                                        : "Selecionar período"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="range"
                                    selected={periodo as any}
                                    onSelect={(range) => setPeriodo(range as DateRange)}
                                    defaultMonth={periodo?.from || inicioMes}
                                    locale={ptBR}
                                    numberOfMonths={2}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Categoria</TableHead>
                                        <TableHead className="text-right">Total em dinheiro</TableHead>
                                        <TableHead className="text-right">Nº avaliações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tabelaGastos.rows.map((row) => (
                                        <TableRow key={row.categoria}>
                                            <TableCell>{row.categoria}</TableCell>
                                            <TableCell className="text-right font-semibold">{formatCurrency(row.total)}</TableCell>
                                            <TableCell className="text-right">{row.quantidade}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell className="font-medium">Total</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(tabelaGastos.totalGeral)}</TableCell>
                                        <TableCell className="text-right">{tabelaGastos.rows.reduce((a, r) => a + r.quantidade, 0)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

        {/* --- AQUI COMEÇA O SISTEMA DE ABAS --- */}
        <Tabs defaultValue="vendas" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:w-[400px] mb-6">
                <TabsTrigger value="vendas">Resultados de Vendas</TabsTrigger>
                <TabsTrigger value="compras">Resultados de Compras</TabsTrigger>
            </TabsList>

            {/* --- ABA 1: VENDAS (COMPLETA) --- */}
            <TabsContent value="vendas" className="space-y-6 animate-in fade-in-50">
                
                {/* === RESUMO GERAL NO TOPO === */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-blue-200 bg-blue-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-blue-700">💰 Valor Total - Mês</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-900">{formatCurrency(salesMetrics.totalVendidoMes)}</div>
                            <p className="text-xs text-blue-600 mt-1">{salesMetrics.qtdVendasMes} vendas realizadas</p>
                        </CardContent>
                    </Card>
                    
                    <Card className="border-green-200 bg-green-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-green-700">💵 Valor Total - Hoje</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-900">{formatCurrency(salesMetrics.totalVendidoHoje)}</div>
                            <p className="text-xs text-green-600 mt-1">{salesMetrics.qtdVendasHoje} vendas hoje</p>
                        </CardContent>
                    </Card>
                    
                    <Card className="border-purple-200 bg-purple-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-purple-700">📦 Peças Vendidas - Mês</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-purple-900">{salesMetrics.totalPecasMes}</div>
                            <p className="text-xs text-purple-600 mt-1">peças em {salesMetrics.qtdVendasMes} vendas</p>
                        </CardContent>
                    </Card>
                    
                    <Card className="border-orange-200 bg-orange-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-orange-700">🎯 Peças Vendidas - Hoje</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-orange-900">{salesMetrics.totalPecasHoje}</div>
                            <p className="text-xs text-orange-600 mt-1">peças em {salesMetrics.qtdVendasHoje} vendas</p>
                        </CardContent>
                    </Card>
                </div>

                {/* === PROPORÇÃO GIRA-CRÉDITO (BARRAS HORIZONTAIS) === */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Barra do Mês */}
                    <Card className="border-blue-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center justify-between">
                                <span>Proporção de Pagamentos - Mês</span>
                                <span className="text-xs text-gray-500">{formatCurrency(salesMetrics.totalVendidoMes)}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {/* Barra de progresso */}
                                <div className="relative w-full h-12 bg-gray-200 rounded-lg overflow-hidden shadow-inner">
                                    <div 
                                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold transition-all duration-500"
                                        style={{ width: `${salesMetrics.totalVendidoMes > 0 ? ((salesMetrics.totalVendidoMes - salesMetrics.totalGiraCreditoMes) / salesMetrics.totalVendidoMes * 100) : 0}%` }}
                                    >
                                        {salesMetrics.totalVendidoMes > 0 && ((salesMetrics.totalVendidoMes - salesMetrics.totalGiraCreditoMes) / salesMetrics.totalVendidoMes * 100).toFixed(1)}%
                                    </div>
                                    <div 
                                        className="absolute right-0 top-0 h-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold transition-all duration-500"
                                        style={{ width: `${salesMetrics.totalVendidoMes > 0 ? (salesMetrics.totalGiraCreditoMes / salesMetrics.totalVendidoMes * 100) : 0}%` }}
                                    >
                                        {salesMetrics.totalVendidoMes > 0 && (salesMetrics.totalGiraCreditoMes / salesMetrics.totalVendidoMes * 100).toFixed(1)}%
                                    </div>
                                </div>
                                
                                {/* Legenda */}
                                <div className="flex justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-blue-600 rounded"></div>
                                        <span className="text-gray-700">Outras Formas: <strong>{formatCurrency(salesMetrics.totalVendidoMes - salesMetrics.totalGiraCreditoMes)}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-amber-600 rounded"></div>
                                        <span className="text-gray-700">Gira-Crédito: <strong>{formatCurrency(salesMetrics.totalGiraCreditoMes)}</strong></span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Barra de Hoje */}
                    <Card className="border-green-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center justify-between">
                                <span>Proporção de Pagamentos - Hoje</span>
                                <span className="text-xs text-gray-500">{formatCurrency(salesMetrics.totalVendidoHoje)}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {/* Barra de progresso */}
                                <div className="relative w-full h-12 bg-gray-200 rounded-lg overflow-hidden shadow-inner">
                                    <div 
                                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-white font-bold transition-all duration-500"
                                        style={{ width: `${salesMetrics.totalVendidoHoje > 0 ? ((salesMetrics.totalVendidoHoje - salesMetrics.totalGiraCreditoHoje) / salesMetrics.totalVendidoHoje * 100) : 0}%` }}
                                    >
                                        {salesMetrics.totalVendidoHoje > 0 && ((salesMetrics.totalVendidoHoje - salesMetrics.totalGiraCreditoHoje) / salesMetrics.totalVendidoHoje * 100).toFixed(1)}%
                                    </div>
                                    <div 
                                        className="absolute right-0 top-0 h-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold transition-all duration-500"
                                        style={{ width: `${salesMetrics.totalVendidoHoje > 0 ? (salesMetrics.totalGiraCreditoHoje / salesMetrics.totalVendidoHoje * 100) : 0}%` }}
                                    >
                                        {salesMetrics.totalVendidoHoje > 0 && (salesMetrics.totalGiraCreditoHoje / salesMetrics.totalVendidoHoje * 100).toFixed(1)}%
                                    </div>
                                </div>
                                
                                {/* Legenda */}
                                <div className="flex justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-green-600 rounded"></div>
                                        <span className="text-gray-700">Outras Formas: <strong>{formatCurrency(salesMetrics.totalVendidoHoje - salesMetrics.totalGiraCreditoHoje)}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-amber-600 rounded"></div>
                                        <span className="text-gray-700">Gira-Crédito: <strong>{formatCurrency(salesMetrics.totalGiraCreditoHoje)}</strong></span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* === PEÇAS POR CATEGORIA (GRÁFICO) === */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex gap-2 items-center"><Package className="w-5"/> Peças Vendidas por Categoria</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { categoria: 'Baby', Mês: salesMetrics.pecasMes.baby, Hoje: salesMetrics.pecasHoje.baby },
                                { categoria: 'Infantil', Mês: salesMetrics.pecasMes.infantil, Hoje: salesMetrics.pecasHoje.infantil },
                                { categoria: 'Calçados', Mês: salesMetrics.pecasMes.calcados, Hoje: salesMetrics.pecasHoje.calcados },
                                { categoria: 'Brinquedos', Mês: salesMetrics.pecasMes.brinquedos, Hoje: salesMetrics.pecasHoje.brinquedos },
                                { categoria: 'Itens Médios', Mês: salesMetrics.pecasMes.itens_medios, Hoje: salesMetrics.pecasHoje.itens_medios },
                                { categoria: 'Itens Grandes', Mês: salesMetrics.pecasMes.itens_grandes, Hoje: salesMetrics.pecasHoje.itens_grandes },
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="categoria" angle={-15} textAnchor="end" height={80} />
                                <YAxis />
                                <Tooltip content={<CustomTooltip type="number" />} />
                                <Legend />
                                <Bar dataKey="Mês" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Hoje" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* === TICKET MÉDIO === */}
                <Card className="border-teal-200 bg-teal-50">
                    <CardHeader>
                        <CardTitle className="flex gap-2 items-center text-teal-800">
                            <DollarSign className="w-5"/> Ticket Médio Geral
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-teal-900">{formatCurrency(salesMetrics.ticketMedioGeral)}</div>
                        <p className="text-sm text-teal-700 mt-2">Valor médio por venda no mês</p>
                    </CardContent>
                </Card>

                {/* === DESEMPENHO POR VENDEDORA === */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex gap-2 items-center"><Users className="w-5"/> Desempenho por Vendedora</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {salesMetrics.vendedorasData.map((vendedora, index) => (
                                <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-lg">{vendedora.nome}</h3>
                                            <p className="text-sm text-gray-600">Ticket Médio: {formatCurrency(vendedora.ticketMedio)}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-blue-50 p-3 rounded">
                                            <div className="text-xs text-gray-600">Valor - Mês</div>
                                            <div className="text-lg font-bold text-blue-700">{formatCurrency(vendedora.valorMes)}</div>
                                        </div>
                                        <div className="bg-blue-50 p-3 rounded">
                                            <div className="text-xs text-gray-600">Qtd - Mês</div>
                                            <div className="text-lg font-bold text-blue-700">{vendedora.qtdMes} vendas</div>
                                        </div>
                                        <div className="bg-green-50 p-3 rounded">
                                            <div className="text-xs text-gray-600">Valor - Hoje</div>
                                            <div className="text-lg font-bold text-green-700">{formatCurrency(vendedora.valorHoje)}</div>
                                        </div>
                                        <div className="bg-green-50 p-3 rounded">
                                            <div className="text-xs text-gray-600">Qtd - Hoje</div>
                                            <div className="text-lg font-bold text-green-700">{vendedora.qtdHoje} vendas</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* === PICOS DE VENDAS POR HORÁRIO === */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex gap-2 items-center"><BarChart3 className="w-5"/> Picos de Vendas por Horário (Mês)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salesMetrics.picosHorarios}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="hora" />
                                <YAxis />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="valor" name="Valor Vendido" fill="#0088FE" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* --- ABA 2: COMPRAS (REFORMULADA) --- */}
            <TabsContent value="compras" className="space-y-6 animate-in fade-in-50">
                
                {/* === RESUMO GERAL NO TOPO === */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-blue-200 bg-blue-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-blue-700">💰 Valor Total - Mês</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-900">{formatCurrency(metrics.metricasMes.total)}</div>
                            <p className="text-xs text-blue-600 mt-1">{metrics.metricasMes.qtdDinheiro + metrics.metricasMes.qtdGira} compras realizadas</p>
                        </CardContent>
                    </Card>
                    
                    <Card className="border-green-200 bg-green-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-green-700">💵 Valor Total - Hoje</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-900">{formatCurrency(metrics.metricasHoje.total)}</div>
                            <p className="text-xs text-green-600 mt-1">{metrics.metricasHoje.qtdDinheiro + metrics.metricasHoje.qtdGira} compras hoje</p>
                        </CardContent>
                    </Card>
                    
                    <Card className="border-purple-200 bg-purple-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-purple-700">🛍️ Quantidade - Mês</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-purple-900">{metrics.metricasMes.qtdDinheiro + metrics.metricasMes.qtdGira}</div>
                            <p className="text-xs text-purple-600 mt-1">atendimentos finalizados</p>
                        </CardContent>
                    </Card>
                    
                    <Card className="border-orange-200 bg-orange-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-orange-700">🎯 Quantidade - Hoje</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-orange-900">{metrics.metricasHoje.qtdDinheiro + metrics.metricasHoje.qtdGira}</div>
                            <p className="text-xs text-orange-600 mt-1">atendimentos finalizados</p>
                        </CardContent>
                    </Card>
                </div>

                {/* === PROPORÇÃO DINHEIRO VS GIRA === */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Barra do Mês */}
                    <Card className="border-blue-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center justify-between">
                                <span>Proporção de Pagamentos - Mês</span>
                                <span className="text-xs text-gray-500">{formatCurrency(metrics.metricasMes.total)}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {/* Barra de progresso */}
                                <div className="relative w-full h-12 bg-gray-200 rounded-lg overflow-hidden shadow-inner">
                                    <div 
                                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold transition-all duration-500"
                                        style={{ width: `${metrics.metricasMes.total > 0 ? (metrics.metricasMes.dinheiro / metrics.metricasMes.total * 100) : 0}%` }}
                                    >
                                        {metrics.metricasMes.total > 0 && (metrics.metricasMes.dinheiro / metrics.metricasMes.total * 100).toFixed(1)}%
                                    </div>
                                    <div 
                                        className="absolute right-0 top-0 h-full bg-gradient-to-r from-yellow-500 to-yellow-600 flex items-center justify-center text-white font-bold transition-all duration-500"
                                        style={{ width: `${metrics.metricasMes.total > 0 ? (metrics.metricasMes.gira / metrics.metricasMes.total * 100) : 0}%` }}
                                    >
                                        {metrics.metricasMes.total > 0 && (metrics.metricasMes.gira / metrics.metricasMes.total * 100).toFixed(1)}%
                                    </div>
                                </div>
                                
                                {/* Legenda */}
                                <div className="flex justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-emerald-600 rounded"></div>
                                        <span className="text-gray-700">Dinheiro/PIX: <strong>{formatCurrency(metrics.metricasMes.dinheiro)}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-yellow-600 rounded"></div>
                                        <span className="text-gray-700">Gira-Crédito: <strong>{formatCurrency(metrics.metricasMes.gira)}</strong></span>
                                    </div>
                                </div>
                                
                                {/* Info adicional */}
                                <div className="flex justify-between text-xs text-gray-600 pt-2 border-t">
                                    <span>{metrics.metricasMes.qtdDinheiro} compras em dinheiro</span>
                                    <span>{metrics.metricasMes.qtdGira} compras em gira</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Barra de Hoje */}
                    <Card className="border-green-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center justify-between">
                                <span>Proporção de Pagamentos - Hoje</span>
                                <span className="text-xs text-gray-500">{formatCurrency(metrics.metricasHoje.total)}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {/* Barra de progresso */}
                                <div className="relative w-full h-12 bg-gray-200 rounded-lg overflow-hidden shadow-inner">
                                    <div 
                                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold transition-all duration-500"
                                        style={{ width: `${metrics.metricasHoje.total > 0 ? (metrics.metricasHoje.dinheiro / metrics.metricasHoje.total * 100) : 0}%` }}
                                    >
                                        {metrics.metricasHoje.total > 0 && (metrics.metricasHoje.dinheiro / metrics.metricasHoje.total * 100).toFixed(1)}%
                                    </div>
                                    <div 
                                        className="absolute right-0 top-0 h-full bg-gradient-to-r from-yellow-500 to-yellow-600 flex items-center justify-center text-white font-bold transition-all duration-500"
                                        style={{ width: `${metrics.metricasHoje.total > 0 ? (metrics.metricasHoje.gira / metrics.metricasHoje.total * 100) : 0}%` }}
                                    >
                                        {metrics.metricasHoje.total > 0 && (metrics.metricasHoje.gira / metrics.metricasHoje.total * 100).toFixed(1)}%
                                    </div>
                                </div>
                                
                                {/* Legenda */}
                                <div className="flex justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-emerald-600 rounded"></div>
                                        <span className="text-gray-700">Dinheiro/PIX: <strong>{formatCurrency(metrics.metricasHoje.dinheiro)}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-yellow-600 rounded"></div>
                                        <span className="text-gray-700">Gira-Crédito: <strong>{formatCurrency(metrics.metricasHoje.gira)}</strong></span>
                                    </div>
                                </div>
                                
                                {/* Info adicional */}
                                <div className="flex justify-between text-xs text-gray-600 pt-2 border-t">
                                    <span>{metrics.metricasHoje.qtdDinheiro} compras em dinheiro</span>
                                    <span>{metrics.metricasHoje.qtdGira} compras em gira</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card><CardHeader><CardTitle className="text-sm flex gap-2"><Package className="w-4"/> Mix de Peças (Mês)</CardTitle></CardHeader>
                    <CardContent className="h-64">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={metrics.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {metrics.pieData.map((_, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card><CardHeader><CardTitle className="text-sm flex gap-2"><TrendingUp className="w-4"/> Compras vs Estoque</CardTitle></CardHeader>
                    <CardContent className="h-64">
                      <ResponsiveContainer>
                        <BarChart data={dataComparativo}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip cursor={{fill: 'transparent'}} />
                          <Legend />
                          <Bar dataKey="compras" name="Comprado" fill={COLORS.compras} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="estoque" name="Estoque" fill={COLORS.estoque} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                   <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-sm flex gap-2"><Users className="w-4"/> Performance Equipe</CardTitle></CardHeader>
                    <CardContent className="h-64">
                       <ResponsiveContainer><BarChart layout="vertical" data={metrics.performanceData}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" /><YAxis dataKey="nome" type="category" width={100} /><Tooltip /><Legend /><Bar dataKey="aprovadoDinheiro" stackId="a" fill={COLORS.dinheiro} /><Bar dataKey="aprovadoGira" stackId="a" fill={COLORS.gira} /><Bar dataKey="recusado" stackId="a" fill={COLORS.recusado} /></BarChart></ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="bg-purple-50 border-purple-200">
                    <CardHeader><CardTitle className="text-purple-800 flex gap-2"><Crown className="w-5"/> Rainha do Gira</CardTitle></CardHeader>
                    <CardContent className="flex flex-col items-center justify-center h-48 text-center">
                       <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center mb-2"><span className="text-2xl font-bold text-purple-700">{metrics.rainha.nome.charAt(0)}</span></div>
                       <h3 className="text-lg font-bold">{metrics.rainha.nome}</h3>
                       <p className="text-purple-700 font-bold">{formatCurrency(metrics.rainha.valor)}</p>
                    </CardContent>
                  </Card>
                </div>
            </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
