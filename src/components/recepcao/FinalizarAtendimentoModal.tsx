import { useState } from "react";
import { useFinalizarAtendimento } from "@/hooks/useAtendimentos";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Loader2, Plus, Trash2 } from "lucide-react";
import type { Atendimento } from "@/types/database";

interface FinalizarAtendimentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  atendimento: Atendimento | null;
}

interface Pagamento {
  metodo: string;
  valor: string;
}

const metodosPagamento = [
  "Dinheiro",
  "Pix",
  "Cartão Débito",
  "Cartão Crédito",
];

export function FinalizarAtendimentoModal({ 
  open, 
  onOpenChange, 
  atendimento 
}: FinalizarAtendimentoModalProps) {
  const [valorTotal, setValorTotal] = useState("");
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([{ metodo: "", valor: "" }]);
  const { toast } = useToast();
  const finalizarAtendimento = useFinalizarAtendimento();

  const handleAddPagamento = () => {
    if (pagamentos.length < 3) {
      setPagamentos([...pagamentos, { metodo: "", valor: "" }]);
    }
  };

  const handleRemovePagamento = (index: number) => {
    setPagamentos(pagamentos.filter((_, i) => i !== index));
  };

  const handlePagamentoChange = (index: number, field: keyof Pagamento, value: string) => {
    const newPagamentos = [...pagamentos];
    newPagamentos[index][field] = value;
    setPagamentos(newPagamentos);
  };

  const somaPagamentos = pagamentos.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
  const valorTotalNum = parseFloat(valorTotal) || 0;
  const pagamentoBalanceado = Math.abs(somaPagamentos - valorTotalNum) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!atendimento) return;

    if (!valorTotal || valorTotalNum <= 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O valor total é obrigatório.",
      });
      return;
    }

    if (!pagamentoBalanceado) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "A soma dos pagamentos deve ser igual ao valor total.",
      });
      return;
    }

    try {
      const pagamentoData: any = {
        valor_total_negociado: valorTotalNum,
      };

      pagamentos.forEach((p, i) => {
        if (p.metodo && p.valor) {
          pagamentoData[`metodo_pagto_${i + 1}`] = p.metodo;
          pagamentoData[`valor_pagto_${i + 1}`] = parseFloat(p.valor);
        }
      });

      await finalizarAtendimento.mutateAsync({
        id: atendimento.id,
        pagamento: pagamentoData,
      });

      toast({
        title: "Sucesso!",
        description: "Atendimento finalizado com sucesso.",
      });
      
      // Reset form
      setValorTotal("");
      setPagamentos([{ metodo: "", valor: "" }]);
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível finalizar o atendimento.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Finalizar Atendimento
          </DialogTitle>
        </DialogHeader>
        
        {atendimento && (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{atendimento.nome_cliente}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valorTotal">Valor Total Negociado (R$)</Label>
                <Input
                  id="valorTotal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorTotal}
                  onChange={(e) => setValorTotal(e.target.value)}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Formas de Pagamento</Label>
                  {pagamentos.length < 3 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleAddPagamento}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  )}
                </div>
                
                {pagamentos.map((pagamento, index) => (
                  <div key={index} className="flex gap-2">
                    <Select
                      value={pagamento.metodo}
                      onValueChange={(value) => handlePagamentoChange(index, 'metodo', value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Método" />
                      </SelectTrigger>
                      <SelectContent>
                        {metodosPagamento.map((metodo) => (
                          <SelectItem key={metodo} value={metodo}>
                            {metodo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pagamento.valor}
                      onChange={(e) => handlePagamentoChange(index, 'valor', e.target.value)}
                      placeholder="Valor"
                      className="w-32"
                    />
                    {pagamentos.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePagamento(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}

                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Soma dos Pagamentos:</span>
                  <span className={`font-medium ${pagamentoBalanceado ? 'text-success' : 'text-destructive'}`}>
                    R$ {somaPagamentos.toFixed(2)}
                  </span>
                </div>
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
                disabled={finalizarAtendimento.isPending || !pagamentoBalanceado}
              >
                {finalizarAtendimento.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  "Finalizar"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
