import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useColaboradoresByFuncao, useAddColaborador, useDeleteColaborador } from "@/hooks/useColaboradores";
import { useCaixas } from "@/hooks/useCaixas";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus, Users, Wallet, Save } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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

function SaldosCaixasCard() {
  const { data: caixas, isLoading } = useCaixas();
  const queryClient = useQueryClient();
  const [saldos, setSaldos] = useState<Record<string, number>>({});
  const [salvando, setSalvando] = useState<string | null>(null);

  useEffect(() => {
    if (caixas) {
      const saldosIniciais: Record<string, number> = {};
      caixas.forEach((caixa) => {
        saldosIniciais[caixa.id] = caixa.saldo_atual;
      });
      setSaldos(saldosIniciais);
    }
  }, [caixas]);

  const handleUpdateSaldo = async (id: string, nome: string) => {
    const novoSaldo = saldos[id];
    if (novoSaldo === undefined || novoSaldo < 0) {
      toast.error("Valor inválido");
      return;
    }

    setSalvando(id);
    try {
      const { error } = await supabase
        .from("caixas")
        .update({ saldo_atual: novoSaldo })
        .eq("id", id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["caixas"] });
      toast.success(`Saldo de "${nome}" atualizado com sucesso!`);
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    } finally {
      setSalvando(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Saldos Iniciais dos Caixas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : caixas?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum caixa cadastrado</p>
        ) : (
          caixas?.map((caixa) => (
            <div key={caixa.id} className="flex items-center gap-3">
              <Label className="w-24 text-sm font-medium">{caixa.nome}</Label>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-muted-foreground">R$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={saldos[caixa.id] ?? 0}
                  onChange={(e) =>
                    setSaldos((prev) => ({
                      ...prev,
                      [caixa.id]: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-32"
                />
              </div>
              <Button
                size="sm"
                onClick={() => handleUpdateSaldo(caixa.id, caixa.nome)}
                disabled={salvando === caixa.id}
              >
                <Save className="h-4 w-4 mr-1" />
                {salvando === caixa.id ? "Salvando..." : "Atualizar"}
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function Configuracoes() {
  return (
    <MainLayout title="Configurações">
      <div className="space-y-6">
        {/* Seção: Saldos dos Caixas */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Saldos Iniciais dos Caixas</h2>
          </div>
          <SaldosCaixasCard />
        </div>

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