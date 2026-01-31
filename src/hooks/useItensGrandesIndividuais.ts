import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ItemGrandeIndividual } from "@/types/database";

// Buscar todos os itens grandes
export function useItensGrandesIndividuais() {
  return useQuery({
    queryKey: ["itens_grandes_individuais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_grandes_individuais")
        .select("*, tipo:tipos_itens_grandes(*), marca:marcas_itens_grandes(*)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as ItemGrandeIndividual[];
    },
  });
}

// Buscar apenas itens disponíveis (para venda)
export function useItensGrandesDisponiveis() {
  return useQuery({
    queryKey: ["itens_grandes_disponiveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_grandes_individuais")
        .select("*, tipo:tipos_itens_grandes(*), marca:marcas_itens_grandes(*)")
        .eq("status", "disponivel")
        .order("data_entrada", { ascending: false });
      
      if (error) throw error;
      return data as ItemGrandeIndividual[];
    },
  });
}

// Criar múltiplos itens grandes (na avaliação)
export function useCreateItensGrandes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itens: Array<{
      tipo_id: string;
      marca_id: string;
      descricao: string;
      valor_compra: number;
      observacoes?: string;
      atendimento_id: string;
      avaliadora_nome?: string;
    }>) => {
      const { data, error } = await supabase
        .from("itens_grandes_individuais")
        .insert(itens)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itens_grandes_individuais"] });
      queryClient.invalidateQueries({ queryKey: ["itens_grandes_disponiveis"] });
    },
  });
}

// Marcar item como vendido
export function useVenderItemGrande() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      valor_venda, 
      venda_id, 
      vendedora_nome 
    }: { 
      id: string; 
      valor_venda: number;
      venda_id: string;
      vendedora_nome?: string;
    }) => {
      const { data, error } = await supabase
        .from("itens_grandes_individuais")
        .update({
          status: "vendido",
          valor_venda,
          venda_id,
          data_saida: new Date().toISOString(),
          vendedora_nome,
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itens_grandes_individuais"] });
      queryClient.invalidateQueries({ queryKey: ["itens_grandes_disponiveis"] });
    },
  });
}

// Dar baixa em item (perdido/danificado)
export function useDarBaixaItemGrande() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { data, error } = await supabase
        .from("itens_grandes_individuais")
        .update({
          status: "baixa",
          observacoes: motivo,
          data_saida: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itens_grandes_individuais"] });
      queryClient.invalidateQueries({ queryKey: ["itens_grandes_disponiveis"] });
    },
  });
}

// Editar item grande
export function useUpdateItemGrande() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Partial<ItemGrandeIndividual> }) => {
      const { data, error } = await supabase
        .from("itens_grandes_individuais")
        .update(dados)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itens_grandes_individuais"] });
      queryClient.invalidateQueries({ queryKey: ["itens_grandes_disponiveis"] });
    },
  });
}

// Deletar item grande (limpeza de testes)
export function useDeleteItemGrande() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("itens_grandes_individuais")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itens_grandes_individuais"] });
      queryClient.invalidateQueries({ queryKey: ["itens_grandes_disponiveis"] });
    },
  });
}
