import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useItensGrandesIndividuais } from "@/hooks/useItensGrandesIndividuais";
import { Search, TrendingUp, Clock } from "lucide-react";

interface ItemComMetricas {
  id: string;
  tipo_nome: string;
  marca_nome: string;
  descricao: string;
  valor_compra: number;
  valor_venda: number | null;
  dias_para_venda: number | null;
  margem: number | null;
  margem_percentual: number | null;
  status: string;
  data_entrada: string;
  data_saida: string | null;
}

interface MetricasPorTipo {
  tipo_nome: string;
  dias_medio_venda: number;
  margem_media_percentual: number;
  quantidade_vendidos: number;
}

export default function RelatorioItensGrandes() {
  const { data: itensGrandes } = useItensGrandesIndividuais();
  const [busca, setBusca] = useState("");

  const itensComMetricas = useMemo(() => {
    if (!itensGrandes) return [];

    const hoje = new Date();
    
    return (itensGrandes as any[]).map((item) => {
      const dataEntrada = new Date(item.data_entrada);
      const dataSaida = item.data_saida ? new Date(item.data_saida) : null;

      let diasParaVenda: number | null = null;
      let margem: number | null = null;
      let margemPercentual: number | null = null;

      if (item.status === "vendido" && dataSaida) {
        diasParaVenda = Math.floor((dataSaida.getTime() - dataEntrada.getTime()) / (1000 * 60 * 60 * 24));
        if (item.valor_venda) {
          margem = item.valor_venda - item.valor_compra;
          margemPercentual = (margem / item.valor_compra) * 100;
        }
      } else if (item.status === "disponivel") {
        diasParaVenda = Math.floor((hoje.getTime() - dataEntrada.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        id: item.id,
        tipo_nome: item.tipo?.nome || "Sem tipo",
        marca_nome: item.marca?.nome || "Sem marca",
        descricao: item.descricao || "",
        valor_compra: item.valor_compra,
        valor_venda: item.valor_venda,
        dias_para_venda: diasParaVenda,
        margem,
        margem_percentual: margemPercentual,
        status: item.status,
        data_entrada: item.data_entrada,
        data_saida: item.data_saida,
      };
    });
  }, [itensGrandes]);

  const metricasPorTipo = useMemo(() => {
    const mapa = new Map<string, { dias: number[]; margens: number[]; quantidade: number }>();

    itensComMetricas.forEach((item) => {
      if (item.status === "vendido" && item.dias_para_venda !== null && item.margem_percentual !== null) {
        const chave = item.tipo_nome;
        if (!mapa.has(chave)) {
          mapa.set(chave, { dias: [], margens: [], quantidade: 0 });
        }
        const dados = mapa.get(chave)!;
        dados.dias.push(item.dias_para_venda);
        dados.margens.push(item.margem_percentual);
        dados.quantidade += 1;
      }
    });

    const resultado: MetricasPorTipo[] = [];
    mapa.forEach((dados, tipoNome) => {
      const diasMedio = Math.round(dados.dias.reduce((a, b) => a + b, 0) / dados.dias.length);
      const margemMedia = Math.round((dados.margens.reduce((a, b) => a + b, 0) / dados.margens.length) * 100) / 100;
      resultado.push({
        tipo_nome: tipoNome,
        dias_medio_venda: diasMedio,
        margem_media_percentual: margemMedia,
        quantidade_vendidos: dados.quantidade,
      });
    });

    return resultado.sort((a, b) => a.tipo_nome.localeCompare(b.tipo_nome));
  }, [itensComMetricas]);

  const itensFiltrados = useMemo(() => {
    if (!busca) return itensComMetricas;

    const termo = busca.toLowerCase();
    return itensComMetricas.filter(
      (item) =>
        item.tipo_nome.toLowerCase().includes(termo) ||
        item.marca_nome.toLowerCase().includes(termo) ||
        item.descricao.toLowerCase().includes(termo)
    );
  }, [itensComMetricas, busca]);

  const itensPorStatus = useMemo(() => {
    return {
      disponivel: itensComMetricas.filter((i) => i.status === "disponivel").length,
      vendido: itensComMetricas.filter((i) => i.status === "vendido").length,
      baixa: itensComMetricas.filter((i) => i.status === "baixa").length,
    };
  }, [itensComMetricas]);

  return (
    <MainLayout title="Relatório - Itens Grandes">
      {/* RESUMO POR TIPO */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Resumo por Tipo de Item</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {metricasPorTipo.map((tipo) => (
            <Card key={tipo.tipo_nome}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{tipo.tipo_nome}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" /> Dias médio
                  </span>
                  <span className="font-semibold">{tipo.dias_medio_venda}d</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" /> Margem média
                  </span>
                  <span className={`font-semibold ${tipo.margem_media_percentual >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {tipo.margem_media_percentual.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {tipo.quantidade_vendidos} item(ns) vendido(s)
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* FILTRO E LISTA DE ITENS */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Lista de Itens</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                Disponível: {itensPorStatus.disponivel}
              </Badge>
              <Badge variant="outline">
                Vendido: {itensPorStatus.vendido}
              </Badge>
              <Badge variant="outline">
                Baixa: {itensPorStatus.baixa}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por tipo, marca ou descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Preço Compra</TableHead>
                  <TableHead className="text-right">Preço Venda</TableHead>
                  <TableHead className="text-right">Dias Venda</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Nenhum item encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  itensFiltrados.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.tipo_nome}</TableCell>
                      <TableCell>{item.marca_nome}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.descricao}</TableCell>
                      <TableCell className="text-right">
                        R$ {item.valor_compra.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.valor_venda ? `R$ ${item.valor_venda.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.dias_para_venda !== null ? `${item.dias_para_venda}d` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.margem_percentual !== null ? (
                          <span className={item.margem_percentual >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                            {item.margem_percentual.toFixed(1)}%
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === "vendido"
                              ? "default"
                              : item.status === "baixa"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {item.status === "vendido"
                            ? "Vendido"
                            : item.status === "baixa"
                              ? "Baixa"
                              : "Disponível"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
