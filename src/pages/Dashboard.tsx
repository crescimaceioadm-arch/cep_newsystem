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

  // --- FETCH DE DADOS (JUNTOS MAS SEPARADOS) ---
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // 1. Busca Atendimentos (Seu código original)
      const { data: atendimentos } = await supabase
        .from("atendimentos")
        .select("*")
        .gte("created_at", inicioMes.toISOString())
        .lte("created_at", endOfDay(hoje).toISOString());

      // 2. Busca Vendas (Novo código)
      const { data: vendas } = await supabase
        .from("vendas")
        .select("*")
        .gte("created_at", inicioMes.toISOString())
        .lte("created_at", endOfDay(hoje).toISOString());

      setAllAtendimentos(atendimentos || []);
      setAllVendas(vendas || []);
      setLoading(false);
    }
    fetchData();
  }, []);

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
    const finalizadosHoje = finalizadosMes.filter(a => isToday(new Date(a.created_at)));
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
  // LÓGICA 2: VENDAS (NOVA LÓGICA)
  // ==================================================================================
  
  const salesMetrics = useMemo(() => {
    const vendasHoje = allVendas.filter(v => isSameDay(parseISO(v.created_at), hoje));

    // KPIs
    const totalVendidoHoje = vendasHoje.reduce((acc, curr) => acc + Number(curr.valor_total_venda || 0), 0);
    const totalVendidoMes = allVendas.reduce((acc, curr) => acc + Number(curr.valor_total_venda || 0), 0);
    
    // Contagem de Peças
    const contarPecas = (lista: any[]) => lista.reduce((acc, curr) => 
      acc + (curr.qtd_baby_vendida || 0) + (curr.qtd_1_a_16_vendida || 0) + (curr.qtd_calcados_vendida || 0) + (curr.qtd_brinquedos_vendida || 0) + (curr.qtd_itens_medios_vendida || 0) + (curr.qtd_itens_grandes_vendida || 0), 0);
    
    const pecasHoje = contarPecas(vendasHoje);
    const pecasMes = contarPecas(allVendas);

    // Gráfico de Pagamentos (Agrupamento Inteligente)
    const pagMap = new Map();
    allVendas.forEach(venda => {
        const pags = venda.pagamentos;
        if (Array.isArray(pags)) {
            pags.forEach((p: any) => {
                let metodo = p.metodo || "Outros";
                const valor = Number(p.valor || 0);
                if (metodo.toLowerCase().includes("crédito") || metodo.toLowerCase().includes("credito")) {
                    metodo = "Cartão de Crédito";
                }
                pagMap.set(metodo, (pagMap.get(metodo) || 0) + valor);
            });
        }
    });
    const piePagamentos = Array.from(pagMap, ([name, value]) => ({ name, value })).filter(d => d.value > 0);

    // Gráfico de Vendedoras
    const vendMap = new Map();
    allVendas.forEach(venda => {
        const nome = venda.vendedora_nome || "N/A";
        const valor = Number(venda.valor_total_venda || 0);
        const qtd = (venda.qtd_baby_vendida || 0) + (venda.qtd_1_a_16_vendida || 0) + (venda.qtd_calcados_vendida || 0) + (venda.qtd_brinquedos_vendida || 0);
        
        const current = vendMap.get(nome) || { valor: 0, qtd: 0 };
        vendMap.set(nome, { valor: current.valor + valor, qtd: current.qtd + qtd });
    });
    const barVendedoras = Array.from(vendMap, ([name, data]) => ({ name, ...data }));

    return { totalVendidoHoje, totalVendidoMes, pecasHoje, pecasMes, piePagamentos, barVendedoras };
  }, [allVendas]);


  // ==================================================================================
  // RENDERIZAÇÃO (TABS)
  // ==================================================================================
  return (
    <MainLayout title="Dashboard Estratégico">
      <div className="space-y-8 pb-10">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Visão Geral</h2>
            <p className="text-muted-foreground">{format(hoje, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
          </div>
        </div>

        {/* --- AQUI COMEÇA O SISTEMA DE ABAS --- */}
        <Tabs defaultValue="vendas" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:w-[400px] mb-6">
                <TabsTrigger value="vendas">Resultados de Vendas</TabsTrigger>
                <TabsTrigger value="compras">Resultados de Compras</TabsTrigger>
            </TabsList>

            {/* --- ABA 1: VENDAS (NOVO) --- */}
            <TabsContent value="vendas" className="space-y-6 animate-in fade-in-50">
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Vendido Hoje</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold">{formatCurrency(salesMetrics.totalVendidoHoje)}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Peças Hoje</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold">{salesMetrics.pecasHoje} un</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Vendido no Mês</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold text-blue-600">{formatCurrency(salesMetrics.totalVendidoMes)}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Peças no Mês</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold">{salesMetrics.pecasMes} un</div></CardContent>
                    </Card>
                </div>

                {/* GRÁFICOS */}
                <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                    {/* Ranking Vendedoras */}
                    <Card className="lg:col-span-4">
                        <CardHeader><CardTitle className="flex gap-2 text-sm"><Users className="w-4"/> Desempenho por Vendedora</CardTitle></CardHeader>
                        <CardContent className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={salesMetrics.barVendedoras}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                    <Legend />
                                    <Bar dataKey="valor" name="Total Vendido (R$)" fill={COLORS.vendas} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Pizza Pagamentos */}
                    <Card className="lg:col-span-3">
                        <CardHeader><CardTitle className="flex gap-2 text-sm"><CreditCard className="w-4"/> Meios de Pagamento</CardTitle></CardHeader>
                        <CardContent className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={salesMetrics.piePagamentos} 
                                        cx="50%" cy="50%" 
                                        innerRadius={60} 
                                        outerRadius={80} 
                                        paddingAngle={5} 
                                        dataKey="value"
                                    >
                                        {salesMetrics.piePagamentos.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={SALES_COLORS[index % SALES_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            {/* --- ABA 2: COMPRAS (SEU CÓDIGO ORIGINAL) --- */}
            <TabsContent value="compras" className="space-y-8 animate-in fade-in-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card><CardHeader><CardTitle className="text-sm text-gray-500">Financeiro (Mês)</CardTitle><div className="text-2xl font-bold">{formatCurrency(metrics.metricasMes.total)}</div></CardHeader>
                    <CardContent className="h-48"><ResponsiveContainer><BarChart layout="vertical" data={[dataFinanceiro[0]]}><XAxis type="number" hide /><YAxis type="category" dataKey="name" hide /><Tooltip content={<CustomTooltip />} /><Legend /><Bar dataKey="dinheiro" name="Dinheiro/Pix" stackId="a" fill={COLORS.dinheiro} /><Bar dataKey="gira" name="Gira Crédito" stackId="a" fill={COLORS.gira} /></BarChart></ResponsiveContainer></CardContent></Card>
                    
                    <Card><CardHeader><CardTitle className="text-sm text-gray-500">Financeiro (Hoje)</CardTitle><div className="text-2xl font-bold">{formatCurrency(metrics.metricasHoje.total)}</div></CardHeader>
                    <CardContent className="h-48"><ResponsiveContainer><BarChart layout="vertical" data={[dataFinanceiro[1]]}><XAxis type="number" hide /><YAxis type="category" dataKey="name" hide /><Tooltip content={<CustomTooltip />} /><Legend /><Bar dataKey="dinheiro" name="Dinheiro/Pix" stackId="a" fill={COLORS.dinheiro} /><Bar dataKey="gira" name="Gira Crédito" stackId="a" fill={COLORS.gira} /></BarChart></ResponsiveContainer></CardContent></Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card><CardHeader><CardTitle className="text-sm text-gray-500">Compras (Mês)</CardTitle><div className="text-2xl font-bold">{metrics.metricasMes.qtdDinheiro + metrics.metricasMes.qtdGira} un</div></CardHeader>
                    <CardContent className="h-32"><ResponsiveContainer><BarChart layout="vertical" data={[dataQtd[0]]}><XAxis type="number" hide /><YAxis type="category" dataKey="name" hide /><Tooltip content={<CustomTooltip type="number" />} /><Bar dataKey="dinheiro" stackId="a" fill={COLORS.dinheiro} /><Bar dataKey="gira" stackId="a" fill={COLORS.gira} /></BarChart></ResponsiveContainer></CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-sm text-gray-500">Compras (Hoje)</CardTitle><div className="text-2xl font-bold">{metrics.metricasHoje.qtdDinheiro + metrics.metricasHoje.qtdGira} un</div></CardHeader>
                    <CardContent className="h-32"><ResponsiveContainer><BarChart layout="vertical" data={[dataQtd[1]]}><XAxis type="number" hide /><YAxis type="category" dataKey="name" hide /><Tooltip content={<CustomTooltip type="number" />} /><Bar dataKey="dinheiro" stackId="a" fill={COLORS.dinheiro} /><Bar dataKey="gira" stackId="a" fill={COLORS.gira} /></BarChart></ResponsiveContainer></CardContent></Card>
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
