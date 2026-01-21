import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ItemCategoria } from "@/types/database";

export function useItemCategories() {
  return useQuery({
    queryKey: ["item_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_categories")
        .select("*")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as ItemCategoria[];
    },
  });
}

export function useCreateItemCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ nome, slug, tipo }: { nome: string; slug: string; tipo: ItemCategoria["tipo"] }) => {
      const { error } = await supabase
        .from("item_categories")
        .insert({ nome, slug, tipo, ativo: true });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item_categories"] });
    },
  });
}

export function useUpdateItemCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ItemCategoria> }) => {
      const { error } = await supabase
        .from("item_categories")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item_categories"] });
    },
  });
}
