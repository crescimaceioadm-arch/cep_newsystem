import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAtendimentos, useDeleteAtendimento } from "@/hooks/useAtendimentos";
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
import { StatusBadge } from "@/components/recepcao/StatusBadge";
import { TempoEspera } from "@/components/recepcao/TempoEspera";
import { NovoAtendimentoModal } from "@/components/recepcao/NovoAtendimentoModal";
import { FinalizarAtendimentoModal } from "@/components/recepcao/FinalizarAtendimentoModal";
import { UserPlus, CheckCircle, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import type { Atendimento } from "@/types/database";

export default function Recepcao() {
  const { isAdmin } = useUser();
  const { data: atendimentos, isLoading, error } = useAtendimentos();
  const { mutate: deleteAtendimento, isPending: deletando } = useDeleteAtendimento();
  const [novoModalOpen, setNovoModalOpen] = useState(false);
  const [finalizarModalOpen, setFinalizarModalOpen] = useState(false);
  const [atendimentoSelecionado, setAtendimentoSelecionado] = useState<Atendimento | null>(null);
  const [atendimentoParaExcluir, setAtendimentoParaExcluir] = useState<Atendimento | null>(null);

  const handleFinalizar = (atendimento: Atendimento) => {
    setAtendimentoSelecionado(atendimento);
    setFinalizarModalOpen(true);
  };

  const handleConfirmarExclusao = () => {
    if (!atendimentoParaExcluir) return;
    
    deleteAtendimento(atendimentoParaExcluir.id, {
      onSuccess: () => {
        toast.success("Atendimento excluído com sucesso");
        setAtendimentoParaExcluir(null);
      },
      onError: (error) => {
        toast.error("Erro ao excluir atendimento");
        console.error(error);
      },
    });
  };

  const formatHora = (dateString: string) => {
    return format(new Date(dateString), "HH:mm", { locale: ptBR });
  };

  return (
    <MainLayout title="Recepção">
      <div className="space-y-6">
        {/* Header com botão */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Fila de Atendimento</h2>
            <p className="text-muted-foreground">Gerencie a entrada de clientes</p>
          </div>
          <Button onClick={() => setNovoModalOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Novo Atendimento
          </Button>
        </div>

        {/* Tabela de Atendimentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atendimentos do Dia</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                Erro ao carregar atendimentos. Verifique a conexão com o banco de dados.
              </div>
            ) : atendimentos && atendimentos.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Chegada</TableHead>
                    <TableHead>Tempo de Espera</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atendimentos.map((atendimento) => (
                    <TableRow key={atendimento.id}>
                      <TableCell className="font-medium">
                        {atendimento.nome_cliente}
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
                              title="Excluir atendimento"
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
                Nenhum atendimento registrado hoje.
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
              Tem certeza que deseja excluir o atendimento de{" "}
              <strong>{atendimentoParaExcluir?.nome_cliente}</strong>?
              <br /><br />
              Isso apagará a avaliação e os dados financeiros associados.
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
