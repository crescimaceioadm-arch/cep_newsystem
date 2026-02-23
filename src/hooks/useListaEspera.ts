import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ListaEsperaCliente, ListaEsperaItem, ListaEsperaMatch } from "@/types/database";
import { toast } from "sonner";

// ========================================
// CLIENTES NA LISTA DE ESPERA
// ========================================

/**
 * Buscar todos os clientes da lista de espera
 */
export function useListaEsperaClientes(status?: string) {
  return useQuery({
    queryKey: ["lista_espera_clientes", status],
    queryFn: async () => {
      let query = supabase
        .from("lista_espera_clientes")
        .select(`
          *,
          itens:lista_espera_itens(
            *,
            tipo:tipos_itens_grandes(*)
          )
        `)
        .order("created_at", { ascending: false });
      
      if (status && status !== 'todos') {
        query = query.eq("status", status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Buscar contagem de matches pendentes para cada cliente
      const clientesComMatches = await Promise.all(
        (data || []).map(async (cliente) => {
          const { count } = await supabase
            .from("lista_espera_matches")
            .select("*", { count: 'exact', head: true })
            .eq("cliente_id", cliente.id)
            .eq("status", "pendente");
          
          return {
            ...cliente,
            matches_pendentes: count || 0
          };
        })
      );
      
      return clientesComMatches as ListaEsperaCliente[];
    },
  });
}

/**
 * Buscar um cliente específico por ID
 */
export function useListaEsperaCliente(clienteId: string | null) {
  return useQuery({
    queryKey: ["lista_espera_cliente", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      if (!clienteId) return null;
      
      const { data, error } = await supabase
        .from("lista_espera_clientes")
        .select(`
          *,
          itens:lista_espera_itens(
            *,
            tipo:tipos_itens_grandes(*)
          )
        `)
        .eq("id", clienteId)
        .single();
      
      if (error) throw error;
      return data as ListaEsperaCliente;
    },
  });
}

/**
 * Criar novo cliente na lista de espera
 */
export function useCreateListaEspera() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dados: {
      nome_cliente: string;
      telefone: string;
      cpf?: string;
      observacoes?: string;
      itens: Array<{
        tipo_id: string;
        descricao?: string;
        cor?: string;
        ordem: number;
      }>;
    }) => {
      // 1. Criar cliente
      const { data: cliente, error: clienteError } = await supabase
        .from("lista_espera_clientes")
        .insert({
          nome_cliente: dados.nome_cliente,
          telefone: dados.telefone,
          cpf: dados.cpf || null,
          observacoes: dados.observacoes || null,
          criado_por: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();
      
      if (clienteError) throw clienteError;
      
      // 2. Criar itens desejados
      if (dados.itens && dados.itens.length > 0) {
        const itensToInsert = dados.itens.map(item => ({
          cliente_id: cliente.id,
          tipo_id: item.tipo_id,
          descricao: item.descricao || null,
          cor: item.cor || null,
          ordem: item.ordem,
        }));
        
        const { error: itensError } = await supabase
          .from("lista_espera_itens")
          .insert(itensToInsert);
        
        if (itensError) throw itensError;
      }
      
      return cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lista_espera_clientes"] });
      toast.success("Cliente adicionado à lista de espera!");
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar cliente: " + error.message);
    },
  });
}

/**
 * Atualizar dados do cliente
 */
export function useUpdateListaEspera() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dados: {
      id: string;
      nome_cliente?: string;
      telefone?: string;
      cpf?: string;
      observacoes?: string;
      status?: string;
      itens?: Array<{
        id?: string;
        tipo_id: string;
        descricao?: string;
        cor?: string;
        ordem: number;
      }>;
    }) => {
      // 1. Atualizar cliente
      const clienteUpdate: any = {};
      if (dados.nome_cliente) clienteUpdate.nome_cliente = dados.nome_cliente;
      if (dados.telefone) clienteUpdate.telefone = dados.telefone;
      if (dados.cpf !== undefined) clienteUpdate.cpf = dados.cpf || null;
      if (dados.observacoes !== undefined) clienteUpdate.observacoes = dados.observacoes || null;
      if (dados.status) clienteUpdate.status = dados.status;
      
      const { error: clienteError } = await supabase
        .from("lista_espera_clientes")
        .update(clienteUpdate)
        .eq("id", dados.id);
      
      if (clienteError) throw clienteError;
      
      // 2. Atualizar itens se fornecidos
      if (dados.itens) {
        // Deletar itens antigos
        await supabase
          .from("lista_espera_itens")
          .delete()
          .eq("cliente_id", dados.id);
        
        // Inserir novos itens
        if (dados.itens.length > 0) {
          const itensToInsert = dados.itens.map(item => ({
            cliente_id: dados.id,
            tipo_id: item.tipo_id,
            descricao: item.descricao || null,
            cor: item.cor || null,
            ordem: item.ordem,
          }));
          
          const { error: itensError } = await supabase
            .from("lista_espera_itens")
            .insert(itensToInsert);
          
          if (itensError) throw itensError;
        }
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lista_espera_clientes"] });
      queryClient.invalidateQueries({ queryKey: ["lista_espera_cliente"] });
      toast.success("Cliente atualizado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });
}

/**
 * Dar baixa/cancelar cliente da lista
 */
export function useDeleteListaEspera() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dados: {
      id: string;
      motivoBaixa: 'atendido' | 'cancelado';
    }) => {
      const { error } = await supabase
        .from("lista_espera_clientes")
        .update({
          status: dados.motivoBaixa,
          data_atendimento: new Date().toISOString(),
          atendido_por: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", dados.id);
      
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lista_espera_clientes"] });
      toast.success("Baixa registrada!");
    },
    onError: (error: any) => {
      toast.error("Erro ao dar baixa: " + error.message);
    },
  });
}

// ========================================
// MATCHES (SUGESTÕES)
// ========================================

/**
 * Buscar matches pendentes (para alertas)
 */
export function useMatchesPendentes() {
  return useQuery({
    queryKey: ["lista_espera_matches_pendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lista_espera_matches")
        .select(`
          *,
          cliente:lista_espera_clientes(*),
          item_desejado:lista_espera_itens(
            *,
            tipo:tipos_itens_grandes(*)
          ),
          item_estoque:itens_grandes_individuais(
            *,
            tipo:tipos_itens_grandes(*),
            marca:marcas_itens_grandes(*)
          )
        `)
        .eq("status", "pendente")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as ListaEsperaMatch[];
    },
  });
}

/**
 * Buscar matches de um cliente específico
 */
export function useMatchesPorCliente(clienteId: string | null) {
  return useQuery({
    queryKey: ["lista_espera_matches_cliente", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      if (!clienteId) return [];
      
      const { data, error } = await supabase
        .from("lista_espera_matches")
        .select(`
          *,
          item_desejado:lista_espera_itens(
            *,
            tipo:tipos_itens_grandes(*)
          ),
          item_estoque:itens_grandes_individuais(
            *,
            tipo:tipos_itens_grandes(*),
            marca:marcas_itens_grandes(*)
          )
        `)
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as ListaEsperaMatch[];
    },
  });
}

/**
 * Aceitar um match (item serve ao cliente)
 */
export function useAceitarMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (matchId: string) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      // 1. Atualizar match
      const { data: match, error: matchError } = await supabase
        .from("lista_espera_matches")
        .update({
          status: "aceito",
          verificado_por: userId,
          data_verificacao: new Date().toISOString(),
        })
        .eq("id", matchId)
        .select()
        .single();
      
      if (matchError) throw matchError;
      
      // 2. Atualizar status do cliente para 'notificado'
      const { error: clienteError } = await supabase
        .from("lista_espera_clientes")
        .update({ status: "notificado" })
        .eq("id", match.cliente_id);
      
      if (clienteError) throw clienteError;
      
      // 3. Atualizar status do item desejado
      const { error: itemError } = await supabase
        .from("lista_espera_itens")
        .update({ status: "match_encontrado" })
        .eq("id", match.item_desejado_id);
      
      if (itemError) throw itemError;
      
      return match;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lista_espera_matches_pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["lista_espera_clientes"] });
      toast.success("Match aceito! Cliente notificado.");
    },
    onError: (error: any) => {
      toast.error("Erro ao aceitar match: " + error.message);
    },
  });
}

/**
 * Recusar um match (item não serve)
 */
export function useRecusarMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dados: {
      matchId: string;
      motivo?: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      const { error } = await supabase
        .from("lista_espera_matches")
        .update({
          status: "recusado",
          verificado_por: userId,
          data_verificacao: new Date().toISOString(),
          motivo_recusa: dados.motivo || null,
        })
        .eq("id", dados.matchId);
      
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lista_espera_matches_pendentes"] });
      toast.success("Match recusado. Cliente continua aguardando.");
    },
    onError: (error: any) => {
      toast.error("Erro ao recusar match: " + error.message);
    },
  });
}
