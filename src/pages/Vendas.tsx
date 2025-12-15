import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useEstoque } from "@/hooks/useEstoque";
import { useFinalizarVenda } from "@/hooks/useVendas";

import { PagamentoInput } from "@/components/vendas/PagamentoInput";
import { ShoppingCart, CreditCard, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Quantidades {
  baby: number;
  infantil: number;
  calcados: number;
  brinquedos: number;
  medios: number;
  grandes: number;
}

interface Pagamento {
  metodo: string;
  valor: number;
}

export default function Vendas() {
  const { data: estoque } = useEstoque();
  const { mutate: finalizarVenda, isPending } = useFinalizarVenda();

  const [quantidades, setQuantidades] = useState<Quantidades>({
    baby: 0,
    infantil: 0,
    calcados: 0,
    brinquedos: 0,
    medios: 0,
    grandes: 0,
  });

  const [valorTotal, setValorTotal] = useState<number>(0);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([{ metodo: "PIX", valor: 0 }]);
  const [showAlertaEstoque, setShowAlertaEstoque] = useState(false);
  const [alertasEstoque, setAlertasEstoque] = useState<string[]>([]);

  const getEstoqueCategoria = (categoria: string): number => {
    return estoque?.find((e) => e.categoria === categoria)?.quantidade_atual || 0;
  };

  const totalPecas = 
    quantidades.baby + 
    quantidades.infantil + 
    quantidades.calcados + 
    quantidades.brinquedos + 
    quantidades.medios + 
    quantidades.grandes;

  const totalPagamentos = pagamentos.reduce((sum, p) => sum + p.valor, 0);
  const diferenca = valorTotal - totalPagamentos;

  const verificarEstoque = (): string[] => {
    const alertas: string[] = [];

    const estoqueBaby = getEstoqueCategoria("Roupas Baby");
    const estoqueInfantil = getEstoqueCategoria("Roupas 1 a 16");

    if (quantidades.baby > estoqueBaby)
      alertas.push(`Roupas Baby: estoque ${estoqueBaby}, vendendo ${quantidades.baby}`);
    if (quantidades.infantil > estoqueInfantil)
      alertas.push(`Roupas 1 a 16: estoque ${estoqueInfantil}, vendendo ${quantidades.infantil}`);
    if (quantidades.calcados > getEstoqueCategoria("Calçados"))
      alertas.push(`Calçados: estoque ${getEstoqueCategoria("Calçados")}, vendendo ${quantidades.calcados}`);
    if (quantidades.brinquedos > getEstoqueCategoria("Brinquedos"))
      alertas.push(`Brinquedos: estoque ${getEstoqueCategoria("Brinquedos")}, vendendo ${quantidades.brinquedos}`);
    if (quantidades.medios > getEstoqueCategoria("Itens Médios"))
      alertas.push(`Itens Médios: estoque ${getEstoqueCategoria("Itens Médios")}, vendendo ${quantidades.medios}`);
    if (quantidades.grandes > getEstoqueCategoria("Itens Grandes"))
      alertas.push(`Itens Grandes: estoque ${getEstoqueCategoria("Itens Grandes")}, vendendo ${quantidades.grandes}`);

    return alertas;
  };

  const handleFinalizarVenda = (forcar = false) => {
    if (totalPecas === 0) {
      toast.error("Adicione pelo menos um item à venda.");
      return;
    }

    if (valorTotal <= 0) {
      toast.error("Informe o valor total da venda.");
      return;
    }

    if (Math.abs(diferenca) > 0.01) {
      toast.error(`A soma dos pagamentos (R$ ${totalPagamentos.toFixed(2)}) deve ser igual ao valor total (R$ ${valorTotal.toFixed(2)}).`);
      return;
    }

    const alertas = verificarEstoque();
    if (alertas.length > 0 && !forcar) {
      setAlertasEstoque(alertas);
      setShowAlertaEstoque(true);
      return;
    }

    finalizarVenda({
      qtd_baby_vendida: quantidades.baby,
      qtd_1_a_16_vendida: quantidades.infantil,
      qtd_calcados_vendida: quantidades.calcados,
      qtd_brinquedos_vendida: quantidades.brinquedos,
      qtd_itens_medios_vendida: quantidades.medios,
      qtd_itens_grandes_vendida: quantidades.grandes,
      valor_total_venda: valorTotal,
      pagamentos,
    }, {
      onSuccess: () => {
        setQuantidades({ baby: 0, infantil: 0, calcados: 0, brinquedos: 0, medios: 0, grandes: 0 });
        setValorTotal(0);
        setPagamentos([{ metodo: "Pix", valor: 0 }]);
      },
    });
  };

  return (
    <MainLayout title="Vendas / Caixa">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna Esquerda - Pagamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="valor-total">Valor Total da Venda</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                <Input
                  id="valor-total"
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorTotal || ""}
                  onChange={(e) => setValorTotal(parseFloat(e.target.value) || 0)}
                  className="pl-10 text-2xl font-bold h-14"
                  placeholder="0,00"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Formas de Pagamento</Label>
              <PagamentoInput pagamentos={pagamentos} onChange={setPagamentos} />
            </div>

            <Separator />

            <div className="space-y-2 p-4 rounded-lg bg-muted">
              <div className="flex justify-between">
                <span>Valor da Venda:</span>
                <span className="font-semibold">R$ {valorTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Pagamentos:</span>
                <span className="font-semibold">R$ {totalPagamentos.toFixed(2)}</span>
              </div>
              <Separator />
              <div className={`flex justify-between text-lg font-bold ${Math.abs(diferenca) > 0.01 ? 'text-destructive' : 'text-secondary'}`}>
                <span>Diferença:</span>
                <span>R$ {diferenca.toFixed(2)}</span>
              </div>
            </div>

            <Button 
              onClick={() => handleFinalizarVenda(false)} 
              disabled={isPending || totalPecas === 0}
              className="w-full h-14 text-lg"
              size="lg"
            >
              {isPending ? "Finalizando..." : "Finalizar Venda"}
            </Button>
          </CardContent>
        </Card>

        {/* Coluna Direita - Itens da Venda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Itens da Venda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Baby</Label>
                <Input
                  type="number"
                  min="0"
                  value={quantidades.baby || ""}
                  onChange={(e) => setQuantidades((prev) => ({ ...prev, baby: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  className="text-center text-lg font-semibold"
                />
                <span className="text-xs text-muted-foreground">Estoque: {getEstoqueCategoria("Roupas Baby")}</span>
              </div>
              <div className="space-y-2">
                <Label>1 a 16</Label>
                <Input
                  type="number"
                  min="0"
                  value={quantidades.infantil || ""}
                  onChange={(e) => setQuantidades((prev) => ({ ...prev, infantil: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  className="text-center text-lg font-semibold"
                />
                <span className="text-xs text-muted-foreground">Estoque: {getEstoqueCategoria("Roupas 1 a 16")}</span>
              </div>
              <div className="space-y-2">
                <Label>Calçados</Label>
                <Input
                  type="number"
                  min="0"
                  value={quantidades.calcados || ""}
                  onChange={(e) => setQuantidades((prev) => ({ ...prev, calcados: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  className="text-center text-lg font-semibold"
                />
                <span className="text-xs text-muted-foreground">Estoque: {getEstoqueCategoria("Calçados")}</span>
              </div>
              <div className="space-y-2">
                <Label>Brinquedos</Label>
                <Input
                  type="number"
                  min="0"
                  value={quantidades.brinquedos || ""}
                  onChange={(e) => setQuantidades((prev) => ({ ...prev, brinquedos: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  className="text-center text-lg font-semibold"
                />
                <span className="text-xs text-muted-foreground">Estoque: {getEstoqueCategoria("Brinquedos")}</span>
              </div>
              <div className="space-y-2">
                <Label>Itens Médios</Label>
                <Input
                  type="number"
                  min="0"
                  value={quantidades.medios || ""}
                  onChange={(e) => setQuantidades((prev) => ({ ...prev, medios: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  className="text-center text-lg font-semibold"
                />
                <span className="text-xs text-muted-foreground">Estoque: {getEstoqueCategoria("Itens Médios")}</span>
              </div>
              <div className="space-y-2">
                <Label>Itens Grandes</Label>
                <Input
                  type="number"
                  min="0"
                  value={quantidades.grandes || ""}
                  onChange={(e) => setQuantidades((prev) => ({ ...prev, grandes: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  className="text-center text-lg font-semibold"
                />
                <span className="text-xs text-muted-foreground">Estoque: {getEstoqueCategoria("Itens Grandes")}</span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <span className="font-medium">Total de Peças:</span>
              <span className="text-2xl font-bold">{totalPecas}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de Estoque Insuficiente */}
      <AlertDialog open={showAlertaEstoque} onOpenChange={setShowAlertaEstoque}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Estoque Insuficiente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>As seguintes categorias têm estoque menor que a quantidade vendida:</p>
              <ul className="list-disc pl-5 space-y-1">
                {alertasEstoque.map((alerta, i) => (
                  <li key={i} className="text-destructive">{alerta}</li>
                ))}
              </ul>
              <p className="font-medium mt-4">Deseja continuar mesmo assim? (O estoque físico manda)</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowAlertaEstoque(false);
              handleFinalizarVenda(true);
            }}>
              Forçar Venda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
