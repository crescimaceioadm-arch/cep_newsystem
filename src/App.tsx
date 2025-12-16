import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Recepcao from "./pages/Recepcao";
import Avaliacao from "./pages/Avaliacao";
import Vendas from "./pages/Vendas";
import VendasHistorico from "./pages/VendasHistorico";
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
        <Routes>
          <Route path="/" element={<Recepcao />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/avaliacao" element={<Avaliacao />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/vendas/historico" element={<VendasHistorico />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
