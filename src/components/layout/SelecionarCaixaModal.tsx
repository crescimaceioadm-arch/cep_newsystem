import { useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCaixa, CaixaOption } from "@/contexts/CaixaContext";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { getDateBrasilia } from "@/lib/utils";
import { MonitorSmartphone, UserCheck } from "lucide-react";

const caixas: CaixaOption[] = ["Caixa 1", "Caixa 2"];

export function SelecionarCaixaModal() {
  const { caixaSelecionado, setCaixaSelecionado, showModal, setShowModal } = useCaixa();
  const { cargo } = useUser();
  const navigate = useNavigate();
  const isAdmin = cargo === "admin";

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

  // Verifica se todos os caixas normais (1 e 2) já foram fechados/aprovados
  const todosCaixasFechados = useMemo(() => {
    if (isAdmin) return false; // Admin sempre vê o modal
    return caixas.every(c => statusPorCaixa.get(c) === "aprovado");
  }, [statusPorCaixa, isAdmin]);

  // Fecha o modal automaticamente se todos os caixas já estão fechados
  useEffect(() => {
    if (!isAdmin && todosCaixasFechados && showModal) {
      setShowModal(false);
    }
  }, [todosCaixasFechados, showModal, setShowModal, isAdmin]);

  const getStatusInfo = (caixa: string) => {
    const status = statusPorCaixa.get(caixa);
    if (status === "aprovado") return { label: "Fechado", className: "text-green-700" };
    if (status === "pendente_aprovacao") return { label: "Em aprovacao", className: "text-amber-700" };
    if (status === "rejeitado") return { label: "Rejeitado", className: "text-red-700" };
    if (caixaSelecionado === caixa) return { label: "Caixa aberto", className: "text-blue-700" };
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

  const handleAvaliadoiraClick = () => {
    setShowModal(false);
    navigate("/avaliacao");
  };

  // Não renderiza o modal se todos os caixas já estão fechados (exceto para admin)
  if (!isAdmin && todosCaixasFechados) {
    return null;
  }

  return (
    <Dialog open={showModal} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => !caixaSelecionado && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5 text-primary" />
            {isAdmin ? "Quer abrir Caixa 3?" : "Qual caixa quer abrir?"}
          </DialogTitle>
          <DialogDescription>
            {isAdmin 
              ? "Selecione uma opção para continuar." 
              : "Selecione o terminal que sera aberto agora."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-3 py-4">
          {isAdmin ? (
            // Para admin: apenas pergunta sobre Caixa 3
            <>
              <Button
                variant="default"
                className="h-14 text-lg w-full"
                onClick={() => setCaixaSelecionado("Caixa 3")}
              >
                Sim
              </Button>
              <Button
                variant="outline"
                className="h-14 text-lg w-full"
                onClick={() => setShowModal(false)}
              >
                Não
              </Button>
            </>
          ) : (
            // Para não-admin: mostrar apenas caixas não fechados
            <>
              {caixas.map((caixa) => {
                const status = statusPorCaixa.get(caixa);
                const isPendente = status === "pendente_aprovacao";
                const isFechado = status === "aprovado";
                const statusInfo = getStatusInfo(caixa);
                
                // Não mostrar caixas já fechados
                if (isFechado) return null;
                
                return (
                  <div key={caixa} className="space-y-1">
                    <Button
                      variant={caixaSelecionado === caixa ? "default" : "outline"}
                      className="h-14 text-lg w-full"
                      disabled={isPendente}
                      title={isPendente ? "Fechamento pendente de aprovacao" : undefined}
                      onClick={() => setCaixaSelecionado(caixa)}
                    >
                      {caixa}
                    </Button>
                    <p className={`text-xs text-center font-medium ${statusInfo.className}`}>
                      {statusInfo.label}
                    </p>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Botão Avaliadora */}
        {!isAdmin && (
          <div className="border-t pt-4">
            <Button
              variant="secondary"
              className="w-full h-10 flex items-center justify-center gap-2"
              onClick={handleAvaliadoiraClick}
            >
              <UserCheck className="h-4 w-4" />
              Avaliadora
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Entrar direto como avaliadora sem abrir caixa
            </p>
          </div>
        )}

        {!isAdmin && (
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Ao abrir um caixa, o status fica como "Caixa aberto" ate o fechamento do dia.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
