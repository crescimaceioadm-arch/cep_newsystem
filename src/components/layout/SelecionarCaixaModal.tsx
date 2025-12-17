import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCaixa, CaixaOption } from "@/contexts/CaixaContext";
import { MonitorSmartphone } from "lucide-react";

const caixas: CaixaOption[] = ["Caixa 1", "Caixa 2", "Caixa 3"];

export function SelecionarCaixaModal() {
  const { caixaSelecionado, setCaixaSelecionado, showModal, setShowModal } = useCaixa();

  // Modal obrigatório - não pode fechar sem selecionar (exceto se já tiver selecionado)
  const handleOpenChange = (open: boolean) => {
    if (!open && !caixaSelecionado) {
      // Não permite fechar se não tiver caixa selecionado
      return;
    }
    setShowModal(open);
  };

  return (
    <Dialog open={showModal} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => !caixaSelecionado && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5 text-primary" />
            Selecione o Caixa
          </DialogTitle>
          <DialogDescription>
            Em qual terminal você está operando hoje?
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-3 py-4">
          {caixas.map((caixa) => (
            <Button
              key={caixa}
              variant={caixaSelecionado === caixa ? "default" : "outline"}
              className="h-14 text-lg"
              onClick={() => setCaixaSelecionado(caixa)}
            >
              {caixa}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
