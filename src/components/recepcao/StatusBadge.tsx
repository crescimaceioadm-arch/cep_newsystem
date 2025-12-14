import { Badge } from "@/components/ui/badge";
import type { StatusAtendimento } from "@/types/database";

const statusConfig: Record<StatusAtendimento, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  aguardando_avaliacao: { label: "Aguardando Avaliação", variant: "secondary" },
  aguardando_pagamento: { label: "Aguardando Pagamento", variant: "default" },
  finalizado: { label: "Finalizado", variant: "outline" },
};

interface StatusBadgeProps {
  status: StatusAtendimento;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "outline" as const };
  
  return (
    <Badge 
      variant={config.variant}
      className={
        status === 'aguardando_avaliacao' 
          ? 'bg-warning text-warning-foreground hover:bg-warning/90' 
          : status === 'aguardando_pagamento'
          ? 'bg-info text-info-foreground hover:bg-info/90'
          : 'bg-success text-success-foreground hover:bg-success/90'
      }
    >
      {config.label}
    </Badge>
  );
}
