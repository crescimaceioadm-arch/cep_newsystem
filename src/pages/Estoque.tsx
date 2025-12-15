import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEstoque } from "@/hooks/useEstoque";
import { AjusteEstoqueModal } from "@/components/estoque/AjusteEstoqueModal";
import { Estoque as EstoqueType } from "@/types/database";
import { Package, Baby, Shirt, Footprints, Gamepad2, Sofa, Archive, Pencil } from "lucide-react";

const CATEGORIA_ICONS: Record<string, React.ReactNode> = {
  "Baby": <Baby className="h-8 w-8" />,
  "1 a 16": <Shirt className="h-8 w-8" />,
  "Calçados": <Footprints className="h-8 w-8" />,
  "Brinquedos": <Gamepad2 className="h-8 w-8" />,
  "Itens Médios": <Sofa className="h-8 w-8" />,
  "Itens Grandes": <Archive className="h-8 w-8" />,
};

const CATEGORIA_COLORS: Record<string, string> = {
  "Baby": "bg-pink-100 text-pink-700 border-pink-200",
  "1 a 16": "bg-blue-100 text-blue-700 border-blue-200",
  "Calçados": "bg-amber-100 text-amber-700 border-amber-200",
  "Brinquedos": "bg-green-100 text-green-700 border-green-200",
  "Itens Médios": "bg-purple-100 text-purple-700 border-purple-200",
  "Itens Grandes": "bg-indigo-100 text-indigo-700 border-indigo-200",
};

export default function Estoque() {
  const { data: estoque, isLoading } = useEstoque();
  const [itemSelecionado, setItemSelecionado] = useState<EstoqueType | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const abrirAjuste = (item: EstoqueType) => {
    setItemSelecionado(item);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setItemSelecionado(null);
  };

  if (isLoading) {
    return (
      <MainLayout title="Estoque">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Estoque">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {estoque?.map((item) => (
          <Card 
            key={item.id} 
            className={`border-2 ${CATEGORIA_COLORS[item.categoria] || 'bg-card'}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background/50">
                    {CATEGORIA_ICONS[item.categoria] || <Package className="h-8 w-8" />}
                  </div>
                  <CardTitle className="text-lg">{item.categoria}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm opacity-70 mb-1">Quantidade Atual</p>
                  <p className="text-5xl font-bold">{item.quantidade_atual}</p>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => abrirAjuste(item)}
                  className="gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Ajuste Manual
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AjusteEstoqueModal
        item={itemSelecionado}
        open={modalAberto}
        onClose={fecharModal}
      />
    </MainLayout>
  );
}
