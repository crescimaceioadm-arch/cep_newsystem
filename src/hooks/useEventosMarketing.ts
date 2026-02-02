import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos_marketing"] });
    },
  });
}

// Atualizar evento
export function useUpdateEventoMarketing() {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos_marketing"] });
    },
  });
}

// Deletar evento
export function useDeleteEventoMarketing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("eventos_marketing")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos_marketing"] });
    },
  });
}
