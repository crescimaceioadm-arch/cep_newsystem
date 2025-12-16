import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  startOfDay, 
  startOfMonth, 
  endOfDay,
  isToday,
  format
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Crown, Users } from "lucide-react";
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
} from "recharts";

// Formatar moeda
const formatCurrency = (value: number): string => {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
};

// Cores para gráficos
const COLORS = {
  dinheiro: "#10B981", // verde
  gira: "#8B5CF6",     // roxo
  recusado: "#EF4444", // vermelho
  azul: "#3B82F6",
  laranja: "#F97316",
};

const CATEGORIA_COLORS = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#FBBF24"];

// Tooltip customizado para barras empilhadas financeiras
const CustomFinanceTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const dinheiro = payload.find((p: any) => p.dataKey === "dinheiro")?.value || 0;
    const gira = payload.find((p: any) => p.dataKey === "gira")?.value || 0;
    const total = dinheiro + gira;
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="font-semibold">Total: {formatCurrency(total)}</p>
        <p className="text-green-600">Dinheiro/Pix: {formatCurrency(dinheiro)}</p>
        <p className="text-purple-600">Gira Crédito: {formatCurrency(gira)}</p>
      </div>
    );
  }
  return null;
};

// Tooltip customizado para quantidade
const CustomQtdTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const dinheiro = payload.find((p: any) => p.dataKey === "dinheiro")?.value || 0;
    const gira = payload.find((p: any) => p.dataKey === "gira")?.value || 0;
    const total = dinheiro + gira;
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="font-semibold">Total: {total} compras</p>
        <p className="text-green-600">Dinheiro/Pix: {dinheiro}</p>
        <p className="text-purple-600">Gira Crédito: {gira}</p>
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

  // Função de classificação de pagamento CORRIGIDA
  const classificarPagamento = (metodo: string): "dinheiro" | "gira" => {
    const tipo = (metodo || "").toLowerCase();
    
    // Regra Gira Crédito
    if (tipo.includes("gira") || 
        tipo.includes("crédito") || 
        tipo.includes("credito") || 
        tipo.includes("troca") || 
        tipo.includes("voucher")) {
      return "gira";
    }
    
    // Regra Dinheiro/Pix (inclui débito)
    if (tipo.includes("pix") || 
        tipo.includes("dinheiro") || 
        tipo.includes("débito") || 
        tipo.includes("debito")) {
      return "dinheiro";
    }
    
    // Fallback: se não identificou, considera dinheiro
    return "dinheiro";
  };

  // Cálculos das métricas
  const metrics = useMemo(() => {
    const atendimentosHoje = allAtendimentos.filter(a => 
      isToday(new Date(a.created_at))
    );
    const atendimentosMes = allAtendimentos;

    const finalizadosHoje = atendimentosHoje.filter(a => a.status === "finalizado");
    const finalizadosMes = atendimentosMes.filter(a => a.status === "finalizado");
    const recusadosMes = atendimentosMes.filter(a => a.status === "recusado");

    // Função de cálculo robusta
    const calcularPorPagamento = (atendimentos: any[]) => {
      let totalDinheiro = 0;
      let totalGira = 0;
      let qtdDinheiro = 0;
      let qtdGira = 0;

      atendimentos.forEach(compra => {
        const valor = Number(compra.valor_total_negociado || 0);
        const metodo = compra.metodo_pagto_1 || compra.tipo_pagamento || compra.forma_pagamento || "";
        const tipo = classificarPagamento(metodo);

        if (valor > 0) {
          if (tipo === "gira") {
            totalGira += valor;
            qtdGira++;
          } else {
            totalDinheiro += valor;
            qtdDinheiro++;
          }
        }
      });

      return { 
        dinheiro: totalDinheiro, 
        gira: totalGira, 
        qtdDinheiro, 
        qtdGira, 
        total: totalDinheiro + totalGira 
      };
    };

    const pagamentosHoje = calcularPorPagamento(finalizadosHoje);
    const pagamentosMes = calcularPorPagamento(finalizadosMes);

    // Mix de peças HOJE
    const pecasHoje = {
      baby: 0,
      infantil: 0,
      calcados: 0,
      brinquedos: 0,
      medios: 0,
      grandes: 0,
    };

    finalizadosHoje.forEach(a => {
      pecasHoje.baby += Number(a.qtd_baby || 0);
      pecasHoje.infantil += Number(a.qtd_1_a_16 || 0);
      pecasHoje.calcados += Number(a.qtd_calcados || 0);
      pecasHoje.brinquedos += Number(a.qtd_brinquedos || 0);
      pecasHoje.medios += Number(a.qtd_itens_medios || 0);
      pecasHoje.grandes += Number(a.qtd_itens_grandes || 0);
    });

    // Mix de peças MÊS
    const pecasMes = {
      baby: 0,
      infantil: 0,
      calcados: 0,
      brinquedos: 0,
      medios: 0,
      grandes: 0,
    };

    finalizadosMes.forEach(a => {
      pecasMes.baby += Number(a.qtd_baby || 0);
      pecasMes.infantil += Number(a.qtd_1_a_16 || 0);
      pecasMes.calcados += Number(a.qtd_calcados || 0);
      pecasMes.brinquedos += Number(a.qtd_brinquedos || 0);
      pecasMes.medios += Number(a.qtd_itens_medios || 0);
      pecasMes.grandes += Number(a.qtd_itens_grandes || 0);
    });

    // Performance por avaliadora
    const avaliadoras = new Map<string, {
      aprovadoDinheiro: number;
      aprovadoGira: number;
      recusado: number;
      totalGira: number;
    }>();

    finalizadosMes.forEach(a => {
      const nome = a.avaliadora_nome || "Não especificada";
      const current = avaliadoras.get(nome) || {
        aprovadoDinheiro: 0,
        aprovadoGira: 0,
        recusado: 0,
        totalGira: 0,
      };

      const metodo = a.metodo_pagto_1 || "";
      const tipo = classificarPagamento(metodo);
      const valor = Number(a.valor_total_negociado || 0);
      
      if (tipo === "gira") {
        current.aprovadoGira++;
        current.totalGira += valor;
      } else {
        current.aprovadoDinheiro++;
      }

      avaliadoras.set(nome, current);
    });

    recusadosMes.forEach(a => {
      const nome = a.avaliadora_nome || "Não especificada";
      const current = avaliadoras.get(nome) || {
        aprovadoDinheiro: 0,
        aprovadoGira: 0,
        recusado: 0,
        totalGira: 0,
      };
      current.recusado++;
      avaliadoras.set(nome, current);
    });

    const performanceData = Array.from(avaliadoras.entries())
      .map(([nome, data]) => ({
        nome,
        ...data,
        total: data.aprovadoDinheiro + data.aprovadoGira + data.recusado,
      }))
      .filter(a => a.total > 0)
      .sort((a, b) => b.totalGira - a.totalGira);

    // Rainha do Gira Crédito
    let rainhaGira = { nome: "-", valor: 0, percentual: 0 };
    performanceData.forEach(av => {
      if (av.totalGira > rainhaGira.valor) {
        const totalAprovado = av.aprovadoDinheiro + av.aprovadoGira;
        rainhaGira = {
          nome: av.nome,
          valor: av.totalGira,
          percentual: totalAprovado > 0 ? (av.aprovadoGira / totalAprovado) * 100 : 0,
        };
      }
    });

    return {
      gastoHoje: pagamentosHoje,
      gastoMes: pagamentosMes,
      pecasHoje,
      pecasMes,
      performanceData,
      rainhaGira,
    };
  }, [allAtendimentos]);

  // Dados para gráficos de barras empilhadas - FINANCEIRO
  const dadosFinanceiroMes = [{ name: "Mês", dinheiro: metrics.gastoMes.dinheiro, gira: metrics.gastoMes.gira }];
  const dadosFinanceiroHoje = [{ name: "Hoje", dinheiro: metrics.gastoHoje.dinheiro, gira: metrics.gastoHoje.gira }];

  // Dados para gráficos de barras empilhadas - QUANTIDADE
  const dadosQtdMes = [{ name: "Mês", dinheiro: metrics.gastoMes.qtdDinheiro, gira: metrics.gastoMes.qtdGira }];
  const dadosQtdHoje = [{ name: "Hoje", dinheiro: metrics.gastoHoje.qtdDinheiro, gira: metrics.gastoHoje.qtdGira }];

  // Dados para PieChart - Mix de peças hoje
  const dadosPieHoje = [
    { name: "Baby", value: metrics.pecasHoje.baby },
    { name: "Infantil 1-16", value: metrics.pecasHoje.infantil },
    { name: "Calçados", value: metrics.pecasHoje.calcados },
    { name: "Brinquedos", value: metrics.pecasHoje.brinquedos },
    { name: "Médios", value: metrics.pecasHoje.medios },
    { name: "Grandes", value: metrics.pecasHoje.grandes },
  ].filter(d => d.value > 0);

  // Dados para BarChart comparativo - Compras Mês vs Estoque
  const estoqueMap = new Map<string, number>();
  estoque?.forEach(e => {
    estoqueMap.set(e.categoria.toLowerCase(), e.quantidade_atual);
  });

  const dadosComparativo = [
    { 
      name: "Baby", 
      comprasMes: metrics.pecasMes.baby, 
      estoque: estoqueMap.get("baby") || estoqueMap.get("roupas baby") || 0 
    },
    { 
      name: "Infantil", 
      comprasMes: metrics.pecasMes.infantil, 
      estoque: estoqueMap.get("infantil") || estoqueMap.get("roupas 1 a 16") || 0 
    },
    { 
      name: "Calçados", 
      comprasMes: metrics.pecasMes.calcados, 
      estoque: estoqueMap.get("calçados") || estoqueMap.get("calcados") || 0 
    },
    { 
      name: "Brinquedos", 
      comprasMes: metrics.pecasMes.brinquedos, 
      estoque: estoqueMap.get("brinquedos") || 0 
    },
  ];

  return (
    <MainLayout title="Dashboard Estratégico">
      <div className="space-y-6 text-left">
        {/* Header com data */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {format(hoje, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        {/* LINHA 1: FINANCEIRO - Barras Empilhadas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Gastos no Mês (R$)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-32 bg-muted rounded" />
              ) : (
                <div className="w-full h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosFinanceiroMes} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" hide />
                      <Tooltip content={<CustomFinanceTooltip />} />
                      <Legend />
                      <Bar dataKey="dinheiro" name="Dinheiro/Pix" stackId="a" fill={COLORS.dinheiro} />
                      <Bar dataKey="gira" name="Gira Crédito" stackId="a" fill={COLORS.gira} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="text-center text-lg font-bold mt-2">
                Total: {formatCurrency(metrics.gastoMes.total)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Gastos Hoje (R$)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-32 bg-muted rounded" />
              ) : (
                <div className="w-full h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosFinanceiroHoje} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" hide />
                      <Tooltip content={<CustomFinanceTooltip />} />
                      <Legend />
                      <Bar dataKey="dinheiro" name="Dinheiro/Pix" stackId="a" fill={COLORS.dinheiro} />
                      <Bar dataKey="gira" name="Gira Crédito" stackId="a" fill={COLORS.gira} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="text-center text-lg font-bold mt-2">
                Total: {formatCurrency(metrics.gastoHoje.total)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* LINHA 2: QUANTIDADE DE COMPRAS - Barras Empilhadas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Qtd Compras no Mês</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-32 bg-muted rounded" />
              ) : (
                <div className="w-full h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosQtdMes} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" hide />
                      <Tooltip content={<CustomQtdTooltip />} />
                      <Legend />
                      <Bar dataKey="dinheiro" name="Dinheiro/Pix" stackId="a" fill={COLORS.dinheiro} />
                      <Bar dataKey="gira" name="Gira Crédito" stackId="a" fill={COLORS.gira} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="text-center text-lg font-bold mt-2">
                Total: {metrics.gastoMes.qtdDinheiro + metrics.gastoMes.qtdGira} compras
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Qtd Compras Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-32 bg-muted rounded" />
              ) : (
                <div className="w-full h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosQtdHoje} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" hide />
                      <Tooltip content={<CustomQtdTooltip />} />
                      <Legend />
                      <Bar dataKey="dinheiro" name="Dinheiro/Pix" stackId="a" fill={COLORS.dinheiro} />
                      <Bar dataKey="gira" name="Gira Crédito" stackId="a" fill={COLORS.gira} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="text-center text-lg font-bold mt-2">
                Total: {metrics.gastoHoje.qtdDinheiro + metrics.gastoHoje.qtdGira} compras
              </p>
            </CardContent>
          </Card>
        </div>

        {/* LINHA 3: CATEGORIAS - PieChart + BarChart Comparativo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Mix de Peças Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-48 bg-muted rounded" />
              ) : dadosPieHoje.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  Nenhuma peça hoje
                </div>
              ) : (
                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosPieHoje}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {dadosPieHoje.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORIA_COLORS[index % CATEGORIA_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Compras Mês vs Estoque Atual</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-48 bg-muted rounded" />
              ) : (
                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosComparativo}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="comprasMes" name="Compras Mês" fill={COLORS.azul} />
                      <Bar dataKey="estoque" name="Estoque Atual" fill={COLORS.dinheiro} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* LINHA 4: PERFORMANCE EQUIPE - StackedBarChart Vertical */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              Performance da Equipe (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse h-64 bg-muted rounded" />
            ) : metrics.performanceData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Nenhum dado de avaliadora
              </div>
            ) : (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.performanceData} layout="vertical">
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="nome" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="aprovadoDinheiro" name="Aprovado (Din/Pix)" stackId="a" fill={COLORS.dinheiro} />
                    <Bar dataKey="aprovadoGira" name="Aprovado (Gira)" stackId="a" fill={COLORS.gira} />
                    <Bar dataKey="recusado" name="Recusado" stackId="a" fill={COLORS.recusado} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* LINHA 5: DESTAQUE - Rainha do Gira */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-purple-700">
              <Crown className="h-5 w-5" />
              Rainha do Gira Crédito (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-700">
                  {loading ? "..." : metrics.rainhaGira.nome}
                </p>
                <p className="text-sm text-muted-foreground">
                  Maior conversão em Gira Crédito
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-purple-600">
                  {loading ? "..." : formatCurrency(metrics.rainhaGira.valor)}
                </p>
                <p className="text-sm text-purple-500">
                  {loading ? "" : `${metrics.rainhaGira.percentual.toFixed(0)}% conversão`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
