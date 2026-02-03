import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLogAtividade } from "@/hooks/useLogAtividade";
import type { EventoMarketing } from "@/types/database";
import { startOfWeek, endOfWeek, format } from "date-fns";

// Buscar eventos de um intervalo de datas
export function useEventosMarketing(dataInicio: Date, dataFim: Date) {
  return useQuery({
    queryKey: ["eventos_marketing", format(dataInicio, "yyyy-MM-dd"), format(dataFim, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos_marketing")
        .select("*")
        .gte("data", format(dataInicio, "yyyy-MM-dd"))
        .lte("data", format(dataFim, "yyyy-MM-dd"))
        .order("data", { ascending: true });
      
      if (error) throw error;
      return data as EventoMarketing[];
    },
  });
}

// Buscar eventos do mês atual
export function useEventosMarketingMes(mes: Date) {
  const inicio = startOfWeek(new Date(mes.getFullYear(), mes.getMonth(), 1), { weekStartsOn: 1 });
  const fim = endOfWeek(new Date(mes.getFullYear(), mes.getMonth() + 1, 0), { weekStartsOn: 1 });
  
  return useEventosMarketing(inicio, fim);
}

// Criar novo evento
export function useCreateEventoMarketing() {
  const queryClient = useQueryClient();
  const { log } = useLogAtividade();

  return useMutation({
    mutationFn: async (dados: {
      data: string;
      titulo: string;
      descricao?: string;
      criado_por?: string;
    }) => {
      const { data, error } = await supabase
        .from("eventos_marketing")
        .insert(dados)
        .select()
        .single();
      
      if (error) throw error;
      return data as EventoMarketing;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["eventos_marketing"] });
          log({
            acao: "criar",
            tabela_afetada: "eventos_marketing",
            registro_id: data.id,
            dados_depois: data,
            detalhes: `Evento criado: ${data.titulo} - ${data.data}`
          });
    },
  });
}

// Atualizar evento
export function useUpdateEventoMarketing() {
    const { log } = useLogAtividade();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dados }: { 
      id: string; 
      dados: Partial<EventoMarketing> 
    }) => {
      const { data, error } = await supabase
        .from("eventos_marketing")
        .update(dados)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as EventoMarketing;
    },
    onSuccess: (data) => {
            log({
              acao: "editar",
              tabela_afetada: "eventos_marketing",
              registro_id: data.id,
              dados_depois: data,
              detalhes: `Evento editado: ${data.titulo}`
            });
      queryClient.invalidateQueries({ queryKey: ["eventos_marketing"] });
    },
  });
}

// Deletar evento
export function useDeleteEventoMarketing() {
    const { log } = useLogAtividade();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
            // Buscar evento antes de deletar para o log
            const { data: eventoParaLog } = await supabase
              .from("eventos_marketing")
              .select("*")
              .eq("id", id)
              .single();
      
      const { error } = await supabase
        .from("eventos_marketing")
        .delete()
        .eq("id", id);
        return eventoParaLog;
      
      if (error) throw error;
    },
    onSuccess: (eventoDeletado) => {
            if (eventoDeletado) {
              log({
                acao: "deletar",
                tabela_afetada: "eventos_marketing",
                registro_id: eventoDeletado.id,
                dados_antes: eventoDeletado,
                detalhes: `Evento deletado: ${eventoDeletado.titulo}`
              });
            }
      queryClient.invalidateQueries({ queryKey: ["eventos_marketing"] });
    },
  });
}
