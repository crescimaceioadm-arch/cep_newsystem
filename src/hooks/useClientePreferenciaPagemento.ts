import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientePreferenciaPagemento {
  nome_cliente: string;
  total_avaliacoes: number;
  total_gira: number;
  total_pix_dinheiro: number;
  percentual_gira: number;
  atualizado_em: string;
}

export interface ClienteRecusas {
  nome_cliente: string;
  total_avaliacoes: number;
  total_recusadas: number;
  percentual_recusadas: number;
}

export function useClientePreferenciaPagemento(nomeCliente: string | undefined) {
  return useQuery({
    queryKey: ["cliente_pagamento_preferencia", nomeCliente],
    queryFn: async () => {
      if (!nomeCliente) return null;

      const { data, error } = await supabase
        .from("cliente_pagamento_preferencia")
        .select("*")
        .eq("nome_cliente", nomeCliente)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned, isso é ok (cliente sem histórico)
        throw error;
      }

      return (data as ClientePreferenciaPagemento) || null;
    },
    enabled: !!nomeCliente,
  });
}

export function useClienteRecusas(nomeCliente: string | undefined) {
  return useQuery({
    queryKey: ["cliente_recusas", nomeCliente],
    queryFn: async () => {
      if (!nomeCliente) return null;

      const { data, error } = await supabase
        .from("atendimentos")
        .select("id, status")
        .eq("nome_cliente", nomeCliente)
        .eq("tipo_atendimento", "avaliacao")
        .in("status", ["recusado", "recusou"]);

      if (error) throw error;

      // Contar total de avaliações
      const { data: todasAvals, error: errorTotal } = await supabase
        .from("atendimentos")
        .select("id")
        .eq("nome_cliente", nomeCliente)
        .eq("tipo_atendimento", "avaliacao")
        .eq("status", "finalizado");

      if (errorTotal) throw errorTotal;

      const totalRecusadas = data?.length || 0;
      const totalFinalizadas = todasAvals?.length || 0;
      const totalAvaliacoes = totalRecusadas + totalFinalizadas;

      const percentualRecusadas = totalAvaliacoes > 0 
        ? (totalRecusadas / totalAvaliacoes) * 100 
        : 0;

      return {
        nome_cliente: nomeCliente,
        total_avaliacoes: totalAvaliacoes,
        total_recusadas: totalRecusadas,
        percentual_recusadas: percentualRecusadas,
      } as ClienteRecusas;
    },
    enabled: !!nomeCliente,
  });
}

export function useTodasClientesPreferencia() {
  return useQuery({
    queryKey: ["todos_clientes_pagamento_preferencia"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cliente_pagamento_preferencia")
        .select("*")
        .order("total_avaliacoes", { ascending: false });

      if (error) throw error;
      return (data as ClientePreferenciaPagemento[]) || [];
    },
  });
}
