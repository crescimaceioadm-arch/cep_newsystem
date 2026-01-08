import { useState } from "react";
import * as React from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Atendimento } from "@/types/database";
import { useSaveAvaliacao, useRecusarAvaliacao } from "@/hooks/useAtendimentos";
import { useColaboradoresByFuncao } from "@/hooks/useColaboradores";
import { toast } from "@/hooks/use-toast";

interface AvaliacaoModalProps {
  atendimento: Atendimento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing?: boolean;
}

// Opções padronizadas para método de pagamento (evita digitação incorreta)
const PAYMENT_METHODS = [
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
  "Vale Presente",
];

export function AvaliacaoModal({ atendimento, open, onOpenChange, isEditing = false }: AvaliacaoModalProps) {
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
    metodo_pagto_1: "",
    valor_pagto_1: 0,
    metodo_pagto_2: "",
    valor_pagto_2: 0,
    metodo_pagto_3: "",
    valor_pagto_3: 0,
  });
  const [avaliadoraSelecionada, setAvaliadoraSelecionada] = useState("");
  const [isRecusando, setIsRecusando] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState<"loja" | "cliente" | "">("");

  // Quando abrir em modo de edição, carrega os dados da avaliação
  React.useEffect(() => {
    if (open && isEditing && atendimento) {
      const pagamento1Metodo = (atendimento as any).metodo_pagto_1 || (atendimento as any).pagamento_1_metodo || "";
      const pagamento1Valor = (atendimento as any).valor_pagto_1 ?? (atendimento as any).pagamento_1_valor ?? 0;
      const pagamento2Metodo = (atendimento as any).metodo_pagto_2 || (atendimento as any).pagamento_2_metodo || "";
      const pagamento2Valor = (atendimento as any).valor_pagto_2 ?? (atendimento as any).pagamento_2_valor ?? 0;
      const pagamento3Metodo = (atendimento as any).metodo_pagto_3 || (atendimento as any).pagamento_3_metodo || "";
      const pagamento3Valor = (atendimento as any).valor_pagto_3 ?? (atendimento as any).pagamento_3_valor ?? 0;

      setFormData({
        qtd_baby: atendimento.qtd_baby || 0,
        qtd_1_a_16: atendimento.qtd_1_a_16 || 0,
        qtd_calcados: atendimento.qtd_calcados || 0,
        qtd_brinquedos: atendimento.qtd_brinquedos || 0,
        qtd_itens_medios: atendimento.qtd_itens_medios || 0,
        qtd_itens_grandes: atendimento.qtd_itens_grandes || 0,
        valor_total_itens_medios: atendimento.valor_total_itens_medios || 0,
        valor_total_itens_grandes: atendimento.valor_total_itens_grandes || 0,
        descricao_itens_extra: atendimento.descricao_itens_extra || "",
        metodo_pagto_1: pagamento1Metodo,
        valor_pagto_1: pagamento1Valor,
        metodo_pagto_2: pagamento2Metodo,
        valor_pagto_2: pagamento2Valor,
        metodo_pagto_3: pagamento3Metodo,
        valor_pagto_3: pagamento3Valor,
      });
      setAvaliadoraSelecionada((atendimento as any).avaliadora_nome || "");
    } else if (open && !isEditing) {
      resetForm();
    }
  }, [open, isEditing, atendimento]);

  const saveAvaliacao = useSaveAvaliacao();
  const recusarAvaliacao = useRecusarAvaliacao();
  
  // Adicionei isLoading para feedback visual se a internet estiver lenta
  const { data: avaliadoras, isLoading } = useColaboradoresByFuncao("Avaliadora");

  const requiresDescription = formData.qtd_itens_grandes > 0 || formData.qtd_itens_medios > 0;
  const isDescriptionValid = !requiresDescription || formData.descricao_itens_extra.trim().length > 0;

  const handleChange = (field: keyof typeof formData, value: number | string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
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
      metodo_pagto_1: "",
      valor_pagto_1: 0,
      metodo_pagto_2: "",
      valor_pagto_2: 0,
      metodo_pagto_3: "",
      valor_pagto_3: 0,
    });
    setAvaliadoraSelecionada("");
    setIsRecusando(false);
    setMotivoRecusa("");
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
        qtd_baby: formData.qtd_baby,
        qtd_1_a_16: formData.qtd_1_a_16,
        qtd_calcados: formData.qtd_calcados,
        qtd_brinquedos: formData.qtd_brinquedos,
        qtd_itens_medios: formData.qtd_itens_medios,
        qtd_itens_grandes: formData.qtd_itens_grandes,
        valor_total_itens_medios: formData.valor_total_itens_medios,
        valor_total_itens_grandes: formData.valor_total_itens_grandes,
        descricao_itens_extra: formData.descricao_itens_extra,
        pagamento_1_metodo: formData.metodo_pagto_1 || null,
        pagamento_1_valor: formData.valor_pagto_1 || null,
        pagamento_2_metodo: formData.metodo_pagto_2 || null,
        pagamento_2_valor: formData.valor_pagto_2 || null,
        pagamento_3_metodo: formData.metodo_pagto_3 || null,
        pagamento_3_valor: formData.valor_pagto_3 || null,
        avaliadora_nome: avaliadoraSelecionada || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "Avaliação salva com sucesso!" });
          onOpenChange(false);
          resetForm();
        },
        onError: (error) => {
          console.error("[AvaliacaoModal] Erro ao salvar avaliação:", error);
          toast({
            title: "Erro ao salvar",
            description: error instanceof Error ? error.message : "Tente novamente.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleRecusar = async () => {
    if (!atendimento) return;

    if (!motivoRecusa) {
      toast({
        title: "Selecione o motivo",
        description: "Escolha o motivo da recusa para continuar.",
        variant: "destructive",
      });
      return;
    }

    recusarAvaliacao.mutate(
      { 
        id: atendimento.id, 
        motivo_recusa: motivoRecusa,
        avaliadora_nome: avaliadoraSelecionada || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "Atendimento recusado." });
          onOpenChange(false);
          resetForm();
        },
        onError: () => {
          toast({
            title: "Erro ao recusar",
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
      <DialogContent className="max-w-lg overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Avaliação: " : "Avaliar: "}{atendimento.nome_cliente}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mb-4">
          <Label htmlFor="avaliadora">Avaliadora</Label>
          <Select value={avaliadoraSelecionada} onValueChange={setAvaliadoraSelecionada} disabled={isEditing}>
            <SelectTrigger disabled={isEditing}>
              <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione a avaliadora"} />
            </SelectTrigger>
            
            {/* CORREÇÃO AQUI: z-index alto para sobrepor o Modal */}
            <SelectContent className="z-[9999] bg-white max-h-[200px]">
              
              {avaliadoras?.map((a) => (
                <SelectItem key={a.id} value={a.nome}>
                  {a.nome}
                </SelectItem>
              ))}

              {/* Feedback se a lista estiver vazia (problema de banco) */}
              {(!avaliadoras || avaliadoras.length === 0) && !isLoading && (
                 <div className="p-2 text-sm text-muted-foreground text-center">
                   Nenhuma avaliadora encontrada
                 </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {!isRecusando ? (
          <>
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

            {isEditing && (
              <>
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold text-sm mb-3">Informações de Pagamento</h3>
                  
                  {/* Pagamento 1 */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-2">
                      <Label htmlFor="metodo_pagto_1">Método Pagamento 1</Label>
                      <Select
                        value={formData.metodo_pagto_1}
                        onValueChange={(v) => handleChange("metodo_pagto_1", v)}
                      >
                        <SelectTrigger id="metodo_pagto_1">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valor_pagto_1">Valor R$</Label>
                      <Input
                        id="valor_pagto_1"
                        type="number"
                        min={0}
                        step={0.01}
                        value={formData.valor_pagto_1}
                        onChange={(e) => handleChange("valor_pagto_1", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {/* Pagamento 2 */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-2">
                      <Label htmlFor="metodo_pagto_2">Método Pagamento 2</Label>
                      <Select
                        value={formData.metodo_pagto_2}
                        onValueChange={(v) => handleChange("metodo_pagto_2", v)}
                      >
                        <SelectTrigger id="metodo_pagto_2">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valor_pagto_2">Valor R$</Label>
                      <Input
                        id="valor_pagto_2"
                        type="number"
                        min={0}
                        step={0.01}
                        value={formData.valor_pagto_2}
                        onChange={(e) => handleChange("valor_pagto_2", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {/* Pagamento 3 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="metodo_pagto_3">Método Pagamento 3</Label>
                      <Select
                        value={formData.metodo_pagto_3}
                        onValueChange={(v) => handleChange("metodo_pagto_3", v)}
                      >
                        <SelectTrigger id="metodo_pagto_3">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valor_pagto_3">Valor R$</Label>
                      <Input
                        id="valor_pagto_3"
                        type="number"
                        min={0}
                        step={0.01}
                        value={formData.valor_pagto_3}
                        onChange={(e) => handleChange("valor_pagto_3", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-between gap-2 pt-4">
              {!isEditing && (
                <Button 
                  variant="destructive" 
                  onClick={() => setIsRecusando(true)}
                >
                  Recusar
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={saveAvaliacao.isPending}>
                  {saveAvaliacao.isPending ? "Salvando..." : isEditing ? "Atualizar Avaliação" : "Salvar Avaliação"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <Label className="text-base font-semibold">Motivo da Recusa *</Label>
              <RadioGroup 
                value={motivoRecusa} 
                onValueChange={(value) => setMotivoRecusa(value as "loja" | "cliente")}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="loja" id="recusa-loja" />
                  <Label htmlFor="recusa-loja" className="cursor-pointer flex-1">
                    <span className="font-medium">Recusado pela Loja</span>
                    <p className="text-sm text-muted-foreground">Peças não aprovadas</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="cliente" id="recusa-cliente" />
                  <Label htmlFor="recusa-cliente" className="cursor-pointer flex-1">
                    <span className="font-medium">Recusado pelo Cliente</span>
                    <p className="text-sm text-muted-foreground">Preço não aceito</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsRecusando(false)}>
                Voltar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleRecusar} 
                disabled={recusarAvaliacao.isPending || !motivoRecusa}
              >
                {recusarAvaliacao.isPending ? "Salvando..." : "Confirmar Recusa"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
