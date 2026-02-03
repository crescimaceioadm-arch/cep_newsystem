import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AlertaFechamentosFaltantes } from "@/components/financeiro/AlertaFechamentosFaltantes";

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function MainLayout({ children, title }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border flex items-center px-6 bg-card">
            <SidebarTrigger className="mr-4" />
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          </header>
          <div className="flex-1 p-6 overflow-auto">
            {/* Alerta de fechamentos faltantes */}
            <AlertaFechamentosFaltantes />
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
