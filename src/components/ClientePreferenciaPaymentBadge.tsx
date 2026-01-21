import { useClientePreferenciaPagemento } from "@/hooks/useClientePreferenciaPagemento";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Loader2 } from "lucide-react";

interface ClientePreferenciaPaymentBadgeProps {
  nomeCliente?: string;
  className?: string;
}

export function ClientePreferenciaPaymentBadge({ nomeCliente, className = "" }: ClientePreferenciaPaymentBadgeProps) {
  const { data: preferencia, isLoading } = useClientePreferenciaPagemento(nomeCliente);

  if (!nomeCliente) return null;

  if (isLoading) {
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
  const preferenciaTexto = prefereGira ? "Gira" : "Pix+Dinheiro";

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border-amber-300 bg-amber-50 text-amber-800 ${className}`}
    >
      <CreditCard className="h-3.5 w-3.5" />
      <span>
        Prefere {preferenciaTexto} ({percentual_gira.toFixed(0)}%)
      </span>
      <span className="text-amber-700 font-bold">•</span>
      <span className="text-amber-700">
        {total_gira}/{total_avaliacoes}
      </span>
    </Badge>
  );
}
