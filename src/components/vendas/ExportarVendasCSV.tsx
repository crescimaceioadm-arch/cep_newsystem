import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MESES = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

// Gerar anos disponíveis (ano atual e 2 anos anteriores)
const getAnos = () => {
  const anoAtual = new Date().getFullYear();
  return [anoAtual, anoAtual - 1, anoAtual - 2].map((ano) => ({
    value: ano.toString(),
    label: ano.toString(),
  }));
};

interface TotaisPorMetodo {
  [key: string]: number;
}

export function ExportarVendasCSV() {
  const [open, setOpen] = useState(false);
  const [mes, setMes] = useState<string>("");
  const [ano, setAno] = useState<string>(new Date().getFullYear().toString());
  const [carregando, setCarregando] = useState(false);

  const handleExportar = async () => {
    if (!mes || !ano) {
      toast.error("Selecione o mês e o ano");
      return;
    }

    setCarregando(true);

    try {
      // Calcular range de datas do mês selecionado
      const dataInicio = `${ano}-${mes}-01`;
      const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
      const dataFim = `${ano}-${mes}-${ultimoDia.toString().padStart(2, "0")}`;

      // Buscar vendas do período
      const { data: vendas, error } = await supabase
        .from("vendas")
        .select(
          "id, data_venda, valor_total_venda, metodo_pagto_1, valor_pagto_1, metodo_pagto_2, valor_pagto_2, metodo_pagto_3, valor_pagto_3"
        )
        .gte("data_venda", dataInicio)
        .lte("data_venda", `${dataFim}T23:59:59`);

      if (error) throw error;

      if (!vendas || vendas.length === 0) {
        toast.info("Nenhuma venda encontrada no período selecionado");
        setCarregando(false);
        return;
      }

      // Calcular totais por método de pagamento
      const totais: TotaisPorMetodo = {};

      vendas.forEach((venda) => {
        // Método 1
        if (venda.metodo_pagto_1 && venda.valor_pagto_1) {
          const metodo = venda.metodo_pagto_1.trim();
          totais[metodo] = (totais[metodo] || 0) + venda.valor_pagto_1;
        }
        // Método 2
        if (venda.metodo_pagto_2 && venda.valor_pagto_2) {
          const metodo = venda.metodo_pagto_2.trim();
          totais[metodo] = (totais[metodo] || 0) + venda.valor_pagto_2;
        }
        // Método 3
        if (venda.metodo_pagto_3 && venda.valor_pagto_3) {
          const metodo = venda.metodo_pagto_3.trim();
          totais[metodo] = (totais[metodo] || 0) + venda.valor_pagto_3;
        }
      });

      // Calcular total geral
      const totalGeral = Object.values(totais).reduce((acc, val) => acc + val, 0);

      // Montar CSV
      const mesLabel = MESES.find((m) => m.value === mes)?.label || mes;
      const linhas = [
        ["Relatório de Vendas por Forma de Pagamento"],
        [`Período: ${mesLabel}/${ano}`],
        [`Total de Vendas: ${vendas.length}`],
        [""],
        ["Forma de Pagamento", "Valor Total (R$)"],
      ];

      // Ordenar métodos alfabeticamente
      const metodosOrdenados = Object.entries(totais).sort((a, b) =>
        a[0].localeCompare(b[0])
      );

      metodosOrdenados.forEach(([metodo, valor]) => {
        linhas.push([metodo, valor.toFixed(2).replace(".", ",")]);
      });

      // Linha de total
      linhas.push([""]);
      linhas.push(["TOTAL GERAL", totalGeral.toFixed(2).replace(".", ",")]);

      // Converter para CSV
      const csvContent = linhas
        .map((linha) => linha.map((cell) => `"${cell}"`).join(";"))
        .join("\n");

      // Adicionar BOM para UTF-8 (para Excel reconhecer acentos)
      const bom = "\uFEFF";
      const blob = new Blob([bom + csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      // Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `vendas_${mesLabel.toLowerCase()}_${ano}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Relatório exportado com sucesso!");
      setOpen(false);
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar relatório");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Exportar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Vendas por Período
          </DialogTitle>
          <DialogDescription>
            Gera um CSV com o total de vendas por forma de pagamento no período
            selecionado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="mes">Mês</Label>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger id="mes">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ano">Ano</Label>
            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger id="ano">
                <SelectValue placeholder="Selecione o ano" />
              </SelectTrigger>
              <SelectContent>
                {getAnos().map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExportar} disabled={carregando || !mes}>
            {carregando ? "Exportando..." : "Exportar CSV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
