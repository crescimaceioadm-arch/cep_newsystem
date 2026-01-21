import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useColaboradoresByFuncao, useAddColaborador, useDeleteColaborador } from "@/hooks/useColaboradores";
import { useCaixas } from "@/hooks/useCaixas";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus, Users, Wallet, Save, Shield, LogOut, Tags, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { useCaixa } from "@/contexts/CaixaContext";
import { GestaoUsuariosCard } from "@/components/configuracoes/GestaoUsuariosCard";
import { ReconciliacaoCaixaCard } from "@/components/financeiro/ReconciliacaoCaixaCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useItemCategories, useCreateItemCategory, useUpdateItemCategory } from "@/hooks/useItemCategories";

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

function TrocarCaixaCard() {
  const { data: caixas, isLoading } = useCaixas();
  const { caixaSelecionado, setCaixaSelecionado } = useCaixa();

  const handleTrocarCaixa = (caixaNome: string) => {
    setCaixaSelecionado(caixaNome as "Caixa 1" | "Caixa 2" | "Caixa 3");
    toast.success(`Caixa alterado para "${caixaNome}"`);
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <LogOut className="h-5 w-5 text-blue-600" />
          Trocar de Caixa
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Altere o caixa ativo sem precisar fazer login novamente
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando caixas...</p>
        ) : caixas?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum caixa disponível</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Caixa Atual</Label>
              <div className="p-3 bg-white rounded-lg border border-blue-200">
                <p className="font-semibold text-blue-900">
                  {caixaSelecionado || "Nenhum caixa selecionado"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="caixa-select">Selecione outro caixa:</Label>
              <Select onValueChange={handleTrocarCaixa} value={caixaSelecionado || ""}>
                <SelectTrigger id="caixa-select">
                  <SelectValue placeholder="Escolha um caixa" />
                </SelectTrigger>
                <SelectContent>
                  {caixas?.map((caixa) => (
                    <SelectItem key={caixa.id} value={caixa.nome}>
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        {caixa.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 text-xs text-blue-700 bg-blue-50 p-2 rounded">
              <p>✓ Caixa será salvo e mantido mesmo se você sair da sessão</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ItemCategoriesCard() {
  const { data: categorias, isLoading, isError, error, refetch } = useItemCategories();
  const criarCategoria = useCreateItemCategory();
  const atualizarCategoria = useUpdateItemCategory();
  const [seedAttempted, setSeedAttempted] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { nome: string; requer_valor: boolean }>>({});

  useEffect(() => {
    if (categorias) {
      const initialDrafts: Record<string, { nome: string; requer_valor: boolean }> = {};
      categorias.forEach((cat) => {
        initialDrafts[cat.id] = { nome: cat.nome, requer_valor: cat.requer_valor };
      });
      setDrafts(initialDrafts);
    }
  }, [categorias]);

  useEffect(() => {
    if (isError && error) {
      toast.error(`Erro ao carregar categorias: ${error.message}`);
    }
  }, [isError, error]);

  // Se não houver categorias, tenta popular os padrões para não deixar o card vazio
  useEffect(() => {
    if (!isLoading && !isError && !seedAttempted && (!categorias || categorias.length === 0)) {
      setSeedAttempted(true);
      (async () => {
        const defaults = [
          { slug: "baby", nome: "Baby", tipo: "ambos", ordem: 1, requer_valor: false },
          { slug: "1a16", nome: "1 a 16", tipo: "ambos", ordem: 2, requer_valor: false },
          { slug: "calcados", nome: "Calçados", tipo: "ambos", ordem: 3, requer_valor: false },
          { slug: "brinquedos", nome: "Brinquedos", tipo: "ambos", ordem: 4, requer_valor: false },
          { slug: "itens_medios", nome: "Itens Médios", tipo: "ambos", ordem: 5, requer_valor: true },
          { slug: "itens_grandes", nome: "Itens Grandes", tipo: "ambos", ordem: 6, requer_valor: true },
        ];
        const { error: seedError } = await supabase
          .from("item_categories")
          .upsert(defaults, { onConflict: "slug" });
        if (seedError) {
          toast.error(`Não foi possível carregar categorias: ${seedError.message}`);
        } else {
          toast.success("Categorias padrões carregadas");
          refetch();
        }
      })();
    }
  }, [categorias, isLoading, isError, refetch, seedAttempted]);

  const existingSlugs = useMemo(() => new Set(categorias?.map((c) => c.slug)), [categorias]);

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const handleCreate = () => {
    const nome = novoNome.trim();
    if (!nome) {
      toast.error("Digite um nome válido");
      return;
    }

    const slug = slugify(nome);
    if (!slug) {
      toast.error("Não foi possível gerar o identificador");
      return;
    }

    if (existingSlugs.has(slug)) {
      toast.error("Já existe uma categoria com esse nome");
      return;
    }

    criarCategoria.mutate(
      { nome, slug, tipo: "ambos" },
      {
        onSuccess: () => {
          toast.success("Categoria criada");
          setNovoNome("");
        },
        onError: (error: any) => {
          toast.error("Erro ao criar: " + error.message);
        },
      }
    );
  };

  const handleUpdate = (id: string) => {
    const draft = drafts[id];
    const original = categorias?.find((c) => c.id === id);
    if (!draft || !original) return;

    const updates: Partial<typeof original> = { tipo: "ambos" };
    const nome = draft.nome.trim();
    if (!nome) {
      toast.error("Nome não pode ser vazio");
      return;
    }
    if (nome !== original.nome) updates.nome = nome;
    if (draft.requer_valor !== original.requer_valor) updates.requer_valor = draft.requer_valor;

    if (!Object.keys(updates).length) {
      toast.info("Nenhuma alteração para salvar");
      return;
    }

    atualizarCategoria.mutate(
      { id, updates },
      {
        onSuccess: () => {
          toast.success("Categoria atualizada");
        },
        onError: (error: any) => {
          toast.error("Erro ao atualizar: " + error.message);
        },
      }
    );
  };

  const renderCategoriaLinha = (catId: string) => (
    <div key={catId} className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/40">
      <div className="flex items-center gap-2">
        <Input
          value={drafts[catId]?.nome ?? ""}
          onChange={(e) =>
            setDrafts((prev) => ({
              ...prev,
              [catId]: { ...prev[catId], nome: e.target.value },
            }))
          }
          placeholder="Nome da categoria"
        />
        <Button
          variant="outline"
          size="icon"
          className={drafts[catId]?.requer_valor ? "bg-blue-100" : ""}
          onClick={() =>
            setDrafts((prev) => ({
              ...prev,
              [catId]: { ...prev[catId], requer_valor: !prev[catId]?.requer_valor },
            }))
          }
          title="Marcar se precisa informar valor e descrição"
        >
          <CheckCircle2 className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleUpdate(catId)}
          disabled={atualizarCategoria.isPending}
        >
          <Save className="h-4 w-4 mr-1" />
          Salvar
        </Button>
      </div>
    </div>
  );

  const categoriasUnificadas = categorias || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Tags className="h-5 w-5 text-blue-600" />
          Categorias de Itens
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Renomeie ou crie novas categorias para compras e vendas; o identificador é gerado automaticamente. Clique no ícone azul para indicar categorias que precisam de valor/descrição (como itens grandes e itens médios).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/30">
          <div className="flex flex-col md:flex-row gap-2">
            <Input
              placeholder="Nova categoria"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button onClick={handleCreate} disabled={criarCategoria.isPending}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando categorias...</p>
        ) : isError ? (
          <p className="text-sm text-destructive">Erro ao carregar categorias. Verifique a conexão e tente novamente.</p>
        ) : categoriasUnificadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma categoria disponível</p>
        ) : (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Categorias</h4>
            {categoriasUnificadas.map((cat) => renderCategoriaLinha(cat.id))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Configuracoes() {
  const { isAdmin } = useUser();

  return (
    <MainLayout title="Configurações">
      <div className="space-y-6">
        {/* Seção: Trocar Caixa (para Admin) */}
        {isAdmin && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Gerenciar Caixa</h2>
            </div>
            <TrocarCaixaCard />
          </div>
        )}

        {/* Seção: Controle de Acesso (Apenas Admin) */}
        {isAdmin && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Controle de Acesso</h2>
            </div>
            <GestaoUsuariosCard />
          </div>
        )}

        {/* Seção: Categorias de Itens (Apenas Admin) */}
        {isAdmin && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Tags className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Categorias de Itens</h2>
            </div>
            <ItemCategoriesCard />
          </div>
        )}

        {/* Seção: Reconciliação de Caixa (Apenas Admin) */}
        {isAdmin && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-orange-600" />
              <h2 className="text-xl font-semibold">Manutenção de Caixa</h2>
            </div>
            <ReconciliacaoCaixaCard />
          </div>
        )}

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