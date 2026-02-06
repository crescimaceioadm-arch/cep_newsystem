import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAtendimentos, useDeleteAtendimento, useUpdateAtendimento } from "@/hooks/useAtendimentos";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/recepcao/StatusBadge";
import { TempoEspera } from "@/components/recepcao/TempoEspera";
import { NovoAtendimentoModal } from "@/components/recepcao/NovoAtendimentoModal";
import { FinalizarAtendimentoModal } from "@/components/recepcao/FinalizarAtendimentoModal";
import { Badge } from "@/components/ui/badge";
import { ClientePreferenciaPaymentBadgeRender } from "@/components/ClientePreferenciaPaymentBadge";
import { useClientesPreferenciaBatch, useClientesRecusasBatch } from "@/hooks/useClientePreferenciaPagemento";
import { UserPlus, CheckCircle, Loader2, Trash2, MessageCircle, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import type { Atendimento } from "@/types/database";

export default function Recepcao() {
  const { isAdmin, cargo } = useUser();
  const { data: atendimentos, isLoading, error } = useAtendimentos();
  const { mutate: deleteAtendimento, isPending: deletando } = useDeleteAtendimento();
  const updateAtendimento = useUpdateAtendimento();
  const navigate = useNavigate();
  
  console.log("[Recepcao] isAdmin:", isAdmin, "cargo:", cargo);
  const [novoModalOpen, setNovoModalOpen] = useState(false);
  const [finalizarModalOpen, setFinalizarModalOpen] = useState(false);
  const [atendimentoSelecionado, setAtendimentoSelecionado] = useState<Atendimento | null>(null);
  const [atendimentoParaExcluir, setAtendimentoParaExcluir] = useState<Atendimento | null>(null);

  // Buscar dados em batch para todos os clientes visíveis
  const nomesClientes = useMemo(() => {
    return atendimentos?.map(a => a.nome_cliente).filter(Boolean) || [];
  }, [atendimentos]);

  // Filtrar apenas avaliações NÃO finalizadas, recusadas ou recusadas
  const avaliacoesNaoFinalizadas = useMemo(() => {
    return atendimentos?.filter(a => 
      a.status !== "finalizado" && 
      a.status !== "recusado" && 
      a.status !== "recusou"
    ) || [];
  }, [atendimentos]);

  const { data: preferenciasMap, isLoading: isLoadingPreferencias } = useClientesPreferenciaBatch(nomesClientes);
  // Desabilitado para performance - recusas são menos críticas
  const { data: recusasMap, isLoading: isLoadingRecusas } = useClientesRecusasBatch(nomesClientes, false);

  const handleFinalizar = (atendimento: Atendimento) => {
    setAtendimentoSelecionado(atendimento);
    setFinalizarModalOpen(true);
  };

  const handleConfirmarExclusao = () => {
    if (!atendimentoParaExcluir) return;
    
    deleteAtendimento(atendimentoParaExcluir.id, {
      onSuccess: () => {
        toast.success("Avaliação excluída com sucesso");
        setAtendimentoParaExcluir(null);
      },
      onError: (error) => {
        toast.error("Erro ao excluir avaliação");
        console.error(error);
      },
    });
  };

  const handleAlterarOrigem = (atendimento: Atendimento, novaOrigem: "presencial" | "whatsapp") => {
    updateAtendimento.mutate(
      {
        id: atendimento.id,
        updates: { origem_avaliacao: novaOrigem }
      },
      {
        onSuccess: () => {
          toast.success(`Origem alterada para ${novaOrigem === "whatsapp" ? "WhatsApp" : "Presencial"}`);
        },
        onError: () => {
          toast.error("Erro ao alterar origem");
        }
      }
    );
  };

  const formatHora = (dateString: string) => {
    if (!dateString) return "--:--";
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return "--:--";
    return format(parsed, "HH:mm", { locale: ptBR });
  };

  const getOrigemBadge = (origem: string | null | undefined) => {
    if (!origem || origem === "presencial") {
      return (
        <Badge variant="outline" className="gap-1">
          <User className="h-3 w-3" />
          Presencial
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 border-green-200">
        <MessageCircle className="h-3 w-3" />
        WhatsApp
      </Badge>
    );
  };

  const getOrigemEditavel = (atendimento: Atendimento) => {
    const origem = atendimento.origem_avaliacao || "presencial";
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="cursor-pointer">
            {getOrigemBadge(origem)}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() => handleAlterarOrigem(atendimento, "presencial")}
            disabled={origem === "presencial"}
          >
            <User className="h-3.5 w-3.5 mr-2" />
            Presencial
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleAlterarOrigem(atendimento, "whatsapp")}
            disabled={origem === "whatsapp"}
          >
            <MessageCircle className="h-3.5 w-3.5 mr-2" />
            WhatsApp
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <MainLayout title="Recepção">
      <div className="space-y-6">
        {/* Header com botão */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Fila de Avaliação</h2>
            <p className="text-muted-foreground">Gerencie a entrada de clientes</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" onClick={() => navigate("/recepcao/clientes")}>Ranking de clientes</Button>
            )}
            <Button onClick={() => setNovoModalOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Nova Avaliação
            </Button>
          </div>
        </div>

        {/* Tabela de Avaliações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Avaliações do Dia</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                Erro ao carregar avaliações. Verifique a conexão com o banco de dados.
              </div>
            ) : avaliacoesNaoFinalizadas && avaliacoesNaoFinalizadas.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Chegada</TableHead>
                    <TableHead>Tempo de Espera</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {avaliacoesNaoFinalizadas.map((atendimento) => (
                    <TableRow key={atendimento.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{atendimento.nome_cliente}</span>
                          <ClientePreferenciaPaymentBadgeRender 
                            preferencia={preferenciasMap?.[atendimento.nome_cliente]}
                            recusas={recusasMap?.[atendimento.nome_cliente]}
                            showRecusas={false}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        {getOrigemEditavel(atendimento)}
                      </TableCell>
                      <TableCell>{formatHora(atendimento.hora_chegada)}</TableCell>
                      <TableCell>
                        {atendimento.status !== 'finalizado' && (
                          <TempoEspera horaChegada={atendimento.hora_chegada} />
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={atendimento.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {atendimento.status === 'aguardando_pagamento' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFinalizar(atendimento)}
                              className="gap-1"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Finalizar
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setAtendimentoParaExcluir(atendimento)}
                              title="Excluir avaliação"
                              disabled={deletando}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {atendimentos && atendimentos.length > 0 
                  ? "Todas as avaliações foram finalizadas! ✅"
                  : "Nenhuma avaliação registrada hoje."
                }
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modais */}
      <NovoAtendimentoModal 
        open={novoModalOpen} 
        onOpenChange={setNovoModalOpen}
      />
      <FinalizarAtendimentoModal
        open={finalizarModalOpen}
        onOpenChange={setFinalizarModalOpen}
        atendimento={atendimentoSelecionado}
      />

      {/* Alert de Confirmação de Exclusão */}
      <AlertDialog 
        open={!!atendimentoParaExcluir} 
        onOpenChange={(open) => !open && setAtendimentoParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a avaliação de{" "}
              <strong>{atendimentoParaExcluir?.nome_cliente}</strong>?
              <br /><br />
              Isso apagará todos os dados financeiros associados.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExclusao}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
