import { useState } from "react";
import { useCreateAtendimento } from "@/hooks/useAtendimentos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Loader2 } from "lucide-react";

interface NovoAtendimentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NovoAtendimentoModal({ open, onOpenChange }: NovoAtendimentoModalProps) {
  const [nomeCliente, setNomeCliente] = useState("");
  const [isWhatsapp, setIsWhatsapp] = useState(false);
  const { toast } = useToast();
  const createAtendimento = useCreateAtendimento();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nomeCliente.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O nome do cliente é obrigatório.",
      });
      return;
    }

    try {
      await createAtendimento.mutateAsync({
        nomeCliente: nomeCliente.trim(),
        origemAvaliacao: isWhatsapp ? "whatsapp" : "presencial",
      });
      toast({
        title: "Sucesso!",
        description: "Atendimento registrado com sucesso.",
      });
      setNomeCliente("");
      setIsWhatsapp(false);
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível registrar o atendimento.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Novo Atendimento
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Cliente</Label>
              <Input
                id="nome"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                placeholder="Digite o nome do cliente..."
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createAtendimento.isPending}
            >
              {createAtendimento.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
