import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MarcaItemGrande } from "@/types/database";

export function useMarcasItensGrandes() {
  return useQuery({
    queryKey: ["marcas_itens_grandes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marcas_itens_grandes")
        .select("*")
        .order("ordem", { ascending: true });
      
      if (error) throw error;
      return data as MarcaItemGrande[];
    },
  });
}

export function useCreateMarcaItemGrande() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dados: { nome: string; ordem?: number }) => {
      const { data, error } = await supabase
        .from("marcas_itens_grandes")
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
      queryClient.invalidateQueries({ queryKey: ["marcas_itens_grandes"] });
    },
  });
}

export function useUpdateMarcaItemGrande() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Partial<MarcaItemGrande> }) => {
      const { data, error } = await supabase
        .from("marcas_itens_grandes")
        .update(dados)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marcas_itens_grandes"] });
    },
  });
}

export function useDeleteMarcaItemGrande() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marcas_itens_grandes")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marcas_itens_grandes"] });
    },
  });
}
