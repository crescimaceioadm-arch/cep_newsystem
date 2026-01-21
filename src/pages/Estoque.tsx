import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEstoque } from "@/hooks/useEstoque";
import { AjusteEstoqueModal } from "@/components/estoque/AjusteEstoqueModal";
import { Estoque as EstoqueType } from "@/types/database";
import { Package, Baby, Shirt, Footprints, Gamepad2, Sofa, Archive, Pencil, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, subMonths } from "date-fns";

const CATEGORIA_ICONS: Record<string, React.ReactNode> = {
  "Baby": <Baby className="h-8 w-8" />,
  "1 a 16": <Shirt className="h-8 w-8" />,
  "Calçados": <Footprints className="h-8 w-8" />,
  "Brinquedos": <Gamepad2 className="h-8 w-8" />,
  "Enxoval": <Sofa className="h-8 w-8" />,
  "Itens Médios": <Sofa className="h-8 w-8" />,
  "Itens Grandes": <Archive className="h-8 w-8" />,
  "Fralda": <Baby className="h-8 w-8" />,
  "Bolsa Escolar": <Package className="h-8 w-8" />,
};

const CATEGORIA_COLORS: Record<string, string> = {
  "Baby": "bg-pink-100 text-pink-700 border-pink-200",
  "1 a 16": "bg-blue-100 text-blue-700 border-blue-200",
  "Calçados": "bg-amber-100 text-amber-700 border-amber-200",
  "Brinquedos": "bg-green-100 text-green-700 border-green-200",
  "Enxoval": "bg-purple-100 text-purple-700 border-purple-200",
  "Itens Médios": "bg-purple-100 text-purple-700 border-purple-200",
  "Itens Grandes": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Fralda": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Bolsa Escolar": "bg-orange-100 text-orange-700 border-orange-200",
};

export default function Estoque() {
  const { data: estoque, isLoading } = useEstoque();
  const [itemSelecionado, setItemSelecionado] = useState<EstoqueType | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [periodo, setPeriodo] = useState<string>("mes-atual");

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    switch (periodo) {
      case "hoje":
        return { startDate: startOfDay(now), endDate: endOfDay(now) };
      case "semana":
        return { startDate: startOfWeek(now), endDate: endOfWeek(now) };
      case "mes-atual":
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
      case "mes-passado":
        const lastMonth = subMonths(now, 1);
        return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
      default:
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    }
  }, [periodo]);

  // Buscar compras do período (atendimentos)
  const { data: comprasPeriodo } = useQuery({
    queryKey: ["compras-periodo", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atendimento_itens")
        .select("categoria_id, quantidade, atendimentos!inner(created_at)")
        .gte("atendimentos.created_at", startDate.toISOString())
        .lte("atendimentos.created_at", endDate.toISOString());

      if (error) throw error;
      
      const grouped: Record<string, number> = {};
      data?.forEach((item: any) => {
        grouped[item.categoria_id] = (grouped[item.categoria_id] || 0) + item.quantidade;
      });
      return grouped;
    },
  });

  // Buscar vendas do período
  const { data: vendasPeriodo } = useQuery({
    queryKey: ["vendas-periodo", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venda_itens")
        .select("categoria_id, quantidade, vendas!inner(created_at)")
        .gte("vendas.created_at", startDate.toISOString())
        .lte("vendas.created_at", endDate.toISOString());

      if (error) throw error;
      
      const grouped: Record<string, number> = {};
      data?.forEach((item: any) => {
        grouped[item.categoria_id] = (grouped[item.categoria_id] || 0) + item.quantidade;
      });
      return grouped;
    },
  });

  const abrirAjuste = (item: EstoqueType) => {
    setItemSelecionado(item);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setItemSelecionado(null);
  };

  if (isLoading) {
    return (
      <MainLayout title="Estoque">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Estoque">
      <div className="mb-6 flex items-center gap-4">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="semana">Esta Semana</SelectItem>
            <SelectItem value="mes-atual">Mês Atual</SelectItem>
            <SelectItem value="mes-passado">Mês Passado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!estoque || estoque.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Nenhum item de estoque encontrado</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {estoque.map((item) => {
          const compras = comprasPeriodo?.[item.categoria_id || ""] || 0;
          const vendas = vendasPeriodo?.[item.categoria_id || ""] || 0;
          const saldoPeriodo = compras - vendas;

          return (
          <Card 
            key={item.id} 
            className={`border-2 ${CATEGORIA_COLORS[item.categoria] || 'bg-card'}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background/50">
                    {CATEGORIA_ICONS[item.categoria] || <Package className="h-8 w-8" />}
                  </div>
                  <CardTitle className="text-lg">{item.categoria}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm opacity-70 mb-1">Saldo Atual</p>
                  <p className="text-5xl font-bold">{item.quantidade_atual}</p>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => abrirAjuste(item)}
                  className="gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Ajuste
                </Button>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Compras
                  </span>
                  <span className="font-semibold text-green-600">+{compras}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    Vendas
                  </span>
                  <span className="font-semibold text-red-600">-{vendas}</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground font-medium">Saldo do Período</span>
                  <span className={`font-bold ${saldoPeriodo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {saldoPeriodo >= 0 ? '+' : ''}{saldoPeriodo}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>
      )}

      <AjusteEstoqueModal
        item={itemSelecionado}
        open={modalAberto}
        onClose={fecharModal}
      />
    </MainLayout>
  );
}
