import { 
  UserPlus, 
  ClipboardCheck, 
  ShoppingCart, 
  Box, 
  BarChart3, 
  Settings,
  Wallet,
  History,
  LogOut
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const allMenuItems = [
  { title: "Vendas/Caixa", url: "/vendas", icon: ShoppingCart },
  { title: "Cadastro", url: "/", icon: UserPlus },
  { title: "Avaliação", url: "/avaliacao", icon: ClipboardCheck },
  { title: "Histórico Vendas", url: "/vendas/historico", icon: History },
  { title: "Financeiro", url: "/financeiro", icon: Wallet },
  { title: "Estoque", url: "/estoque", icon: Box },
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { cargo } = useUser();
  const navigate = useNavigate();
  
  // Filtra menu items baseado no cargo do usuário
  const menuItems = allMenuItems.filter(item => hasAccess(cargo, item.url));

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair: " + error.message);
    } else {
      toast.success("Você saiu do sistema");
      navigate("/auth");
    }
  };

  return (
    <Sidebar className="border-r-0 bg-sidebar-gradient">
      <SidebarHeader className="p-6 border-b border-amber-300/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/80 flex items-center justify-center shadow-sm">
            <span className="text-slate-700 font-bold text-lg">CP</span>
          </div>
          <div>
            <h1 className="font-semibold text-slate-800 text-lg">Cresci e Perdi</h1>
            <p className="text-xs text-slate-600">Sistema de Gestão</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-4 bg-sidebar-gradient">
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-600 text-xs uppercase tracking-wider mb-2">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
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
