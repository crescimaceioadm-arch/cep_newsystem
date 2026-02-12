import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

const ROLES_COM_NOTIFICACAO = new Set(["admin", "avaliadora"]);

type AtendimentoPayload = {
  id?: string;
  nome_cliente?: string | null;
  origem_avaliacao?: string | null;
  status?: string | null;
};

export function AvaliacaoNotifications() {
  const { cargo, loading } = useUser();
  const ultimoIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!ROLES_COM_NOTIFICACAO.has(cargo)) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

    if (Notification.permission === "default") {
      toast.info("Ative as notificacoes do navegador para receber novas avaliacoes.");
    }
  }, [cargo, loading]);

  useEffect(() => {
    if (loading) return;
    if (!ROLES_COM_NOTIFICACAO.has(cargo)) return;
    if (typeof window === "undefined") return;

    console.log("[AvaliacaoNotifications] Iniciando listener", {
      cargo,
      permission: "Notification" in window ? Notification.permission : "indisponivel",
    });

    const channel = supabase
      .channel("avaliacoes-insert")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "atendimentos" },
        (payload) => {
          console.log("[AvaliacaoNotifications] Evento recebido", payload);
          const novo = payload.new as AtendimentoPayload;
          if (novo?.status && novo.status !== "aguardando_avaliacao") return;
          if (novo?.id && ultimoIdRef.current === novo.id) return;
          if (novo?.id) ultimoIdRef.current = novo.id;

          const nome = (novo?.nome_cliente || "").trim();
          const origem = (novo?.origem_avaliacao || "presencial").toString();
          const titulo = "Nova avaliacao cadastrada";
          const corpo = nome ? `${nome} • ${origem}` : `Origem: ${origem}`;
          const toastMsg = nome ? `${titulo}: ${nome}` : titulo;

          // Toast interno para confirmar recebimento em tempo real.
          toast.info(toastMsg);

          if ("Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification(titulo, { body: corpo });
              return;
            }

            if (Notification.permission === "default") {
              Notification.requestPermission()
                .then((perm) => {
                  if (perm === "granted") {
                    new Notification(titulo, { body: corpo });
                  }
                })
                .catch(() => {});
              return;
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("[AvaliacaoNotifications] Status canal", status);
        if (status === "CHANNEL_ERROR") {
          toast.error("Erro ao conectar nas notificacoes em tempo real.");
        }
      });

    return () => {
      console.log("[AvaliacaoNotifications] Encerrando listener");
      supabase.removeChannel(channel);
    };
  }, [cargo, loading]);

  return null;
}
