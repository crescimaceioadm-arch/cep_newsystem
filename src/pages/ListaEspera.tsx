import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Users, Bell } from "lucide-react";
import { useListaEsperaClientes, useMatchesPendentes } from "@/hooks/useListaEspera";
import { MatchesAlert } from "@/components/lista-espera/MatchesAlert";
import { NovoClienteModal } from "@/components/lista-espera/NovoClienteModal";
import { TabelaListaEspera } from "@/components/lista-espera/TabelaListaEspera";
import { DetalhesClienteModal } from "@/components/lista-espera/DetalhesClienteModal";
import { EditarClienteModal } from "@/components/lista-espera/EditarClienteModal";
import { DarBaixaModal } from "@/components/lista-espera/DarBaixaModal";
import type { ListaEsperaCliente } from "@/types/database";
import { Badge } from "@/components/ui/badge";

export default function ListaEspera() {
  const [filtroStatus, setFiltroStatus] = useState("aguardando");
  const { data: clientes, isLoading } = useListaEsperaClientes(filtroStatus);
  const { data: matchesPendentes } = useMatchesPendentes();
  
  const [novoModalOpen, setNovoModalOpen] = useState(false);
  const [detalhesModalOpen, setDetalhesModalOpen] = useState(false);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [baixaModalOpen, setBaixaModalOpen] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<ListaEsperaCliente | null>(null);
  const [abaAtiva, setAbaAtiva] = useState("alertas");

  const handleVisualizar = (cliente: ListaEsperaCliente) => {
    setClienteSelecionado(cliente);
    setDetalhesModalOpen(true);
  };

  const handleEditar = (cliente: ListaEsperaCliente) => {
    setClienteSelecionado(cliente);
    setEditarModalOpen(true);
  };

  const handleBaixa = (cliente: ListaEsperaCliente) => {
    setClienteSelecionado(cliente);
    setBaixaModalOpen(true);
  };

  const totalMatchesPendentes = matchesPendentes?.length || 0;
  const totalAguardando = clientes?.filter(c => c.status === 'aguardando').length || 0;

  return (
    <MainLayout title="Lista de Espera">
      <div className="space-y-6">
        {/* Header com Botão de Ação */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lista de Espera de Itens</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie clientes aguardando por itens grandes específicos
            </p>
          </div>
          <Button onClick={() => setNovoModalOpen(true)} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Nova Lista de Espera
          </Button>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas Pendentes</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalMatchesPendentes}
                {totalMatchesPendentes > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white animate-pulse">
                    NOVO
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Matches encontrados aguardando verificação
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aguardando</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAguardando}</div>
              <p className="text-xs text-muted-foreground">
                Clientes na lista de espera
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cadastrado</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientes?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                {filtroStatus === 'todos' ? 'Todos os clientes' : `Status: ${filtroStatus}`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alertas de Matches Pendentes */}
        {totalMatchesPendentes > 0 && abaAtiva === "alertas" && (
          <MatchesAlert />
        )}

        {/* Tabs: Alertas e Lista Completa */}
        <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="alertas" className="relative">
                Alertas
                {totalMatchesPendentes > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">
                    {totalMatchesPendentes}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="lista">Lista Completa</TabsTrigger>
            </TabsList>

            {abaAtiva === "lista" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filtrar por:</span>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aguardando">Aguardando</SelectItem>
                    <SelectItem value="notificado">Notificado</SelectItem>
                    <SelectItem value="atendido">Atendido</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                    <SelectItem value="todos">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <TabsContent value="alertas" className="space-y-4">
            {totalMatchesPendentes === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Nenhum Alerta Pendente</CardTitle>
                  <CardDescription>
                    Não há matches aguardando verificação no momento.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="lista" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Clientes na Lista de Espera</CardTitle>
                <CardDescription>
                  {isLoading
                    ? "Carregando..."
                    : `${clientes?.length || 0} cliente(s) encontrado(s)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </div>
                ) : (
                  <TabelaListaEspera
                    clientes={clientes || []}
                    onVisualizar={handleVisualizar}
                    onEditar={handleEditar}
                    onBaixa={handleBaixa}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <NovoClienteModal open={novoModalOpen} onOpenChange={setNovoModalOpen} />
        
        <DetalhesClienteModal
          cliente={clienteSelecionado}
          open={detalhesModalOpen}
          onOpenChange={setDetalhesModalOpen}
        />
        
        <EditarClienteModal
          cliente={clienteSelecionado}
          open={editarModalOpen}
          onOpenChange={setEditarModalOpen}
        />
        
        <DarBaixaModal
          cliente={clienteSelecionado}
          open={baixaModalOpen}
          onOpenChange={setBaixaModalOpen}
        />
      </div>
    </MainLayout>
  );
}
