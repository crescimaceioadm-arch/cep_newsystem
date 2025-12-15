import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Colaborador {
  id: string;
  nome: string;
  funcao: "Vendedora" | "Avaliadora";
  ativo: boolean;
  created_at: string;
}

export function useColaboradores() {
  return useQuery({
    queryKey: ["colaboradores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as Colaborador[];
    },
  });
}

export function useColaboradoresByFuncao(funcao: "Vendedora" | "Avaliadora") {
  return useQuery({
    queryKey: ["colaboradores", funcao],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("*")
        .eq("funcao", funcao)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as Colaborador[];
    },
  });
}

export function useAddColaborador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ nome, funcao }: { nome: string; funcao: "Vendedora" | "Avaliadora" }) => {
      const { data, error } = await supabase
        .from("colaboradores")
        .insert({ nome, funcao, ativo: true })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
    },
  });
}

export function useDeleteColaborador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("colaboradores")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
    },
  });
}
