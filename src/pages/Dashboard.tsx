import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  startOfMonth, 
  endOfDay,
  isToday,
  format
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Crown, Users, TrendingUp, DollarSign, ShoppingBag, Package, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEstoque } from "@/hooks/useEstoque";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from "recharts";

// Formatar moeda
const formatCurrency = (value: number): string => {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
};

const COLORS = {
  dinheiro: "#10B981", 
  gira: "#8B5CF6",     
  recusado: "#EF4444", 
  estoque: "#3B82F6",  
  compras: "#F97316",  
};

const PIE_COLORS = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#FBBF24"];

const CustomTooltip = ({ active, payload, label, type = "currency" }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-xl z-50">
        <p className="font-bold text-gray-700 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-600 capitalize">
              {entry.name}: {type === "currency" 
                ? formatCurrency(entry.value) 
                : `${entry.value} un`}
            </span>
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
  const [tiposEncontrados, setTiposEncontrados] = useState<string[]>([]); // Para diagnóstico
  const { data: estoque } = useEstoque();

  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const startDate = inicioMes.toISOString();
      const endDate = endOfDay(hoje).toISOString();

      const { data: atendimentos } = await supabase
        .from("atendimentos")
        .select("*")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      setAllAtendimentos(atendimentos || []);
      
      // Diagnóstico: Coletar todos os tipos de pagamento únicos encontrados
      const tipos = new Set<string>();
      atendimentos?.forEach(a => {
        if (a.metodo_pagto_1) tipos.add(`1: ${a.metodo_pagto_1}`);
        if (a.metodo_pagto_2) tipos.add(`2: ${a.metodo_pagto_2}`);
        if (a.tipo_pagamento) tipos.add(`Tipo: ${a.tipo_pagamento}`);
      });
      setTiposEncontrados(Array.from(tipos));
      
      setLoading(false);
    }
    fetchData();
  }, []);

  // Classificação "Rede de Pesca" - Busca em tudo
  const classificarPagamento = (item: any): "dinheiro" | "gira" => {
    // Junta todas as colunas possíveis em uma única string para busca
    const textoBusca = [
      item.metodo_pagto_1, 
      item.metodo_pagto_2, 
      item.tipo_pagamento, 
      item.forma_pagamento,
      item.observacao
    ].join(" ").toLowerCase();
    
    // Palavras-chave ampliadas
    const termosGira = ["gira", "crédito", "credito", "troca", "voucher", "permuta", "loja"];
    
    if (termosGira.some(termo => textoBusca.includes(termo))) {
      return "gira";
    }
    
    return "dinheiro";
  };

  const metrics = useMemo(() => {
    const atendimentosHoje = allAtendimentos.filter(a => isToday(new Date(a.created_at)));
    const finalizadosMes = allAtendimentos.filter(a => a.status === "finalizado");
    const recusadosMes = allAtendimentos.filter(a => a.status === "recusado");

    const calcularTotais = (lista: any[]) => {
      let dados = { dinheiro: 0, gira: 0, qtdDinheiro: 0, qtdGira: 0 };
      
      lista.forEach(item => {
        const valor = Number(item.valor_total_negociado || 0);
        const tipo = classificarPagamento(item); // Passa o item inteiro agora

        if (tipo === "gira") {
          dados.gira += valor;
          dados.qtdGira += 1;
        } else {
          dados.dinheiro += valor;
          dados.qtdDinheiro += 1;
        }
      });
      return { ...dados, total: dados.dinheiro + dados.gira };
    };

    const metricasHoje = calcularTotais(atendimentosHoje.filter(a => a.status === "finalizado"));
    const metricasMes = calcularTotais(finalizadosMes);

    // Performance Avaliadoras
    const mapAvaliadoras = new Map();
    
    finalizadosMes.forEach(a => {
      const nome = a.avaliadora_nome || "Não Identificado";
      const valor = Number(a.valor_total_negociado || 0);
      const tipo = classificarPagamento(a);
      
      const atual = mapAvaliadoras.get(nome) || { din: 0, gira: 0, rec: 0, totalGiraValor: 0 };
      
      if (tipo === "gira") {
        atual.gira += 1;
        atual.totalGiraValor += valor;
      } else {
        atual.din += 1;
      }
      mapAvaliadoras.set(nome, atual);
    });

    recusadosMes.forEach(a => {
      const nome = a.avaliadora_nome || "Não Identificado";
      const atual = mapAvaliadoras.get(nome) || { din: 0, gira: 0, rec: 0, totalGiraValor: 0 };
      atual.rec += 1;
      mapAvaliadoras.set(nome, atual);
    });

    const performanceData = Array.from(mapAvaliadoras.entries()).map(([nome, dados]) => ({
      nome,
      aprovadoDinheiro: dados.din,
      aprovadoGira: dados.gira,
      recusado: dados.rec,
      totalGiraValor: dados.totalGiraValor,
      totalAvaliacoes: dados.din + dados.gira + dados.rec
    })).sort((a, b) => b.totalAvaliacoes - a.totalAvaliacoes);

    // Rainha do Gira
    let rainha = { nome: "-", valor: 0, percentual: 0 };
    performanceData.forEach(d => {
      if (d.totalGiraValor > rainha.valor) {
        const totalAprovado = d.aprovadoDinheiro + d.aprovadoGira;
        rainha = {
          nome: d.nome,
          valor: d.totalGiraValor,
          percentual: totalAprovado > 0 ? (d.aprovadoGira / totalAprovado) * 100 : 0
        };
      }
    });

    // Dados PieChart Simples (Fallback se não houver detalhe)
    const pieData = [
       { name: "Peças Totais", value: finalizadosMes.reduce((acc, curr) => acc + (curr.qtd_1_a_16 || 0) + (curr.qtd_baby || 0), 0) }
    ].filter(d => d.value > 0);

    // Comparativo simples
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

  return (
    <MainLayout title="Dashboard Estratégico">
      <div className="space-y-8 pb-10">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Visão Geral</h2>
            <p className="text-muted-foreground">
              {format(hoje, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* 1. FINANCEIRO */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" /> Financeiro (R$)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Gastos Totais (Mês)</CardTitle>
                <div className="text-2xl font-bold">{formatCurrency(metrics.metricasMes.total)}</div>
              </CardHeader>
              <CardContent className="h-[200px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart layout="vertical" data={[dataFinanceiro[0]]} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                     <XAxis type="number" hide />
                     <YAxis dataKey="name" type="category" hide />
                     <Tooltip content={<CustomTooltip />} />
                     <Legend />
                     <Bar dataKey="dinheiro" name="Dinheiro/Pix" stackId="a" fill={COLORS.dinheiro} radius={[4, 0, 0, 4]} barSize={40} />
                     <Bar dataKey="gira" name="Gira Crédito" stackId="a" fill={COLORS.gira} radius={[0, 4, 4, 0]} barSize={40} />
                   </BarChart>
                 </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Gastos Totais (Hoje)</CardTitle>
                <div className="text-2xl font-bold">{formatCurrency(metrics.metricasHoje.total)}</div>
              </CardHeader>
              <CardContent className="h-[200px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart layout="vertical" data={[dataFinanceiro[1]]} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                     <XAxis type="number" hide />
                     <YAxis dataKey="name" type="category" hide />
                     <Tooltip content={<CustomTooltip />} />
                     <Legend />
                     <Bar dataKey="dinheiro" name="Dinheiro/Pix" stackId="a" fill={COLORS.dinheiro} radius={[4, 0, 0, 4]} barSize={40} />
                     <Bar dataKey="gira" name="Gira Crédito" stackId="a" fill={COLORS.gira} radius={[0, 4, 4, 0]} barSize={40} />
                   </BarChart>
                 </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 2. QUANTIDADE */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-600" /> Volume de Compras
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Compras no Mês</CardTitle>
                <div className="text-2xl font-bold">{metrics.metricasMes.qtdDinheiro + metrics.metricasMes.qtdGira} compras</div>
              </CardHeader>
              <CardContent className="h-[150px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart layout="vertical" data={[dataQtd[0]]}>
                     <XAxis type="number" hide />
                     <YAxis dataKey="name" type="category" hide />
                     <Tooltip content={<CustomTooltip type="number" />} />
                     <Bar dataKey="dinheiro" name="Dinheiro/Pix" stackId="a" fill={COLORS.dinheiro} barSize={30} />
                     <Bar dataKey="gira" name="Gira Crédito" stackId="a" fill={COLORS.gira} barSize={30} />
                   </BarChart>
                 </ResponsiveContainer>
              </CardContent>
            </Card>

             <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Compras Hoje</CardTitle>
                <div className="text-2xl font-bold">{metrics.metricasHoje.qtdDinheiro + metrics.metricasHoje.qtdGira} compras</div>
              </CardHeader>
              <CardContent className="h-[150px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart layout="vertical" data={[dataQtd[1]]}>
                     <XAxis type="number" hide />
                     <YAxis dataKey="name" type="category" hide />
                     <Tooltip content={<CustomTooltip type="number" />} />
                     <Bar dataKey="dinheiro" name="Dinheiro/Pix" stackId="a" fill={COLORS.dinheiro} barSize={30} />
                     <Bar dataKey="gira" name="Gira Crédito" stackId="a" fill={COLORS.gira} barSize={30} />
                   </BarChart>
                 </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 3. DIAGNÓSTICO (TEMPORÁRIO) */}
        <div className="bg-slate-100 p-4 rounded-lg border border-slate-300 mt-8">
          <h4 className="flex items-center gap-2 font-bold text-slate-700 text-sm mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Diagnóstico de Dados (O que está no Banco)
          </h4>
          <p className="text-xs text-slate-500 mb-2">Se o Gira Crédito não aparecer, verifique se algum dos nomes abaixo corresponde a ele:</p>
          <div className="flex flex-wrap gap-2">
            {tiposEncontrados.map((tipo, idx) => (
              <span key={idx} className="bg-white px-2 py-1 rounded border text-xs font-mono">
                {tipo}
              </span>
            ))}
            {tiposEncontrados.length === 0 && <span className="text-xs text-muted-foreground">Nenhum dado encontrado</span>}
          </div>
        </div>

      </div>
    </MainLayout>
  );
}
