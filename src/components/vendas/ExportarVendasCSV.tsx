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
  { value: "all", label: "Todos os meses" },
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

// Colunas fixas do CSV na ordem correta
const COLUNAS_PAGAMENTO = [
  "Crédito à vista",
  "Crédito 2x",
  "Crédito 3x",
  "Crédito 4x",
  "Crédito 5x",
  "Crédito 6x",
  "Crédito 7x",
  "Crédito 8x",
  "Crédito 9x",
  "Crédito 10x",
  "Débito",
  "Dinheiro",
  "Pix",
  "Gira crédito",
  "Vale Presente",
];

// Formatar valor no padrão brasileiro (1.234,56)
const formatarValorBR = (valor: number): string => {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

interface TotaisPorMes {
  [mes: string]: { [metodo: string]: number };
}

export function ExportarVendasCSV() {
  const [open, setOpen] = useState(false);
  const [mes, setMes] = useState<string>("all");
  const [ano, setAno] = useState<string>(new Date().getFullYear().toString());
  const [carregando, setCarregando] = useState(false);

  const handleExportar = async () => {
    if (!ano) {
      toast.error("Selecione o ano");
      return;
    }

    setCarregando(true);

    try {
      // Calcular range de datas
      let dataInicio: string;
      let dataFim: string;

      if (mes === "all") {
        dataInicio = `${ano}-01-01`;
        dataFim = `${ano}-12-31T23:59:59`;
      } else {
        const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
        dataInicio = `${ano}-${mes}-01`;
        dataFim = `${ano}-${mes}-${ultimoDia.toString().padStart(2, "0")}T23:59:59`;
      }

      const { data: vendas, error } = await supabase
        .from("vendas")
        .select(
          "id, created_at, metodo_pagto_1, valor_pagto_1, metodo_pagto_2, valor_pagto_2, metodo_pagto_3, valor_pagto_3"
        )
        .gte("created_at", dataInicio)
        .lte("created_at", dataFim);

      if (error) throw error;

      if (!vendas || vendas.length === 0) {
        toast.info("Nenhuma venda encontrada no período selecionado");
        setCarregando(false);
        return;
      }

      // Agrupar por mês e método de pagamento
      const totaisPorMes: TotaisPorMes = {};

      vendas.forEach((venda) => {
        const dataVenda = new Date(venda.created_at);
        const mesKey = `${(dataVenda.getMonth() + 1).toString().padStart(2, "0")}/${ano}`;

        if (!totaisPorMes[mesKey]) {
          totaisPorMes[mesKey] = {};
          COLUNAS_PAGAMENTO.forEach((col) => {
            totaisPorMes[mesKey][col] = 0;
          });
        }

        // Processar cada método de pagamento
        const processarPagamento = (metodo: string | null, valor: number | null) => {
          if (!metodo || !valor) return;
          
          // Normalizar o método de pagamento
          const metodoOriginal = metodo.trim();
          let metodoNormalizado = metodoOriginal;
          
          // Função auxiliar para normalizar string (remove acentos e converte para minúsculas)
          const normalizar = (str: string) => 
            str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
          
          // Mapeamento inteligente baseado em padrões
          const metodoNorm = normalizar(metodoOriginal);
          
          // Detectar PIX
          if (metodoNorm === "pix") {
            metodoNormalizado = "Pix";
          }
          // Detectar Dinheiro
          else if (metodoNorm === "dinheiro") {
            metodoNormalizado = "Dinheiro";
          }
          // Detectar Débito
          else if (metodoNorm === "debito") {
            metodoNormalizado = "Débito";
          }
          // Detectar Gira crédito
          else if (metodoNorm.includes("gira")) {
            metodoNormalizado = "Gira crédito";
          }
          // Detectar Vale Presente
          else if (metodoNorm.includes("vale")) {
            metodoNormalizado = "Vale Presente";
          }
          // Detectar Crédito com parcelas
          else if (metodoNorm.includes("credito")) {
            // Extrair número de parcelas (2x, 3x, etc)
            const match = metodoOriginal.match(/(\d+)x/i);
            if (match) {
              const parcelas = match[1];
              metodoNormalizado = `Crédito ${parcelas}x`;
            } else if (metodoNorm.includes("vista")) {
              metodoNormalizado = "Crédito à vista";
            } else {
              // Se não tem parcela especificada, assume à vista
              metodoNormalizado = "Crédito à vista";
            }
          }
          
          // Verificar se o método normalizado existe nas colunas
          if (totaisPorMes[mesKey][metodoNormalizado] !== undefined) {
            totaisPorMes[mesKey][metodoNormalizado] += valor;
          } else {
            // Se ainda não encontrou, loga para debug
            console.warn(`⚠️ Método não mapeado: "${metodoOriginal}" → tentou: "${metodoNormalizado}"`);
          }
        };

        processarPagamento(venda.metodo_pagto_1, venda.valor_pagto_1);
        processarPagamento(venda.metodo_pagto_2, venda.valor_pagto_2);
        processarPagamento(venda.metodo_pagto_3, venda.valor_pagto_3);
      });

      // Ordenar meses do mais recente para o mais antigo
      const mesesOrdenados = Object.keys(totaisPorMes).sort((a, b) => {
        const [mesA] = a.split("/");
        const [mesB] = b.split("/");
        return parseInt(mesB) - parseInt(mesA);
      });

      // Calcular total geral para debug
      let totalGeralCSV = 0;
      mesesOrdenados.forEach((mesKey) => {
        COLUNAS_PAGAMENTO.forEach((col) => {
          totalGeralCSV += totaisPorMes[mesKey][col] || 0;
        });
      });
      
      console.log(`📊 Total processado no CSV: R$ ${totalGeralCSV.toFixed(2)}`);
      console.log(`📦 ${vendas.length} vendas processadas no período`);

      // Montar CSV no formato especificado
      const header = ["mês", ...COLUNAS_PAGAMENTO];
      const linhas: string[][] = [header];

      mesesOrdenados.forEach((mesKey) => {
        const [mes] = mesKey.split("/");
        const dataFormatada = `01/${mes}/${ano}`;
        const valores = COLUNAS_PAGAMENTO.map((col) =>
          `"${formatarValorBR(totaisPorMes[mesKey][col] || 0)}"`
        );
        linhas.push([dataFormatada, ...valores]);
      });

      // Converter para CSV (usar vírgula como separador)
      const csvContent = linhas
        .map((linha) => linha.join(","))
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
      link.download = `Input_Fat_Controle_Financeiro_${ano}.csv`;
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
            Exportar Faturamento Anual
          </DialogTitle>
          <DialogDescription>
            Gera um CSV com o total de vendas por forma de pagamento para cada mês do ano selecionado.
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
          <Button onClick={handleExportar} disabled={carregando}>
            {carregando ? "Exportando..." : "Exportar CSV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
