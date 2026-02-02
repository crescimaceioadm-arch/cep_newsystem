import { useState } from "react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Calendar } from "lucide-react";
import { useEventosMarketingMes, useCreateEventoMarketing, useUpdateEventoMarketing, useDeleteEventoMarketing } from "@/hooks/useEventosMarketing";
import type { EventoMarketing } from "@/types/database";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";

export default function CalendarioEventosMarketing() {
  const { isAdmin, cargo } = useUser();
  
  const [mesAtual, setMesAtual] = useState(new Date());
  const { data: eventos, isLoading } = useEventosMarketingMes(mesAtual);
  
  const createEvento = useCreateEventoMarketing();
  const updateEvento = useUpdateEventoMarketing();
  const deleteEvento = useDeleteEventoMarketing();
  
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [eventoSelecionado, setEventoSelecionado] = useState<EventoMarketing | null>(null);
  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null);
  const [tituloEvento, setTituloEvento] = useState("");
  const [descricaoEvento, setDescricaoEvento] = useState("");

  // Calcular início da primeira semana (segunda-feira)
  const inicioMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
  const primeiraSegunda = startOfWeek(inicioMes, { weekStartsOn: 1 });

  // Gerar 5 semanas
  const semanas = Array.from({ length: 5 }, (_, i) => {
    const inicioSemana = addWeeks(primeiraSegunda, i);
    return Array.from({ length: 7 }, (_, j) => addDays(inicioSemana, j));
  });

  const diasSemana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  // Buscar eventos de uma data específica
  const getEventosDoDia = (data: Date) => {
    if (!eventos) return [];
    // Compara apenas ano-mês-dia (ignora timezone)
    const dataStr = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
    return eventos.filter(e => e.data === dataStr);
  };

  const abrirModalNovoEvento = (data: Date) => {
    if (!isAdmin) return;
    setDataSelecionada(data);
    setModoEdicao(false);
    setEventoSelecionado(null);
    setTituloEvento("");
    setDescricaoEvento("");
    setModalAberto(true);
  };

  const abrirModalEditarEvento = (evento: EventoMarketing) => {
    if (!isAdmin) return;
    setEventoSelecionado(evento);
    setModoEdicao(true);
    setTituloEvento(evento.titulo);
    setDescricaoEvento(evento.descricao || "");
    setModalAberto(true);
  };

  const salvarEvento = () => {
    if (!tituloEvento.trim()) {
      toast.error("Informe o título do evento");
      return;
    }

    if (modoEdicao && eventoSelecionado) {
      updateEvento.mutate(
        {
          id: eventoSelecionado.id,
          dados: {
            titulo: tituloEvento,
            descricao: descricaoEvento || null,
          },
        },
        {
          onSuccess: () => {
            toast.success("Evento atualizado");
            setModalAberto(false);
          },
          onError: (error: any) => toast.error("Erro: " + error.message),
        }
      );
    } else if (dataSelecionada) {
      // Formatar data garantindo que seja no dia correto (sem problema de timezone)
      const ano = dataSelecionada.getFullYear();
      const mes = String(dataSelecionada.getMonth() + 1).padStart(2, '0');
      const dia = String(dataSelecionada.getDate()).padStart(2, '0');
      const dataFormatada = `${ano}-${mes}-${dia}`;
      
      createEvento.mutate(
        {
          data: dataFormatada,
          titulo: tituloEvento,
          descricao: descricaoEvento || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Evento criado");
            setModalAberto(false);
          },
          onError: (error: any) => toast.error("Erro: " + error.message),
        }
      );
    }
  };

  const excluirEvento = (id: string) => {
    if (!isAdmin) return;
    if (confirm("Deseja realmente excluir este evento?")) {
      deleteEvento.mutate(id, {
        onSuccess: () => toast.success("Evento excluído"),
        onError: (error: any) => toast.error("Erro: " + error.message),
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-1 text-lg">
              <Calendar className="h-4 w-4" />
              <span className="truncate">{format(mesAtual, "MMM 'de' yyyy", { locale: ptBR })}</span>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="px-2"
                onClick={() => setMesAtual(subWeeks(mesAtual, 4))}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="px-2 text-xs"
                onClick={() => setMesAtual(new Date())}
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="px-2"
                onClick={() => setMesAtual(addWeeks(mesAtual, 4))}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando eventos...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-300 px-1 py-1 bg-muted font-semibold w-12 text-xs">Sem</th>
                    {diasSemana.map((dia, i) => (
                      <th key={i} className="border border-gray-300 px-1 py-1 bg-muted font-semibold text-xs">
                        {dia}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {semanas.map((semana, semanaIdx) => (
                    <tr key={semanaIdx}>
                      <td className="border border-gray-300 px-1 py-1 text-center bg-muted/50 font-medium text-xs">
                        {semanaIdx + 1}
                      </td>
                      {semana.map((dia, diaIdx) => {
                        const eventosDoDia = getEventosDoDia(dia);
                        const isHoje = isSameDay(dia, new Date());
                        const isMesAtual = dia.getMonth() === mesAtual.getMonth();
                        
                        return (
                          <td
                            key={diaIdx}
                            className={`border border-gray-300 px-1 py-1 align-top min-h-[90px] ${
                              isHoje ? "bg-blue-50" : ""
                            } ${!isMesAtual ? "bg-gray-50 text-gray-400" : ""}`}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={`text-[10px] font-semibold ${isHoje ? "text-blue-600" : "text-gray-600"}`}>
                                {format(dia, "dd")}
                              </span>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 hover:bg-blue-100 p-0"
                                  onClick={() => abrirModalNovoEvento(dia)}
                                  title="Adicionar evento"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            <div className="space-y-0.5">
                              {eventosDoDia.map((evento) => (
                                <div
                                  key={evento.id}
                                  className={`bg-blue-100 border border-blue-300 rounded px-1.5 py-1 text-[10px] group hover:bg-blue-200 transition-colors ${isAdmin ? 'cursor-pointer' : ''}`}
                                  onClick={() => isAdmin && abrirModalEditarEvento(evento)}
                                  title={isAdmin ? "Clique para editar" : ""}
                                >
                                  <div className="flex items-start justify-between gap-0.5">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-blue-900 text-[10px] leading-tight whitespace-normal break-words">
                                        {evento.titulo}
                                      </p>
                                    </div>
                                    {isAdmin && (
                                      <div className="flex gap-0 opacity-70 hover:opacity-100">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-4 w-4 p-0"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            abrirModalEditarEvento(evento);
                                          }}
                                          title="Editar"
                                        >
                                          <Edit2 className="h-2.5 w-2.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-4 w-4 p-0 text-red-600"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            excluirEvento(evento.id);
                                          }}
                                          title="Deletar"
                                        >
                                          <Trash2 className="h-2.5 w-2.5" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criar/Editar Evento */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modoEdicao ? "Editar Evento" : "Novo Evento"}
              {dataSelecionada && !modoEdicao && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  - {format(dataSelecionada, "dd 'de' MMMM", { locale: ptBR })}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="titulo" className="text-sm font-medium">
                Título *
              </label>
              <Input
                id="titulo"
                value={tituloEvento}
                onChange={(e) => setTituloEvento(e.target.value)}
                placeholder="Ex: Postagem no Instagram"
                maxLength={100}
              />
            </div>
            <div>
              <label htmlFor="descricao" className="text-sm font-medium">
                Descrição
              </label>
              <Textarea
                id="descricao"
                value={descricaoEvento}
                onChange={(e) => setDescricaoEvento(e.target.value)}
                placeholder="Detalhes do evento (opcional)"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={salvarEvento}
              disabled={createEvento.isPending || updateEvento.isPending}
            >
              {createEvento.isPending || updateEvento.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
