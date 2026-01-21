import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, format, isSameDay, parseISO, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Plus, CheckCircle2, Clock, User, Edit2, Trash2, Calendar } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

type MarketingItem = {
  id: string;
  titulo?: string | null;
  descricao?: string | null;
  categoria?: string | null;
  data_postagem?: string | null;
  data_producao?: string | null;
  produzido?: boolean | null;
  responsavel?: string | null;
  horarios_postagem?: string[] | null;
  horario_real_postagem?: string | null;
  check_timestamp?: string | null;
  created_at?: string | null;
};

const categoryOptions = ["Reels", "Divulgação", "Stories", "Feed", "Carrossel"];
const responsavelOptions = ["Duda", "Rose", "Melissa", "Rayane"];

// Tipos de postagem padrão (como na planilha)
const tiposPostagemPadrao = [
  { tipo: "REPOSIÇÃO COM ISCA QUENTE", horario: "08:00", categoria: "Reels" },
  { tipo: "REPOSIÇÃO ATRATIVA FRIO", horario: "10:00", categoria: "Reels" },
  { tipo: "REPOSIÇÃO MÉDIA", horario: "11:30", categoria: "Reels" },
  { tipo: "EVENTO QUENTE", horario: "14:00", categoria: "Stories" },
  { tipo: "CARROSSEL EVENTO", horario: "14:00", categoria: "Carrossel" },
  { tipo: "EVENTO FRIO", horario: "15:00", categoria: "Stories" },
  { tipo: "LOJA ABERTA AMANHÃ", horario: "19:00", categoria: "Stories" },
  { tipo: "VÍDEO INSTITUCIONAL FRIO", horario: "19:30", categoria: "Reels" },
  { tipo: "COMPRAMOS OU CARROSSEL GERAL", horario: "20:00", categoria: "Carrossel" },
];

type TipoPostagem = {
  id: string;
  tipo: string;
  horario: string;
  categoria: string;
};

type CelulaData = {
  titulo: string;
  descricao?: string;
  data_producao?: string;
  responsavel?: string;
};

export default function Marketing() {
  const { cargo } = useUser();
  const queryClient = useQueryClient();

  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedItem, setSelectedItem] = useState<MarketingItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [gridDialogOpen, setGridDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<MarketingItem>>({});
  const [horarioRealInput, setHorarioRealInput] = useState("");
  const [gridData, setGridData] = useState<Record<string, Record<string, CelulaData>>>({});
  const [tiposPostagem, setTiposPostagem] = useState<TipoPostagem[]>([]);
  const [expandedCell, setExpandedCell] = useState<string | null>(null);
  
  // Filtros
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>("todos");
  const [filtroDataPostagem, setFiltroDataPostagem] = useState<string>("");
  const [filtroDataProducao, setFiltroDataProducao] = useState<string>("");

  const isSocialMedia = cargo === "social_media";

  const safeWeekStart = useMemo(
    () => startOfWeek(weekStart, { weekStartsOn: 1 }),
    [weekStart]
  );

  const weekDays = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(safeWeekStart, i)),
    [safeWeekStart]
  );

  const weekLabel = `${format(safeWeekStart, "dd MMM", { locale: ptBR })} - ${format(
    addDays(safeWeekStart, 4),
    "dd MMM",
    { locale: ptBR }
  )}`;

  // Query para buscar itens da semana
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["marketing_items", format(safeWeekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const start = format(safeWeekStart, "yyyy-MM-dd");
      const end = format(addDays(safeWeekStart, 6), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("marketing_items")
        .select("*")
        .gte("data_postagem", start)
        .lte("data_postagem", end)
        .order("data_postagem", { ascending: true });

      if (error) throw error;
      return (data as MarketingItem[]) || [];
    },
  });

  // Agrupar tarefas por dia
  const tarefasPorDia = useMemo(() => {
    const dias: Record<string, MarketingItem[]> = {};
    
    weekDays.forEach(day => {
      const dayKey = format(day, "yyyy-MM-dd");
      dias[dayKey] = items.filter(item => item.data_postagem === dayKey);
    });
    
    return dias;
  }, [items, weekDays]);

  // Aplicar filtros nas tarefas
  const tarefasFiltradasPorDia = useMemo(() => {
    const dias: Record<string, MarketingItem[]> = {};
    
    weekDays.forEach(day => {
      const dayKey = format(day, "yyyy-MM-dd");
      let tarefas = tarefasPorDia[dayKey] || [];
      
      // Filtro de responsável
      if (filtroResponsavel !== "todos") {
        tarefas = tarefas.filter(t => t.responsavel === filtroResponsavel);
      }
      
      // Filtro de data de produção
      if (filtroDataProducao) {
        tarefas = tarefas.filter(t => t.data_producao === filtroDataProducao);
      }
      
      // Filtro de data de postagem (já está implícito no dayKey, mas deixando para casos futuros)
      if (filtroDataPostagem) {
        tarefas = tarefas.filter(t => t.data_postagem === filtroDataPostagem);
      }
      
      dias[dayKey] = tarefas;
    });
    
    return dias;
  }, [tarefasPorDia, weekDays, filtroResponsavel, filtroDataProducao, filtroDataPostagem]);

  // Mutation para criar/atualizar
  const upsertMutation = useMutation({
    mutationFn: async (item: Partial<MarketingItem>) => {
      const payload = {
        ...item,
        semana_referencia: format(safeWeekStart, "yyyy-MM-dd"), // Adiciona semana de referência
      };
      
      if (item.id) {
        const { error } = await supabase
          .from("marketing_items")
          .update(payload)
          .eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("marketing_items")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing_items"] });
      toast.success("Tarefa salva com sucesso!");
      setFormDialogOpen(false);
      setFormData({});
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  // Mutation para deletar
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketing_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing_items"] });
      toast.success("Tarefa excluída!");
      setDrawerOpen(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });

  // Mutation para marcar como realizado
  const checkMutation = useMutation({
    mutationFn: async ({ id, horario }: { id: string; horario: string }) => {
      const { error } = await supabase
        .from("marketing_items")
        .update({
          produzido: true,
          check_timestamp: new Date().toISOString(),
          horario_real_postagem: horario,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing_items"] });
      toast.success("✅ Tarefa concluída!");
      setDrawerOpen(false);
      setHorarioRealInput("");
    },
    onError: (error: any) => {
      toast.error("Erro ao marcar: " + error.message);
    },
  });

  const getBadge = (item: MarketingItem) => {
    if (item.produzido) {
      return { icon: CheckCircle2, color: "bg-green-100 text-green-700 border-green-300", text: "Concluído" };
    }
    
    const hoje = format(new Date(), "yyyy-MM-dd");
    if (item.data_producao === hoje) {
      return { icon: Clock, color: "bg-yellow-100 text-yellow-700 border-yellow-300", text: "Produzir Hoje" };
    }
    if (item.data_postagem === hoje) {
      return { icon: Calendar, color: "bg-blue-100 text-blue-700 border-blue-300", text: "Postar Hoje" };
    }
    
    return { icon: Calendar, color: "bg-gray-100 text-gray-600 border-gray-300", text: "Agendado" };
  };

  const handleOpenForm = (dia?: Date) => {
    setFormData({
      data_postagem: dia ? format(dia, "yyyy-MM-dd") : undefined,
      data_producao: dia ? format(addDays(dia, -1), "yyyy-MM-dd") : undefined,
    });
    setFormDialogOpen(true);
  };

  const handleEditItem = (item: MarketingItem) => {
    setFormData(item);
    setFormDialogOpen(true);
  };

  const handleViewDetails = (item: MarketingItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const handleSave = () => {
    if (!formData.titulo || !formData.categoria || !formData.data_postagem) {
      toast.error("Preencha os campos obrigatórios!");
      return;
    }
    upsertMutation.mutate(formData);
  };

  const handleCheck = () => {
    if (!selectedItem || !horarioRealInput) {
      toast.error("Informe o horário real de postagem!");
      return;
    }
    checkMutation.mutate({ id: selectedItem.id, horario: horarioRealInput });
  };

  const handleAddHorario = () => {
    const newHorario = prompt("Digite o horário (ex: 09:00):");
    if (newHorario) {
      setFormData(prev => ({
        ...prev,
        horarios_postagem: [...(prev.horarios_postagem || []), newHorario],
      }));
    }
  };

  const handleRemoveHorario = (horario: string) => {
    setFormData(prev => ({
      ...prev,
      horarios_postagem: (prev.horarios_postagem || []).filter(h => h !== horario),
    }));
  };

  const handleOpenGridPlanning = () => {
    // Inicializar tipos de postagem com IDs únicos
    const tipos = tiposPostagemPadrao.map((t, idx) => ({
      ...t,
      id: `tipo-${idx}`,
    }));
    setTiposPostagem(tipos);

    // Preencher grid com dados existentes
    const grid: Record<string, Record<string, CelulaData>> = {};
    
    tipos.forEach(tipo => {
      grid[tipo.id] = {};
      weekDays.forEach(dia => {
        const dayKey = format(dia, "yyyy-MM-dd");
        const tarefas = tarefasPorDia[dayKey] || [];
        const tarefa = tarefas.find(t => 
          t.categoria === tipo.categoria && 
          t.horarios_postagem?.includes(tipo.horario)
        );
        grid[tipo.id][dayKey] = {
          titulo: tarefa?.titulo || "",
          descricao: tarefa?.descricao || "",
          data_producao: tarefa?.data_producao || format(addDays(dia, -1), "yyyy-MM-dd"),
          responsavel: tarefa?.responsavel || "",
        };
      });
    });
    
    setGridData(grid);
    setGridDialogOpen(true);
  };

  const handleSaveGrid = async () => {
    try {
      const updates: Array<{ id: string; payload: any }> = [];
      const inserts: any[] = [];

      tiposPostagem.forEach(tipo => {
        weekDays.forEach(dia => {
          const dayKey = format(dia, "yyyy-MM-dd");
          const celula = gridData[tipo.id]?.[dayKey];

          if (celula?.titulo && celula.titulo.trim()) {
            // Verifica se já existe uma tarefa
            const tarefas = tarefasPorDia[dayKey] || [];
            const existente = tarefas.find(t => 
              t.categoria === tipo.categoria && 
              t.horarios_postagem?.includes(tipo.horario)
            );

            const payload = {
              titulo: celula.titulo.trim(),
              descricao: celula.descricao?.trim() || null,
              categoria: tipo.categoria,
              data_postagem: dayKey,
              data_producao: celula.data_producao || format(addDays(parseISO(dayKey), -1), "yyyy-MM-dd"),
              responsavel: celula.responsavel || null,
              horarios_postagem: [tipo.horario],
              semana_referencia: format(safeWeekStart, "yyyy-MM-dd"),
            };

            if (existente) {
              updates.push({ id: existente.id, payload });
            } else {
              inserts.push(payload);
            }
          }
        });
      });

      // Executar updates
      for (const { id, payload } of updates) {
        const { error } = await supabase.from("marketing_items").update(payload).eq("id", id);
        if (error) throw error;
      }

      // Executar inserts
      if (inserts.length > 0) {
        const { error } = await supabase.from("marketing_items").insert(inserts);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["marketing_items"] });
      toast.success("Planejamento salvo com sucesso!");
      setGridDialogOpen(false);
    } catch (error: any) {
      toast.error("Erro ao salvar planejamento: " + error.message);
    }
  };

  const handleGridInputChange = (tipoId: string, dia: string, field: keyof CelulaData, value: string) => {
    setGridData(prev => ({
      ...prev,
      [tipoId]: {
        ...prev[tipoId],
        [dia]: {
          ...prev[tipoId]?.[dia],
          [field]: value,
        },
      },
    }));
  };

  const handleTipoChange = (tipoId: string, field: keyof TipoPostagem, value: string) => {
    setTiposPostagem(prev =>
      prev.map(t => (t.id === tipoId ? { ...t, [field]: value } : t))
    );
  };

  const handleAddTipo = () => {
    const newTipo: TipoPostagem = {
      id: `tipo-${Date.now()}`,
      tipo: "Novo tipo",
      horario: "12:00",
      categoria: "Reels",
    };
    setTiposPostagem(prev => [...prev, newTipo]);
    setGridData(prev => ({
      ...prev,
      [newTipo.id]: {},
    }));
  };

  const handleRemoveTipo = (tipoId: string) => {
    setTiposPostagem(prev => prev.filter(t => t.id !== tipoId));
    setGridData(prev => {
      const newData = { ...prev };
      delete newData[tipoId];
      return newData;
    });
  };

  const toggleCellExpanded = (tipoId: string, dia: string) => {
    const key = `${tipoId}-${dia}`;
    setExpandedCell(expandedCell === key ? null : key);
  };

  return (
    <MainLayout title="Marketing - Gestão de Conteúdo">
      <div className="space-y-6">
        {/* Header com navegação de semana */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">📅 {weekLabel}</h2>
            <p className="text-sm text-muted-foreground">
              Planejamento semanal de postagens
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekStart(prev => addDays(prev, -7))}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="filtro-responsavel" className="text-sm">Responsável</Label>
                <Select value={filtroResponsavel} onValueChange={setFiltroResponsavel}>
                  <SelectTrigger id="Filtradasfiltro-responsavel">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {responsavelOptions.map(resp => (
                      <SelectItem key={resp} value={resp}>{resp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="filtro-data-producao" className="text-sm">Data de Produção</Label>
                <Input
                  id="filtro-data-producao"
                  type="date"
                  value={filtroDataProducao}
                  onChange={(e) => setFiltroDataProducao(e.target.value)}
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="filtro-data-postagem" className="text-sm">Data de Postagem</Label>
                <Input
                  id="filtro-data-postagem"
                  type="date"
                  value={filtroDataPostagem}
                  onChange={(e) => setFiltroDataPostagem(e.target.value)}
                />
              </div>

              {(filtroResponsavel !== "todos" || filtroDataProducao || filtroDataPostagem) && (
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setFiltroResponsavel("todos");
                      setFiltroDataProducao("");
                      setFiltroDataPostagem("");
                    }}
                  >
                    Limpar Filtros
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
            <Button
              variant="outline"
              onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              Hoje
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekStart(prev => addDays(prev, 7))}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            
            {!isSocialMedia && (
              <Button onClick={() => handleOpenForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Tarefa
              </Button>
            )}
            
            {!isSocialMedia && (
              <Button onClick={handleOpenGridPlanning} variant="secondary">
                📋 Planejamento Grid
              </Button>
            )}
          </div>
        </div>

        {/* Grid semanal - 5 colunas (Seg-Sex) */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {weekDays.map(dia => {
              const dayKey = format(dia, "yyyy-MM-dd");
              const tarefas = tarefasPorDia[dayKey] || [];
              const isHoje = isSameDay(dia, new Date());

              return (
                <div key={dayKey} className="space-y-2">
                  {/* Cabeçalho do dia */}
                  <div className={`text-center p-2 rounded-lg ${isHoje ? 'bg-primary/10 border-2 border-primary' : 'bg-muted'}`}>
                    <div className="font-bold">{format(dia, "EEE", { locale: ptBR })}</div>
                    <div className="text-sm text-muted-foreground">{format(dia, "dd/MM")}</div>
                  </div>

                  {/* Cards de tarefas */}
                  <div className="space-y-2 min-h-[200px]">
                    {tarefas.map(tarefa => {
                      const badge = getBadge(tarefa);
                      const BadgeIcon = badge.icon;

                      return (
                        <Card
                          key={tarefa.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => handleViewDetails(tarefa)}
                        >
                          <CardContent className="p-3 space-y-2">
                            <Badge className={badge.color}>
                              <BadgeIcon className="h-3 w-3 mr-1" />
                              {badge.text}
                            </Badge>
                            
                            <h4 className="font-semibold text-sm">{tarefa.titulo}</h4>
                            
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {tarefa.responsavel || "Não atribuído"}
                              </div>
                              {tarefa.horarios_postagem && tarefa.horarios_postagem.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {tarefa.horarios_postagem.join(", ")}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    
                    {/* Botão de adicionar (apenas para não social media) */}
                    {!isSocialMedia && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleOpenForm(dia)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drawer de Detalhes */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md">
          {selectedItem && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between">
                  <span>{selectedItem.titulo}</span>
                  {!isSocialMedia && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          handleEditItem(selectedItem);
                          setDrawerOpen(false);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(selectedItem.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Categoria</Label>
                  <p className="font-medium">{selectedItem.categoria}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Descrição</Label>
                  <p className="text-sm">{selectedItem.descricao || "Sem descrição"}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Responsável</Label>
                  <p className="font-medium">{selectedItem.responsavel || "Não atribuído"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Produzir em</Label>
                    <p className="text-sm">
                      {selectedItem.data_producao
                        ? format(parseISO(selectedItem.data_producao), "dd/MM/yyyy", { locale: ptBR })
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Postar em</Label>
                    <p className="text-sm">
                      {selectedItem.data_postagem
                        ? format(parseISO(selectedItem.data_postagem), "dd/MM/yyyy", { locale: ptBR })
                        : "-"}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Horários Planejados</Label>
                  <p className="text-sm">{selectedItem.horarios_postagem?.join(", ") || "Não definido"}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    {selectedItem.produzido ? (
                      <Badge className="bg-green-100 text-green-700">
                        ✅ Concluído em {selectedItem.check_timestamp
                          ? format(parseISO(selectedItem.check_timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "-"}
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-700">
                        ⏳ Aguardando
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Seção de Check (apenas se não estiver concluído) */}
                {!selectedItem.produzido && (
                  <>
                    <div className="border-t pt-4">
                      <Label className="font-semibold">Marcar como Realizado</Label>
                    </div>

                    <div>
                      <Label htmlFor="horario-real">Horário Real de Postagem</Label>
                      <Input
                        id="horario-real"
                        type="time"
                        value={horarioRealInput}
                        onChange={(e) => setHorarioRealInput(e.target.value)}
                        placeholder="ex: 09:15"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Informe o horário em que foi postado ou programado
                      </p>
                    </div>
                  </>
                )}
              </div>

              {!selectedItem.produzido && (
                <SheetFooter>
                  <Button
                    onClick={handleCheck}
                    className="w-full"
                    disabled={checkMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Marcar como Realizado
                  </Button>
                </SheetFooter>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog de Formulário */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{formData.id ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={formData.titulo || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="ex: Reels Institucional"
              />
            </div>

            <div>
              <Label htmlFor="categoria">Categoria *</Label>
              <Select
                value={formData.categoria || ""}
                onValueChange={(value) => setFormData(prev => ({ ...prev, categoria: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descreva o conteúdo da postagem"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="responsavel">Responsável</Label>
              <Select
                value={formData.responsavel || ""}
                onValueChange={(value) => setFormData(prev => ({ ...prev, responsavel: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {responsavelOptions.map(resp => (
                    <SelectItem key={resp} value={resp}>{resp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data-producao">Data de Produção</Label>
                <Input
                  id="data-producao"
                  type="date"
                  value={formData.data_producao || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_producao: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="data-postagem">Data de Postagem *</Label>
                <Input
                  id="data-postagem"
                  type="date"
                  value={formData.data_postagem || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_postagem: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Horários de Postagem</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {(formData.horarios_postagem || []).map(horario => (
                  <Badge key={horario} variant="secondary">
                    {horario}
                    <button
                      onClick={() => handleRemoveHorario(horario)}
                      className="ml-2 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddHorario}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Planejamento Grid (estilo planilha) */}
      <Dialog open={gridDialogOpen} onOpenChange={setGridDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>📋 Planejamento Semanal - Modo Grid</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Preencha rapidamente o planejamento da semana. Clique em uma célula para expandir e preencher detalhes.
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-background z-20">
                <tr className="bg-muted">
                  <th className="border p-2 text-left font-semibold w-[250px] sticky left-0 bg-muted z-30">
                    Tipo de Postagem
                  </th>
                  <th className="border p-2 text-center w-[80px]">Horário</th>
                  <th className="border p-2 text-center w-[100px]">Categoria</th>
                  {weekDays.map(dia => (
                    <th key={format(dia, "yyyy-MM-dd")} className="border p-2 text-center min-w-[180px]">
                      <div className="font-bold">{format(dia, "EEE", { locale: ptBR })}</div>
                      <div className="text-xs text-muted-foreground">{format(dia, "dd/MM")}</div>
                    </th>
                  ))}
                  <th className="border p-2 w-[60px] sticky right-0 bg-muted z-30"></th>
                </tr>
              </thead>
              <tbody>
                {tiposPostagem.map(tipo => (
                  <tr key={tipo.id} className="hover:bg-muted/30">
                    <td className="border p-2 sticky left-0 bg-background z-10">
                      <Input
                        value={tipo.tipo}
                        onChange={(e) => handleTipoChange(tipo.id, "tipo", e.target.value)}
                        className="text-xs h-8 font-medium"
                        placeholder="Nome do tipo"
                      />
                    </td>
                    <td className="border p-1">
                      <Input
                        type="time"
                        value={tipo.horario}
                        onChange={(e) => handleTipoChange(tipo.id, "horario", e.target.value)}
                        className="text-xs h-8 w-[75px] font-mono"
                      />
                    </td>
                    <td className="border p-1">
                      <Select
                        value={tipo.categoria}
                        onValueChange={(value) => handleTipoChange(tipo.id, "categoria", value)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    {weekDays.map(dia => {
                      const dayKey = format(dia, "yyyy-MM-dd");
                      const celula = gridData[tipo.id]?.[dayKey] || { titulo: "", descricao: "", data_producao: "", responsavel: "" };
                      const cellKey = `${tipo.id}-${dayKey}`;
                      const isExpanded = expandedCell === cellKey;

                      return (
                        <td key={dayKey} className="border p-1 align-top">
                          <div className="space-y-1">
                            <Input
                              value={celula.titulo}
                              onChange={(e) => handleGridInputChange(tipo.id, dayKey, "titulo", e.target.value)}
                              onFocus={() => toggleCellExpanded(tipo.id, dayKey)}
                              placeholder="Título..."
                              className="text-xs h-8 border-0 focus-visible:ring-1"
                            />
                            {isExpanded && (
                              <div className="space-y-1 p-2 bg-muted/30 rounded border">
                                <Textarea
                                  value={celula.descricao || ""}
                                  onChange={(e) => handleGridInputChange(tipo.id, dayKey, "descricao", e.target.value)}
                                  placeholder="Descrição..."
                                  className="text-xs min-h-[60px]"
                                  rows={2}
                                />
                                <div className="grid grid-cols-2 gap-1">
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground">Data Produção</Label>
                                    <Input
                                      type="date"
                                      value={celula.data_producao || ""}
                                      onChange={(e) => handleGridInputChange(tipo.id, dayKey, "data_producao", e.target.value)}
                                      className="text-xs h-7"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground">Responsável</Label>
                                    <Select
                                      value={celula.responsavel || ""}
                                      onValueChange={(value) => handleGridInputChange(tipo.id, dayKey, "responsavel", value)}
                                    >
                                      <SelectTrigger className="h-7 text-xs">
                                        <SelectValue placeholder="Selecione" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {responsavelOptions.map(resp => (
                                          <SelectItem key={resp} value={resp}>{resp}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setExpandedCell(null)}
                                  className="w-full h-6 text-[10px]"
                                >
                                  Fechar
                                </Button>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="border p-1 text-center sticky right-0 bg-background z-10">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleRemoveTipo(tipo.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3 + weekDays.length + 1} className="border p-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddTipo}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Tipo de Postagem
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setGridDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveGrid}>
              💾 Salvar Planejamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
