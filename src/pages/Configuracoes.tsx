import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useColaboradoresByFuncao, useAddColaborador, useDeleteColaborador } from "@/hooks/useColaboradores";
import { Trash2, Plus, Users } from "lucide-react";
import { toast } from "sonner";

function EquipeCard({ 
  titulo, 
  funcao 
}: { 
  titulo: string; 
  funcao: "Vendedora" | "Avaliadora" 
}) {
  const { data: colaboradores, isLoading } = useColaboradoresByFuncao(funcao);
  const addColaborador = useAddColaborador();
  const deleteColaborador = useDeleteColaborador();
  const [novoNome, setNovoNome] = useState("");

  const handleAdd = () => {
    if (!novoNome.trim()) {
      toast.error("Digite um nome válido");
      return;
    }

    addColaborador.mutate(
      { nome: novoNome.trim(), funcao },
      {
        onSuccess: () => {
          toast.success(`${funcao} adicionada!`);
          setNovoNome("");
        },
        onError: (error: any) => {
          toast.error("Erro ao adicionar: " + error.message);
        },
      }
    );
  };

  const handleDelete = (id: string, nome: string) => {
    deleteColaborador.mutate(id, {
      onSuccess: () => {
        toast.success(`${nome} removida`);
      },
      onError: (error: any) => {
        toast.error("Erro ao remover: " + error.message);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de colaboradores */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : colaboradores?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma {funcao.toLowerCase()} cadastrada</p>
          ) : (
            colaboradores?.map((col) => (
              <div key={col.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                <span className="text-sm font-medium">{col.nome}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(col.id, col.nome)}
                  disabled={deleteColaborador.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Adicionar novo */}
        <div className="flex gap-2">
          <Input
            placeholder={`Nome da ${funcao.toLowerCase()}`}
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button 
            onClick={handleAdd} 
            disabled={addColaborador.isPending}
            size="icon"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Configuracoes() {
  return (
    <MainLayout title="Configurações">
      <div className="space-y-6">
        {/* Seção: Gerenciar Equipe */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Gerenciar Equipe</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EquipeCard titulo="Vendedoras" funcao="Vendedora" />
            <EquipeCard titulo="Avaliadoras" funcao="Avaliadora" />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
