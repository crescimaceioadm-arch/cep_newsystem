import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEstoque } from "@/hooks/useEstoque";
import { useVendasHoje } from "@/hooks/useVendas";
import { DollarSign, Package, ShoppingBag, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#8b5cf6", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6"];

export default function Dashboard() {
  const { data: estoque, isLoading: loadingEstoque } = useEstoque();
  const { data: vendasHoje, isLoading: loadingVendas } = useVendasHoje();

  // Cálculos de KPIs
  const totalVendasHoje = vendasHoje?.reduce((sum, v) => sum + (v.valor_total || 0), 0) || 0;
  const qtdVendasHoje = vendasHoje?.length || 0;
  const ticketMedio = qtdVendasHoje > 0 ? totalVendasHoje / qtdVendasHoje : 0;

  const pecasVendidasHoje = vendasHoje?.reduce((sum, v) => {
    return sum + 
      (v.qtd_baby_vendida || 0) + 
      (v.qtd_1_a_16_vendida || 0) + 
      (v.qtd_calcados_vendida || 0) + 
      (v.qtd_brinquedos_vendida || 0) + 
      (v.qtd_itens_medios_vendida || 0) + 
      (v.qtd_itens_grandes_vendida || 0);
  }, 0) || 0;

  // Dados para gráfico de barras (Estoque)
  const dadosEstoque = estoque?.map((e) => ({
    categoria: e.categoria,
    quantidade: e.quantidade_atual,
  })) || [];

  // Dados para gráfico de pizza (Pagamentos)
  const pagamentosAgregados: Record<string, number> = {};
  vendasHoje?.forEach((v) => {
    if (v.metodo_pagto_1 && v.valor_pagto_1) {
      pagamentosAgregados[v.metodo_pagto_1] = (pagamentosAgregados[v.metodo_pagto_1] || 0) + v.valor_pagto_1;
    }
    if (v.metodo_pagto_2 && v.valor_pagto_2) {
      pagamentosAgregados[v.metodo_pagto_2] = (pagamentosAgregados[v.metodo_pagto_2] || 0) + v.valor_pagto_2;
    }
    if (v.metodo_pagto_3 && v.valor_pagto_3) {
      pagamentosAgregados[v.metodo_pagto_3] = (pagamentosAgregados[v.metodo_pagto_3] || 0) + v.valor_pagto_3;
    }
  });

  const dadosPagamentos = Object.entries(pagamentosAgregados).map(([name, value]) => ({
    name,
    value,
  }));

  if (loadingEstoque || loadingVendas) {
    return (
      <MainLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard">
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vendas Hoje</CardTitle>
              <DollarSign className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {totalVendasHoje.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{qtdVendasHoje} venda(s)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Peças Vendidas Hoje</CardTitle>
              <ShoppingBag className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pecasVendidasHoje}</div>
              <p className="text-xs text-muted-foreground">unidades</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {ticketMedio.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">por venda</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total em Estoque</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {estoque?.reduce((sum, e) => sum + (e.quantidade_atual || 0), 0) || 0}
              </div>
              <p className="text-xs text-muted-foreground">peças disponíveis</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Barras - Estoque */}
          <Card>
            <CardHeader>
              <CardTitle>Estoque por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosEstoque} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="categoria" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => [`${value} peças`, 'Quantidade']} />
                    <Bar dataKey="quantidade" fill="hsl(270, 60%, 50%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Pizza - Pagamentos */}
          <Card>
            <CardHeader>
              <CardTitle>Vendas por Método de Pagamento (Hoje)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {dadosPagamentos.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosPagamentos}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {dadosPagamentos.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Valor']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Nenhuma venda realizada hoje
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
