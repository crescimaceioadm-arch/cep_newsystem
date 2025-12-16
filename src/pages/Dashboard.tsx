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
import { Crown, Users, TrendingUp, DollarSign, ShoppingBag, Package } from "lucide-react";
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

// Cores Oficiais
const COLORS = {
  dinheiro: "#10B981", // Emerald 500
  gira: "#8B5CF6",     // Violet 500
  recusado: "#EF4444", // Red 500
  estoque: "#3B82F6",  // Blue 500
  compras: "#F97316",  // Orange 500
};

const PIE_COLORS = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#FBBF24"];

// Tooltip Unificado
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
  const [loading, setLoading] = useState(true);
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
      setLoading(false);
    }
    fetchData();
  }, []);

  // Classificação Agressiva de Pagamento
  const classificarPagamento = (metodo: string): "dinheiro" | "gira" => {
    const tipo = (metodo || "").toLowerCase().trim();
    
    // Lista de palavras-chave para Gira Crédito
    const termosGira = ["gira", "crédito", "credito", "troca", "voucher", "permuta"];
    if (termosGira.some(termo => tipo.includes(termo))) {
      return "gira";
    }
    
    // Se não for Gira, assume Dinheiro (Saída de Caixa)
    return "dinheiro";
  };

  const metrics = useMemo(() => {
    const atendimentosHoje = allAtendimentos.filter(a => isToday(new Date(a.created_at)));
    
    // Filtros de Status
    const finalizadosHoje = atendimentosHoje.filter(a => a.status === "finalizado");
    const finalizadosMes = allAtendimentos.filter(a => a.status === "finalizado");
    const recusadosMes = allAtendimentos.filter(a => a.status === "recusado");

    // Função de Cálculo Genérica
    const calcularTotais = (lista: any[]) => {
      let dados = { dinheiro: 0, gira: 0, qtdDinheiro: 0, qtdGira: 0 };
      
      lista.forEach(item => {
        const valor = Number(item.valor_total_negociado || 0);
        // Tenta pegar o método de várias colunas possíveis
        const metodo = item.metodo_pagto_1 || item.tipo_pagamento || item.forma_pagamento || "";
        const tipo = classificarPagamento(metodo);

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

    const metricasHoje = calcularTotais(finalizadosHoje);
    const metricasMes = calcularTotais(finalizadosMes);

    // Dados PieChart (Categorias Hoje)
    const categoriasHoje = {
      Baby: finalizadosHoje.reduce((acc, a) => acc + (a.qtd_baby || 0), 0),
      Infantil: finalizadosHoje.reduce((acc, a) => acc + (a.qtd_1_a_16 || 0), 0),
      Calcados: finalizadosHoje.reduce((acc, a) => acc + (a.qtd_calcados || 0), 0),
      Brinquedos: finalizadosHoje.reduce((acc, a) => acc + (a.qtd_brinquedos || 0), 0),
      Medios: finalizadosHoje.reduce((acc, a) => acc + (a.qtd_itens_medios || 0), 0),
      Grandes: finalizadosHoje.reduce((acc, a) => acc + (a.qtd_itens_grandes || 0), 0),
    };

    // Dados Comparativo (Compras Mês vs Estoque)
    // Agrupando compras do mês
    const comprasPorCat = {
      baby: finalizadosMes.reduce((acc, a) => acc + (a.qtd_baby || 0), 0),
      infantil: finalizadosMes.reduce((acc, a) => acc + (a.qtd_1_a_16 || 0), 0),
      calcados: finalizadosMes.reduce((acc, a) => acc + (a.qtd_calcados || 0), 0),
      brinquedos: finalizadosMes.reduce((acc, a) => acc + (a.qtd_brinquedos || 0), 0),
    };

    // Performance Avaliadoras
    const mapAvaliadoras = new Map();
    
    // Processar Aprovados
    finalizadosMes.forEach(a => {
      const nome = a.avaliadora_nome || "Não Identificado";
      const valor = Number(a.valor_total_negociado || 0);
      const tipo = classificarPagamento(a.metodo_pagto_1 || "");
      
      const atual = mapAvaliadoras.get(nome) || { din: 0, gira: 0, rec: 0, totalGiraValor: 0 };
      
      if (tipo === "gira") {
        atual.gira += 1;
        atual.totalGiraValor += valor;
      } else {
        atual.din += 1;
      }
      mapAvaliadoras.set(nome, atual);
    });

    // Processar Recusados
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

    return {
      metricasHoje,
      metricasMes,
      pieData: Object.entries(categoriasHoje)
        .filter(([_, val]) => val > 0)
        .map(([name, value]) => ({ name, value })),
      comprasPorCat,
      performanceData,
      rainha
    };

  }, [allAtendimentos]);

  // Preparar dados para gráficos
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
    { name: "Calçados", compras: metrics.comprasPorCat.calcados, estoque: 0 },
    { name: "Brinquedos", compras: metrics.comprasPorCat.brinquedos, estoque: 0 },
  ];

  // Preencher estoque se disponível
  if (estoque) {
    estoque.forEach(e => {
      const cat = e.categoria.toLowerCase();
      const qtd = e.quantidade_atual;
      if (cat.includes("baby")) dataComparativo[0].estoque = qtd;
      else if (cat.includes("infantil") || cat.includes("16")) dataComparativo[1].estoque = qtd;
      else if (cat.includes("calcado")) dataComparativo[2].estoque = qtd;
      else if (cat.includes("brinquedo")) dataComparativo[3].estoque = qtd;
    });
  }

  return (
    <MainLayout title="Dashboard Estratégico">
      <div className="space-y-8 pb-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Visão Geral</h2>
            <p className="text-muted-foreground">
              {format(hoje, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* 1. GRÁFICOS FINANCEIROS (MÊS E HOJE) */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" /> Financeiro (R$)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gastos Mês */}
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

            {/* Gastos Hoje */}
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

        {/* 2. GRÁFICOS QUANTIDADE (MÊS E HOJE) */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-600" /> Volume de Compras
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Qtd Mês */}
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

             {/* Qtd Hoje */}
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

        {/* 3. CATEGORIAS E ESTOQUE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="w-4 h-4" /> Mix de Peças (Hoje)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {metrics.pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {metrics.pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">Sem dados hoje</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Compras Mês vs Estoque
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataComparativo}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 12}} />
                  <YAxis />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Legend />
                  <Bar dataKey="compras" name="Comprado (Mês)" fill={COLORS.compras} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="estoque" name="Estoque Atual" fill={COLORS.estoque} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* 4. PERFORMANCE EQUIPE E RAINHA DO GIRA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
             <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" /> Performance Avaliadoras (Mês)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart layout="vertical" data={metrics.performanceData} margin={{ left: 20 }}>
                   <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                   <XAxis type="number" />
                   <YAxis dataKey="nome" type="category" width={100} tick={{fontSize: 12}} />
                   <Tooltip />
                   <Legend />
                   <Bar dataKey="aprovadoDinheiro" name="Aprovado (Din)" stackId="a" fill={COLORS.dinheiro} />
                   <Bar dataKey="aprovadoGira" name="Aprovado (Gira)" stackId="a" fill={COLORS.gira} />
                   <Bar dataKey="recusado" name="Recusado" stackId="a" fill={COLORS.recusado} />
                 </BarChart>
               </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Rainha do Gira */}
          <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-800 flex items-center gap-2">
                <Crown className="w-6 h-6 fill-purple-600 text-purple-600" />
                Rainha do Gira
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-[200px] text-center">
               <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                 <span className="text-2xl font-bold text-purple-600">
                   {metrics.rainha.nome.charAt(0)}
                 </span>
               </div>
               <h3 className="text-xl font-bold text-gray-800">{metrics.rainha.nome}</h3>
               <p className="text-purple-600 font-semibold mt-1">
                 {formatCurrency(metrics.rainha.valor)} gerados
               </p>
               <p className="text-xs text-gray-500 mt-2">
                 {metrics.rainha.percentual.toFixed(0)}% das compras em crédito
               </p>
            </CardContent>
          </Card>
        </div>

      </div>
    </MainLayout>
  );
}
