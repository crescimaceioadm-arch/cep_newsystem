import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Venda {
  id: string;
  data_venda: string | null;
  vendedora_nome: string | null;
  caixa_origem: string | null;
  cliente_nome: string | null;
  valor_total_venda: number;
  metodo_pagto_1: string | null;
  valor_pagto_1: number | null;
  bandeira_cartao_1: string | null;
  metodo_pagto_2: string | null;
  valor_pagto_2: number | null;
  bandeira_cartao_2: string | null;
  metodo_pagto_3: string | null;
  valor_pagto_3: number | null;
  bandeira_cartao_3: string | null;
  qtd_total_itens: number | null;
  qtd_baby_vendida: number | null;
  qtd_1_a_16_vendida: number | null;
  qtd_calcados_vendida: number | null;
  qtd_brinquedos_vendida: number | null;
  qtd_itens_medios_vendida: number | null;
  qtd_itens_grandes_vendida: number | null;
}

export function useVendasHistorico() {
  return useQuery({
    queryKey: ["vendas", "historico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .order("data_venda", { ascending: false });

      if (error) throw error;
      return data as Venda[];
    },
  });
}

export interface AtualizacaoVenda {
  vendedora_nome?: string | null;
  cliente_nome?: string | null;
  metodo_pagto_1?: string | null;
  valor_total_venda?: number;
  caixa_origem?: string | null;
}

export function useAtualizarVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: AtualizacaoVenda }) => {
      const { error } = await supabase
        .from("vendas")
        .update(dados)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      queryClient.invalidateQueries({ queryKey: ["caixas"] });
      toast.success("Venda atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar venda:", error);
      toast.error("Erro ao atualizar venda");
    },
  });
}

export function useExcluirVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vendas")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      queryClient.invalidateQueries({ queryKey: ["caixas"] });
      toast.success("Venda excluída com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao excluir venda:", error);
      toast.error("Erro ao excluir venda");
    },
  });
}
