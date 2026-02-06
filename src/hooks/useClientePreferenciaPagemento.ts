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

// Hook otimizado para buscar preferências de múltiplos clientes de uma vez
export function useClientesPreferenciaBatch(nomesClientes: string[] | undefined) {
  return useQuery({
    queryKey: ["clientes_pagamento_preferencia_batch", nomesClientes?.sort().join(",")],
    queryFn: async () => {
      if (!nomesClientes || nomesClientes.length === 0) return {};

      const { data, error } = await supabase
        .from("cliente_pagamento_preferencia")
        .select("*")
        .in("nome_cliente", nomesClientes);

      if (error) throw error;

      // Transforma em um mapa para acesso rápido
      const map: Record<string, ClientePreferenciaPagemento> = {};
      data?.forEach((item) => {
        map[item.nome_cliente] = item as ClientePreferenciaPagemento;
      });

      return map;
    },
    enabled: !!nomesClientes && nomesClientes.length > 0,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    gcTime: 10 * 60 * 1000, // Manter em cache por 10 minutos
    refetchOnWindowFocus: false, // Não refetch ao focar na janela
  });
}

// Hook otimizado para buscar recusas de múltiplos clientes de uma vez
export function useClientesRecusasBatch(nomesClientes: string[] | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ["clientes_recusas_batch", nomesClientes?.sort().join(",")],
    queryFn: async () => {
      if (!nomesClientes || nomesClientes.length === 0) return {};

      // Buscar todas as avaliações dos clientes de uma vez
      const { data: avaliacoes, error } = await supabase
        .from("atendimentos")
        .select("nome_cliente, status")
        .in("nome_cliente", nomesClientes)
        .eq("tipo_atendimento", "avaliacao")
        .in("status", ["finalizado", "recusado", "recusou"]);

      if (error) throw error;

      // Agrupa por cliente - Otimizado com reduce
      const map: Record<string, ClienteRecusas> = {};
      
      // Primeiro agrupa as avaliações por cliente
      const avaliacoesPorCliente = avaliacoes?.reduce((acc, aval) => {
        if (!acc[aval.nome_cliente]) {
          acc[aval.nome_cliente] = { recusadas: 0, finalizadas: 0 };
        }
        if (aval.status === "recusado" || aval.status === "recusou") {
          acc[aval.nome_cliente].recusadas++;
        } else if (aval.status === "finalizado") {
          acc[aval.nome_cliente].finalizadas++;
        }
        return acc;
      }, {} as Record<string, { recusadas: number; finalizadas: number }>);

      // Depois calcula os percentuais
      nomesClientes.forEach((nomeCliente) => {
        const stats = avaliacoesPorCliente?.[nomeCliente] || { recusadas: 0, finalizadas: 0 };
        const totalAvaliacoes = stats.recusadas + stats.finalizadas;
        const percentualRecusadas = totalAvaliacoes > 0 
          ? (stats.recusadas / totalAvaliacoes) * 100 
          : 0;

        map[nomeCliente] = {
          nome_cliente: nomeCliente,
          total_avaliacoes: totalAvaliacoes,
          total_recusadas: stats.recusadas,
          percentual_recusadas: percentualRecusadas,
        };
      });

      return map;
    },
    enabled: enabled && !!nomesClientes && nomesClientes.length > 0,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    gcTime: 10 * 60 * 1000, // Manter em cache por 10 minutos
    refetchOnWindowFocus: false, // Não refetch ao focar na janela
  });
}
