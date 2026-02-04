import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Save } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { usePermissoesUsuario, useSalvarPermissoesLote, TipoPermissao } from "@/hooks/usePermissoesUsuario";
import { Separator } from "@/components/ui/separator";
import { UserRole } from "@/contexts/UserContext";

interface Usuario {
  id: string;
  email: string;
  nome?: string;
  cargo: UserRole;
}

// Definição das permissões disponíveis
const PERMISSOES_DISPONIVEIS: {
  categoria: string;
  itens: { id: TipoPermissao; label: string }[];
}[] = [
  {
    categoria: "Menus",
    itens: [
      { id: "menu:/recepcao", label: "Recepção" },
      { id: "menu:/recepcao/clientes", label: "Recepção > Clientes" },
      { id: "menu:/vendas", label: "Vendas" },
      { id: "menu:/vendas/historico", label: "Histórico de Vendas" },
      { id: "menu:/avaliacao", label: "Avaliação" },
      { id: "menu:/atendimentos/historico", label: "Histórico de Atendimentos" },
      { id: "menu:/financeiro", label: "Financeiro" },
      { id: "menu:/estoque", label: "Estoque" },
      { id: "menu:/dashboard", label: "Dashboard" },
      { id: "menu:/configuracoes", label: "Configurações" },
      { id: "menu:/marketing", label: "Marketing" },
      { id: "menu:/performance-vendas", label: "Performance de Vendas" },
      { id: "menu:/logs-atividades", label: "Logs de Atividades" },
    ],
  },
  {
    categoria: "Ações",
    itens: [
      { id: "action:editar_venda", label: "Editar vendas" },
      { id: "action:deletar_venda", label: "Deletar vendas" },
      { id: "action:editar_avaliacao", label: "Editar avaliações" },
      { id: "action:deletar_avaliacao", label: "Deletar avaliações" },
    ],
  },
  {
    categoria: "Financeiro",
    itens: [
      { id: "financeiro:aprovacoes", label: "Aprovações de fechamentos" },
      { id: "financeiro:relatorio", label: "Relatórios financeiros" },
      { id: "financeiro:movimentacoes", label: "Movimentações de caixa" },
    ],
  },
  {
    categoria: "Exportações",
    itens: [
      { id: "export:csv_vendas", label: "Exportar vendas (CSV)" },
      { id: "export:csv_cartoes", label: "Exportar cartões (CSV)" },
      { id: "export:csv_atendimentos", label: "Exportar atendimentos (CSV)" },
    ],
  },
];

export function ControlePermissoesUsuarioCard() {
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<string>("");
  const [permissoesEditadas, setPermissoesEditadas] = useState<
    Map<TipoPermissao, boolean>
  >(new Map());

  // Buscar todos os usuários
  const { data: usuarios = [], isLoading: loadingUsuarios } = useQuery({
    queryKey: ["usuarios-todos-permissoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, nome, cargo")
        .order("nome");
      
      if (error) throw error;
      return data as Usuario[];
    },
  });

  const { data: permissoesAtuais, isLoading: loadingPermissoes } = usePermissoesUsuario(
    usuarioSelecionado || undefined
  );
  const salvarPermissoes = useSalvarPermissoesLote();

  // Quando o usuário é selecionado, carregar suas permissões
  const handleUsuarioChange = (userId: string) => {
    setUsuarioSelecionado(userId);
    setPermissoesEditadas(new Map());
  };

  // Verificar se uma permissão está concedida
  const isPermissaoConcedida = (permissao: TipoPermissao): boolean => {
    // Se foi editada localmente, usar o valor local
    if (permissoesEditadas.has(permissao)) {
      return permissoesEditadas.get(permissao)!;
    }

    // Caso contrário, verificar nas permissões salvas
    const permissaoSalva = permissoesAtuais?.find((p) => p.permissao === permissao);
    return permissaoSalva ? permissaoSalva.concedida : false;
  };

  // Toggle de permissão
  const togglePermissao = (permissao: TipoPermissao) => {
    const novoMapa = new Map(permissoesEditadas);
    const estadoAtual = isPermissaoConcedida(permissao);
    novoMapa.set(permissao, !estadoAtual);
    setPermissoesEditadas(novoMapa);
  };

  // Salvar todas as permissões
  const handleSalvar = () => {
    if (!usuarioSelecionado) return;

    // Coletar todas as permissões (editadas + existentes)
    const todasPermissoes: { permissao: TipoPermissao; concedida: boolean }[] = [];

    PERMISSOES_DISPONIVEIS.forEach((categoria) => {
      categoria.itens.forEach((item) => {
        const concedida = isPermissaoConcedida(item.id);
        // Só salvar se a permissão foi concedida (para economizar espaço no banco)
        if (concedida) {
          todasPermissoes.push({ permissao: item.id, concedida });
        }
      });
    });

    salvarPermissoes.mutate({
      userId: usuarioSelecionado,
      permissoes: todasPermissoes,
    });
  };

  // Resetar para usar apenas permissões do cargo
  const handleResetar = () => {
    if (!usuarioSelecionado) return;

    salvarPermissoes.mutate({
      userId: usuarioSelecionado,
      permissoes: [],
    });
    setPermissoesEditadas(new Map());
  };

  const usuarioAtual = usuarios?.find((u) => u.id === usuarioSelecionado);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>Controle de Permissões por Usuário</CardTitle>
        </div>
        <CardDescription>
          Defina permissões individuais para cada usuário, substituindo ou complementando as
          permissões do cargo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seletor de usuário */}
        <div className="space-y-2">
          <Label htmlFor="usuario-select">Selecione o usuário</Label>
          <Select value={usuarioSelecionado} onValueChange={handleUsuarioChange}>
            <SelectTrigger id="usuario-select">
              <SelectValue placeholder="Escolha um usuário" />
            </SelectTrigger>
            <SelectContent>
              {loadingUsuarios ? (
                <SelectItem value="loading" disabled>
                  Carregando...
                </SelectItem>
              ) : (
                usuarios?.map((usuario) => (
                  <SelectItem key={usuario.id} value={usuario.id}>
                    {usuario.nome || usuario.email} - {usuario.cargo}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Mostrar permissões apenas se um usuário estiver selecionado */}
        {usuarioSelecionado && (
          <>
            <Separator />

            {usuarioAtual && (
              <div className="bg-muted p-3 rounded-md text-sm">
                <p>
                  <strong>Cargo:</strong> {usuarioAtual.cargo}
                </p>
                <p className="text-muted-foreground mt-1">
                  As permissões marcadas abaixo <strong>substituem</strong> as permissões padrão do
                  cargo. Deixe tudo desmarcado para usar apenas as permissões do cargo.
                </p>
              </div>
            )}

            {loadingPermissoes ? (
              <p className="text-sm text-muted-foreground">Carregando permissões...</p>
            ) : (
              <div className="space-y-6">
                {PERMISSOES_DISPONIVEIS.map((categoria) => (
                  <div key={categoria.categoria} className="space-y-3">
                    <h4 className="font-semibold text-sm">{categoria.categoria}</h4>
                    <div className="space-y-2 pl-4">
                      {categoria.itens.map((item) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={item.id}
                            checked={isPermissaoConcedida(item.id)}
                            onCheckedChange={() => togglePermissao(item.id)}
                          />
                          <Label
                            htmlFor={item.id}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {item.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {/* Botões de ação */}
            <div className="flex gap-2">
              <Button
                onClick={handleSalvar}
                disabled={salvarPermissoes.isPending}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Permissões
              </Button>
              <Button
                onClick={handleResetar}
                variant="outline"
                disabled={salvarPermissoes.isPending}
              >
                Resetar (usar cargo)
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
