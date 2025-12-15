import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Atendimento } from "@/types/database";
import { useSaveAvaliacao } from "@/hooks/useAtendimentos";
import { useColaboradoresByFuncao } from "@/hooks/useColaboradores";
import { toast } from "@/hooks/use-toast";

interface AvaliacaoModalProps {
  atendimento: Atendimento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AvaliacaoModal({ atendimento, open, onOpenChange }: AvaliacaoModalProps) {
  const [formData, setFormData] = useState({
    qtd_baby: 0,
    qtd_1_a_16: 0,
    qtd_calcados: 0,
    qtd_brinquedos: 0,
    qtd_itens_medios: 0,
    qtd_itens_grandes: 0,
    valor_total_itens_medios: 0,
    valor_total_itens_grandes: 0,
    descricao_itens_extra: "",
  });
  const [avaliadoraSelecionada, setAvaliadoraSelecionada] = useState("");

  const saveAvaliacao = useSaveAvaliacao();
  const { data: avaliadoras } = useColaboradoresByFuncao("Avaliadora");

  const requiresDescription = formData.qtd_itens_grandes > 0 || formData.qtd_itens_medios > 0;
  const isDescriptionValid = !requiresDescription || formData.descricao_itens_extra.trim().length > 0;

  const handleChange = (field: keyof typeof formData, value: number | string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!atendimento) return;

    if (!isDescriptionValid) {
      toast({
        title: "Campo obrigatório",
        description: "Descreva os itens grandes/médios.",
        variant: "destructive",
      });
      return;
    }

    saveAvaliacao.mutate(
      { 
        id: atendimento.id, 
        ...formData,
        avaliadora_nome: avaliadoraSelecionada || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "Avaliação salva com sucesso!" });
          onOpenChange(false);
          setFormData({
            qtd_baby: 0,
            qtd_1_a_16: 0,
            qtd_calcados: 0,
            qtd_brinquedos: 0,
            qtd_itens_medios: 0,
            qtd_itens_grandes: 0,
            valor_total_itens_medios: 0,
            valor_total_itens_grandes: 0,
            descricao_itens_extra: "",
          });
          setAvaliadoraSelecionada("");
        },
        onError: () => {
          toast({
            title: "Erro ao salvar",
            description: "Tente novamente.",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (!atendimento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Avaliar: {atendimento.nome_cliente}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mb-4">
          <Label htmlFor="avaliadora">Avaliadora</Label>
          <Select value={avaliadoraSelecionada} onValueChange={setAvaliadoraSelecionada}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a avaliadora" />
            </SelectTrigger>
            <SelectContent>
              {avaliadoras?.map((a) => (
                <SelectItem key={a.id} value={a.nome}>
                  {a.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="qtd_baby">Baby</Label>
            <Input
              id="qtd_baby"
              type="number"
              min={0}
              value={formData.qtd_baby}
              onChange={(e) => handleChange("qtd_baby", parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qtd_1_a_16">1 a 16 anos</Label>
            <Input
              id="qtd_1_a_16"
              type="number"
              min={0}
              value={formData.qtd_1_a_16}
              onChange={(e) => handleChange("qtd_1_a_16", parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qtd_calcados">Calçados</Label>
            <Input
              id="qtd_calcados"
              type="number"
              min={0}
              value={formData.qtd_calcados}
              onChange={(e) => handleChange("qtd_calcados", parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qtd_brinquedos">Brinquedos</Label>
            <Input
              id="qtd_brinquedos"
              type="number"
              min={0}
              value={formData.qtd_brinquedos}
              onChange={(e) => handleChange("qtd_brinquedos", parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qtd_itens_medios">Itens Médios</Label>
            <Input
              id="qtd_itens_medios"
              type="number"
              min={0}
              value={formData.qtd_itens_medios}
              onChange={(e) => handleChange("qtd_itens_medios", parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qtd_itens_grandes">Itens Grandes</Label>
            <Input
              id="qtd_itens_grandes"
              type="number"
              min={0}
              value={formData.qtd_itens_grandes}
              onChange={(e) => handleChange("qtd_itens_grandes", parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        {formData.qtd_itens_medios > 0 && (
          <div className="space-y-2">
            <Label htmlFor="valor_total_itens_medios">Valor Total Ofertado (Médios) R$</Label>
            <Input
              id="valor_total_itens_medios"
              type="number"
              min={0}
              step={0.01}
              value={formData.valor_total_itens_medios}
              onChange={(e) => handleChange("valor_total_itens_medios", parseFloat(e.target.value) || 0)}
            />
          </div>
        )}

        {formData.qtd_itens_grandes > 0 && (
          <div className="space-y-2">
            <Label htmlFor="valor_total_itens_grandes">Valor Total Ofertado (Grandes) R$</Label>
            <Input
              id="valor_total_itens_grandes"
              type="number"
              min={0}
              step={0.01}
              value={formData.valor_total_itens_grandes}
              onChange={(e) => handleChange("valor_total_itens_grandes", parseFloat(e.target.value) || 0)}
            />
          </div>
        )}

        {requiresDescription && (
          <div className="space-y-2">
            <Label htmlFor="descricao_itens_extra" className="text-destructive">
              Descrição dos Itens Grandes/Médios *
            </Label>
            <Textarea
              id="descricao_itens_extra"
              placeholder="Descreva os itens grandes ou médios..."
              value={formData.descricao_itens_extra}
              onChange={(e) => handleChange("descricao_itens_extra", e.target.value)}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saveAvaliacao.isPending}>
            {saveAvaliacao.isPending ? "Salvando..." : "Salvar Avaliação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
