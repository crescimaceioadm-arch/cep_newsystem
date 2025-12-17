import { MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCaixa } from "@/contexts/CaixaContext";

export function CaixaIndicator() {
  const { caixaSelecionado, setShowModal } = useCaixa();

  if (!caixaSelecionado) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/60 rounded-lg border border-amber-300/50">
      <MapPin className="h-4 w-4 text-amber-600" />
      <span className="text-sm font-medium text-slate-700">{caixaSelecionado}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-amber-200/50"
        onClick={() => setShowModal(true)}
        title="Trocar caixa"
      >
        <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
      </Button>
    </div>
  );
}
