import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useVendasHistorico } from "@/hooks/useVendasHistorico";

export function ExportarCartoesCSV({ vendasFiltradas }: { vendasFiltradas: any[] }) {
  const exportar = () => {
    if (!vendasFiltradas || vendasFiltradas.length === 0) {
      alert("Não há vendas para exportar");
      return;
    }
    // Montar linhas de vendas a crédito/débito
    const linhas: string[] = [];
    vendasFiltradas.forEach((venda) => {
      const pagamentos = [
        { metodo: venda.metodo_pagto_1, valor: venda.valor_pagto_1, bandeira: venda.bandeira_cartao_1 },
        { metodo: venda.metodo_pagto_2, valor: venda.valor_pagto_2, bandeira: venda.bandeira_cartao_2 },
        { metodo: venda.metodo_pagto_3, valor: venda.valor_pagto_3, bandeira: venda.bandeira_cartao_3 },
      ];
      pagamentos.forEach((p) => {
        if (!p.metodo || !p.valor || p.valor <= 0) return;
        const metodoNorm = (p.metodo || "").toLowerCase();
        if (
          metodoNorm.includes("credito") ||
          metodoNorm.includes("crédito") ||
          metodoNorm.includes("debito") ||
          metodoNorm.includes("débito")
        ) {
          const data = format(new Date(venda.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR });
          const forma = p.metodo;
          const bandeira = p.bandeira || "-";
          const valor = p.valor.toFixed(2).replace(".", ",");
          linhas.push(`${data};${forma};${bandeira};${valor}`);
        }
      });
    });
    if (linhas.length === 0) {
      alert("Não há vendas a crédito ou débito no filtro atual");
      return;
    }
    const cabecalho = "Data;Forma de Pagamento;Bandeira;Valor\n";
    const csvContent = cabecalho + linhas.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `vendas_cartoes_${format(new Date(), "yyyy-MM-dd_HHmm")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <Button onClick={exportar} variant="outline" size="sm">
      <Download className="h-4 w-4 mr-2" />
      Exportar Cartões CSV
    </Button>
  );
}
