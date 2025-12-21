import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useEstoque } from "@/hooks/useEstoque";
import { useFinalizarVenda } from "@/hooks/useVendas";
import { useColaboradoresByFuncao } from "@/hooks/useColaboradores";
import { useCaixa } from "@/contexts/CaixaContext";
import { useUser } from "@/contexts/UserContext";
import { PagamentoInput } from "@/components/vendas/PagamentoInput";
import { ExportarVendasCSV } from "@/components/vendas/ExportarVendasCSV";
import { ShoppingCart, CreditCard, AlertTriangle, Loader2 } from "lucide-react";
// CORREÇÃO 1: Usando o hook padrão do projeto em vez do Sonner (evita crash de Provider)
import { useToast } from "@/hooks/use-toast";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Definição de Tipos Seguros
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
  valor: string;
  bandeira?: string;
}

export default function Vendas() {
  const { toast } = useToast(); // Hook correto
  const { isAdmin } = useUser();
  const { caixaSelecionado } = useCaixa();
  
  // CORREÇÃO 2: Proteção contra dados undefined/null do banco
  const { data: rawEstoque, isLoading: loadingEstoque } = useEstoque();
  const estoque = Array.isArray(rawEstoque) ? rawEstoque : [];

  const { data: rawVendedoras, isLoading: loadingVendedoras } = useColaboradoresByFuncao("Vendedora");
  const vendedoras = Array.isArray(rawVendedoras) ? rawVendedoras : [];

  const { mutate: finalizarVenda, isPending } = useFinalizarVenda();

  const [quantidades, setQuantidades] = useState<Quantidades>({
    baby: 0, infantil: 0, calcados: 0, brinquedos: 0, medios: 0, grandes: 0,
  });

  const [valorTotal, setValorTotal] = useState<string>("");
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([{ metodo: "PIX", valor: "" }]);
  const [vendedoraSelecionada, setVendedoraSelecionada] = useState<string>("");
  const [showAlertaEstoque, setShowAlertaEstoque] = useState(false);
  const [alertasEstoque, setAlertasEstoque] = useState<string[]>([]);

  // Helper seguro para buscar estoque
  const getEstoqueCategoria = (categoria: string): number => {
    if (!estoque.length) return 0;
    return estoque.find((e) => e.categoria === categoria)?.quantidade_atual || 0;
  };

  const totalPecas = Object.values(quantidades).reduce((acc, curr) => acc + (curr || 0), 0);
  const totalPagamentos = pagamentos.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
  const valorTotalNum = parseFloat(valorTotal) || 0;
  const diferenca = valorTotalNum - totalPagamentos;

  const verificarEstoque = (): string[] => {
    if (!estoque.length) return []; // Se não carregou estoque, não bloqueia
    
    const alertas: string[] = [];
    const check = (qtd: number, cat: string) => {
      const atual = getEstoqueCategoria(cat);
      if (qtd > atual) alertas.push(`${cat}: estoque ${atual}, vendendo ${qtd}`);
    };

    check(quantidades.baby, "Roupas Baby");
    check(quantidades.infantil, "Roupas 1 a 16");
    check(quantidades.calcados, "Calçados");
    check(quantidades.brinquedos, "Brinquedos");
    check(quantidades.medios, "Itens Médios");
    check(quantidades.grandes, "Itens Grandes");

    return alertas;
  };

  const handleFinalizarVenda = (forcar = false) => {
    if (totalPecas === 0) {
      toast({ variant: "destructive", title: "Erro", description: "Adicione itens à venda." });
      return;
    }

    if (valorTotalNum <= 0) {
      toast({ variant: "destructive", title: "Erro", description: "Informe o valor total." });
      return;
    }

    // Tolerância para arredondamento (0.05 centavos)
    if (Math.abs(diferenca) > 0.05) {
      toast({ variant: "destructive", title: "Erro", description: "Pagamento não bate com o valor total." });
      return;
    }

    const alertas = verificarEstoque();
    if (alertas.length > 0 && !forcar) {
      setAlertasEstoque(alertas);
      setShowAlertaEstoque(true);
      return;
    }

    finalizarVenda({
      qtd_baby_vendida: quantidades.baby || 0,
      qtd_1_a_16_vendida: quantidades.infantil || 0,
      qtd_calcados_vendida: quantidades.calcados || 0,
      qtd_brinquedos_vendida: quantidades.brinquedos || 0,
      qtd_itens_medios_vendida: quantidades.medios || 0,
      qtd_itens_grandes_vendida: quantidades.grandes || 0,
      valor_total_venda: valorTotalNum,
      pagamentos: pagamentos.map(p => ({ ...p, valor: parseFloat(p.valor) || 0 })),
      vendedora_nome: vendedoraSelecionada || undefined,
      caixa_origem: caixaSelecionado || "Caixa 1",
    }, {
      onSuccess: () => {
        setQuantidades({ baby: 0, infantil: 0, calcados: 0, brinquedos: 0, medios: 0, grandes: 0 });
        setValorTotal("");
        setPagamentos([{ metodo: "PIX", valor: "" }]);
        setVendedoraSelecionada("");
        toast({ title: "Sucesso", description: "Venda registrada!" });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Erro", description: "Falha ao registrar venda." });
      }
    });
  };

  return (
    <MainLayout title="Vendas / Caixa">
      {isAdmin && (
        <div className="flex justify-end mb-4">
          <ExportarVendasCSV />
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD PAGAMENTO */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <CreditCard className="h-5 w-5" /> Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="space-y-2">
              <Label htmlFor="vendedora">Vendedora</Label>
              <Select value={vendedoraSelecionada} onValueChange={setVendedoraSelecionada}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingVendedoras ? "Carregando..." : "Selecione a vendedora"} />
                </SelectTrigger>
                <SelectContent>
                  {/* CORREÇÃO CRÍTICA: Previne crash se lista for vazia */}
                  {!loadingVendedoras && vendedoras.length > 0 ? (
                    vendedoras.map((v) => (
                      <SelectItem key={v.id || Math.random()} value={v.nome || "Sem Nome"}>
                        {v.nome}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-center text-muted-foreground">
                      {loadingVendedoras ? "Carregando..." : "Nenhuma vendedora"}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor-total">Valor Total (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                <Input
                  id="valor-total"
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorTotal}
                  onChange={(e) => setValorTotal(e.target.value)}
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

            <div className="space-y-2 p-4 rounded-lg bg-slate-50 border">
              <div className="flex justify-between text-sm">
                <span>Total Venda:</span>
                <span className="font-semibold">R$ {valorTotalNum.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pagamentos:</span>
                <span className="font-semibold">R$ {totalPagamentos.toFixed(2)}</span>
              </div>
              <Separator className="my-2" />
              <div className={`flex justify-between text-lg font-bold ${Math.abs(diferenca) > 0.05 ? 'text-red-500' : 'text-green-600'}`}>
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
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Processando...</> : "Finalizar Venda"}
            </Button>
          </CardContent>
        </Card>

        {/* CARD ITENS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <ShoppingCart className="h-5 w-5" /> Itens da Venda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Inputs protegidos com fallback || 0 */}
              {[
                { label: "Baby", key: "baby", estoqueCat: "Roupas Baby" },
                { label: "1 a 16", key: "infantil", estoqueCat: "Roupas 1 a 16" },
                { label: "Calçados", key: "calcados", estoqueCat: "Calçados" },
                { label: "Brinquedos", key: "brinquedos", estoqueCat: "Brinquedos" },
                { label: "Médios", key: "medios", estoqueCat: "Itens Médios" },
                { label: "Grandes", key: "grandes", estoqueCat: "Itens Grandes" },
              ].map((item) => (
                <div key={item.key} className="space-y-2">
                  <Label>{item.label}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={quantidades[item.key as keyof Quantidades] || ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setQuantidades(prev => ({ ...prev, [item.key]: isNaN(val) ? 0 : val }));
                    }}
                    placeholder="0"
                    className="text-center text-lg font-semibold"
                  />
                  <span className="text-xs text-muted-foreground">
                    Estoque: {getEstoqueCategoria(item.estoqueCat)}
                  </span>
                </div>
              ))}
            </div>

            <Separator />
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
              <span className="font-medium">Total de Peças:</span>
              <span className="text-2xl font-bold">{totalPecas}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showAlertaEstoque} onOpenChange={setShowAlertaEstoque}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-500">
              <AlertTriangle className="h-5 w-5" /> Estoque Insuficiente
            </AlertDialogTitle>
            <AlertDialogDescription>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                {alertasEstoque.map((a, i) => <li key={i} className="text-red-500">{a}</li>)}
              </ul>
              <p className="mt-4 font-bold">Continuar mesmo assim?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowAlertaEstoque(false); handleFinalizarVenda(true); }}>
              Forçar Venda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
