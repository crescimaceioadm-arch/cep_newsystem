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
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-bold text-lg">CP</span>
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground text-lg">Cresci e Perdi</h1>
            <p className="text-xs text-sidebar-foreground/60">Sistema de Gestão</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider mb-2">
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
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                      activeClassName="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
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

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-red-500/20 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Sair</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
