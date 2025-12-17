import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "@/contexts/UserContext";
import { CaixaProvider } from "@/contexts/CaixaContext";
import { InactivityProvider } from "@/contexts/InactivityContext";
import { RequireRole } from "@/components/auth/RequireRole";
import { CaixaGuard } from "@/components/auth/CaixaGuard";
import Recepcao from "./pages/Recepcao";
import Avaliacao from "./pages/Avaliacao";
import Vendas from "./pages/Vendas";
import VendasHistorico from "./pages/VendasHistorico";
import HistoricoAtendimentos from "./pages/HistoricoAtendimentos";
import Financeiro from "./pages/Financeiro";
import Estoque from "./pages/Estoque";
import Dashboard from "./pages/Dashboard";
import Configuracoes from "./pages/Configuracoes";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <UserProvider>
          <CaixaProvider>
            <InactivityProvider>
              <CaixaGuard />
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<RequireRole><Recepcao /></RequireRole>} />
                <Route path="/avaliacao" element={<RequireRole><Avaliacao /></RequireRole>} />
                <Route path="/atendimentos/historico" element={<RequireRole><HistoricoAtendimentos /></RequireRole>} />
                <Route path="/vendas" element={<RequireRole><Vendas /></RequireRole>} />
                <Route path="/vendas/historico" element={<RequireRole><VendasHistorico /></RequireRole>} />
                <Route path="/financeiro" element={<RequireRole><Financeiro /></RequireRole>} />
                <Route path="/estoque" element={<RequireRole><Estoque /></RequireRole>} />
                <Route path="/dashboard" element={<RequireRole><Dashboard /></RequireRole>} />
                <Route path="/configuracoes" element={<RequireRole><Configuracoes /></RequireRole>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </InactivityProvider>
          </CaixaProvider>
        </UserProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
