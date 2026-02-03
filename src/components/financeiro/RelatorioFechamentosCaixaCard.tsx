import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Check, ChevronDown, Plus } from "lucide-react";

interface FechamentoCaixa {
  id: string;
  caixa_id: string;
  data_fechamento: string;
  valor_sistema: number;
  valor_contado: number;
  diferenca: number;
  status: "aprovado" | "pendente_aprovacao" | "rejeitado";
  justificativa: string | null;
  requer_revisao: boolean;
  aprovado_por: string | null;
  data_aprovacao: string | null;
  motivo_rejeicao: string | null;
  criado_por: string | null;
  caixa?: { nome: string } | null;
  criado_por_user?: { email: string } | null;
}

interface Caixa {
  id: string;
  nome: string;
}

interface CaixaPorDia {
  data: string;
  caixas: Array<{
    caixa: Caixa;
    fechamento: FechamentoCaixa | null;
  }>;
}

export function RelatorioFechamentosCaixaCard() {
  const queryClient = useQueryClient();
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroData, setFiltroData] = useState<string>("");
  const [fechamentoSelecionado, setFechamentoSelecionado] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);
  
  // Estado para criar fechamento manual
  const [criarFechamentoDialog, setCriarFechamentoDialog] = useState<{
    caixaId: string;
    caixaNome: string;
    data: string;
  } | null>(null);
  const [valorContado, setValorContado] = useState<string>("");
  const [justificativaManual, setJustificativaManual] = useState<string>("");

  // Buscar caixas
  const { data: caixas = [] } = useQuery({
    queryKey: ["caixas_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caixas")
        .select("id, nome")
        .order("nome", { ascending: true });

      if (error) throw error;
      return (data || []) as Caixa[];
    },
  });

  // Buscar fechamentos COM dados do usuário que criou
  const { data: fechamentos = [], isLoading } = useQuery({
    queryKey: ["fechamentos_relatorio"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fechamentos_caixa")
        .select(`
          *,
          caixa:caixas(nome),
          criado_por_user:profiles!criado_por(email)
        `)
        .order("data_fechamento", { ascending: false });

      if (error) throw error;
      return (data || []) as FechamentoCaixa[];
    },
  });

  // Deletar fechamento
  const { mutate: deletarFechamento } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fechamentos_caixa")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fechamentos_relatorio"] });
      toast.success("Fechamento deletado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao deletar: " + error.message);
    },
  });

  // Aprovar fechamento
  const { mutate: aprovarFechamento } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fechamentos_caixa")
        .update({ status: "aprovado", requer_revisao: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fechamentos_relatorio"] });
      toast.success("Fechamento aprovado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao aprovar: " + error.message);
    },
  });

  // Criar fechamento manual
  const { mutate: criarFechamentoManual } = useMutation({
    mutationFn: async ({
      caixaId,
      data,
      valorContado,
      justificativa,
    }: {
      caixaId: string;
      data: string;
      valorContado: number;
      justificativa: string;
    }) => {
      // Buscar o usuário atual
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("fechamentos_caixa")
        .insert({
          caixa_id: caixaId,
          data_fechamento: data,
          valor_contado: valorContado,
          justificativa: justificativa || null,
          status: "aprovado", // Fechamento manual já aprovado
          criado_por: user?.id || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fechamentos_relatorio"] });
      toast.success("Fechamento criado com sucesso!");
      setCriarFechamentoDialog(null);
      setValorContado("");
      setJustificativaManual("");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar fechamento: " + error.message);
    },
  });

  // Organizar dados por dia
  const caixasPorDia: CaixaPorDia[] = useMemo(() => {
    const mapa = new Map<string, CaixaPorDia>();

    // Primeiro, adicionar todos os fechamentos
    fechamentos.forEach((f) => {
      const data = f.data_fechamento.split("T")[0];
      if (!mapa.has(data)) {
        mapa.set(data, { data, caixas: [] });
      }
      const dia = mapa.get(data)!;
      dia.caixas.push({
        caixa: { id: f.caixa_id, nome: f.caixa?.nome || "Desconhecido" },
        fechamento: f,
      });
    });

    // Depois, adicionar caixas que não foram fechados
    const datas = new Set(fechamentos.map((f) => f.data_fechamento.split("T")[0]));
    datas.forEach((data) => {
      const dia = mapa.get(data)!;
      const caixasFechados = new Set(dia.caixas.map((c) => c.caixa.id));
      
      caixas.forEach((caixa) => {
        if (!caixasFechados.has(caixa.id)) {
          dia.caixas.push({
            caixa,
            fechamento: null,
          });
        }
      });

      // Ordenar caixas por nome
      dia.caixas.sort((a, b) => a.caixa.nome.localeCompare(b.caixa.nome));
    });

    return Array.from(mapa.values()).sort((a, b) => b.data.localeCompare(a.data));
  }, [fechamentos, caixas]);

  // Filtrar por data
  const diasFiltrados = useMemo(() => {
    return caixasPorDia.filter((dia) => {
      if (filtroData && !dia.data.includes(filtroData)) return false;
      if (filtroStatus !== "todos") {
        return dia.caixas.some((c) => c.fechamento?.status === filtroStatus || (!c.fechamento && filtroStatus === "nao_fechado"));
      }
      return true;
    });
  }, [caixasPorDia, filtroData, filtroStatus]);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "aprovado":
        return <Badge className="bg-green-500">Aprovado</Badge>;
      case "pendente_aprovacao":
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      case "rejeitado":
        return <Badge className="bg-red-500">Rejeitado</Badge>;
      case null:
        return <Badge variant="outline" className="bg-gray-200">Não Fechado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Fechamentos de Caixa por Dia</CardTitle>
        <CardDescription>
          Visualize o status de fechamento de cada caixa por dia
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="pendente_aprovacao">Pendente</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
                <SelectItem value="nao_fechado">Não Fechado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Data</label>
            <Input
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFiltroStatus("todos");
                setFiltroData("");
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        </div>

        {/* Tabela */}
        <div className="space-y-6">
          {isLoading ? (
            <p className="text-center py-4">Carregando...</p>
          ) : diasFiltrados.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">Nenhum resultado encontrado</p>
          ) : (
            diasFiltrados.map((dia) => (
              <div key={dia.data} className="border rounded-lg">
                <div className="bg-muted px-4 py-3 border-b font-semibold">
                  {format(new Date(dia.data + "T00:00:00"), "dd/MM/yyyy (EEEE)", {
                    locale: ptBR,
                  })}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Caixa</TableHead>
                      <TableHead className="text-right w-28">Saldo Final</TableHead>
                      <TableHead className="text-right w-28">Valor Físico</TableHead>
                      <TableHead className="text-right w-24">Diferença</TableHead>
                      <TableHead className="w-20">Status</TableHead>
                      <TableHead className="w-28">Criado por</TableHead>
                      <TableHead className="w-40">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dia.caixas.map((item) => (
                      <React.Fragment key={`${dia.data}-${item.caixa.id}`}>
                        <TableRow>
                          <TableCell className="font-medium">{item.caixa.nome}</TableCell>
                          <TableCell className="text-right">
                            {item.fechamento ? `R$ ${item.fechamento.valor_sistema.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.fechamento ? `R$ ${item.fechamento.valor_contado.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold ${
                              item.fechamento?.diferenca === 0
                                ? "text-green-600"
                                : item.fechamento?.diferenca
                                ? "text-red-600"
                                : ""
                            }`}
                          >
                            {item.fechamento ? `R$ ${item.fechamento.diferenca.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell>{getStatusBadge(item.fechamento?.status || null)}</TableCell>
                          <TableCell className="text-sm">
                            {item.fechamento?.criado_por_user?.email?.split("@")[0] || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {/* Caixa não fechado - botão para criar fechamento manual */}
                              {!item.fechamento && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setCriarFechamentoDialog({
                                      caixaId: item.caixa.id,
                                      caixaNome: item.caixa.nome,
                                      data: dia.data,
                                    })
                                  }
                                  title="Criar fechamento manual"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Fechar
                                </Button>
                              )}
                              
                              {/* Caixa fechado - botões de aprovação e detalhes */}
                              {item.fechamento?.status === "pendente_aprovacao" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => aprovarFechamento(item.fechamento!.id)}
                                  title="Aprovar fechamento"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              {item.fechamento && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setExpandido(
                                        expandido === item.fechamento!.id
                                          ? null
                                          : item.fechamento!.id
                                      )
                                    }
                                    title="Ver detalhes"
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setFechamentoSelecionado(item.fechamento!.id)}
                                    title="Deletar fechamento"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Linha expandida com justificativa */}
                        {expandido === item.fechamento?.id && item.fechamento?.justificativa && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-muted/50 py-4">
                              <div className="space-y-2">
                                <p className="font-semibold text-sm">Justificativa:</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.fechamento.justificativa}
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* Diálogo de confirmação de deleção */}
      <AlertDialog open={!!fechamentoSelecionado} onOpenChange={() => setFechamentoSelecionado(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Fechamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O fechamento será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (fechamentoSelecionado) {
                deletarFechamento(fechamentoSelecionado);
                setFechamentoSelecionado(null);
              }
            }}
            className="bg-red-600 hover:bg-red-700"
          >
            Deletar
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de criação manual de fechamento */}
      <AlertDialog open={!!criarFechamentoDialog} onOpenChange={() => setCriarFechamentoDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Criar Fechamento Manual</AlertDialogTitle>
            <AlertDialogDescription>
              Criando fechamento para <strong>{criarFechamentoDialog?.caixaNome}</strong> em{" "}
              <strong>
                {criarFechamentoDialog?.data &&
                  format(new Date(criarFechamentoDialog.data + "T00:00:00"), "dd/MM/yyyy (EEEE)", {
                    locale: ptBR,
                  })}
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="valor_contado">Valor Físico Contado (R$)</Label>
              <Input
                id="valor_contado"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={valorContado}
                onChange={(e) => setValorContado(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="justificativa">Justificativa (opcional)</Label>
              <Textarea
                id="justificativa"
                placeholder="Ex: Fechamento manual retroativo, correção de sistema..."
                value={justificativaManual}
                onChange={(e) => setJustificativaManual(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <AlertDialogCancel onClick={() => {
              setCriarFechamentoDialog(null);
              setValorContado("");
              setJustificativaManual("");
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (criarFechamentoDialog && valorContado) {
                  criarFechamentoManual({
                    caixaId: criarFechamentoDialog.caixaId,
                    data: criarFechamentoDialog.data,
                    valorContado: parseFloat(valorContado),
                    justificativa: justificativaManual,
                  });
                }
              }}
              disabled={!valorContado || parseFloat(valorContado) < 0}
              className="bg-primary hover:bg-primary/90"
            >
              Criar Fechamento
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
