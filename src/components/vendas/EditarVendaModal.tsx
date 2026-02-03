import { useState, useEffect, useMemo } from "react";
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
import { useItemCategories } from "@/hooks/useItemCategories";
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
  const { data: categorias } = useItemCategories();
  const { mutate: atualizarVenda, isPending } = useAtualizarVenda();

  const categoriasVenda = useMemo(
    () => (categorias || []).filter((c) => c.ativo !== false && (c.tipo === "venda" || c.tipo === "ambos")),
    [categorias]
  );

  // Estados do formulário - Informações gerais
  const [vendedora, setVendedora] = useState("");
  const [cliente, setCliente] = useState("");
  const [caixaOrigem, setCaixaOrigem] = useState("");

  // Estados - Produtos vendidos (dinâmico por categoria)
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});

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

      // Produtos (pivot + fallback legados por slug)
      const initial: Record<string, number> = {};
      categoriasVenda.forEach((cat) => {
        const pivot = venda.itens?.find((i) => i.categoria_id === cat.id);
        let qtd = pivot?.quantidade ?? 0;
        if (qtd === 0 || Number.isNaN(qtd)) {
          switch (cat.slug) {
            case "baby":
              qtd = venda.qtd_baby_vendida || 0;
              break;
            case "1a16":
              qtd = venda.qtd_1_a_16_vendida || 0;
              break;
            case "calcados":
              qtd = venda.qtd_calcados_vendida || 0;
              break;
            case "brinquedos":
              qtd = venda.qtd_brinquedos_vendida || 0;
              break;
            case "itens_medios":
              qtd = venda.qtd_itens_medios_vendida || 0;
              break;
            case "itens_grandes":
              qtd = venda.qtd_itens_grandes_vendida || 0;
              break;
            default:
              qtd = 0;
          }
        }
        initial[cat.id] = qtd || 0;
      });
      setQuantidades(initial);

      // Formas de pagamento
      setMetodoPagto1(venda.metodo_pagto_1 || "");
      setValorPagto1(venda.valor_pagto_1?.toFixed(2) || "0.00");
      setMetodoPagto2(venda.metodo_pagto_2 || "");
      setValorPagto2(venda.valor_pagto_2?.toFixed(2) || "0.00");
      setMetodoPagto3(venda.metodo_pagto_3 || "");
      setValorPagto3(venda.valor_pagto_3?.toFixed(2) || "0.00");
    }
  }, [venda, open, categoriasVenda]);

  const handleSalvar = () => {
    if (!venda) return;

    const valorTotalCalculado = (parseFloat(valorPagto1) || 0) +
      (parseFloat(valorPagto2) || 0) +
      (parseFloat(valorPagto3) || 0);

    const basePayload = {
      qtd_baby_vendida: 0,
      qtd_1_a_16_vendida: 0,
      qtd_calcados_vendida: 0,
      qtd_brinquedos_vendida: 0,
      qtd_itens_medios_vendida: 0,
      qtd_itens_grandes_vendida: 0,
    };
    const itensExtras: Array<{ categoria_id: string; quantidade: number }> = [];

    categoriasVenda.forEach((cat) => {
      const qtd = quantidades[cat.id] || 0;
      if (qtd <= 0) return;
      switch (cat.slug) {
        case "baby":
          basePayload.qtd_baby_vendida = qtd;
          break;
        case "1a16":
          basePayload.qtd_1_a_16_vendida = qtd;
          break;
        case "calcados":
          basePayload.qtd_calcados_vendida = qtd;
          break;
        case "brinquedos":
          basePayload.qtd_brinquedos_vendida = qtd;
          break;
        case "itens_medios":
          basePayload.qtd_itens_medios_vendida = qtd;
          break;
        case "itens_grandes":
          basePayload.qtd_itens_grandes_vendida = qtd;
          break;
        default:
          itensExtras.push({ categoria_id: cat.id, quantidade: qtd });
      }
    });

    const totalItens = Object.values(quantidades).reduce((sum, v) => sum + (v || 0), 0);

    console.log('[EditarVendaModal] itensExtras:', itensExtras);
    console.log('[EditarVendaModal] basePayload:', basePayload);
    console.log('[EditarVendaModal] quantidades:', quantidades);

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
          ...basePayload,
          itens: itensExtras,
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

  const totalPecas = Object.values(quantidades).reduce((acc, curr) => acc + (curr || 0), 0);
  
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
            {categoriasVenda.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cadastre categorias de venda em Configurações.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {categoriasVenda.map((cat) => (
                  <div key={cat.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>{cat.nome}</Label>
                      <span className="text-[11px] text-muted-foreground uppercase">{cat.slug}</span>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={quantidades[cat.id] ?? ""}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setQuantidades((prev) => ({ ...prev, [cat.id]: Number.isNaN(val) ? 0 : val }));
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
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
