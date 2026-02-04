import { 
  UserPlus, 
  ClipboardCheck, 
  ShoppingCart, 
  Box, 
  BarChart3, 
  Settings,
  Wallet,
  History,
  ClipboardList,
  Megaphone,
  LogOut,
  Package,
  TrendingUp,
  ChevronRight,
  FileText
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useUser, hasAccess } from "@/contexts/UserContext";
import { useCaixa } from "@/contexts/CaixaContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CaixaIndicator } from "./CaixaIndicator";

const allMenuItems = [
  { title: "Dashboard", url: "/", icon: BarChart3, submenu: [
    { title: "Dashboard", url: "/" },
    { title: "Performance Vendas", url: "/dashboard/performance-vendas" },
  ]},
  { title: "Performance Vendas", url: "/performance-vendas", icon: TrendingUp },
  { title: "Cadastro", url: "/recepcao", icon: UserPlus },
  { title: "Vendas/Caixa", url: "/vendas", icon: ShoppingCart },
  { title: "Avaliação", url: "/avaliacao", icon: ClipboardCheck },
  { title: "Histórico Avaliações", url: "/atendimentos/historico", icon: ClipboardList },
  { title: "Histórico Vendas", url: "/vendas/historico", icon: History },
  { title: "Financeiro", url: "/financeiro", icon: Wallet },
  { title: "Marketing", url: "/marketing", icon: Megaphone },
  { title: "Estoque", url: "/estoque", icon: Box, submenu: [
    { title: "Gestão de Estoque", url: "/estoque" },
    { title: "Itens Grandes", url: "/estoque/itens-grandes" },
    { title: "Relatório Itens Grandes", url: "/estoque/itens-grandes/relatorio" },
  ]},
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  { title: "Logs de Atividades", url: "/logs-atividades", icon: FileText },
];

export function AppSidebar() {
  const { cargo, hasPermission } = useUser();
  const { limparCaixa } = useCaixa();
  const navigate = useNavigate();
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  
  // Filtra menu items baseado nas permissões do usuário (individuais ou do cargo)
  const menuItems = allMenuItems.filter(item => {
    const menuPermissao = `menu:${item.url}` as any;
    return hasPermission(menuPermissao);
  });

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair: " + error.message);
    } else {
      limparCaixa(); // Limpa o caixa selecionado ao fazer logout
      toast.success("Você saiu do sistema");
      navigate("/auth");
    }
  };

  return (
    <Sidebar className="border-r-0 bg-sidebar-gradient">
      <SidebarHeader className="p-6 border-b border-amber-300/50">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/80 flex items-center justify-center shadow-sm">
              <span className="text-slate-700 font-bold text-lg">CP</span>
            </div>
            <div>
              <h1 className="font-semibold text-slate-800 text-lg">Cresci e Perdi</h1>
              <p className="text-xs text-slate-600">Sistema de Gestão</p>
            </div>
          </div>
          <CaixaIndicator />
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-4 bg-sidebar-gradient">
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-600 text-xs uppercase tracking-wider mb-2">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item: any) => (
                <div key={item.title}>
                  {item.submenu ? (
                    <>
                      <SidebarMenuItem>
                        <SidebarMenuButton 
                          onClick={() => setExpandedMenu(expandedMenu === item.title ? null : item.title)}
                          className="flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-700 hover:bg-white/40 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className="h-5 w-5" />
                            <span className="font-medium">{item.title}</span>
                          </div>
                          <ChevronRight 
                            className={`h-4 w-4 transition-transform ${expandedMenu === item.title ? "rotate-90" : ""}`}
                          />
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {expandedMenu === item.title && (
                        <div className="ml-4 space-y-1 mt-1">
                          {item.submenu.map((subitem: any) => (
                            <SidebarMenuItem key={subitem.url}>
                              <SidebarMenuButton asChild>
                                <NavLink 
                                  to={subitem.url} 
                                  end={subitem.url === "/estoque"} 
                                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-white/30 hover:text-slate-800 transition-colors"
                                  activeClassName="bg-white/40 text-slate-800 font-semibold"
                                >
                                  <span>•</span>
                                  <span>{subitem.title}</span>
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url} 
                          end={item.url === "/"} 
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-white/40 hover:text-slate-900 transition-colors"
                          activeClassName="bg-white/50 text-slate-900 font-semibold hover:bg-white/50 hover:text-slate-900 shadow-sm"
                        >
                          <item.icon className="h-5 w-5" />
                          <span className="font-medium">{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </div>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-amber-300/50 bg-sidebar-gradient">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-slate-700 hover:bg-red-500/20 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Sair</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
