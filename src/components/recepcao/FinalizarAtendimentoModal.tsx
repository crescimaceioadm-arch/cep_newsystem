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
  banco?: string;
}

const metodosPagamento = ["PIX", "Dinheiro", "Gira crédito"];
const bancosPix = ["Nubank", "Inter"];

export function FinalizarAtendimentoModal({ 
  open, 
  onOpenChange, 
  atendimento 
}: FinalizarAtendimentoModalProps) {
  const [valorTotal, setValorTotal] = useState("");
  const [desconto, setDesconto] = useState("");
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([{ metodo: "", valor: "", banco: undefined }]);
  const { toast } = useToast();
  const finalizarAtendimento = useFinalizarAtendimento();

  const handleAddPagamento = () => {
    if (pagamentos.length < 3) {
      setPagamentos([...pagamentos, { metodo: "", valor: "", banco: undefined }]);
    }
  };

  const handleRemovePagamento = (index: number) => {
    setPagamentos(pagamentos.filter((_, i) => i !== index));
  };

  const handlePagamentoChange = (index: number, field: keyof Pagamento, value: string | undefined) => {
    const newPagamentos = [...pagamentos];
    if (field === 'metodo') {
      newPagamentos[index].metodo = value as string;
      // Limpa banco se não for PIX
      if (value !== 'PIX') {
        newPagamentos[index].banco = undefined;
      }
    } else if (field === 'banco') {
      newPagamentos[index].banco = value;
    } else {
      newPagamentos[index].valor = value as string;
    }
    setPagamentos(newPagamentos);
  };

  const somaPagamentos = pagamentos.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
  const valorTotalNum = parseFloat(valorTotal) || 0;
  const descontoNum = parseFloat(desconto) || 0;
  const valorComDesconto = valorTotalNum - descontoNum;
  // Aumentei a tolerância para 0.05 para evitar erros de arredondamento chatos
  const pagamentoBalanceado = Math.abs(somaPagamentos - valorComDesconto) < 0.05;

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
        description: `A soma dos pagamentos (R$ ${somaPagamentos.toFixed(2)}) deve ser igual ao valor com desconto (R$ ${valorComDesconto.toFixed(2)}).`,
      });
      return;
    }

    try {
      
      // CORREÇÃO CRÍTICA AQUI:
      // Adicionado status: 'finalizado' e hora_encerramento
      const pagamentoData: any = {
        status: 'finalizado', // <--- Força a mudança de status
        hora_encerramento: new Date().toISOString(), // <--- Grava a hora do fim
        valor_total_negociado: valorTotalNum,
        desconto_aplicado: descontoNum,
        
        // Pagamento 1
        pagamento_1_metodo: pagamentos[0]?.metodo || null,
        pagamento_1_valor: parseFloat(pagamentos[0]?.valor) || 0,
        pagamento_1_banco: pagamentos[0]?.metodo === 'PIX' ? (pagamentos[0]?.banco || null) : null,
        
        // Pagamento 2
        pagamento_2_metodo: pagamentos[1]?.metodo || null,
        pagamento_2_valor: parseFloat(pagamentos[1]?.valor) || 0,
        pagamento_2_banco: pagamentos[1]?.metodo === 'PIX' ? (pagamentos[1]?.banco || null) : null,
        
        // Pagamento 3
        pagamento_3_metodo: pagamentos[2]?.metodo || null,
        pagamento_3_valor: parseFloat(pagamentos[2]?.valor) || 0,
        pagamento_3_banco: pagamentos[2]?.metodo === 'PIX' ? (pagamentos[2]?.banco || null) : null,
      };

      console.log("[FinalizarAtendimentoModal] Payload enviado:", pagamentoData);

      await finalizarAtendimento.mutateAsync({
        id: atendimento.id,
        pagamento: pagamentoData,
      });

      toast({
        title: "Sucesso!",
        description: "Venda finalizada e registrada no financeiro!",
      });
      
      // Reset form
      setValorTotal("");
      setDesconto("");
      setPagamentos([{ metodo: "", valor: "", banco: undefined }]);
      onOpenChange(false);
    } catch (error: any) {
      console.error("[FinalizarAtendimentoModal] Erro:", error);
      toast({
        variant: "destructive",
        title: "Erro técnico",
        description: error?.message || "Não foi possível finalizar o atendimento.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg z-[9999]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Finalizar Atendimento
          </DialogTitle>
        </DialogHeader>
        
        {atendimento && (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg border">
                <p className="text-xs text-muted-foreground uppercase font-bold">Cliente</p>
                <p className="font-medium text-lg">{atendimento.nome_cliente}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valorTotal">Valor Total (R$)</Label>
                  <Input
                    id="valorTotal"
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorTotal}
                    onChange={(e) => setValorTotal(e.target.value)}
                    placeholder="0,00"
                    className="font-bold text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desconto">Desconto (R$)</Label>
                  <Input
                    id="desconto"
                    type="number"
                    step="0.01"
                    min="0"
                    value={desconto}
                    onChange={(e) => setDesconto(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t">
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
                  <div key={index} className="flex flex-wrap gap-2 items-center bg-slate-50 p-2 rounded border">
                    <Select
                      value={pagamento.metodo}
                      onValueChange={(value) => handlePagamentoChange(index, 'metodo', value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="z-[99999]">
                        {metodosPagamento.map((metodo) => (
                          <SelectItem key={metodo} value={metodo}>
                            {metodo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {pagamento.metodo === 'PIX' && (
                      <Select
                        value={pagamento.banco || ""}
                        onValueChange={(value) => handlePagamentoChange(index, 'banco', value)}
                      >
                        <SelectTrigger className="w-[110px]">
                          <SelectValue placeholder="Banco" />
                        </SelectTrigger>
                        <SelectContent className="z-[99999]">
                          {bancosPix.map((banco) => (
                            <SelectItem key={banco} value={banco}>
                              {banco}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pagamento.valor}
                      onChange={(e) => handlePagamentoChange(index, 'valor', e.target.value)}
                      placeholder="Valor"
                      className="flex-1 min-w-[100px]"
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

                <div className="space-y-2 p-3 bg-slate-50 rounded-lg border mt-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Valor Total:</span>
                    <span className="font-semibold">R$ {valorTotalNum.toFixed(2)}</span>
                  </div>
                  {descontoNum > 0 && (
                    <div className="flex justify-between items-center text-sm text-red-600 border-t pt-2">
                      <span className="font-medium">- Desconto:</span>
                      <span className="font-semibold">R$ {descontoNum.toFixed(2)}</span>
                    </div>
                  )}
                  <div className={`flex justify-between items-center p-2 rounded border-t-2 ${pagamentoBalanceado ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <span className="text-sm font-bold">Valor a Pagar:</span>
                    <span className={`font-bold text-lg ${pagamentoBalanceado ? 'text-green-600' : 'text-red-600'}`}>
                      R$ {valorComDesconto.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium">Soma dos Pagamentos:</span>
                    <span className={`font-bold text-lg ${pagamentoBalanceado ? 'text-green-600' : 'text-red-600'}`}>
                      R$ {somaPagamentos.toFixed(2)}
                    </span>
                  </div>
                  {!pagamentoBalanceado && (
                    <span className="text-xs text-red-600 font-medium block text-center pt-1">
                      Diferença: R$ {Math.abs(valorComDesconto - somaPagamentos).toFixed(2)}
                    </span>
                  )}
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
                className="bg-green-600 hover:bg-green-700"
              >
                {finalizarAtendimento.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  "Confirmar Venda"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
