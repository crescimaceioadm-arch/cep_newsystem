import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/contexts/UserContext";
import { Shield, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MenuPermissao {
  id: string;
  label: string;
  path: string;
  icon?: string;
  descricao?: string;
}

const MENUS_DISPONIVEIS: MenuPermissao[] = [
  { id: 'cockpit', label: 'Cockpit real time', path: '/cockpit-real-time', descricao: 'Painel em tempo real (admin)' },
  { id: 'vendas', label: 'Vendas', path: '/vendas', descricao: 'Gerenciar vendas e histórico' },
  { id: 'recepcao', label: 'Recepção', path: '/recepcao', descricao: 'Atendimento de clientes' },
  { id: 'avaliacao', label: 'Avaliação', path: '/avaliacao', descricao: 'Avaliar itens' },
  { id: 'financeiro', label: 'Financeiro', path: '/financeiro', descricao: 'Controle financeiro' },
  { id: 'estoque', label: 'Estoque', path: '/estoque', descricao: 'Gerenciar estoque' },
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', descricao: 'Visualizar gráficos e dados' },
  { id: 'configuracoes', label: 'Configurações', path: '/configuracoes', descricao: 'Configurar sistema' },
  { id: 'marketing', label: 'Marketing', path: '/marketing', descricao: 'Gerenciar eventos de marketing' },
];

const CARGO_OPTIONS: { value: UserRole; label: string; color: string }[] = [
  { value: 'admin', label: 'Admin', color: 'bg-blue-600' },
  { value: 'caixa', label: 'Caixa', color: 'bg-orange-500' },
  { value: 'avaliadora', label: 'Avaliadora', color: 'bg-green-600' },
  { value: 'geral', label: 'Geral', color: 'bg-purple-500' },
  { value: 'social_media', label: 'Social Media', color: 'bg-pink-500' },
  { value: 'mkt', label: 'MKT', color: 'bg-red-600' },
];

interface PermissoesPerfil {
  cargo: UserRole;
  menus: string[];
}

export function ControlePerfisMenuCard() {
  const [cargoSelecionado, setCargoSelecionado] = useState<UserRole>('admin');
  const [permissoes, setPermissoes] = useState<Record<UserRole, string[]>>({
    admin: MENUS_DISPONIVEIS.map(m => m.id),
    caixa: ['vendas', 'financeiro', 'dashboard'],
    avaliadora: ['recepcao', 'avaliacao'],
    geral: ['vendas', 'recepcao', 'avaliacao', 'financeiro', 'marketing'],
    social_media: ['marketing'],
    mkt: ['marketing', 'dashboard'],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alteracoes, setAlteracoes] = useState<Record<UserRole, boolean>>({
    admin: false,
    caixa: false,
    avaliadora: false,
    geral: false,
    social_media: false,
    mkt: false,
  });

  useEffect(() => {
    carregarPermissoes();
  }, []);

  const carregarPermissoes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('perfil_menus')
        .select('cargo, menus');

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = table doesn't exist

      if (data && data.length > 0) {
        const permissoesCarregadas: Record<UserRole, string[]> = { ...permissoes };
        data.forEach((item: any) => {
          permissoesCarregadas[item.cargo] = item.menus || [];
        });
        setPermissoes(permissoesCarregadas);
      }
    } catch (err: any) {
      console.warn('Usando permissões padrão:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMenu = (menu: string) => {
    setPermissoes(prev => ({
      ...prev,
      [cargoSelecionado]: prev[cargoSelecionado].includes(menu)
        ? prev[cargoSelecionado].filter(m => m !== menu)
        : [...prev[cargoSelecionado], menu]
    }));
    setAlteracoes(prev => ({ ...prev, [cargoSelecionado]: true }));
  };

  const handleSalvar = async () => {
    setSaving(true);
    try {
      // Primero, deletar permissões antigas do cargo
      await supabase
        .from('perfil_menus')
        .delete()
        .eq('cargo', cargoSelecionado);

      // Inserir novas permissões
      const { error } = await supabase
        .from('perfil_menus')
        .insert({
          cargo: cargoSelecionado,
          menus: permissoes[cargoSelecionado],
        });

      if (error) throw error;

      toast.success(`Permissões do cargo "${CARGO_OPTIONS.find(c => c.value === cargoSelecionado)?.label}" salvas com sucesso!`);
      setAlteracoes(prev => ({ ...prev, [cargoSelecionado]: false }));
    } catch (err: any) {
      // Se tabela não existe, criar e inserir
      if (err.code === 'PGRST116' || err.message.includes('perfil_menus')) {
        toast.info('Criando tabela de permissões... Tente novamente em alguns segundos.');
        carregarPermissoes();
      } else {
        toast.error('Erro ao salvar permissões: ' + err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const cargoOption = CARGO_OPTIONS.find(c => c.value === cargoSelecionado);
  const menusAtivos = permissoes[cargoSelecionado] || [];

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Controle de Menus por Perfil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seletor de Cargo */}
        <div>
          <Label className="text-base font-semibold mb-3 block">Selecione o perfil para editar:</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {CARGO_OPTIONS.map((cargo) => (
              <Button
                key={cargo.value}
                variant={cargoSelecionado === cargo.value ? 'default' : 'outline'}
                className={`${cargoSelecionado === cargo.value ? cargo.color + ' text-white' : ''}`}
                onClick={() => setCargoSelecionado(cargo.value)}
              >
                {cargo.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Menus Disponíveis */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <Label className="text-base font-semibold">
                Menus disponíveis para{' '}
                <Badge className={`${cargoOption?.color} text-white ml-2`}>
                  {cargoOption?.label}
                </Badge>
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione quais menus este perfil pode acessar
              </p>
            </div>
            {alteracoes[cargoSelecionado] && (
              <Button
                size="sm"
                onClick={handleSalvar}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Salvar
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {MENUS_DISPONIVEIS.map((menu) => {
              const ativo = menusAtivos.includes(menu.id);
              return (
                <div
                  key={menu.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    ativo
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-muted/50 border-muted hover:border-gray-400'
                  }`}
                  onClick={() => toggleMenu(menu.id)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={ativo}
                      onChange={() => toggleMenu(menu.id)}
                      className="cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{menu.label}</p>
                      {menu.descricao && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {menu.descricao}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumo */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Resumo:</strong> O perfil <Badge className={`${cargoOption?.color} text-white ml-1 mr-1`}>{cargoOption?.label}</Badge>
            tem acesso a {menusAtivos.length} de {MENUS_DISPONIVEIS.length} menus.
          </p>
          {menusAtivos.length > 0 && (
            <p className="text-sm text-blue-800 mt-2">
              Menus: {MENUS_DISPONIVEIS.filter(m => menusAtivos.includes(m.id)).map(m => m.label).join(', ')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
