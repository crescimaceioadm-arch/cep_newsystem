import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, eachDayOfInterval, format, isSameDay, isWithinInterval, parseISO, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { CalendarDays, Clapperboard, Clock3, ArrowLeft, ArrowRight, Plus, Film, CheckCircle2, AlertCircle, Save, Trash2, Check, ChevronsUpDown } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

import type { UserRole } from "@/contexts/UserContext";

type ViewMode = "planejamento" | "producao";

type MarketingItem = {
  id: string;
  titulo?: string | null;
  descricao?: string | null;
  categoria?: string | null;
  data_postagem?: string | null;
  dia_postagem?: string | null;
  data_producao?: string | null;
  dia_producao?: string | null;
  produzido?: boolean | null;
  hora_sugerida?: string | null;
  hora_real?: string | null;
  created_at?: string | null;
};

type MarketingPreset = {
  id: string;
  tipo?: string | null;
  valor?: string | null;
  categoria?: string | null;
  hora_sugerida?: string | null;
  titulo_padrao?: string | null;
  descricao_padrao?: string | null;
};

type UpdatePayload = {
  id: string;
  produzido?: boolean;
  hora_real?: string | null;
};

type EditableRow = {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  horaSugerida: string;
  diaProducao: string;
  diaPostagem: string;
  isNew: boolean;
};

const dayOptions = [
  { value: "segunda", label: "Segunda-Feira", index: 0 },
  { value: "terca", label: "Terca-Feira", index: 1 },
  { value: "quarta", label: "Quarta-Feira", index: 2 },
  { value: "quinta", label: "Quinta-Feira", index: 3 },
  { value: "sexta", label: "Sexta-Feira", index: 4 },
  { value: "sabado", label: "Sabado", index: 5 },
  { value: "domingo", label: "Domingo", index: 6 },
];

const normalizeDay = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const dayValueToIndex = (value: string) => {
  const normalized = normalizeDay(value);
  const found = dayOptions.find(
    (day) => normalizeDay(day.value) === normalized || normalizeDay(day.label) === normalized
  );
  return found?.index ?? 0;
};

const isIsoDate = (value: string) => /\d{4}-\d{2}-\d{2}/.test(value);

const resolveDate = (raw: string | null | undefined, baseWeek: Date) => {
  if (!raw) return null;
  if (isIsoDate(raw)) {
    try {
      const parsed = parseISO(raw);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    } catch (err) {
      console.error("Erro ao converter data:", err);
      return null;
    }
  }

  const index = dayValueToIndex(raw);
  const weekStart = startOfWeek(baseWeek, { weekStartsOn: 1 });
  return addDays(weekStart, index);
};

const formatDay = (date: Date) => format(date, "EEE dd/MM", { locale: ptBR });

export default function Marketing() {
  const { cargo } = useUser();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<ViewMode>("planejamento");
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [editableRows, setEditableRows] = useState<EditableRow[]>([]);
  const [openCategoryPopover, setOpenCategoryPopover] = useState<string | null>(null);
  const [openHourPopover, setOpenHourPopover] = useState<string | null>(null);

  const isSocialMedia = (cargo as UserRole | string) === "social_media";

  useEffect(() => {
    if (isSocialMedia) {
      setViewMode("producao");
    }
  }, [isSocialMedia]);

  const safeWeekStart = useMemo(
    () => startOfWeek(weekStart, { weekStartsOn: 1 }),
    [weekStart]
  );

  const weekDays = useMemo(
    () => eachDayOfInterval({ start: safeWeekStart, end: addDays(safeWeekStart, 6) }),
    [safeWeekStart]
  );

  const weekLabel = `${format(safeWeekStart, "dd MMM", { locale: ptBR })} - ${format(
    addDays(safeWeekStart, 6),
    "dd MMM",
    { locale: ptBR }
  )}`;

  const { data: presets, isLoading: loadingPresets, isError: presetsError, error: presetsQueryError, refetch: refetchPresets } = useQuery({
    queryKey: ["marketing_presets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_presets")
        .select("*")
        .order("tipo", { ascending: true })
        .order("valor", { ascending: true });

      if (error) throw error;
      return data as MarketingPreset[];
    },
  });

  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: ["marketing_items", format(safeWeekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const start = format(safeWeekStart, "yyyy-MM-dd");
      const end = format(addDays(safeWeekStart, 6), "yyyy-MM-dd");

      try {
        const { data, error } = await supabase
          .from("marketing_items")
          .select("*")
          .or(
            `and(data_postagem.gte.${start},data_postagem.lte.${end}),and(data_producao.gte.${start},data_producao.lte.${end})`
          )
          .order("data_postagem", { ascending: true });

        if (error) throw error;
        return (data as MarketingItem[]) || [];
      } catch (error) {
        console.warn("Filtro por data falhou, buscando tudo:", error);
        const fallback = await supabase
          .from("marketing_items")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(120);

        if (fallback.error) throw fallback.error;
        return (fallback.data as MarketingItem[]) || [];
      }
    },
  });

  const categoryOptions = useMemo(() => {
    const unique = new Set<string>();
    presets?.forEach((preset) => {
      if (preset.tipo === "categoria" && preset.valor) unique.add(preset.valor);
    });
    return Array.from(unique);
  }, [presets]);

  const hourOptions = useMemo(() => {
    const unique = new Set<string>();
    presets
      ?.filter((preset) => preset.tipo === "horario")
      .forEach((preset) => {
        if (preset.valor) unique.add(preset.valor);
      });
    return Array.from(unique);
  }, [presets]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    const window = { start: safeWeekStart, end: addDays(safeWeekStart, 6) };
    return items.filter((item) => {
      const postagem = resolveDate(item.data_postagem || item.dia_postagem, safeWeekStart);
      const producao = resolveDate(item.data_producao || item.dia_producao, safeWeekStart);
      return (
        (postagem && isWithinInterval(postagem, window)) ||
        (producao && isWithinInterval(producao, window))
      );
    });
  }, [items, safeWeekStart]);

  useEffect(() => {
    if (filteredItems && viewMode === "planejamento") {
      const rows: EditableRow[] = filteredItems.map((item) => ({
        id: item.id,
        titulo: item.titulo || "",
        descricao: item.descricao || "",
        categoria: item.categoria || "",
        horaSugerida: item.hora_sugerida || "",
        diaProducao: item.dia_producao || item.data_producao || "",
        diaPostagem: item.dia_postagem || item.data_postagem || "",
        isNew: false,
      }));
      setEditableRows(rows);
    }
  }, [filteredItems, viewMode]);

  const monitorPorDia = useMemo(
    () =>
      weekDays.map((day) => ({
        day,
        items: filteredItems.filter((item) => {
          const postagem = resolveDate(item.data_postagem || item.dia_postagem, safeWeekStart);
          return postagem ? isSameDay(postagem, day) : false;
        }),
      })),
    [filteredItems, safeWeekStart, weekDays]
  );

  const producaoPorDia = useMemo(
    () =>
      weekDays.map((day) => ({
        day,
        items: filteredItems.filter((item) => {
          const producao = resolveDate(item.data_producao || item.dia_producao, safeWeekStart);
          return producao ? isSameDay(producao, day) : false;
        }),
      })),
    [filteredItems, safeWeekStart, weekDays]
  );

  const planningList = useMemo(() => {
    const withPostDate = filteredItems.map((item) => {
      const postagem = resolveDate(item.data_postagem || item.dia_postagem, safeWeekStart);
      return { ...item, postagem };
    });

    return withPostDate.sort((a, b) => {
      if (!a.postagem || !b.postagem) return 0;
      return a.postagem.getTime() - b.postagem.getTime();
    });
  }, [filteredItems, safeWeekStart]);

  const upsertRow = useMutation({
    mutationFn: async (row: EditableRow) => {
      if (!row.categoria || !row.titulo.trim()) {
        throw new Error("Categoria e Titulo sao obrigatorios");
      }

      const producaoDate = isIsoDate(row.diaProducao)
        ? row.diaProducao
        : format(addDays(safeWeekStart, dayValueToIndex(row.diaProducao)), "yyyy-MM-dd");
      const postagemDate = isIsoDate(row.diaPostagem)
        ? row.diaPostagem
        : format(addDays(safeWeekStart, dayValueToIndex(row.diaPostagem)), "yyyy-MM-dd");

      const payload = {
        titulo: row.titulo.trim(),
        descricao: row.descricao.trim() || null,
        categoria: row.categoria,
        data_producao: producaoDate,
        data_postagem: postagemDate,
        semana_referencia: format(safeWeekStart, "yyyy-MM-dd"),
      };

      if (row.isNew) {
        const { error } = await supabase.from("marketing_items").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("marketing_items").update(payload).eq("id", row.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Item salvo com sucesso");
      queryClient.invalidateQueries({ queryKey: ["marketing_items"] });
    },
    onError: (error: any) => {
      console.error("Erro completo:", error);
      const message = error?.message || error?.error_description || "Erro ao salvar item";
      toast.error(message);
    },
  });

  const deleteRow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item excluido");
      queryClient.invalidateQueries({ queryKey: ["marketing_items"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Erro ao excluir item";
      toast.error(message);
    },
  });

  const updateItem = useMutation({
    mutationFn: async (payload: UpdatePayload) => {
      const { id, ...values } = payload;
      const { error } = await supabase.from("marketing_items").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing_items"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Erro ao atualizar item";
      toast.error(message);
    },
  });

  const handleAddRow = () => {
    const newRow: EditableRow = {
      id: `new-${Date.now()}`,
      titulo: "",
      descricao: "",
      categoria: "",
      horaSugerida: "",
      diaProducao: dayOptions[0].value,
      diaPostagem: dayOptions[0].value,
      isNew: true,
    };
    setEditableRows([...editableRows, newRow]);
  };

  const handleUpdateRow = (id: string, field: keyof EditableRow, value: string) => {
    setEditableRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleSaveRow = (row: EditableRow) => {
    if (!row.categoria) {
      toast.error("Selecione a categoria");
      return;
    }
    if (!row.titulo.trim()) {
      toast.error("Informe um titulo");
      return;
    }
    upsertRow.mutate(row);
  };

  const handleDeleteRow = (row: EditableRow) => {
    if (row.isNew) {
      setEditableRows((prev) => prev.filter((r) => r.id !== row.id));
    } else {
      deleteRow.mutate(row.id);
    }
  };

  const handleToggleProduzido = (item: MarketingItem, value: boolean) => {
    updateItem.mutate({ id: item.id, produzido: value });
  };

  const handleHoraRealBlur = (item: MarketingItem, value: string) => {
    updateItem.mutate({ id: item.id, hora_real: value || null });
  };

  return (
    <MainLayout title="Marketing">
      <div className="space-y-6">
        <div className="sticky top-4 z-20 space-y-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <Card className="shadow-md border-dashed">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-primary" />
                <CardTitle>Monitor de Postagens</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Semana anterior"
                  onClick={() => setWeekStart(addDays(safeWeekStart, -7))}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="px-4"
                  onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                >
                  {weekLabel}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Proxima semana"
                  onClick={() => setWeekStart(addDays(safeWeekStart, 7))}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
                {monitorPorDia.map(({ day, items: itemsDoDia }) => (
                  <div key={day.toISOString()} className="rounded-lg border bg-muted/40 p-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {format(day, "EEE", { locale: ptBR })}
                    </div>
                    <div className="text-sm font-semibold">{format(day, "dd/MM")}</div>
                    <div className="mt-2 flex flex-col gap-2">
                      {itemsDoDia.length === 0 && (
                        <p className="text-xs text-muted-foreground">Sem posts</p>
                      )}
                      {itemsDoDia.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center gap-2 rounded border px-2 py-1 text-xs ${
                            item.produzido ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              item.produzido ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          <span className="truncate">{item.titulo || item.categoria || "Conteudo"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) => value && setViewMode(value as ViewMode)}
                className="border rounded-full bg-muted/50 px-1"
              >
                <ToggleGroupItem value="planejamento" disabled={isSocialMedia} className="px-4">
                  📝 Modo Planejamento
                </ToggleGroupItem>
                <ToggleGroupItem value="producao" className="px-4">
                  🎬 Modo Producao
                </ToggleGroupItem>
              </ToggleGroup>
          </div>
        </div>

        {viewMode === "planejamento" ? (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clapperboard className="h-5 w-5 text-primary" />
                    Planejamento da Semana
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Edite os campos diretamente na tabela. Clique em Salvar para confirmar.
                  </p>
                </div>
                {!isSocialMedia && (
                  <Button onClick={handleAddRow} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Linha
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingItems ? (
                <p className="text-muted-foreground text-sm">Carregando...</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Categoria</TableHead>
                        <TableHead className="w-[120px]">Horário</TableHead>
                        <TableHead className="min-w-[200px]">Título do Vídeo</TableHead>
                        <TableHead className="w-[140px]">Dia Produção</TableHead>
                        <TableHead className="w-[140px]">Dia Postagem</TableHead>
                        <TableHead className="w-[100px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editableRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            <div className="flex flex-col items-center gap-2">
                              <AlertCircle className="h-5 w-5" />
                              <span>Nenhum item. Clique em "Adicionar Linha" para começar.</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        editableRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <Popover
                                open={openCategoryPopover === row.id}
                                onOpenChange={(open) => setOpenCategoryPopover(open ? row.id : null)}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between"
                                  >
                                    {row.categoria || "Selecione..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[200px] p-0">
                                  <Command>
                                    <CommandInput placeholder="Buscar categoria..." />
                                    <CommandList>
                                      <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                                      <CommandGroup>
                                        {categoryOptions.map((option) => (
                                          <CommandItem
                                            key={option}
                                            value={option}
                                            onSelect={() => {
                                              handleUpdateRow(row.id, "categoria", option);
                                              setOpenCategoryPopover(null);
                                            }}
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${
                                                row.categoria === option ? "opacity-100" : "opacity-0"
                                              }`}
                                            />
                                            {option}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell>
                              <Popover
                                open={openHourPopover === row.id}
                                onOpenChange={(open) => setOpenHourPopover(open ? row.id : null)}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between"
                                  >
                                    {row.horaSugerida || "Nenhum"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[140px] p-0">
                                  <Command>
                                    <CommandInput placeholder="Buscar horário..." />
                                    <CommandList>
                                      <CommandEmpty>Nenhum horário encontrado.</CommandEmpty>
                                      <CommandGroup>
                                        <CommandItem
                                          value=""
                                          onSelect={() => {
                                            handleUpdateRow(row.id, "horaSugerida", "");
                                            setOpenHourPopover(null);
                                          }}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              !row.horaSugerida ? "opacity-100" : "opacity-0"
                                            }`}
                                          />
                                          Nenhum
                                        </CommandItem>
                                        {hourOptions.map((hour) => (
                                          <CommandItem
                                            key={hour}
                                            value={hour}
                                            onSelect={() => {
                                              handleUpdateRow(row.id, "horaSugerida", hour);
                                              setOpenHourPopover(null);
                                            }}
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${
                                                row.horaSugerida === hour ? "opacity-100" : "opacity-0"
                                              }`}
                                            />
                                            {hour}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={row.titulo}
                                onChange={(e) => handleUpdateRow(row.id, "titulo", e.target.value)}
                                placeholder="Digite o título..."
                                className="w-full"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={row.diaProducao}
                                onValueChange={(value) => handleUpdateRow(row.id, "diaProducao", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {dayOptions.map((day) => (
                                    <SelectItem key={day.value} value={day.value}>
                                      {day.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={row.diaPostagem}
                                onValueChange={(value) => handleUpdateRow(row.id, "diaPostagem", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {dayOptions.map((day) => (
                                    <SelectItem key={day.value} value={day.value}>
                                      {day.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleSaveRow(row)}
                                  disabled={upsertRow.isPending}
                                >
                                  <Save className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDeleteRow(row)}
                                  disabled={deleteRow.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-col gap-1">
              <CardTitle className="flex items-center gap-2">
                <Film className="h-5 w-5 text-primary" />
                Modo Producao
              </CardTitle>
              <p className="text-sm text-muted-foreground">Marque os conteudos produzidos e registre o horario real.</p>
            </CardHeader>
            <CardContent>
              {loadingItems ? (
                <p className="text-muted-foreground text-sm">Carregando...</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
                  {producaoPorDia.map(({ day, items: itemsDoDia }) => (
                    <div key={day.toISOString()} className="rounded-lg border bg-muted/40 p-3 flex flex-col gap-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {format(day, "EEE", { locale: ptBR })}
                      </div>
                      <div className="text-sm font-semibold">{format(day, "dd/MM")}</div>
                      {itemsDoDia.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Sem producao</p>
                      ) : (
                        <div className="space-y-2">
                          {itemsDoDia.map((item) => (
                            <div key={item.id} className="rounded-lg border bg-background p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <p className="text-sm font-semibold leading-tight">{item.titulo || "Conteudo"}</p>
                                  <p className="text-xs text-muted-foreground">{item.categoria || "Sem categoria"}</p>
                                  {item.hora_sugerida && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock3 className="h-3 w-3" />
                                      Sugestao: {item.hora_sugerida}
                                    </div>
                                  )}
                                </div>
                                <Switch
                                  checked={!!item.produzido}
                                  onCheckedChange={(value) => handleToggleProduzido(item, value)}
                                  className="data-[state=checked]:bg-green-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Hora Real</Label>
                                <Input
                                  type="time"
                                  defaultValue={item.hora_real || ""}
                                  onBlur={(e) => handleHoraRealBlur(item, e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
