import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useColaboradoresByFuncao, useAddColaborador, useDeleteColaborador } from "@/hooks/useColaboradores";
import { useCaixas } from "@/hooks/useCaixas";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus, Users, Wallet, Save, Shield, Tags, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { useCaixa } from "@/contexts/CaixaContext";
import { GestaoUsuariosCard } from "@/components/configuracoes/GestaoUsuariosCard";
import { ControlePerfisMenuCard } from "@/components/configuracoes/ControlePerfisMenuCard";
import { ControlePermissoesUsuarioCard } from "@/components/configuracoes/ControlePermissoesUsuarioCard";
import { GerenciamentoCargosCard } from "@/components/configuracoes/GerenciamentoCargosCard";
import { ReconciliacaoCaixaCard } from "@/components/financeiro/ReconciliacaoCaixaCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useItemCategories, useCreateItemCategory, useUpdateItemCategory } from "@/hooks/useItemCategories";
import { useTiposItensGrandes, useCreateTipoItemGrande, useUpdateTipoItemGrande, useDeleteTipoItemGrande } from "@/hooks/useTiposItensGrandes";
import { useMarcasItensGrandes, useCreateMarcaItemGrande, useUpdateMarcaItemGrande, useDeleteMarcaItemGrande } from "@/hooks/useMarcasItensGrandes";

function EquipeSection({ 
  funcao 
}: { 
  funcao: "Vendedora" | "Avaliadora" | "Marketing"
}) {
  const { data: colaboradores, isLoading } = useColaboradoresByFuncao(funcao as any);
  const addColaborador = useAddColaborador();
  const deleteColaborador = useDeleteColaborador();
  const [novoNome, setNovoNome] = useState("");

  const funcaoLabel = funcao === "Marketing" ? "membro da equipe" : funcao.toLowerCase();

  const handleAdd = () => {
    if (!novoNome.trim()) {
      toast.error("Digite um nome válido");
      return;
    }

    addColaborador.mutate(
      { nome: novoNome.trim(), funcao: funcao as any },
      {
        onSuccess: () => {
          toast.success(`${funcao === "Marketing" ? "Membro" : funcao} adicionado(a)!`);
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
        toast.success(`${nome} removido(a)`);
      },
      onError: (error: any) => {
        toast.error("Erro ao remover: " + error.message);
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Lista de colaboradores */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : colaboradores?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum(a) {funcaoLabel} cadastrado(a)</p>
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
          placeholder={`Nome ${funcao === "Marketing" ? "do membro" : "da " + funcaoLabel}`}
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
    </div>
  );
}

function TrocarCaixaSection() {
  const { data: caixas, isLoading } = useCaixas();
  const { caixaSelecionado, setCaixaSelecionado } = useCaixa();

  const handleTrocarCaixa = (caixaNome: string) => {
    setCaixaSelecionado(caixaNome as "Caixa 1" | "Caixa 2" | "Caixa 3");
    toast.success(`Caixa alterado para "${caixaNome}"`);
  };

  return (
    <div className="space-y-4">
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
    </div>
  );
}

function ItemCategoriesSection() {
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

  const handleCreate = () => {
    const nome = novoNome.trim();
    if (!nome) {
      toast.error("Digite um nome válido");
      return;
    }

    criarCategoria.mutate(
      { nome, tipo: "ambos" },
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
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Renomeie ou crie novas categorias para compras e vendas; o identificador é gerado automaticamente. Clique no ícone azul para indicar categorias que precisam de valor/descrição.
      </p>
      
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
          {categoriasUnificadas.map((cat) => renderCategoriaLinha(cat.id))}
        </div>
      )}
    </div>
  );
}

// Seção de Tipos de Itens Grandes
function TiposItensGrandesSection() {
  const { data: tipos, isLoading } = useTiposItensGrandes();
  const criarTipo = useCreateTipoItemGrande();
  const atualizarTipo = useUpdateTipoItemGrande();
  const deletarTipo = useDeleteTipoItemGrande();
  const [novoTipo, setNovoTipo] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEdit, setNomeEdit] = useState("");

  const handleCriar = () => {
    if (!novoTipo.trim()) {
      toast.error("Digite um nome válido");
      return;
    }
    criarTipo.mutate(
      { nome: novoTipo.trim() },
      {
        onSuccess: () => {
          toast.success("Tipo criado");
          setNovoTipo("");
        },
        onError: (error: any) => toast.error("Erro: " + error.message),
      }
    );
  };

  const handleAtualizar = (id: string) => {
    if (!nomeEdit.trim()) {
      toast.error("Nome não pode ser vazio");
      return;
    }
    atualizarTipo.mutate(
      { id, dados: { nome: nomeEdit.trim() } },
      {
        onSuccess: () => {
          toast.success("Tipo atualizado");
          setEditandoId(null);
        },
        onError: (error: any) => toast.error("Erro: " + error.message),
      }
    );
  };

  const handleDeletar = (id: string, nome: string) => {
    if (!confirm(`Excluir tipo "${nome}"?`)) return;
    deletarTipo.mutate(id, {
      onSuccess: () => toast.success("Tipo excluído"),
      onError: (error: any) => toast.error("Erro: " + error.message),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Novo tipo (ex: Carrinho de Bebê)"
          value={novoTipo}
          onChange={(e) => setNovoTipo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCriar()}
        />
        <Button onClick={handleCriar} disabled={criarTipo.isPending}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : tipos?.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum tipo cadastrado</p>
      ) : (
        <div className="space-y-2">
          {tipos?.map((tipo) => (
            <div key={tipo.id} className="flex items-center gap-2 p-2 border rounded">
              {editandoId === tipo.id ? (
                <>
                  <Input
                    value={nomeEdit}
                    onChange={(e) => setNomeEdit(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAtualizar(tipo.id)}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={() => handleAtualizar(tipo.id)}>
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditandoId(null)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-medium">{tipo.nome}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditandoId(tipo.id);
                      setNomeEdit(tipo.nome);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handleDeletar(tipo.id, tipo.nome)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Seção de Marcas de Itens Grandes
function MarcasItensGrandesSection() {
  const { data: marcas, isLoading } = useMarcasItensGrandes();
  const criarMarca = useCreateMarcaItemGrande();
  const atualizarMarca = useUpdateMarcaItemGrande();
  const deletarMarca = useDeleteMarcaItemGrande();
  const [novaMarca, setNovaMarca] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEdit, setNomeEdit] = useState("");

  const handleCriar = () => {
    if (!novaMarca.trim()) {
      toast.error("Digite um nome válido");
      return;
    }
    criarMarca.mutate(
      { nome: novaMarca.trim() },
      {
        onSuccess: () => {
          toast.success("Marca criada");
          setNovaMarca("");
        },
        onError: (error: any) => toast.error("Erro: " + error.message),
      }
    );
  };

  const handleAtualizar = (id: string) => {
    if (!nomeEdit.trim()) {
      toast.error("Nome não pode ser vazio");
      return;
    }
    atualizarMarca.mutate(
      { id, dados: { nome: nomeEdit.trim() } },
      {
        onSuccess: () => {
          toast.success("Marca atualizada");
          setEditandoId(null);
        },
        onError: (error: any) => toast.error("Erro: " + error.message),
      }
    );
  };

  const handleDeletar = (id: string, nome: string) => {
    if (!confirm(`Excluir marca "${nome}"?`)) return;
    deletarMarca.mutate(id, {
      onSuccess: () => toast.success("Marca excluída"),
      onError: (error: any) => toast.error("Erro: " + error.message),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Nova marca (ex: Burigotto)"
          value={novaMarca}
          onChange={(e) => setNovaMarca(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCriar()}
        />
        <Button onClick={handleCriar} disabled={criarMarca.isPending}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : marcas?.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma marca cadastrada</p>
      ) : (
        <div className="space-y-2">
          {marcas?.map((marca) => (
            <div key={marca.id} className="flex items-center gap-2 p-2 border rounded">
              {editandoId === marca.id ? (
                <>
                  <Input
                    value={nomeEdit}
                    onChange={(e) => setNomeEdit(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAtualizar(marca.id)}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={() => handleAtualizar(marca.id)}>
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditandoId(null)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-medium">{marca.nome}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditandoId(marca.id);
                      setNomeEdit(marca.nome);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handleDeletar(marca.id, marca.nome)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Configuracoes() {
  const { isAdmin } = useUser();

  return (
    <MainLayout title="Configurações">
      <Accordion type="multiple" className="space-y-4">
        {/* Admin: Trocar Caixa */}
        {isAdmin && (
          <AccordionItem value="trocar-caixa" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-600" />
                <span className="text-lg font-semibold">Trocar de Caixa</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <TrocarCaixaSection />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Admin: Controle de Acesso */}
        {isAdmin && (
          <AccordionItem value="controle-acesso" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span className="text-lg font-semibold">Controle de Acesso</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              <GestaoUsuariosCard />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Admin: Gerenciamento de Cargos */}
        {isAdmin && (
          <AccordionItem value="gerenciamento-cargos" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600" />
                <span className="text-lg font-semibold">Gerenciamento de Cargos</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <GerenciamentoCargosCard />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Admin: Controle de Menus por Perfil */}
        {isAdmin && (
          <AccordionItem value="controle-menus" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                <span className="text-lg font-semibold">Permissões de Menus</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <ControlePerfisMenuCard />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Admin: Controle de Permissões por Usuário */}
        {isAdmin && (
          <AccordionItem value="permissoes-usuario" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-600" />
                <span className="text-lg font-semibold">Permissões por Usuário</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <ControlePermissoesUsuarioCard />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Admin: Categorias de Itens */}
        {isAdmin && (
          <AccordionItem value="categorias" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-blue-600" />
                <span className="text-lg font-semibold">Categorias de Itens</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <ItemCategoriesSection />
            </AccordionContent>
          </AccordionItem>
        )}
        {/* Tipos de Itens Grandes */}
        {isAdmin && (
          <AccordionItem value="tipos-itens-grandes" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-blue-600" />
                <span className="text-lg font-semibold">Tipos de Itens Grandes</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <TiposItensGrandesSection />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Marcas de Itens Grandes */}
        {isAdmin && (
          <AccordionItem value="marcas-itens-grandes" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-green-600" />
                <span className="text-lg font-semibold">Marcas de Itens Grandes</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <MarcasItensGrandesSection />
            </AccordionContent>
          </AccordionItem>
        )}
        {/* Admin: Reconciliação */}
        {isAdmin && (
          <AccordionItem value="reconciliacao" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-orange-600" />
                <span className="text-lg font-semibold">Manutenção de Caixa</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <ReconciliacaoCaixaCard />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Gerenciar Equipe */}
        <AccordionItem value="equipe" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="text-lg font-semibold">Gerenciar Equipe</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-semibold mb-3">Vendedoras</h3>
                <EquipeSection funcao="Vendedora" />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-3">Avaliadoras</h3>
                <EquipeSection funcao="Avaliadora" />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-3">Equipe de Marketing</h3>
                <EquipeSection funcao="Marketing" />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </MainLayout>
  );
}
