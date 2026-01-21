import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Estoque } from "@/types/database";
import { useAtualizarEstoque } from "@/hooks/useEstoque";
import { useItemCategories } from "@/hooks/useItemCategories";

interface AjusteEstoqueModalProps {
  item: Estoque | null;
  open: boolean;
  onClose: () => void;
}

export function AjusteEstoqueModal({ item, open, onClose }: AjusteEstoqueModalProps) {
  const [novaQuantidade, setNovaQuantidade] = useState<number>(0);
  const { mutate: atualizar, isPending } = useAtualizarEstoque();
  const { data: categorias } = useItemCategories();

  const resolvedCategoria = useMemo(() => {
    if (!item) return { nome: "-", slug: "" };
    const cat = categorias?.find((c) => c.id === item.categoria_id);
    return {
      nome: cat?.nome || item.categoria,
      slug: cat?.slug || item.categoria,
    };
  }, [categorias, item]);

  const handleOpen = () => {
    if (item) {
      setNovaQuantidade(item.quantidade_atual || 0);
    }
  };

  const handleSalvar = () => {
    if (!item) return;
    atualizar(
      { id: item.id, quantidade_atual: novaQuantidade },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={handleOpen}>
        <DialogHeader>
          <DialogTitle>
            Ajuste Manual - {resolvedCategoria.nome}
            {resolvedCategoria.slug && resolvedCategoria.slug !== resolvedCategoria.nome && (
              <span className="ml-2 text-xs text-muted-foreground">({resolvedCategoria.slug})</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Quantidade Atual</Label>
            <p className="text-2xl font-bold text-muted-foreground">{item?.quantidade_atual || 0}</p>
            {item?.categoria_id && (
              <p className="text-xs text-muted-foreground">ID: {item.categoria_id}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nova-quantidade">Nova Quantidade</Label>
            <Input
              id="nova-quantidade"
              type="number"
              min={0}
              value={novaQuantidade}
              onChange={(e) => setNovaQuantidade(parseInt(e.target.value) || 0)}
              className="text-xl font-semibold"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar Ajuste"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
