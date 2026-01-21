import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ItemCategoria } from "@/types/database";

// Função para gerar slug a partir do nome
function generateSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD") // Remove acentos
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-") // Substitui espaços e caracteres especiais por hífen
    .replace(/^-+|-+$/g, ""); // Remove hífens no início/fim
}

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
    mutationFn: async ({ nome, tipo }: { nome: string; tipo: ItemCategoria["tipo"] }) => {
      const slug = generateSlug(nome);
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
      // Se o nome foi alterado, gerar novo slug automaticamente
      if (updates.nome) {
        updates.slug = generateSlug(updates.nome);
      }
      
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
