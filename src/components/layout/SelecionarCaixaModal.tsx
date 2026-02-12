import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCaixa, CaixaOption } from "@/contexts/CaixaContext";
import { supabase } from "@/integrations/supabase/client";
import { getDateBrasilia } from "@/lib/utils";
import { MonitorSmartphone } from "lucide-react";

const caixas: CaixaOption[] = ["Caixa 1", "Caixa 2", "Caixa 3"];
const STORAGE_KEY_AVALIACAO = "caixa_avaliacao_aberto";

export function SelecionarCaixaModal() {
  const { caixaSelecionado, setCaixaSelecionado, showModal, setShowModal } = useCaixa();
  const [avaliacaoAberta, setAvaliacaoAberta] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(STORAGE_KEY_AVALIACAO) === "1";
    } catch {
      return false;
    }
  });

  const setAvaliacaoComStorage = (value: boolean) => {
    setAvaliacaoAberta(value);
    try {
      localStorage.setItem(STORAGE_KEY_AVALIACAO, value ? "1" : "0");
    } catch {
      // Silencioso: manter estado local se o storage falhar.
    }
  };

  const { data: fechamentosHoje = [], isLoading: loadingFechamentos } = useQuery({
    queryKey: ["fechamentos_hoje_modal"],
    queryFn: async () => {
      const hoje = getDateBrasilia();
      const { data, error } = await supabase
        .from("fechamentos_caixa")
        .select("status, caixa:caixas(nome)")
        .gte("data_fechamento", `${hoje}T00:00:00`)
        .lt("data_fechamento", `${hoje}T23:59:59`);

      if (error) throw error;
      return data || [];
    },
  });

  const statusPorCaixa = useMemo(() => {
    const map = new Map<string, string>();
    fechamentosHoje.forEach((f: any) => {
      const nome = f?.caixa?.nome;
      if (nome) map.set(nome, f.status);
    });
    return map;
  }, [fechamentosHoje]);

  const getStatusInfo = (caixa: string) => {
    const status = statusPorCaixa.get(caixa);
    if (status === "aprovado") return { label: "Fechado", className: "text-green-700" };
    if (status === "pendente_aprovacao") return { label: "Em aprovacao", className: "text-amber-700" };
    if (status === "rejeitado") return { label: "Rejeitado", className: "text-red-700" };
    if (caixaSelecionado === caixa) return { label: "Caixa aberto", className: "text-blue-700" };
    if (caixa === "Avaliação" && avaliacaoAberta) return { label: "Caixa aberto", className: "text-blue-700" };
    return { label: "Nao aberto", className: "text-muted-foreground" };
  };

  // Modal obrigatório - não pode fechar sem selecionar (exceto se já tiver selecionado)
  const handleOpenChange = (open: boolean) => {
    if (!open && !caixaSelecionado) {
      // Não permite fechar se não tiver caixa selecionado
      return;
    }
    setShowModal(open);
  };

  return (
    <Dialog open={showModal} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => !caixaSelecionado && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5 text-primary" />
            Qual caixa quer abrir?
          </DialogTitle>
          <DialogDescription>
            Selecione o terminal que sera aberto agora.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-3 py-4">
          {caixas.map((caixa) => (
            (() => {
              const isPendente = statusPorCaixa.get(caixa) === "pendente_aprovacao";
              return (
            <Button
              key={caixa}
              variant={caixaSelecionado === caixa ? "default" : "outline"}
              className="h-14 text-lg"
              disabled={isPendente}
              title={isPendente ? "Fechamento pendente de aprovacao" : undefined}
              onClick={() => setCaixaSelecionado(caixa)}
            >
              {caixa}
            </Button>
              );
            })()
          ))}
        </div>

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Quer abrir o caixa da Avaliacao?</p>
          <div className="flex gap-2">
            <Button
              variant={avaliacaoAberta ? "default" : "outline"}
              disabled={statusPorCaixa.get("Avaliação") === "pendente_aprovacao"}
              onClick={() => setAvaliacaoComStorage(true)}
            >
              Sim
            </Button>
            <Button
              variant={!avaliacaoAberta ? "default" : "outline"}
              onClick={() => setAvaliacaoComStorage(false)}
            >
              Nao
            </Button>
          </div>
          {statusPorCaixa.get("Avaliação") === "pendente_aprovacao" && (
            <p className="text-xs text-amber-700">
              Nao e possivel abrir: fechamento pendente de aprovacao.
            </p>
          )}
        </div>

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Resumo do status dos caixas</p>
          {loadingFechamentos ? (
            <p className="text-sm text-muted-foreground">Carregando status...</p>
          ) : (
            <div className="space-y-1">
              {[...caixas, "Avaliação"].map((caixa) => {
                const statusInfo = getStatusInfo(caixa);
                return (
                  <div key={`status-${caixa}`} className="flex items-center justify-between text-sm">
                    <span>{caixa}</span>
                    <span className={`font-medium ${statusInfo.className}`}>{statusInfo.label}</span>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Informe: ao abrir um caixa, o status fica como "Caixa aberto" ate o fechamento do dia.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
