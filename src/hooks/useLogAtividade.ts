import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LogAtividade } from "@/types/database";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";

// Função auxiliar para obter IP (simplificada, pode ser melhorada)
const getClientIP = async (): Promise<string | null> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return null;
  }
};

// Função auxiliar para obter User Agent
const getUserAgent = (): string | null => {
  return navigator.userAgent || null;
};

// Interface para registrar log
interface RegistrarLogParams {
  acao: string;
  tabela_afetada: string;
  registro_id?: string;
  dados_antes?: any;
  dados_depois?: any;
  detalhes?: string;
}

// Hook para buscar logs (apenas admin)
export function useLogsAtividades(filters?: {
  user_id?: string;
  acao?: string;
  tabela_afetada?: string;
  data_inicio?: string;
  data_fim?: string;
  limite?: number;
}) {
  return useQuery({
    queryKey: ["logs-atividades", filters],
    queryFn: async () => {
      let query = supabase
        .from("log_atividades")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.user_id) {
        query = query.eq("user_id", filters.user_id);
      }
      if (filters?.acao) {
        query = query.eq("acao", filters.acao);
      }
      if (filters?.tabela_afetada) {
        query = query.eq("tabela_afetada", filters.tabela_afetada);
      }
      if (filters?.data_inicio) {
        query = query.gte("created_at", filters.data_inicio);
      }
      if (filters?.data_fim) {
        query = query.lte("created_at", filters.data_fim);
      }
      if (filters?.limite) {
        query = query.limit(filters.limite);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as LogAtividade[];
    },
  });
}

// Hook para registrar log
export function useRegistrarLog() {
  const queryClient = useQueryClient();
  const { profile } = useUser();

  return useMutation({
    mutationFn: async (params: RegistrarLogParams) => {
      // Obter informações do usuário
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !profile) {
        console.warn("Log não registrado: usuário não autenticado");
        return null;
      }

      // Obter IP e User Agent (de forma assíncrona)
      const [ip, userAgent] = await Promise.all([
        getClientIP(),
        Promise.resolve(getUserAgent())
      ]);

      const logData = {
        user_id: user.id,
        user_nome: profile.nome || "Usuário desconhecido",
        user_cargo: profile.cargo || null,
        acao: params.acao,
        tabela_afetada: params.tabela_afetada,
        registro_id: params.registro_id || null,
        dados_antes: params.dados_antes || null,
        dados_depois: params.dados_depois || null,
        detalhes: params.detalhes || null,
        ip_address: ip,
        user_agent: userAgent,
      };

      const { error } = await supabase
        .from("log_atividades")
        .insert([logData]);

      if (error) {
        console.error("Erro ao registrar log:", error);
        // Não mostramos toast de erro ao usuário para não poluir a UX
        // Logs são secundários, não devem interromper operações principais
        return null;
      }

      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logs-atividades"] });
    },
  });
}

// Hook para registrar log de forma simplificada (fire and forget)
export function useLogAtividade() {
  const { mutateAsync: registrarLog } = useRegistrarLog();

  // Função que pode ser chamada sem await (não bloqueia a operação principal)
  const log = (params: RegistrarLogParams) => {
    registrarLog(params).catch(err => {
      console.error("Erro silencioso ao registrar log:", err);
    });
  };

  return { log };
}
