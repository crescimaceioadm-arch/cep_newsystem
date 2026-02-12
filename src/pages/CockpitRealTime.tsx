import { useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useAtendimentos } from "@/hooks/useAtendimentos";
import { useClientesPreferenciaBatch } from "@/hooks/useClientePreferenciaPagemento";
import { ClientePreferenciaPaymentBadgeRender } from "@/components/ClientePreferenciaPaymentBadge";
import { StatusBadge } from "@/components/recepcao/StatusBadge";
import { convertToLocalTime } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Atendimento } from "@/types/database";

const isAvaliacaoEmAberto = (status?: string | null) => {
  return status !== "finalizado" && status !== "recusado" && status !== "recusou";
};

const normalizeNome = (nome?: string | null) => {
  if (!nome) return "";
  return nome.trim().toLowerCase().replace(/\s+/g, " ");
};

const formatPagamentos = (atendimento: Atendimento) => {
  const pagamentos = [
    { metodo: atendimento.pagamento_1_metodo, valor: atendimento.pagamento_1_valor },
    { metodo: atendimento.pagamento_2_metodo, valor: atendimento.pagamento_2_valor },
    { metodo: atendimento.pagamento_3_metodo, valor: atendimento.pagamento_3_valor },
  ].filter((p) => p.metodo);

  if (pagamentos.length === 0) return "-";

  return pagamentos
    .map((p) => `${p.metodo}${p.valor != null ? ` (R$ ${Number(p.valor).toFixed(2)})` : ""}`)
    .join(" / ");
};

const calcularTempoEsperaMin = (horaChegada: string) => {
  const chegada = convertToLocalTime(horaChegada) || new Date(horaChegada);
  if (Number.isNaN(chegada.getTime())) return null;
  const agora = new Date();
  const diffMs = agora.getTime() - chegada.getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
};

const formatTempoEspera = (minutos: number | null) => {
  if (minutos === null) return "--";
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;
  return horas > 0 ? `${horas}h ${minutosRestantes}min` : `${minutos}min`;
};

const formatValorTotal = (atendimento: Atendimento) => {
  if (atendimento.valor_total_negociado != null) {
    return `R$ ${Number(atendimento.valor_total_negociado).toFixed(2)}`;
  }

  const total =
    (atendimento.pagamento_1_valor || 0) +
    (atendimento.pagamento_2_valor || 0) +
    (atendimento.pagamento_3_valor || 0);

  return total > 0 ? `R$ ${total.toFixed(2)}` : "-";
};

const getItensResumo = (atendimento: Atendimento) => {
  const itens = atendimento.itens || [];
  if (itens.length === 0) return [] as Array<{ nome: string; quantidade: number }>;

  const map = new Map<string, number>();
  itens.forEach((item: any) => {
    const nome = item.categoria?.nome || item.categoria?.slug || "Categoria";
    const qtd = Number(item.quantidade || 0);
    if (!qtd) return;
    map.set(nome, (map.get(nome) || 0) + qtd);
  });

  return Array.from(map.entries()).map(([nome, quantidade]) => ({ nome, quantidade }));
};

export default function CockpitRealTime() {
  const { data: atendimentos, isLoading } = useAtendimentos();

  const atendimentosEmAberto = useMemo(() => {
    return (atendimentos || []).filter((a) => isAvaliacaoEmAberto(a.status));
  }, [atendimentos]);

  const clientesMap = useMemo(() => {
    const map = new Map<string, Atendimento[]>();
    atendimentosEmAberto.forEach((a) => {
      if (!a.nome_cliente) return;
      const key = normalizeNome(a.nome_cliente);
      const list = map.get(key) || [];
      list.push(a);
      map.set(key, list);
    });
    return map;
  }, [atendimentosEmAberto]);

  const nomesClientes = useMemo(() => {
    return atendimentosEmAberto.map((a) => a.nome_cliente).filter(Boolean) as string[];
  }, [atendimentosEmAberto]);

  const { data: preferenciasMap } = useClientesPreferenciaBatch(nomesClientes);

  const preferenciaByKey = useMemo(() => {
    const map = new Map<string, typeof preferenciasMap[string]>();
    Object.entries(preferenciasMap || {}).forEach(([nomeCliente, pref]) => {
      map.set(normalizeNome(nomeCliente), pref);
    });
    return map;
  }, [preferenciasMap]);

  const clientesSinalizados = useMemo(() => {
    return Array.from(clientesMap.entries())
      .map(([key, abertas]) => {
        const nomeExibicao = abertas[0]?.nome_cliente || "";
        const preferencia = preferenciaByKey.get(key);
        const totalFinalizadas = preferencia?.total_avaliacoes || 0;
        const percentualGira = preferencia?.percentual_gira ?? 0;
        const percentualDinheiro = 100 - percentualGira;
        const prefereGira = percentualGira >= percentualDinheiro;

        return {
          nome: nomeExibicao,
          preferencia,
          totalFinalizadas,
          prefereGira,
          abertas,
          key,
        };
      })
      .filter((c) => c.prefereGira || c.totalFinalizadas > 3);
  }, [preferenciaByKey, clientesMap]);

  const atendimentosPresenciaisEmAberto = useMemo(() => {
    return (atendimentosEmAberto || []).filter((a) => a.origem_avaliacao !== "whatsapp");
  }, [atendimentosEmAberto]);

  const historicoPorCliente = useMemo(() => {
    const map = new Map<string, Atendimento[]>();
    (atendimentos || []).forEach((a) => {
      if (!a.nome_cliente) return;
      const key = normalizeNome(a.nome_cliente);
      const list = map.get(key) || [];
      list.push(a);
      map.set(key, list);
    });
    return map;
  }, [atendimentos]);

  return (
    <MainLayout title="Cockpit real time">
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bloco Avaliações</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Carregando avaliações...</div>
              ) : clientesSinalizados.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhuma avaliação crítica em aberto.</div>
              ) : (
                <Accordion type="single" collapsible className="space-y-2">
                  {clientesSinalizados.map((cliente) => {
                    const historico = (historicoPorCliente.get(cliente.key) || [])
                      .slice()
                      .sort((a, b) => (a.hora_chegada < b.hora_chegada ? 1 : -1));
                    const temposAbertos = cliente.abertas
                      .map((aberta) => calcularTempoEsperaMin(aberta.hora_chegada))
                      .filter((m): m is number => m !== null);
                    const maiorTempo = temposAbertos.length > 0 ? Math.max(...temposAbertos) : null;
                    const tempoCritico = maiorTempo !== null && maiorTempo > 25;
                    const temWhatsapp = cliente.abertas.some((aberta) => aberta.origem_avaliacao === "whatsapp");
                    const aberturaMaisAntiga = cliente.abertas
                      .map((aberta) => convertToLocalTime(aberta.hora_chegada) || new Date(aberta.hora_chegada))
                      .filter((d) => !Number.isNaN(d.getTime()))
                      .sort((a, b) => a.getTime() - b.getTime())[0];

                    return (
                      <AccordionItem key={cliente.nome} value={cliente.nome} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-sm sm:text-base">{cliente.nome}</span>
                              <Badge variant="secondary">Em aberto: {cliente.abertas.length}</Badge>
                              <Badge variant="outline">Finalizadas: {cliente.totalFinalizadas}</Badge>
                              {temWhatsapp && aberturaMaisAntiga && (
                                <Badge variant="outline">
                                  WhatsApp • Abertura: {format(aberturaMaisAntiga, "dd/MM/yyyy", { locale: ptBR })}
                                </Badge>
                              )}
                              {!temWhatsapp && maiorTempo !== null && (
                                <Badge
                                  className={tempoCritico ? "bg-red-600 text-white" : "bg-muted text-foreground"}
                                >
                                  Espera: {formatTempoEspera(maiorTempo)}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <ClientePreferenciaPaymentBadgeRender
                                preferencia={cliente.preferencia}
                                showRecusas={false}
                              />
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                            <div className="text-xs text-muted-foreground">Histórico completo</div>
                            <div className="space-y-2">
                              {historico.map((item) => {
                                const itensResumo = getItensResumo(item);

                                return (
                                  <div
                                    key={item.id}
                                    className="flex flex-col gap-2 rounded-md border px-3 py-2 text-sm"
                                  >
                                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                      <div className="flex flex-col gap-1">
                                        <span className="font-medium">
                                          {format(
                                            convertToLocalTime(item.hora_chegada) || new Date(item.hora_chegada),
                                            "dd/MM/yyyy HH:mm",
                                            { locale: ptBR }
                                          )}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          Pagamento: {formatPagamentos(item)}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Valor:</span>
                                        <span className="text-sm font-semibold">{formatValorTotal(item)}</span>
                                        <StatusBadge status={item.status} />
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                      {itensResumo.length === 0 ? (
                                        <span className="text-muted-foreground">Sem itens</span>
                                      ) : (
                                        itensResumo.map((itemResumo) => (
                                          <Badge key={itemResumo.nome} variant="outline">
                                            {itemResumo.nome}: {itemResumo.quantidade}
                                          </Badge>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Avaliações presenciais em aberto</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Carregando avaliações...</div>
              ) : atendimentosPresenciaisEmAberto.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhuma avaliação presencial em aberto.</div>
              ) : (
                <div className="space-y-2">
                  {atendimentosPresenciaisEmAberto.map((atendimento) => {
                    const tempo = calcularTempoEsperaMin(atendimento.hora_chegada);
                    const tempoCritico = tempo !== null && tempo > 25;
                    const preferencia = preferenciaByKey.get(normalizeNome(atendimento.nome_cliente));

                    return (
                      <div
                        key={atendimento.id}
                        className="flex flex-col gap-2 rounded-md border px-3 py-2 text-sm"
                      >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{atendimento.nome_cliente || "-"}</span>
                            {tempo !== null && (
                              <Badge
                                className={tempoCritico ? "bg-red-600 text-white" : "bg-muted text-foreground"}
                              >
                                Espera: {formatTempoEspera(tempo)}
                              </Badge>
                            )}
                          </div>
                          <ClientePreferenciaPaymentBadgeRender preferencia={preferencia} showRecusas={false} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
