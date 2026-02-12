import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { format, subDays, startOfDay, isSunday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, X } from "lucide-react";

interface CaixaSemFechamento {
  id: string;
  nome: string;
}

export function AlertaFechamentosFaltantes() {
  const { profile, cargo } = useUser();
  const queryClient = useQueryClient();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [bannerVisivel, setBannerVisivel] = useState(true);
  const [caixaSelecionado, setCaixaSelecionado] = useState<CaixaSemFechamento | null>(null);
  const [lojaAbriu, setLojaAbriu] = useState<boolean | null>(null);
  const [ignorarHoje, setIgnorarHoje] = useState(false);
  const [valorContado, setValorContado] = useState<string>("");
  const [justificativa, setJustificativa] = useState<string>("");

  const isAdmin = cargo === "admin";
  const isCaixaOuGeral = cargo === "caixa" || cargo === "geral";

  // Data de referencia: ultimo dia util (pula domingos)
  let dataReferencia = subDays(startOfDay(new Date()), 1);
  while (isSunday(dataReferencia)) {
    dataReferencia = subDays(dataReferencia, 1);
  }
  const dataOntem = format(dataReferencia, "yyyy-MM-dd");
  const storageKey = `fechamento_assumido_${dataOntem}`;

  useEffect(() => {
    try {
      const assumido = localStorage.getItem(storageKey) === "1";
      if (assumido) setIgnorarHoje(true);
    } catch {
      // Silencioso: se localStorage falhar, mantem o fluxo normal.
    }
  }, [storageKey]);

  // Buscar caixas sem fechamento no dia anterior
  const { data: caixasSemFechamento = [] } = useQuery({
    queryKey: ["caixas_sem_fechamento", dataOntem],
    queryFn: async () => {
      // 1. Buscar todos os caixas ativos
      const { data: todosCaixas, error: caixasError } = await supabase
        .from("caixas")
        .select("id, nome")
        .order("nome", { ascending: true });

      if (caixasError) throw caixasError;

      // 2. Buscar fechamentos do dia anterior
      const { data: fechamentosOntem, error: fechamentosError } = await supabase
        .from("fechamentos_caixa")
        .select("caixa_id")
        .gte("data_fechamento", `${dataOntem}T00:00:00`)
        .lt("data_fechamento", `${dataOntem}T23:59:59`);

      if (fechamentosError) throw fechamentosError;

      // 3. Identificar caixas sem fechamento
      const caixasComFechamento = new Set(fechamentosOntem?.map((f) => f.caixa_id) || []);
      const semFechamento = (todosCaixas || []).filter(
        (caixa) => !caixasComFechamento.has(caixa.id)
      );

      return semFechamento as CaixaSemFechamento[];
    },
    refetchInterval: 5 * 60 * 1000, // Atualiza a cada 5 minutos
  });

  // Abrir popup automaticamente para Caixa/Geral quando houver fechamentos faltantes
  useEffect(() => {
    if (isCaixaOuGeral && caixasSemFechamento.length > 0 && !dialogAberto && !ignorarHoje) {
      setDialogAberto(true);
    }
  }, [caixasSemFechamento, isCaixaOuGeral, dialogAberto, ignorarHoje]);

  // Mutation para criar fechamento
  const { mutate: criarFechamento, isPending } = useMutation({
    mutationFn: async ({
      caixaId,
      valorContado,
      justificativa,
    }: {
      caixaId: string;
      valorContado: number;
      justificativa: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("fechamentos_caixa").insert({
        caixa_id: caixaId,
        data_fechamento: dataOntem,
        valor_contado: valorContado,
        justificativa: justificativa || `Fechamento retroativo do dia ${format(new Date(dataOntem), "dd/MM/yyyy", { locale: ptBR })}`,
        status: "pendente_aprovacao",
        criado_por: user?.id || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caixas_sem_fechamento"] });
      queryClient.invalidateQueries({ queryKey: ["fechamentos_relatorio"] });
      toast.success("Fechamento criado e enviado para aprovação!");
      setDialogAberto(false);
      setCaixaSelecionado(null);
      setValorContado("");
      setJustificativa("");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar fechamento: " + error.message);
    },
  });

  // Não mostrar nada se não houver fechamentos faltantes
  if (caixasSemFechamento.length === 0) return null;

  // Se o dia foi assumido como sem abertura, nao alertar
  if (ignorarHoje) return null;

  // Não mostrar nada se o usuário não for Admin, Caixa ou Geral
  if (!isAdmin && !isCaixaOuGeral) return null;

  // POPUP para Caixa e Geral
  if (isCaixaOuGeral) {
    return (
      <AlertDialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <AlertDialogTitle className="text-xl">
                ⚠️ Fechamento Pendente do Ultimo Dia Util
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base pt-2">
              A loja abriu em {format(new Date(dataOntem), "dd/MM/yyyy (EEEE)", { locale: ptBR })}?
            </AlertDialogDescription>
          </AlertDialogHeader>

          {lojaAbriu === null ? (
            <div className="space-y-3 py-4">
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3"
                  onClick={() => setLojaAbriu(true)}
                >
                  Sim, abriu
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3"
                  onClick={() => {
                    try {
                      localStorage.setItem(storageKey, "1");
                    } catch {
                      // Silencioso: se localStorage falhar, apenas encerra o dialogo.
                    }
                    setIgnorarHoje(true);
                    setLojaAbriu(false);
                    toast.success("Dia assumido como fechado (loja nao abriu).");
                    setDialogAberto(false);
                  }}
                >
                  Nao, nao abriu
                </Button>
              </div>
              <div className="pt-4 border-t">
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setDialogAberto(false)}
                >
                  Fechar e fazer mais tarde
                </Button>
              </div>
            </div>
          ) : !caixaSelecionado ? (
            <div className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">
                Selecione um caixa para fazer o fechamento retroativo:
              </p>
              <div className="grid gap-2">
                {caixasSemFechamento.map((caixa) => (
                  <Button
                    key={caixa.id}
                    variant="outline"
                    className="justify-start h-auto py-3"
                    onClick={() => setCaixaSelecionado(caixa)}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                    {caixa.nome}
                  </Button>
                ))}
              </div>
              <div className="pt-4 border-t">
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setDialogAberto(false)}
                >
                  Fechar e fazer mais tarde
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <Alert className="bg-orange-50 border-orange-200">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertTitle>Fechamento de {caixaSelecionado.nome}</AlertTitle>
                <AlertDescription>
                  Data: {format(new Date(dataOntem), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="valor_contado_popup">Valor Físico Contado (R$) *</Label>
                <Input
                  id="valor_contado_popup"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={valorContado}
                  onChange={(e) => setValorContado(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="justificativa_popup">Justificativa (opcional)</Label>
                <Textarea
                  id="justificativa_popup"
                  placeholder="Ex: Esqueci de fechar ontem, estava muito ocupado..."
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCaixaSelecionado(null);
                    setValorContado("");
                    setJustificativa("");
                  }}
                >
                  Voltar
                </Button>
                <AlertDialogAction
                  onClick={() => {
                    if (valorContado) {
                      criarFechamento({
                        caixaId: caixaSelecionado.id,
                        valorContado: parseFloat(valorContado),
                        justificativa,
                      });
                    }
                  }}
                  disabled={!valorContado || parseFloat(valorContado) < 0 || isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isPending ? "Criando..." : "Enviar para Aprovação"}
                </AlertDialogAction>
              </div>
            </div>
          )}
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // BANNER para Admin
  if (isAdmin && bannerVisivel) {
    return (
      <Alert className="mb-4 bg-orange-50 border-orange-300">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <AlertTitle className="flex items-center justify-between">
          <span className="text-lg font-semibold">
            ⚠️ Fechamento{caixasSemFechamento.length > 1 ? "s" : ""} Pendente
            {caixasSemFechamento.length > 1 ? "s" : ""} do Ultimo Dia Util
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBannerVisivel(false)}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertTitle>
        <AlertDescription className="mt-2">
          {caixasSemFechamento.length === 1 ? (
            <>
              O caixa <strong className="text-orange-700">{caixasSemFechamento[0].nome}</strong> não
              foi fechado em{" "}
              <strong>{format(new Date(dataOntem), "dd/MM/yyyy", { locale: ptBR })}</strong>.
            </>
          ) : (
            <>
              Os seguintes caixas não foram fechados em{" "}
              <strong>{format(new Date(dataOntem), "dd/MM/yyyy", { locale: ptBR })}</strong>:{" "}
              <strong className="text-orange-700">
                {caixasSemFechamento.map((c) => c.nome).join(", ")}
              </strong>
            </>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
