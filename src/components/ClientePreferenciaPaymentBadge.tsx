import { useClientePreferenciaPagemento, useClienteRecusas, type ClientePreferenciaPagemento, type ClienteRecusas } from "@/hooks/useClientePreferenciaPagemento";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface ClientePreferenciaPaymentBadgeProps {
  nomeCliente?: string;
  className?: string;
  showRecusas?: boolean;
}

// Componente que renderiza apenas (sem queries) - Use este quando tiver dados em batch
interface ClientePreferenciaPaymentBadgeRenderProps {
  preferencia?: ClientePreferenciaPagemento | null;
  recusas?: ClienteRecusas | null;
  className?: string;
  showRecusas?: boolean;
}

export function ClientePreferenciaPaymentBadgeRender({ 
  preferencia, 
  recusas, 
  className = "", 
  showRecusas = true 
}: ClientePreferenciaPaymentBadgeRenderProps) {
  if (!preferencia || preferencia.total_avaliacoes === 0) {
    return null; // Não mostra nada se não tem histórico - mais rápido
  }

  const { total_gira, total_pix_dinheiro, total_avaliacoes, percentual_gira } = preferencia;
  const percentualDinheiro = 100 - percentual_gira;
  const prefereGira = percentual_gira >= percentualDinheiro;
  
  const percentualDominante = prefereGira ? percentual_gira : percentualDinheiro;
  const qtdDominante = prefereGira ? total_gira : total_pix_dinheiro;
  const tipoLabel = prefereGira ? "Gira" : "$/Pix";

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {/* Badge de Preferência - Sem ícone, apenas texto */}
      <Badge
        variant="outline"
        className={`px-2 py-0.5 text-[11px] font-semibold ${
          prefereGira 
            ? "border-orange-400 bg-orange-50 text-orange-700" 
            : "border-green-400 bg-green-50 text-green-700"
        }`}
      >
        {tipoLabel} {percentualDominante.toFixed(0)}% ({qtdDominante}/{total_avaliacoes})
      </Badge>

      {/* Badge de Recusas - Simplificado */}
      {showRecusas && recusas && recusas.total_recusadas > 0 && (
        <Badge
          variant="outline"
          className="px-2 py-0.5 text-[11px] font-semibold border-red-400 bg-red-50 text-red-700"
        >
          ❌ {recusas.percentual_recusadas.toFixed(0)}% ({recusas.total_recusadas}/{recusas.total_avaliacoes})
        </Badge>
      )}
    </div>
  );
}

// Componente original que faz queries individuais (mantido para compatibilidade)
export function ClientePreferenciaPaymentBadge({ nomeCliente, className = "", showRecusas = true }: ClientePreferenciaPaymentBadgeProps) {
  const { data: preferencia, isLoading } = useClientePreferenciaPagemento(nomeCliente);
  const { data: recusas, isLoading: isLoadingRecusas } = useClienteRecusas(showRecusas ? nomeCliente : undefined);

  if (!nomeCliente) return null;

  if (isLoading || isLoadingRecusas) {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <Loader2 className="h-3 w-3 animate-spin" />
      </span>
    );
  }

  return <ClientePreferenciaPaymentBadgeRender 
    preferencia={preferencia} 
    recusas={recusas} 
    className={className} 
    showRecusas={showRecusas} 
  />;
}
