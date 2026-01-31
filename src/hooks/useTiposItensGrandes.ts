import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TipoItemGrande } from "@/types/database";

export function useTiposItensGrandes() {
  return useQuery({
    queryKey: ["tipos_itens_grandes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tipos_itens_grandes")
        .select("*")
        .order("ordem", { ascending: true });
      
      if (error) throw error;
      return data as TipoItemGrande[];
    },
  });
}

export function useCreateTipoItemGrande() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dados: { nome: string; ordem?: number }) => {
      const { data, error } = await supabase
        .from("tipos_itens_grandes")
        .insert({
          nome: dados.nome,
          ordem: dados.ordem ?? 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos_itens_grandes"] });
    },
  });
}

export function useUpdateTipoItemGrande() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Partial<TipoItemGrande> }) => {
      const { data, error } = await supabase
        .from("tipos_itens_grandes")
        .update(dados)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos_itens_grandes"] });
    },
  });
}

export function useDeleteTipoItemGrande() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tipos_itens_grandes")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos_itens_grandes"] });
    },
  });
}
