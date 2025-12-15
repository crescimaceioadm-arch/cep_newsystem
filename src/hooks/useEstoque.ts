import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Estoque } from "@/types/database";
import { toast } from "sonner";

export function useEstoque() {
  return useQuery({
    queryKey: ["estoque"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estoque")
        .select("*")
        .order("categoria");

      if (error) throw error;
      return data as Estoque[];
    },
  });
}

export function useAtualizarEstoque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quantidade_atual }: { id: string; quantidade_atual: number }) => {
      const { error } = await supabase
        .from("estoque")
        .update({ quantidade_atual })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
      toast.success("Estoque atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar estoque: " + error.message);
    },
  });
}
