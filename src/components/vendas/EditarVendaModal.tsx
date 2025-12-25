import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAtualizarVenda, Venda } from "@/hooks/useVendasHistorico";
import { useColaboradoresByFuncao } from "@/hooks/useColaboradores";
import { useCaixas } from "@/hooks/useCaixas";
import { Pencil } from "lucide-react";

const METODOS_PAGAMENTO = [
  "Dinheiro",
  "PIX",
  "Gira crédito",
  "Débito",
  "Crédito à vista",
  "Crédito 2x",
  "Crédito 3x",
  "Crédito 4x",
  "Crédito 5x",
  "Crédito 6x",
  "Crédito 7x",
  "Crédito 8x",
  "Crédito 9x",
  "Crédito 10x",
];

interface EditarVendaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venda: Venda | null;
}

export function EditarVendaModal({ open, onOpenChange, venda }: EditarVendaModalProps) {
  const { data: vendedoras } = useColaboradoresByFuncao("Vendedora");
  const { data: caixas } = useCaixas();
  const { mutate: atualizarVenda, isPending } = useAtualizarVenda();

  // Estados do formulário - Informações gerais
  const [vendedora, setVendedora] = useState("");
  const [cliente, setCliente] = useState("");
  const [caixaOrigem, setCaixaOrigem] = useState("");

  // Estados - Produtos vendidos
  const [qtdBaby, setQtdBaby] = useState("");
  const [qtdInfantil, setQtdInfantil] = useState("");
  const [qtdCalcados, setQtdCalcados] = useState("");
  const [qtdBrinquedos, setQtdBrinquedos] = useState("");
  const [qtdMedios, setQtdMedios] = useState("");
  const [qtdGrandes, setQtdGrandes] = useState("");

  // Estados - Formas de pagamento
  const [metodoPagto1, setMetodoPagto1] = useState("");
  const [valorPagto1, setValorPagto1] = useState("");
  const [metodoPagto2, setMetodoPagto2] = useState("");
  const [valorPagto2, setValorPagto2] = useState("");
  const [metodoPagto3, setMetodoPagto3] = useState("");
  const [valorPagto3, setValorPagto3] = useState("");

  // Preencher campos ao abrir
  useEffect(() => {
    if (venda && open) {
      // Informações gerais
      setVendedora(venda.vendedora_nome || "");
      setCliente(venda.cliente_nome || "");
      setCaixaOrigem(venda.caixa_origem || "");

      // Produtos
      setQtdBaby(venda.qtd_baby_vendida?.toString() || "0");
      setQtdInfantil(venda.qtd_1_a_16_vendida?.toString() || "0");
      setQtdCalcados(venda.qtd_calcados_vendida?.toString() || "0");
      setQtdBrinquedos(venda.qtd_brinquedos_vendida?.toString() || "0");
      setQtdMedios(venda.qtd_itens_medios_vendida?.toString() || "0");
      setQtdGrandes(venda.qtd_itens_grandes_vendida?.toString() || "0");

      // Formas de pagamento
      setMetodoPagto1(venda.metodo_pagto_1 || "");
      setValorPagto1(venda.valor_pagto_1?.toFixed(2) || "0.00");
      setMetodoPagto2(venda.metodo_pagto_2 || "");
      setValorPagto2(venda.valor_pagto_2?.toFixed(2) || "0.00");
      setMetodoPagto3(venda.metodo_pagto_3 || "");
      setValorPagto3(venda.valor_pagto_3?.toFixed(2) || "0.00");

      console.log("📝 Venda carregada no modal:", {
        produtos: { qtdBaby: venda.qtd_baby_vendida, qtdInfantil: venda.qtd_1_a_16_vendida },
        pagamentos: { metodo1: venda.metodo_pagto_1, valor1: venda.valor_pagto_1, metodo2: venda.metodo_pagto_2, valor2: venda.valor_pagto_2 }
      });
    }
  }, [venda, open]);

  const handleSalvar = () => {
    if (!venda) return;

    // Calcular totais
    const totalItens = (parseFloat(qtdBaby) || 0) + (parseFloat(qtdInfantil) || 0) + 
                       (parseFloat(qtdCalcados) || 0) + (parseFloat(qtdBrinquedos) || 0) + 
                       (parseFloat(qtdMedios) || 0) + (parseFloat(qtdGrandes) || 0);
    
    const valorTotalCalculado = (parseFloat(valorPagto1) || 0) + 
                                (parseFloat(valorPagto2) || 0) + 
                                (parseFloat(valorPagto3) || 0);

    atualizarVenda(
      {
        id: venda.id,
        dados: {
          vendedora_nome: vendedora || null,
          cliente_nome: cliente || null,
          caixa_origem: caixaOrigem || null,
          metodo_pagto_1: metodoPagto1 || null,
          valor_pagto_1: parseFloat(valorPagto1) || 0,
          metodo_pagto_2: metodoPagto2 || null,
          valor_pagto_2: parseFloat(valorPagto2) || 0,
          metodo_pagto_3: metodoPagto3 || null,
          valor_pagto_3: parseFloat(valorPagto3) || 0,
          qtd_baby_vendida: parseFloat(qtdBaby) || 0,
          qtd_1_a_16_vendida: parseFloat(qtdInfantil) || 0,
          qtd_calcados_vendida: parseFloat(qtdCalcados) || 0,
          qtd_brinquedos_vendida: parseFloat(qtdBrinquedos) || 0,
          qtd_itens_medios_vendida: parseFloat(qtdMedios) || 0,
          qtd_itens_grandes_vendida: parseFloat(qtdGrandes) || 0,
          qtd_total_itens: totalItens,
          valor_total_venda: valorTotalCalculado,
        },
        vendaOriginal: venda,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const totalPecas = (parseFloat(qtdBaby) || 0) + (parseFloat(qtdInfantil) || 0) + 
                     (parseFloat(qtdCalcados) || 0) + (parseFloat(qtdBrinquedos) || 0) + 
                     (parseFloat(qtdMedios) || 0) + (parseFloat(qtdGrandes) || 0);
  
  const totalValor = (parseFloat(valorPagto1) || 0) + 
                     (parseFloat(valorPagto2) || 0) + 
                     (parseFloat(valorPagto3) || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Venda
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seção 1: Informações Gerais */}
          <div className="space-y-3 border-b pb-4">
            <h3 className="font-semibold text-sm">Informações Gerais</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Vendedora</Label>
                <Select value={vendedora} onValueChange={setVendedora}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedoras?.map((v) => (
                      <SelectItem key={v.id} value={v.nome}>
                        {v.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>

              <div className="space-y-2">
                <Label>Caixa de Origem</Label>
                <Select value={caixaOrigem} onValueChange={setCaixaOrigem}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {caixas?.map((c) => (
                      <SelectItem key={c.id} value={c.nome}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Seção 2: Produtos Vendidos */}
          <div className="space-y-3 border-b pb-4">
            <h3 className="font-semibold text-sm">Produtos Vendidos</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Baby</Label>
                <Input
                  type="number"
                  min="0"
                  value={qtdBaby}
                  onChange={(e) => setQtdBaby(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Infantil (1-16)</Label>
                <Input
                  type="number"
                  min="0"
                  value={qtdInfantil}
                  onChange={(e) => setQtdInfantil(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Calçados</Label>
                <Input
                  type="number"
                  min="0"
                  value={qtdCalcados}
                  onChange={(e) => setQtdCalcados(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Brinquedos</Label>
                <Input
                  type="number"
                  min="0"
                  value={qtdBrinquedos}
                  onChange={(e) => setQtdBrinquedos(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Médios</Label>
                <Input
                  type="number"
                  min="0"
                  value={qtdMedios}
                  onChange={(e) => setQtdMedios(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Grandes</Label>
                <Input
                  type="number"
                  min="0"
                  value={qtdGrandes}
                  onChange={(e) => setQtdGrandes(e.target.value)}
                />
              </div>
            </div>
            <div className="bg-blue-50 p-2 rounded text-sm">
              <strong>Total de Peças:</strong> {totalPecas}
            </div>
          </div>

          {/* Seção 3: Formas de Pagamento */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Formas de Pagamento</h3>
            
            {/* Pagamento 1 */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded">
              <div className="space-y-2">
                <Label>Método 1</Label>
                <Select value={metodoPagto1} onValueChange={setMetodoPagto1}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {METODOS_PAGAMENTO.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorPagto1}
                  onChange={(e) => setValorPagto1(e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value) {
                      setValorPagto1(parseFloat(e.target.value).toFixed(2));
                    }
                  }}
                />
              </div>
            </div>

            {/* Pagamento 2 (opcional) */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded">
              <div className="space-y-2">
                <Label>Método 2 (opcional)</Label>
                <Select value={metodoPagto2} onValueChange={setMetodoPagto2}>
                  <SelectTrigger disabled={!metodoPagto1}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {METODOS_PAGAMENTO.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!metodoPagto2}
                  value={valorPagto2}
                  onChange={(e) => setValorPagto2(e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value) {
                      setValorPagto2(parseFloat(e.target.value).toFixed(2));
                    }
                  }}
                />
              </div>
            </div>

            {/* Pagamento 3 (opcional) */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded">
              <div className="space-y-2">
                <Label>Método 3 (opcional)</Label>
                <Select value={metodoPagto3} onValueChange={setMetodoPagto3}>
                  <SelectTrigger disabled={!metodoPagto2}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {METODOS_PAGAMENTO.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!metodoPagto3}
                  value={valorPagto3}
                  onChange={(e) => setValorPagto3(e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value) {
                      setValorPagto3(parseFloat(e.target.value).toFixed(2));
                    }
                  }}
                />
              </div>
            </div>

            <div className="bg-green-50 p-2 rounded text-sm">
              <strong>Valor Total:</strong> R$ {totalValor.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
