import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface TempoEsperaProps {
  horaChegada: string;
}

function calcularTempoEspera(horaChegada: string): string {
  if (!horaChegada) return "--";
  const chegada = new Date(horaChegada);
  if (Number.isNaN(chegada.getTime())) return "--";
  const agora = new Date();
  const diffMs = agora.getTime() - chegada.getTime();
  
  const minutos = Math.floor(diffMs / 60000);
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;

  if (horas > 0) {
    return `${horas}h ${minutosRestantes}min`;
  }
  return `${minutos}min`;
}

export function TempoEspera({ horaChegada }: TempoEsperaProps) {
  const [tempo, setTempo] = useState(() => calcularTempoEspera(horaChegada));

  useEffect(() => {
    const interval = setInterval(() => {
      setTempo(calcularTempoEspera(horaChegada));
    }, 60000); // Atualiza a cada minuto

    return () => clearInterval(interval);
  }, [horaChegada]);

  return (
    <div className="flex items-center gap-1 text-muted-foreground text-sm">
      <Clock className="h-3.5 w-3.5" />
      <span>{tempo}</span>
    </div>
  );
}
