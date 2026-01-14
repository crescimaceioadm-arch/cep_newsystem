import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useHistoricoFechamentos,
  useEstatisticasFechamentos,
} from "@/hooks/useCaixas";
import { CheckCircle, XCircle, Clock, TrendingUp, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function RelatorioFechamentosCard() {
  const [diasFiltro, setDiasFiltro] = useState(30);
  const { data: historico, isLoading: loadingHistorico, error: errorHistorico } = useHistoricoFechamentos(diasFiltro * 10); // Margem maior
  const { data: estatisticas, isLoading: loadingEstatisticas, error: errorEstatisticas } = useEstatisticasFechamentos(diasFiltro);

  if (loadingHistorico || loadingEstatisticas) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Relatório de Fechamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando estatísticas...</p>
        </CardContent>
      </Card>
    );
  }

  if (errorHistorico || errorEstatisticas) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Relatório de Fechamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Erro ao carregar relatório: {(errorHistorico || errorEstatisticas)?.message || "Erro desconhecido"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Agrupar fechamentos por data
  const fechamentosPorData = historico?.reduce((acc: any, fechamento: any) => {
    const data = fechamento.data_fechamento;
    if (!acc[data]) {
      acc[data] = [];
    }
    acc[data].push(fechamento);
    return acc;
  }, {}) || {};

  // Ordenar datas em ordem decrescente
  const datasOrdenadas = Object.keys(fechamentosPorData || {}).sort((a, b) =>
    b.localeCompare(a)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Relatório de Fechamentos
            </CardTitle>
            <CardDescription>Histórico e estatísticas de desempenho</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={diasFiltro.toString()}
              onValueChange={(value) => setDiasFiltro(Number(value))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="15">Últimos 15 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="60">Últimos 60 dias</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" title="Exportar relatório">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Indicador de Performance */}
        <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Taxa de Fechamentos Corretos
            </h3>
            <Badge variant="outline" className="bg-white">
              {diasFiltro} dias
            </Badge>
          </div>
          
          <div className="flex items-end gap-3">
            <div className="text-5xl font-bold text-primary">
              {estatisticas?.percentualDiasPerfeitos || "0"}%
            </div>
            <div className="text-sm text-muted-foreground pb-2">
              ({estatisticas?.diasPerfeitos || 0} de {estatisticas?.totalDias || 0} dias perfeitos)
            </div>
          </div>

          {/* Barra de progresso visual */}
          <div className="mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
              style={{
                width: `${estatisticas?.percentualDiasPerfeitos || 0}%`,
              }}
            />
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            Dias em que todos os caixas fecharam com valores corretos (sem divergências)
          </p>
        </div>

        {/* Histórico por Data */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground">
            Histórico Detalhado
          </h3>

          {datasOrdenadas.slice(0, diasFiltro).map((data) => {
            // Validar se a data é válida
            if (!data) return null;
            
            const fechamentosData = fechamentosPorData[data];
            if (!fechamentosData || fechamentosData.length === 0) return null;
            
            const todosCorretos = fechamentosData.every((f: any) => f.diferenca === 0);
            const temDivergencia = fechamentosData.some((f: any) => f.diferenca !== 0);
            const temPendente = fechamentosData.some(
              (f: any) => f.status === "pendente_aprovacao"
            );

            // Validar formato da data antes de usar
            let dataFormatada = data;
            try {
              const dataObj = new Date(data + "T00:00:00");
              if (isNaN(dataObj.getTime())) {
                return null; // Data inválida, pular
              }
              dataFormatada = format(dataObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
            } catch (error) {
              console.error("Erro ao formatar data:", data, error);
              return null;
            }

            // Se todos bateram, mostrar apenas o indicador visual
            if (todosCorretos) {
              return (
                <div
                  key={data}
                  className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">
                        {dataFormatada}
                      </p>
                      <p className="text-xs text-green-700">
                        Todos os {fechamentosData.length} caixa(s) fecharam corretamente ✨
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    Perfeito
                  </Badge>
                </div>
              );
            }

            // Se há divergência, mostrar apenas os caixas problemáticos
            const caixasProblematicos = fechamentosData.filter(
              (f: any) => f.diferenca !== 0
            );

            return (
              <div key={data} className="space-y-2">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-900">
                          {dataFormatada}
                        </p>
                        <p className="text-xs text-red-700">
                          {caixasProblematicos.length} caixa(s) com divergência
                        </p>
                      </div>
                    </div>
                    {temPendente && (
                      <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendente
                      </Badge>
                    )}
                  </div>

                  {/* Tabela de caixas problemáticos */}
                  <div className="space-y-2">
                    {caixasProblematicos.map((fechamento: any) => {
                      const diferenca = fechamento.diferenca || 0;
                      const tipo = diferenca > 0 ? "sobra" : "falta";
                      const corDiferenca = diferenca > 0 ? "text-blue-600" : "text-red-600";

                      return (
                        <div
                          key={fechamento.id}
                          className="p-3 bg-white border rounded"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">
                                {fechamento.caixa?.[0]?.nome || "Caixa"}
                              </p>
                              <Badge
                                variant={tipo === "sobra" ? "default" : "destructive"}
                                className="mt-1"
                              >
                                {tipo === "sobra" ? "Sobra" : "Falta"} de R${" "}
                                {Math.abs(diferenca).toFixed(2)}
                              </Badge>
                            </div>
                            <Badge
                              variant={
                                fechamento.status === "aprovado"
                                  ? "outline"
                                  : fechamento.status === "pendente_aprovacao"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {fechamento.status === "aprovado"
                                ? "Aprovado"
                                : fechamento.status === "pendente_aprovacao"
                                ? "Pendente"
                                : "Rejeitado"}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Sistema</p>
                              <p className="font-medium">
                                R$ {(fechamento.valor_sistema || 0).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Físico</p>
                              <p className="font-medium">
                                R$ {(fechamento.valor_contado || 0).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Diferença</p>
                              <p className={`font-medium ${corDiferenca}`}>
                                {diferenca > 0 ? "+" : ""}R$ {Math.abs(diferenca).toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {fechamento.justificativa && (
                            <div className="mt-2 p-2 bg-amber-50 rounded text-xs">
                              <p className="text-amber-900">
                                <span className="font-medium">Justificativa:</span>{" "}
                                {fechamento.justificativa}
                              </p>
                            </div>
                          )}

                          {fechamento.motivo_rejeicao && (
                            <div className="mt-2 p-2 bg-red-50 rounded text-xs">
                              <p className="text-red-900">
                                <span className="font-medium">Motivo da Rejeição:</span>{" "}
                                {fechamento.motivo_rejeicao}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {datasOrdenadas.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum fechamento encontrado no período selecionado
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
