import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ShoppingBag, ShoppingCart, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { DateRange } from "react-day-picker";

export default function Dashboard() {
  // Date Range (default: últimos 30 dias)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Metas (salvas no localStorage)
  const [metaVenda, setMetaVenda] = useState(() => 
    localStorage.getItem("dashboard_meta_venda") || ""
  );
  const [metaCompra, setMetaCompra] = useState(() => 
    localStorage.getItem("dashboard_meta_compra") || ""
  );

  // Dados brutos
  const [salesData, setSalesData] = useState<any[]>([]);
  const [purchasesData, setPurchasesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Salvar metas no localStorage
  useEffect(() => {
    localStorage.setItem("dashboard_meta_venda", metaVenda);
  }, [metaVenda]);

  useEffect(() => {
    localStorage.setItem("dashboard_meta_compra", metaCompra);
  }, [metaCompra]);

  // Buscar dados quando dateRange mudar
  useEffect(() => {
    async function fetchData() {
      if (!dateRange?.from || !dateRange?.to) return;
      
      setLoading(true);
      
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();

      // Buscar vendas
      const { data: vendas, error: vendasError } = await supabase
        .from("vendas")
        .select("*")
        .gte("data_venda", startDate)
        .lte("data_venda", endDate);

      if (vendasError) {
        console.error("Erro ao buscar vendas:", vendasError);
      } else {
        setSalesData(vendas || []);
      }

      // Buscar atendimentos finalizados (compras)
      const { data: atendimentos, error: atendimentosError } = await supabase
        .from("atendimentos")
        .select("*")
        .eq("status", "finalizado")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      if (atendimentosError) {
        console.error("Erro ao buscar atendimentos:", atendimentosError);
      } else {
        setPurchasesData(atendimentos || []);
      }

      setLoading(false);
    }

    fetchData();
  }, [dateRange]);

  const handleMetaBlur = (setter: (v: string) => void, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setter(num.toFixed(2));
    }
  };

  return (
    <MainLayout title="Dashboard Gerencial">
      <div className="space-y-6">
        {/* Filtros e Metas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Configurações do Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date Range Picker */}
              <div className="space-y-2">
                <Label>Período de Análise</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                            {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                          </>
                        ) : (
                          format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                        )
                      ) : (
                        <span>Selecione o período</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Meta Venda */}
              <div className="space-y-2">
                <Label htmlFor="metaVenda">Meta Venda (R$)</Label>
                <Input
                  id="metaVenda"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={metaVenda}
                  onChange={(e) => setMetaVenda(e.target.value)}
                  onBlur={() => handleMetaBlur(setMetaVenda, metaVenda)}
                />
              </div>

              {/* Meta Compra */}
              <div className="space-y-2">
                <Label htmlFor="metaCompra">Meta Compra (R$)</Label>
                <Input
                  id="metaCompra"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={metaCompra}
                  onChange={(e) => setMetaCompra(e.target.value)}
                  onBlur={() => handleMetaBlur(setMetaCompra, metaCompra)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vendas encontradas no período
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-8 w-16 bg-muted rounded"></div>
              ) : (
                <div className="text-3xl font-bold">{salesData.length}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">registros na tabela vendas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Compras finalizadas no período
              </CardTitle>
              <ShoppingBag className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-8 w-16 bg-muted rounded"></div>
              ) : (
                <div className="text-3xl font-bold">{purchasesData.length}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">atendimentos finalizados</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
