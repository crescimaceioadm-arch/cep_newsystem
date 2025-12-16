import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  startOfDay, 
  startOfMonth, 
  endOfDay,
  isToday,
  isThisMonth,
  format
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  DollarSign, 
  ShoppingBag, 
  TrendingUp,
  Crown,
  Percent,
  Banknote,
  CreditCard,
  Package
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import { useEstoque } from "@/hooks/useEstoque";

const COLORS_PIE = ["#8b5cf6", "#22c55e", "#f59e0b", "#3b82f6", "#ef4444", "#6b7280"];
const COLORS_STACKED = {
  aprovadoDinheiro: "#22c55e",
  aprovadoGira: "#8b5cf6",
  recusadoCliente: "#f97316",
  recusadoLoja: "#ef4444"
};

// Helper para verificar se é pagamento em dinheiro/pix
const isDinheiroPix = (metodo: string | null): boolean => {
  if (!metodo) return false;
  const m = metodo.toLowerCase();
  return m.includes("dinheiro") || m.includes("pix");
};

const isGiraCredito = (metodo: string | null): boolean => {
  if (!metodo) return false;
  return metodo.toLowerCase().includes("gira");
};

// Formatar moeda
const formatCurrency = (value: number): string => {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
};

export default function Dashboard() {
  const [allAtendimentos, setAllAtendimentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: estoqueData } = useEstoque();

  const hoje = new Date();
  const inicioHoje = startOfDay(hoje);
  const inicioMes = startOfMonth(hoje);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // Buscar atendimentos do mês atual
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

  // Cálculos das métricas
  const metrics = useMemo(() => {
    const atendimentosHoje = allAtendimentos.filter(a => 
      isToday(new Date(a.created_at))
    );
    const atendimentosMes = allAtendimentos;

    const finalizadosHoje = atendimentosHoje.filter(a => a.status === "finalizado");
    const finalizadosMes = atendimentosMes.filter(a => a.status === "finalizado");
    const recusadosHoje = atendimentosHoje.filter(a => a.status === "recusado");
    const recusadosMes = atendimentosMes.filter(a => a.status === "recusado");

    // Função para calcular valores por tipo de pagamento
    const calcularPorPagamento = (atendimentos: any[]) => {
      let dinheiroPix = 0;
      let giraCredito = 0;
      let qtdDinheiroPix = 0;
      let qtdGira = 0;

      atendimentos.forEach(a => {
        const pagamentos = [
          { metodo: a.metodo_pagto_1, valor: a.valor_pagto_1 || 0 },
          { metodo: a.metodo_pagto_2, valor: a.valor_pagto_2 || 0 },
          { metodo: a.metodo_pagto_3, valor: a.valor_pagto_3 || 0 },
        ];

        let temDinheiroPix = false;
        let temGira = false;

        pagamentos.forEach(p => {
          if (isDinheiroPix(p.metodo)) {
            dinheiroPix += p.valor;
            temDinheiroPix = true;
          }
          if (isGiraCredito(p.metodo)) {
            giraCredito += p.valor;
            temGira = true;
          }
        });

        // Contar atendimentos por tipo predominante
        if (temGira && !temDinheiroPix) {
          qtdGira++;
        } else if (temDinheiroPix) {
          qtdDinheiroPix++;
        } else if (temGira) {
          qtdGira++;
        }
      });

      return { dinheiroPix, giraCredito, qtdDinheiroPix, qtdGira, total: dinheiroPix + giraCredito };
    };

    const pagamentosHoje = calcularPorPagamento(finalizadosHoje);
    const pagamentosMes = calcularPorPagamento(finalizadosMes);

    // Peças por categoria (hoje)
    const pecasHoje = {
      baby: finalizadosHoje.reduce((acc, a) => acc + (a.qtd_baby || 0), 0),
      infantil: finalizadosHoje.reduce((acc, a) => acc + (a.qtd_1_a_16 || 0), 0),
      calcados: finalizadosHoje.reduce((acc, a) => acc + (a.qtd_calcados || 0), 0),
      brinquedos: finalizadosHoje.reduce((acc, a) => acc + (a.qtd_brinquedos || 0), 0),
      medios: finalizadosHoje.reduce((acc, a) => acc + (a.qtd_itens_medios || 0), 0),
      grandes: finalizadosHoje.reduce((acc, a) => acc + (a.qtd_itens_grandes || 0), 0),
    };

    // Peças compradas no mês (por categoria)
    const pecasMes = {
      baby: finalizadosMes.reduce((acc, a) => acc + (a.qtd_baby || 0), 0),
      infantil: finalizadosMes.reduce((acc, a) => acc + (a.qtd_1_a_16 || 0), 0),
      calcados: finalizadosMes.reduce((acc, a) => acc + (a.qtd_calcados || 0), 0),
      brinquedos: finalizadosMes.reduce((acc, a) => acc + (a.qtd_brinquedos || 0), 0),
    };

    // Performance por avaliadora (para gráfico empilhado)
    const avaliadoras = new Map<string, {
      aprovadoDinheiro: number;
      aprovadoGira: number;
      recusadoCliente: number;
      recusadoLoja: number;
      totalGira: number;
    }>();

    // Processar finalizados do mês
    finalizadosMes.forEach(a => {
      const nome = a.avaliadora_nome || "Não especificada";
      const current = avaliadoras.get(nome) || {
        aprovadoDinheiro: 0,
        aprovadoGira: 0,
        recusadoCliente: 0,
        recusadoLoja: 0,
        totalGira: 0,
      };

      const pagamentos = [
        { metodo: a.metodo_pagto_1, valor: a.valor_pagto_1 || 0 },
        { metodo: a.metodo_pagto_2, valor: a.valor_pagto_2 || 0 },
        { metodo: a.metodo_pagto_3, valor: a.valor_pagto_3 || 0 },
      ];

      let temGira = false;
      pagamentos.forEach(p => {
        if (isGiraCredito(p.metodo)) {
          current.totalGira += p.valor;
          temGira = true;
        }
      });

      if (temGira) {
        current.aprovadoGira++;
      } else {
        current.aprovadoDinheiro++;
      }

      avaliadoras.set(nome, current);
    });

    // Processar recusados do mês
    recusadosMes.forEach(a => {
      const nome = a.avaliadora_nome || "Não especificada";
      const current = avaliadoras.get(nome) || {
        aprovadoDinheiro: 0,
        aprovadoGira: 0,
        recusadoCliente: 0,
        recusadoLoja: 0,
        totalGira: 0,
      };

      if (a.motivo_recusa === "cliente") {
        current.recusadoCliente++;
      } else if (a.motivo_recusa === "loja") {
        current.recusadoLoja++;
      }

      avaliadoras.set(nome, current);
    });

    const performanceData = Array.from(avaliadoras.entries()).map(([nome, data]) => ({
      nome: nome.split(" ")[0], // Primeiro nome apenas
      ...data,
    })).sort((a, b) => (b.aprovadoDinheiro + b.aprovadoGira) - (a.aprovadoDinheiro + a.aprovadoGira));

    // Rainha do Gira Crédito
    let rainhaGira = { nome: "-", valor: 0, percentual: 0 };
    performanceData.forEach(av => {
      if (av.totalGira > rainhaGira.valor) {
        const total = av.aprovadoDinheiro + av.aprovadoGira;
        rainhaGira = {
          nome: av.nome,
          valor: av.totalGira,
          percentual: total > 0 ? (av.aprovadoGira / total) * 100 : 0,
        };
      }
    });

    return {
      gastoHoje: pagamentosHoje,
      gastoMes: pagamentosMes,
      qtdComprasHoje: finalizadosHoje.length,
      qtdComprasMes: finalizadosMes.length,
      pecasHoje,
      pecasMes,
      performanceData,
      rainhaGira,
    };
  }, [allAtendimentos]);

  // Dados para os gráficos
  const pieChartData = [
    { name: "Baby", value: metrics.pecasHoje.baby },
    { name: "Infantil", value: metrics.pecasHoje.infantil },
    { name: "Calçados", value: metrics.pecasHoje.calcados },
    { name: "Brinquedos", value: metrics.pecasHoje.brinquedos },
    { name: "Médios", value: metrics.pecasHoje.medios },
    { name: "Grandes", value: metrics.pecasHoje.grandes },
  ].filter(d => d.value > 0);

  // Estoque atual por categoria
  const estoqueAtual = useMemo(() => {
    if (!estoqueData) return { baby: 0, infantil: 0, calcados: 0, brinquedos: 0 };
    
    const map: Record<string, number> = {};
    estoqueData.forEach(e => {
      map[e.categoria.toLowerCase()] = e.quantidade_atual;
    });
    
    return {
      baby: map["baby"] || 0,
      infantil: map["infantil"] || map["1_a_16"] || 0,
      calcados: map["calcados"] || 0,
      brinquedos: map["brinquedos"] || 0,
    };
  }, [estoqueData]);

  const comparativoData = [
    { categoria: "Baby", comprasMes: metrics.pecasMes.baby, estoqueAtual: estoqueAtual.baby },
    { categoria: "Infantil", comprasMes: metrics.pecasMes.infantil, estoqueAtual: estoqueAtual.infantil },
    { categoria: "Calçados", comprasMes: metrics.pecasMes.calcados, estoqueAtual: estoqueAtual.calcados },
    { categoria: "Brinquedos", comprasMes: metrics.pecasMes.brinquedos, estoqueAtual: estoqueAtual.brinquedos },
  ];

  return (
    <MainLayout title="Dashboard Estratégico">
      <div className="space-y-6">
        {/* Header com data */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {format(hoje, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        {/* SEÇÃO 1: FINANCEIRO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gasto Hoje */}
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-orange-500" />
                Gasto Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-16 bg-muted rounded" />
              ) : (
                <>
                  <div className="text-3xl font-bold text-foreground">
                    {formatCurrency(metrics.gastoHoje.total)}
                  </div>
                  <div className="flex gap-4 mt-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Banknote className="h-4 w-4 text-green-600" />
                      <span className="text-muted-foreground">Dinheiro+Pix:</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(metrics.gastoHoje.dinheiroPix)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 text-purple-600" />
                      <span className="text-muted-foreground">Gira:</span>
                      <span className="font-semibold text-purple-600">
                        {formatCurrency(metrics.gastoHoje.giraCredito)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Gasto Mês */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-blue-500" />
                Gasto Mês ({format(hoje, "MMMM", { locale: ptBR })})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-16 bg-muted rounded" />
              ) : (
                <>
                  <div className="text-3xl font-bold text-foreground">
                    {formatCurrency(metrics.gastoMes.total)}
                  </div>
                  <div className="flex gap-4 mt-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Banknote className="h-4 w-4 text-green-600" />
                      <span className="text-muted-foreground">Dinheiro+Pix:</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(metrics.gastoMes.dinheiroPix)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 text-purple-600" />
                      <span className="text-muted-foreground">Gira:</span>
                      <span className="font-semibold text-purple-600">
                        {formatCurrency(metrics.gastoMes.giraCredito)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SEÇÃO 2: VOLUME DE COMPRAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Qtd Compras Hoje */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingBag className="h-5 w-5 text-orange-500" />
                Compras Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-12 bg-muted rounded" />
              ) : (
                <>
                  <div className="text-4xl font-bold">{metrics.qtdComprasHoje}</div>
                  <div className="flex gap-3 mt-2 text-sm">
                    <span className="text-green-600">
                      {metrics.gastoHoje.qtdDinheiroPix} em Dinheiro/Pix
                    </span>
                    <span className="text-purple-600">
                      {metrics.gastoHoje.qtdGira} em Gira
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Qtd Compras Mês */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingBag className="h-5 w-5 text-blue-500" />
                Compras no Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-12 bg-muted rounded" />
              ) : (
                <>
                  <div className="text-4xl font-bold">{metrics.qtdComprasMes}</div>
                  <div className="flex gap-3 mt-2 text-sm">
                    <span className="text-green-600">
                      {metrics.gastoMes.qtdDinheiroPix} em Dinheiro/Pix
                    </span>
                    <span className="text-purple-600">
                      {metrics.gastoMes.qtdGira} em Gira
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SEÇÃO 3: GRÁFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PieChart - Mix de Peças do Dia */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Mix de Peças (Hoje)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-[280px] bg-muted rounded" />
              ) : pieChartData.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  Nenhuma compra hoje
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {pieChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* BarChart - Compras Mês vs Estoque */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Compras Mês vs Estoque Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-[280px] bg-muted rounded" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={comparativoData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="categoria" className="text-xs" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="comprasMes" name="Compras Mês" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="estoqueAtual" name="Estoque Atual" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SEÇÃO 4: PERFORMANCE DA EQUIPE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* StackedBarChart - Avaliações e Recusas */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Performance das Avaliadoras (Mês)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-[300px] bg-muted rounded" />
              ) : metrics.performanceData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado de avaliadora
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.performanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="nome" width={80} className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      dataKey="aprovadoDinheiro" 
                      name="Aprovado (Din/Pix)" 
                      stackId="a" 
                      fill={COLORS_STACKED.aprovadoDinheiro} 
                    />
                    <Bar 
                      dataKey="aprovadoGira" 
                      name="Aprovado (Gira)" 
                      stackId="a" 
                      fill={COLORS_STACKED.aprovadoGira} 
                    />
                    <Bar 
                      dataKey="recusadoCliente" 
                      name="Recusa Cliente" 
                      stackId="a" 
                      fill={COLORS_STACKED.recusadoCliente} 
                    />
                    <Bar 
                      dataKey="recusadoLoja" 
                      name="Recusa Loja" 
                      stackId="a" 
                      fill={COLORS_STACKED.recusadoLoja} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Highlight Card - Rainha do Gira */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <Crown className="h-5 w-5" />
                Rainha do Gira Crédito
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-32 bg-muted rounded" />
              ) : metrics.rainhaGira.valor === 0 ? (
                <div className="text-muted-foreground text-center py-8">
                  Sem dados de Gira Crédito
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <div className="text-3xl font-bold text-purple-700">
                    {metrics.rainhaGira.nome}
                  </div>
                  <div className="text-xl font-semibold">
                    {formatCurrency(metrics.rainhaGira.valor)}
                  </div>
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <Percent className="h-4 w-4" />
                    <span>
                      {metrics.rainhaGira.percentual.toFixed(0)}% das compras em Gira
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
