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
import { 
  DollarSign, 
  ShoppingBag, 
  Crown,
  Percent,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Formatar moeda
const formatCurrency = (value: number): string => {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
};

export default function Dashboard() {
  const [allAtendimentos, setAllAtendimentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      let totalDinheiroPix = 0;
      let totalGiraCredito = 0;
      let qtdDinheiroPix = 0;
      let qtdGira = 0;

      atendimentos.forEach(compra => {
        const valor = Number(compra.valor_total_negociado || 0);
        const tipoPagamento = (
          compra.metodo_pagto_1 || 
          compra.tipo_pagamento || 
          compra.forma_pagamento || 
          ''
        ).toLowerCase();

        if (tipoPagamento.includes('pix') || 
            tipoPagamento.includes('dinheiro') || 
            tipoPagamento.includes('débito') || 
            tipoPagamento.includes('debito')) {
          totalDinheiroPix += valor;
          qtdDinheiroPix++;
        } else if (tipoPagamento.includes('gira') || 
                   tipoPagamento.includes('crédito') || 
                   tipoPagamento.includes('credito') || 
                   tipoPagamento.includes('troca')) {
          totalGiraCredito += valor;
          qtdGira++;
        } else if (valor > 0) {
          totalDinheiroPix += valor;
          qtdDinheiroPix++;
        }
      });

      return { 
        dinheiroPix: totalDinheiroPix, 
        giraCredito: totalGiraCredito, 
        qtdDinheiroPix, 
        qtdGira, 
        total: totalDinheiroPix + totalGiraCredito 
      };
    };

    const pagamentosHoje = calcularPorPagamento(finalizadosHoje);
    const pagamentosMes = calcularPorPagamento(finalizadosMes);

    // Performance por avaliadora
    const avaliadoras = new Map<string, {
      aprovadoDinheiro: number;
      aprovadoGira: number;
      recusadoCliente: number;
      recusadoLoja: number;
      totalGira: number;
    }>();

    finalizadosMes.forEach(a => {
      const nome = a.avaliadora_nome || "Não especificada";
      const current = avaliadoras.get(nome) || {
        aprovadoDinheiro: 0,
        aprovadoGira: 0,
        recusadoCliente: 0,
        recusadoLoja: 0,
        totalGira: 0,
      };

      const tipoPagamento = (a.metodo_pagto_1 || '').toLowerCase();
      const valor = Number(a.valor_total_negociado || 0);
      
      if (tipoPagamento.includes('gira') || tipoPagamento.includes('crédito') || tipoPagamento.includes('credito') || tipoPagamento.includes('troca')) {
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
      nome,
      ...data,
      totalAtendimentos: data.aprovadoDinheiro + data.aprovadoGira + data.recusadoCliente + data.recusadoLoja,
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
      performanceData,
      rainhaGira,
    };
  }, [allAtendimentos]);

  return (
    <MainLayout title="Dashboard Estratégico">
      <div className="space-y-6">
        {/* Header com data */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {format(hoje, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        {/* SEÇÃO 1: CARDS FINANCEIROS - HOJE */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <DollarSign className="h-4 w-4 text-green-500" />
                Dinheiro/Pix Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {loading ? "..." : formatCurrency(metrics.gastoHoje.dinheiroPix)}
              </p>
              <p className="text-xs text-muted-foreground">
                {loading ? "" : `${metrics.gastoHoje.qtdDinheiroPix} compras`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <DollarSign className="h-4 w-4 text-purple-500" />
                Gira Crédito Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">
                {loading ? "..." : formatCurrency(metrics.gastoHoje.giraCredito)}
              </p>
              <p className="text-xs text-muted-foreground">
                {loading ? "" : `${metrics.gastoHoje.qtdGira} compras`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <ShoppingBag className="h-4 w-4 text-orange-500" />
                Total Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">
                {loading ? "..." : formatCurrency(metrics.gastoHoje.total)}
              </p>
              <p className="text-xs text-muted-foreground">
                {loading ? "" : `${metrics.qtdComprasHoje} compras`}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-purple-700">
                <Crown className="h-4 w-4" />
                Rainha Gira Crédito
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-purple-700">
                {loading ? "..." : metrics.rainhaGira.nome}
              </p>
              <p className="text-xs text-muted-foreground">
                {loading ? "" : `${formatCurrency(metrics.rainhaGira.valor)} (${metrics.rainhaGira.percentual.toFixed(0)}%)`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* SEÇÃO 2: CARDS FINANCEIROS - MÊS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <DollarSign className="h-4 w-4 text-green-500" />
                Dinheiro/Pix no Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {loading ? "..." : formatCurrency(metrics.gastoMes.dinheiroPix)}
              </p>
              <p className="text-xs text-muted-foreground">
                {loading ? "" : `${metrics.gastoMes.qtdDinheiroPix} compras`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <DollarSign className="h-4 w-4 text-purple-500" />
                Gira Crédito no Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">
                {loading ? "..." : formatCurrency(metrics.gastoMes.giraCredito)}
              </p>
              <p className="text-xs text-muted-foreground">
                {loading ? "" : `${metrics.gastoMes.qtdGira} compras`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <ShoppingBag className="h-4 w-4 text-blue-500" />
                Total no Mês ({format(hoje, "MMMM", { locale: ptBR })})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                {loading ? "..." : formatCurrency(metrics.gastoMes.total)}
              </p>
              <p className="text-xs text-muted-foreground">
                {loading ? "" : `${metrics.qtdComprasMes} compras`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* SEÇÃO 3: PERFORMANCE DA EQUIPE - TABELA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Performance das Avaliadoras (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse h-48 bg-muted rounded" />
            ) : metrics.performanceData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum dado de avaliadora
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Avaliadora</TableHead>
                    <TableHead className="text-center text-green-600">Aprovado (Din/Pix)</TableHead>
                    <TableHead className="text-center text-purple-600">Aprovado (Gira)</TableHead>
                    <TableHead className="text-center text-orange-600">Recusa Cliente</TableHead>
                    <TableHead className="text-center text-red-600">Recusa Loja</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-right text-purple-600">Valor Gira</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.performanceData.map((av) => (
                    <TableRow key={av.nome}>
                      <TableCell className="font-medium">{av.nome}</TableCell>
                      <TableCell className="text-center">{av.aprovadoDinheiro}</TableCell>
                      <TableCell className="text-center">{av.aprovadoGira}</TableCell>
                      <TableCell className="text-center">{av.recusadoCliente}</TableCell>
                      <TableCell className="text-center">{av.recusadoLoja}</TableCell>
                      <TableCell className="text-center font-semibold">{av.totalAtendimentos}</TableCell>
                      <TableCell className="text-right font-semibold text-purple-600">
                        {formatCurrency(av.totalGira)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
