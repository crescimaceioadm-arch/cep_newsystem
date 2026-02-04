import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TipoPermissao = 
  | 'menu:/recepcao'
  | 'menu:/recepcao/clientes'
  | 'menu:/vendas'
  | 'menu:/vendas/historico'
  | 'menu:/avaliacao'
  | 'menu:/atendimentos/historico'
  | 'menu:/financeiro'
  | 'menu:/estoque'
  | 'menu:/dashboard'
  | 'menu:/configuracoes'
  | 'menu:/marketing'
  | 'menu:/performance-vendas'
  | 'menu:/logs-atividades'
  | 'action:editar_venda'
  | 'action:editar_avaliacao'
  | 'action:deletar_venda'
  | 'action:deletar_avaliacao'
  | 'financeiro:aprovacoes'
  | 'financeiro:relatorio'
  | 'financeiro:movimentacoes'
  | 'export:csv_vendas'
  | 'export:csv_cartoes'
  | 'export:csv_atendimentos';

export interface PermissaoUsuario {
  id: string;
  user_id: string;
  permissao: TipoPermissao;
  concedida: boolean;
  created_at: string;
  updated_at: string;
}

// Buscar permissões de um usuário específico
export function usePermissoesUsuario(userId: string | undefined) {
  return useQuery({
    queryKey: ["permissoes-usuario", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("permissoes_usuario")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return data as PermissaoUsuario[];
    },
    enabled: !!userId,
  });
}

// Buscar todas as permissões de todos os usuários (para admin)
export function useTodasPermissoesUsuarios() {
  return useQuery({
    queryKey: ["permissoes-usuario", "todas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissoes_usuario")
        .select("*")
        .order("user_id");

      if (error) throw error;
      return data as PermissaoUsuario[];
    },
  });
}

// Atualizar ou criar permissão
export function useSalvarPermissao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      permissao,
      concedida,
    }: {
      userId: string;
      permissao: TipoPermissao;
      concedida: boolean;
    }) => {
      const { data, error } = await supabase
        .from("permissoes_usuario")
        .upsert(
          {
            user_id: userId,
            permissao,
            concedida,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,permissao",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["permissoes-usuario", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["permissoes-usuario", "todas"] });
    },
  });
}

// Deletar permissão
export function useDeletarPermissao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (permissaoId: string) => {
      const { error } = await supabase
        .from("permissoes_usuario")
        .delete()
        .eq("id", permissaoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissoes-usuario"] });
      toast.success("Permissão removida");
    },
    onError: () => {
      toast.error("Erro ao remover permissão");
    },
  });
}

// Salvar múltiplas permissões de uma vez
export function useSalvarPermissoesLote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      permissoes,
    }: {
      userId: string;
      permissoes: { permissao: TipoPermissao; concedida: boolean }[];
    }) => {
      // Deletar todas as permissões antigas do usuário
      await supabase
        .from("permissoes_usuario")
        .delete()
        .eq("user_id", userId);

      // Inserir as novas permissões
      if (permissoes.length > 0) {
        const { data, error } = await supabase
          .from("permissoes_usuario")
          .insert(
            permissoes.map((p) => ({
              user_id: userId,
              permissao: p.permissao,
              concedida: p.concedida,
            }))
          )
          .select();

        if (error) throw error;
        return data;
      }
      return [];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["permissoes-usuario", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["permissoes-usuario", "todas"] });
      toast.success("Permissões atualizadas");
    },
    onError: () => {
      toast.error("Erro ao atualizar permissões");
    },
  });
}
