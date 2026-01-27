import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Atendimento } from "@/types/database";

export function useAtendimentosDinheiroFinalizados(dataInicio?: string, dataFim?: string) {
  return useQuery({
    queryKey: ["atendimentos_dinheiro_finalizados", dataInicio, dataFim],
    queryFn: async () => {
      let query = supabase
        .from("atendimentos")
        .select("*")
        .eq("status", "finalizado");

      if (dataInicio) {
        const dataInicioTimestamp = new Date(dataInicio + "T00:00:00").toISOString();
        query = query.gte("hora_encerramento", dataInicioTimestamp);
      }
      if (dataFim) {
        const dataFimTimestamp = new Date(dataFim + "T23:59:59").toISOString();
        query = query.lte("hora_encerramento", dataFimTimestamp);
      }

      const { data, error } = await query;
      if (error) throw error;
      // Filtrar avaliações pagas em dinheiro
      return (data as Atendimento[]).filter(att => {
        return (
          (att.pagamento_1_metodo?.toLowerCase() === "dinheiro" && att.pagamento_1_valor && att.pagamento_1_valor > 0) ||
          (att.pagamento_2_metodo?.toLowerCase() === "dinheiro" && att.pagamento_2_valor && att.pagamento_2_valor > 0) ||
          (att.pagamento_3_metodo?.toLowerCase() === "dinheiro" && att.pagamento_3_valor && att.pagamento_3_valor > 0)
        );
      });
    },
  });
}
