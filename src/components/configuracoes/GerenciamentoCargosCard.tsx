import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCargos, useCreateCargo, useUpdateCargo, useDeleteCargo, type Cargo } from "@/hooks/useCargos";
import { Plus, Edit2, Trash2, Loader2, Briefcase } from "lucide-react";
import { toast } from "sonner";

const CORES_DISPONIVEIS = [
  { valor: 'bg-blue-600', label: 'Azul' },
  { valor: 'bg-orange-500', label: 'Laranja' },
  { valor: 'bg-green-600', label: 'Verde' },
  { valor: 'bg-purple-500', label: 'Roxo' },
  { valor: 'bg-pink-500', label: 'Rosa' },
  { valor: 'bg-red-600', label: 'Vermelho' },
  { valor: 'bg-yellow-500', label: 'Amarelo' },
  { valor: 'bg-indigo-600', label: 'Índigo' },
  { valor: 'bg-cyan-500', label: 'Ciano' },
  { valor: 'bg-slate-600', label: 'Cinza' },
];

export function GerenciamentoCargosCard() {
  const { data: cargos, isLoading } = useCargos();
  const createCargo = useCreateCargo();
  const updateCargo = useUpdateCargo();
  const deleteCargo = useDeleteCargo();

  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [cargoSelecionado, setCargoSelecionado] = useState<Cargo | null>(null);
  const [cargoParaDeletar, setCargoParaDeletar] = useState<Cargo | null>(null);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cor, setCor] = useState("bg-gray-600");

  const abrirNovoModal = () => {
    setModoEdicao(false);
    setCargoSelecionado(null);
    setNome("");
    setDescricao("");
    setCor("bg-gray-600");
    setModalAberto(true);
  };

  const abrirEditarModal = (cargo: Cargo) => {
    setModoEdicao(true);
    setCargoSelecionado(cargo);
    setNome(cargo.nome);
    setDescricao(cargo.descricao || "");
    setCor(cargo.cor);
    setModalAberto(true);
  };

  const handleSalvar = async () => {
    if (!nome.trim()) {
      toast.error("Nome do cargo é obrigatório");
      return;
    }

    if (modoEdicao && cargoSelecionado) {
      updateCargo.mutate({
        id: cargoSelecionado.id,
        nome,
        descricao: descricao || null,
        cor,
      });
    } else {
      createCargo.mutate({
        nome: nome.trim(),
        descricao: descricao.trim() || "",
        cor,
      });
    }

    setModalAberto(false);
  };

  const handleDeletar = async () => {
    if (!cargoParaDeletar) return;

    deleteCargo.mutate(cargoParaDeletar.id);
    setCargoParaDeletar(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Gerenciamento de Cargos
            </CardTitle>
            <Button
              size="sm"
              onClick={abrirNovoModal}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Novo Cargo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!cargos || cargos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum cargo cadastrado.
            </p>
          ) : (
            <div className="space-y-3">
              {cargos.map((cargo) => (
                <div
                  key={cargo.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Badge className={`${cargo.cor} text-white`}>
                      {cargo.nome}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        {cargo.descricao || "Sem descrição"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirEditarModal(cargo)}
                      title="Editar cargo"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setCargoParaDeletar(cargo)}
                      title="Deletar cargo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para criar/editar cargo */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              {modoEdicao ? "Editar Cargo" : "Novo Cargo"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome do Cargo *</Label>
              <Input
                id="nome"
                placeholder="Ex: Gerente, Vendedor, etc"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={50}
              />
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                placeholder="Ex: Responsável pela gestão de vendas"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                maxLength={200}
              />
            </div>

            <div>
              <Label className="mb-2 block">Cor da Badge</Label>
              <div className="grid grid-cols-5 gap-2">
                {CORES_DISPONIVEIS.map((corOpcao) => (
                  <button
                    key={corOpcao.valor}
                    className={`w-full p-2 rounded border-2 transition-all ${
                      cor === corOpcao.valor
                        ? "border-gray-800"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                    onClick={() => setCor(corOpcao.valor)}
                    title={corOpcao.label}
                  >
                    <div className={`${corOpcao.valor} w-full h-8 rounded flex items-center justify-center text-white text-xs font-semibold`}>
                      {corOpcao.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-900">
                <strong>Pré-visualização:</strong>
              </p>
              <div className="mt-2">
                <Badge className={`${cor} text-white`}>
                  {nome || "Nome do Cargo"}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSalvar}
              disabled={createCargo.isPending || updateCargo.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createCargo.isPending || updateCargo.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              {modoEdicao ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para confirmar deleção */}
      <AlertDialog open={!!cargoParaDeletar} onOpenChange={(open) => !open && setCargoParaDeletar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Tem certeza que deseja deletar este cargo?</p>
              <p className="font-medium">
                <Badge className={`${cargoParaDeletar?.cor} text-white`}>
                  {cargoParaDeletar?.nome}
                </Badge>
              </p>
              <p className="text-sm text-muted-foreground">
                ⚠️ Usuários com este cargo precisarão de um novo cargo antes da exclusão.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletar}
              disabled={deleteCargo.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCargo.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Deletar Cargo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
