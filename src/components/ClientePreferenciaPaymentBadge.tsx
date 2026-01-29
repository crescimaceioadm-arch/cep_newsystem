import { useClientePreferenciaPagemento, useClienteRecusas } from "@/hooks/useClientePreferenciaPagemento";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Orbit, Loader2, AlertCircle } from "lucide-react";

interface ClientePreferenciaPaymentBadgeProps {
  nomeCliente?: string;
  className?: string;
  showRecusas?: boolean;
}

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

  if (!preferencia) {
    return (
      <Badge
        variant="outline"
        className={`px-2.5 py-1 text-xs font-medium border-muted text-muted-foreground ${className}`}
      >
        <span>Sem histórico</span>
      </Badge>
    );
  }

  const { total_gira, total_pix_dinheiro, total_avaliacoes, percentual_gira } = preferencia;
  if (total_avaliacoes === 0) {
    return (
      <Badge
        variant="outline"
        className={`px-2.5 py-1 text-xs font-medium border-muted text-muted-foreground ${className}`}
      >
        <span>Sem histórico</span>
      </Badge>
    );
  }

  const percentualDinheiro = 100 - percentual_gira;
  const prefereGira = percentual_gira >= percentualDinheiro;
  
  const IconePreferencia = prefereGira ? Orbit : DollarSign;
  const percentualDominante = prefereGira ? percentual_gira : percentualDinheiro;
  const qtdDominante = prefereGira ? total_gira : total_pix_dinheiro;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Badge de Preferência de Pagamento */}
      <Badge
        variant="outline"
        className={`inline-flex items-center gap-2 px-2.5 py-1.5 ${
          prefereGira 
            ? "border-orange-300 bg-orange-50 text-orange-700" 
            : "border-green-300 bg-green-50 text-green-700"
        }`}
      >
        {/* Ícone grande */}
        <IconePreferencia className="h-6 w-6" />
        
        {/* Informações empilhadas */}
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold">{percentualDominante.toFixed(0)}%</span>
          <span className="text-[10px] font-medium opacity-80">{qtdDominante}/{total_avaliacoes}</span>
        </div>
      </Badge>

      {/* Badge de Recusas */}
      {recusas && recusas.total_recusadas > 0 && (
        <Badge
          variant="outline"
          className={`inline-flex items-center gap-2 px-2.5 py-1.5 border-red-300 bg-red-50 text-red-700`}
        >
          {/* Ícone de recusa */}
          <AlertCircle className="h-6 w-6" />
          
          {/* Informações empilhadas */}
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold">{recusas.percentual_recusadas.toFixed(0)}%</span>
            <span className="text-[10px] font-medium opacity-80">{recusas.total_recusadas}/{recusas.total_avaliacoes}</span>
          </div>
        </Badge>
      )}
    </div>
  );
}
