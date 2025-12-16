import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { startOfMonth, endOfDay, isToday, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Crown, Users, TrendingUp, DollarSign, ShoppingBag, Package, Bug } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEstoque } from "@/hooks/useEstoque";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";

const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const COLORS = { dinheiro: "#10B981", gira: "#8B5CF6", recusado: "#EF4444", estoque: "#3B82F6", compras: "#F97316" };
const PIE_COLORS = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#FBBF24"];

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
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [allAtendimentos, setAllAtendimentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugItem, setDebugItem] = useState<any>(null); // ITEM PARA DEBUG
  const { data: estoque } = useEstoque();

  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: atendimentos } = await supabase
        .from("atendimentos")
        .select("*")
        .gte("created_at", inicioMes.toISOString())
        .lte("created_at", endOfDay(hoje).toISOString());

      setAllAtendimentos(atendimentos || []);
      
      // SALVA O PRIMEIRO ITEM PARA DEBUGAR AS COLUNAS
      if (atendimentos && atendimentos.length > 0) {
        setDebugItem(atendimentos[0]);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const classificarPagamento = (item: any): "dinheiro" | "gira" => {
    // Transforma o objeto inteiro em string para buscar em qualquer campo
    const fullSearch = JSON.stringify(item).toLowerCase();
    const termosGira = ["gira", "crédito", "credito", "troca", "voucher"];
    
    if (termosGira.some(termo => fullSearch.includes(termo))) {
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
        if (classificarPagamento(item) === "gira") { d.gira += val; d.qtdGira++; }
        else { d.dinheiro += val; d.qtdDinheiro++; }
      });
      return { ...d, total: d.dinheiro + d.gira };
    };

    const metricasHoje = calcularTotais(finalizadosHoje);
    const metricasMes = calcularTotais(finalizadosMes);

    // Performance Simplificada
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

    return { metricasHoje, metricasMes, performanceData, rainha };
  }, [allAtendimentos]);

  const dataFinanceiro = [
    { name: "Mês", dinheiro: metrics.metricasMes.dinheiro, gira: metrics.metricasMes.gira },
    { name: "Hoje", dinheiro: metrics.metricasHoje.dinheiro, gira: metrics.metricasHoje.gira },
  ];
  const dataQtd = [
    { name: "Mês", dinheiro: metrics.metricasMes.qtdDinheiro, gira: metrics.metricasMes.qtdGira },
    { name: "Hoje", dinheiro: metrics.metricasHoje.qtdDinheiro, gira: metrics.metricasHoje.qtdGira },
  ];

  return (
    <MainLayout title="Dashboard - MODO DEBUG">
      <div className="space-y-8 pb-10">
        
        {/* ÁREA DE DEBUG CRÍTICA */}
        <div className="bg-slate-900 text-green-400 p-6 rounded-lg font-mono text-xs overflow-auto border-2 border-red-500 shadow-2xl">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
            <Bug className="h-5 w-5" /> RAIO-X DO BANCO DE DADOS
          </h3>
          <p className="mb-2 text-slate-400">Este é o formato real que o Supabase está entregando. Procure aqui onde está escrito "Gira", "Pix", etc.</p>
          {debugItem ? (
            <pre>{JSON.stringify(debugItem, null, 2)}</pre>
          ) : (
             <p className="text-red-400">Nenhum atendimento encontrado no período (Verifique se há vendas finalizadas neste mês)</p>
          )}
        </div>

        <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">Visão Geral</h2><p className="text-muted-foreground">{format(hoje, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Financeiro Mês</CardTitle><div className="text-2xl font-bold">{formatCurrency(metrics.metricasMes.total)}</div></CardHeader>
            <CardContent className="h-48"><ResponsiveContainer><BarChart layout="vertical" data={[dataFinanceiro[0]]}><XAxis type="number" hide /><YAxis type="category" dataKey="name" hide /><Tooltip content={<CustomTooltip />} /><Legend /><Bar dataKey="dinheiro" stackId="a" fill={COLORS.dinheiro} /><Bar dataKey="gira" stackId="a" fill={COLORS.gira} /></BarChart></ResponsiveContainer></CardContent></Card>
            
            <Card><CardHeader><CardTitle>Financeiro Hoje</CardTitle><div className="text-2xl font-bold">{formatCurrency(metrics.metricasHoje.total)}</div></CardHeader>
            <CardContent className="h-48"><ResponsiveContainer><BarChart layout="vertical" data={[dataFinanceiro[1]]}><XAxis type="number" hide /><YAxis type="category" dataKey="name" hide /><Tooltip content={<CustomTooltip />} /><Legend /><Bar dataKey="dinheiro" stackId="a" fill={COLORS.dinheiro} /><Bar dataKey="gira" stackId="a" fill={COLORS.gira} /></BarChart></ResponsiveContainer></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Compras Mês</CardTitle><div className="text-2xl font-bold">{metrics.metricasMes.qtdDinheiro + metrics.metricasMes.qtdGira}</div></CardHeader>
            <CardContent className="h-32"><ResponsiveContainer><BarChart layout="vertical" data={[dataQtd[0]]}><XAxis type="number" hide /><YAxis type="category" dataKey="name" hide /><Tooltip /><Bar dataKey="dinheiro" stackId="a" fill={COLORS.dinheiro} /><Bar dataKey="gira" stackId="a" fill={COLORS.gira} /></BarChart></ResponsiveContainer></CardContent></Card>
             <Card><CardHeader><CardTitle>Compras Hoje</CardTitle><div className="text-2xl font-bold">{metrics.metricasHoje.qtdDinheiro + metrics.metricasHoje.qtdGira}</div></CardHeader>
            <CardContent className="h-32"><ResponsiveContainer><BarChart layout="vertical" data={[dataQtd[1]]}><XAxis type="number" hide /><YAxis type="category" dataKey="name" hide /><Tooltip /><Bar dataKey="dinheiro" stackId="a" fill={COLORS.dinheiro} /><Bar dataKey="gira" stackId="a" fill={COLORS.gira} /></BarChart></ResponsiveContainer></CardContent></Card>
        </div>
      </div>
    </MainLayout>
  );
}
