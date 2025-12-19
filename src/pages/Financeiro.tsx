import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCaixa } from "@/contexts/CaixaContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCaixas,
  useMovimentacoesCaixa,
  useTransferenciaCaixa,
  useMovimentacaoManual,
  Caixa,
} from "@/hooks/useCaixas";
import { FechamentoCaixaModal } from "@/components/financeiro/FechamentoCaixaModal";
import { Wallet, ArrowLeftRight, Plus, Minus, Lock, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Financeiro() {
  const { caixaSelecionado } = useCaixa();
  const { data: caixas, isLoading: loadingCaixas, refetch } = useCaixas();
  const { data: movimentacoes, isLoading: loadingMov } = useMovimentacoesCaixa();
  const { mutate: transferir, isPending: transferindo } = useTransferenciaCaixa();
  const { mutate: movimentar, isPending: movimentando } = useMovimentacaoManual();

  // Transferência
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [valorTransf, setValorTransf] = useState("");
  const [motivoTransf, setMotivoTransf] = useState("");

  // Movimentação Manual
  const [caixaMov, setCaixaMov] = useState("");
  const [tipoMov, setTipoMov] = useState<"entrada" | "saida">("entrada");
  const [valorMov, setValorMov] = useState("");
  const [motivoMov, setMotivoMov] = useState("");

  // Fechamento Modal
  const [modalFechamento, setModalFechamento] = useState(false);
  const [caixaFechamento, setCaixaFechamento] = useState<Caixa | null>(null);

  // Filtro de Data
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");

  const handleTransferencia = () => {
    if (!origem || !destino || !valorTransf || origem === destino) return;

    transferir(
      {
        origemNome: origem,
        destinoNome: destino,
        valor: parseFloat(valorTransf),
        motivo: motivoTransf || "Transferência entre caixas",
      },
      {
        onSuccess: () => {
          setOrigem("");
          setDestino("");
          setValorTransf("");
          setMotivoTransf("");
        },
      }
    );
  };

  const handleMovimentacao = () => {
    if (!caixaMov || !valorMov) return;

    movimentar(
      {
        caixaNome: caixaMov,
        tipo: tipoMov,
        valor: parseFloat(valorMov),
        motivo: motivoMov || (tipoMov === "entrada" ? "Entrada manual" : "Saída manual"),
      },
      {
        onSuccess: () => {
          setCaixaMov("");
          setValorMov("");
          setMotivoMov("");
        },
      }
    );
  };

  const openFechamento = (caixa: Caixa) => {
    setCaixaFechamento(caixa);
    setModalFechamento(true);
  };

  const getCaixaCardClass = (nome: string) => {
    if (nome === "Avaliação") {
      return "bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30";
    }
    return "bg-card";
  };

  const getCaixaIconClass = (nome: string) => {
    if (nome === "Avaliação") {
      return "text-green-600";
    }
    return "text-primary";
  };

  // Calcular extrato do caixa selecionado
  const extratoCalculado = useMemo(() => {
    if (!caixaSelecionado || !caixas || !movimentacoes) {
      return {
        caixaAtual: null,
        movimentacoesFiltradas: [],
        saldoInicial: 0,
        saldoFinal: 0,
        totalEntradas: 0,
        totalSaidas: 0
      };
    }

    const caixaAtual = caixas.find(c => c.nome === caixaSelecionado);
    if (!caixaAtual) {
      return {
        caixaAtual: null,
        movimentacoesFiltradas: [],
        saldoInicial: 0,
        saldoFinal: 0,
        totalEntradas: 0,
        totalSaidas: 0
      };
    }

    // Filtrar movimentações do caixa selecionado
    let movimentacoesFiltradas = movimentacoes.filter(mov => {
      const origemNome = mov.caixa_origem?.[0]?.nome;
      const destinoNome = mov.caixa_destino?.[0]?.nome;
      return origemNome === caixaSelecionado || destinoNome === caixaSelecionado;
    });

    // Filtrar por data se houver filtros
    if (dataInicio || dataFim) {
      movimentacoesFiltradas = movimentacoesFiltradas.filter(mov => {
        if (!mov.data_hora) return false;
        
        // Criar data da movimentação no horário local (sem conversão UTC)
        const movData = new Date(mov.data_hora);
        const ano = movData.getFullYear();
        const mes = String(movData.getMonth() + 1).padStart(2, '0');
        const dia = String(movData.getDate()).padStart(2, '0');
        const movDataStr = `${ano}-${mes}-${dia}`; // Formato: YYYY-MM-DD
        
        // Comparar strings no formato YYYY-MM-DD
        if (dataInicio && movDataStr < dataInicio) {
          return false;
        }
        
        if (dataFim && movDataStr > dataFim) {
          return false;
        }
        
        return true;
      });
    }

    // Calcular totais das movimentações filtradas
    let totalEntradas = 0;
    let totalSaidas = 0;

    movimentacoesFiltradas.forEach(mov => {
      const destinoNome = mov.caixa_destino?.[0]?.nome;
      const origemNome = mov.caixa_origem?.[0]?.nome;
      
      if (destinoNome === caixaSelecionado) {
        totalEntradas += mov.valor;
      }
      if (origemNome === caixaSelecionado) {
        totalSaidas += mov.valor;
      }
    });

    const saldoFinal = caixaAtual.saldo_atual;
    const saldoInicial = saldoFinal - totalEntradas + totalSaidas;

    return {
      caixaAtual,
      movimentacoesFiltradas,
      saldoInicial,
      saldoFinal,
      totalEntradas,
      totalSaidas
    };
  }, [caixaSelecionado, caixas, movimentacoes, dataInicio, dataFim]);

  return (
    <MainLayout title="Financeiro / Caixas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financeiro / Caixas</h1>
            <p className="text-muted-foreground">Controle os caixas físicos da loja</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Cards de Saldo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loadingCaixas ? (
            <p className="text-muted-foreground col-span-3">Carregando caixas...</p>
          ) : (
            caixas?.map((caixa) => (
              <Card key={caixa.id} className={getCaixaCardClass(caixa.nome)}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className={`h-5 w-5 ${getCaixaIconClass(caixa.nome)}`} />
                    {caixa.nome}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <p className="text-4xl font-bold">
                    R$ {caixa.saldo_atual.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Atualizado: {caixa.updated_at ? format(new Date(caixa.updated_at), "dd/MM HH:mm", { locale: ptBR }) : "-"}
                  </p>
                </CardContent>
                <div className="px-6 pb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                    onClick={() => openFechamento(caixa)}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Realizar Fechamento
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Painel de Operações */}
        <Tabs defaultValue="transferencia" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transferencia">
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Transferência
            </TabsTrigger>
            <TabsTrigger value="movimentacao">
              <Plus className="h-4 w-4 mr-2" />
              Movimentação Manual
            </TabsTrigger>
          </TabsList>

          {/* Aba Transferência */}
          <TabsContent value="transferencia">
            <Card>
              <CardHeader>
                <CardTitle>Transferência entre Caixas (Sangria/Suprimento)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>De (Origem)</Label>
                    <Select value={origem} onValueChange={setOrigem}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {caixas?.map((c) => (
                          <SelectItem key={c.id} value={c.nome}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Para (Destino)</Label>
                    <Select value={destino} onValueChange={setDestino}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {caixas?.map((c) => (
                          <SelectItem key={c.id} value={c.nome}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      value={valorTransf}
                      onChange={(e) => setValorTransf(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value) {
                          setValorTransf(parseFloat(e.target.value).toFixed(2));
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Motivo</Label>
                    <Input
                      placeholder="Sangria, Suprimento..."
                      value={motivoTransf}
                      onChange={(e) => setMotivoTransf(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  className="mt-4"
                  onClick={handleTransferencia}
                  disabled={transferindo || !origem || !destino || !valorTransf || origem === destino}
                >
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  {transferindo ? "Transferindo..." : "Executar Transferência"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Movimentação Manual */}
          <TabsContent value="movimentacao">
            <Card>
              <CardHeader>
                <CardTitle>Movimentação Manual (Ajuste/Retirada)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Caixa</Label>
                    <Select value={caixaMov} onValueChange={setCaixaMov}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {caixas?.map((c) => (
                          <SelectItem key={c.id} value={c.nome}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={tipoMov} onValueChange={(v) => setTipoMov(v as "entrada" | "saida")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entrada">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4 text-green-600" />
                            Entrada
                          </div>
                        </SelectItem>
                        <SelectItem value="saida">
                          <div className="flex items-center gap-2">
                            <Minus className="h-4 w-4 text-red-600" />
                            Saída
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      value={valorMov}
                      onChange={(e) => setValorMov(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value) {
                          setValorMov(parseFloat(e.target.value).toFixed(2));
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Motivo</Label>
                    <Input
                      placeholder="Ajuste, Retirada..."
                      value={motivoMov}
                      onChange={(e) => setMotivoMov(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  className="mt-4"
                  onClick={handleMovimentacao}
                  disabled={movimentando || !caixaMov || !valorMov}
                >
                  {tipoMov === "entrada" ? (
                    <Plus className="h-4 w-4 mr-2" />
                  ) : (
                    <Minus className="h-4 w-4 mr-2" />
                  )}
                  {movimentando ? "Registrando..." : "Registrar"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Extrato do Caixa Selecionado */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <CardTitle>Extrato do Caixa: {caixaSelecionado || "Nenhum selecionado"}</CardTitle>
                {extratoCalculado.caixaAtual && (
                  <div className="text-sm font-normal text-muted-foreground">
                    Saldo Atual: <span className="font-bold text-purple-600">R$ {extratoCalculado.saldoFinal.toFixed(2)}</span>
                  </div>
                )}
              </div>
              
              {/* Filtros de Data */}
              {caixaSelecionado && (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg flex-wrap">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="dataInicio" className="text-sm whitespace-nowrap">Data Início:</Label>
                      <Input
                        id="dataInicio"
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="w-[160px]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="dataFim" className="text-sm whitespace-nowrap">Data Fim:</Label>
                      <Input
                        id="dataFim"
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="w-[160px]"
                      />
                    </div>
                    
                    {/* Botões Rápidos */}
                    <div className="flex gap-2 ml-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const hoje = new Date();
                          const dataStr = hoje.toISOString().split('T')[0];
                          setDataInicio(dataStr);
                          setDataFim(dataStr);
                        }}
                      >
                        Hoje
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const ontem = new Date();
                          ontem.setDate(ontem.getDate() - 1);
                          const dataStr = ontem.toISOString().split('T')[0];
                          setDataInicio(dataStr);
                          setDataFim(dataStr);
                        }}
                      >
                        Ontem
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const hoje = new Date();
                          const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
                          setDataInicio(inicioMes.toISOString().split('T')[0]);
                          setDataFim(hoje.toISOString().split('T')[0]);
                        }}
                      >
                        Mês Atual
                      </Button>
                      {(dataInicio || dataFim) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setDataInicio("");
                            setDataFim("");
                          }}
                        >
                          Limpar
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Info sobre o filtro */}
                  {(dataInicio || dataFim) && (
                    <div className="text-sm text-muted-foreground px-3">
                      {extratoCalculado.movimentacoesFiltradas.length > 0 ? (
                        <span className="text-green-700">
                          ✓ Encontradas {extratoCalculado.movimentacoesFiltradas.length} movimentações 
                          {dataInicio && dataFim && dataInicio === dataFim ? 
                            ` no dia ${new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')}` :
                            ` entre ${dataInicio ? new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR') : 'início'} e ${dataFim ? new Date(dataFim + 'T12:00:00').toLocaleDateString('pt-BR') : 'hoje'}`
                          }
                        </span>
                      ) : (
                        <span className="text-orange-600">
                          ⚠️ Nenhuma movimentação encontrada 
                          {dataInicio && dataFim && dataInicio === dataFim ? 
                            ` no dia ${new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')}` :
                            ` entre ${dataInicio ? new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR') : 'início'} e ${dataFim ? new Date(dataFim + 'T12:00:00').toLocaleDateString('pt-BR') : 'hoje'}`
                          }
                        </span>
                      )}
                    </div>
                  )}
                  {!dataInicio && !dataFim && (
                    <div className="text-sm px-3">
                      {extratoCalculado.movimentacoesFiltradas.length > 0 ? (
                        <span className="text-blue-600">
                          📋 Mostrando todas as {extratoCalculado.movimentacoesFiltradas.length} movimentações do caixa
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-orange-600">
                            ⚠️ Nenhuma movimentação encontrada para este caixa
                          </span>
                          <div className="text-xs text-gray-500">
                            Debug: Total de movimentações no sistema: {movimentacoes?.length || 0}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!caixaSelecionado ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Selecione um caixa no login para ver o extrato</p>
              </div>
            ) : loadingMov || loadingCaixas ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : (
              <>
                {/* Resumo */}
                <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Saldo Inicial</p>
                    <p className="text-xl font-bold text-blue-600">R$ {extratoCalculado.saldoInicial.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Total Movimentações</p>
                    <p className="text-sm text-green-600">+ R$ {extratoCalculado.totalEntradas.toFixed(2)}</p>
                    <p className="text-sm text-red-600">- R$ {extratoCalculado.totalSaidas.toFixed(2)}</p>
                  </div>
                  <div className="text-center bg-purple-50 rounded-lg p-2">
                    <p className="text-xs text-gray-600 mb-1">Saldo Fechamento</p>
                    <p className="text-xl font-bold text-purple-600">R$ {extratoCalculado.saldoFinal.toFixed(2)}</p>
                  </div>
                </div>

                {/* Tabela */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Entrada (+)</TableHead>
                      <TableHead className="text-right">Saída (-)</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Primeira linha: SALDO FINAL (FECHAMENTO) */}
                    <TableRow className="bg-purple-50 font-bold">
                      <TableCell colSpan={4} className="text-right">VALOR DE FECHAMENTO:</TableCell>
                      <TableCell className="text-right text-purple-700 text-lg">
                        R$ {extratoCalculado.saldoFinal.toFixed(2)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>

                    {/* Movimentações (do mais recente para o mais antigo) */}
                    {extratoCalculado.movimentacoesFiltradas.map((mov, index) => {
                      const origemNome = mov.caixa_origem?.[0]?.nome;
                      const destinoNome = mov.caixa_destino?.[0]?.nome;
                      const isEntrada = destinoNome === caixaSelecionado;
                      const isSaida = origemNome === caixaSelecionado;
                      
                      // Calcular saldo acumulado até esta movimentação
                      let saldoAteAqui = extratoCalculado.saldoInicial;
                      for (let i = extratoCalculado.movimentacoesFiltradas.length - 1; i > index; i--) {
                        const m = extratoCalculado.movimentacoesFiltradas[i];
                        if (m.caixa_destino?.[0]?.nome === caixaSelecionado) {
                          saldoAteAqui += m.valor;
                        }
                        if (m.caixa_origem?.[0]?.nome === caixaSelecionado) {
                          saldoAteAqui -= m.valor;
                        }
                      }
                      
                      let descricao = "";
                      if (mov.tipo === "transferencia") {
                        if (isEntrada) descricao = `Recebido de ${origemNome}`;
                        else if (isSaida) descricao = `Transferido para ${destinoNome}`;
                      } else {
                        descricao = mov.tipo.charAt(0).toUpperCase() + mov.tipo.slice(1).replace(/_/g, " ");
                      }

                      return (
                        <TableRow key={mov.id}>
                          <TableCell className="whitespace-nowrap">
                            {mov.data_hora ? format(new Date(mov.data_hora), "dd/MM HH:mm", { locale: ptBR }) : "-"}
                          </TableCell>
                          <TableCell>{descricao}</TableCell>
                          <TableCell className="text-right text-green-600 font-semibold">
                            {isEntrada ? `R$ ${mov.valor.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell className="text-right text-red-600 font-semibold">
                            {isSaida ? `R$ ${mov.valor.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            R$ {saldoAteAqui.toFixed(2)}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs">
                            {mov.motivo || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {/* Última linha: SALDO INICIAL */}
                    <TableRow className="bg-blue-50 font-bold border-t-2">
                      <TableCell colSpan={4} className="text-right">SALDO INICIAL (Abertura):</TableCell>
                      <TableCell className="text-right text-blue-700 text-lg">
                        R$ {extratoCalculado.saldoInicial.toFixed(2)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>

                    {extratoCalculado.movimentacoesFiltradas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          <div className="space-y-2">
                            <p className="text-muted-foreground">
                              Nenhuma movimentação encontrada para este caixa
                            </p>
                            <div className="text-xs text-gray-500 space-y-1">
                              <p>Debug Info:</p>
                              <p>• Caixa Selecionado: {caixaSelecionado}</p>
                              <p>• Total de Movimentações no Sistema: {movimentacoes?.length || 0}</p>
                              <p>• Saldo do Caixa: R$ {extratoCalculado.saldoFinal.toFixed(2)}</p>
                              {movimentacoes && movimentacoes.length > 0 && (
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-blue-600 hover:underline">
                                    Ver primeiras movimentações (debug)
                                  </summary>
                                  <div className="mt-2 text-left max-h-40 overflow-auto bg-gray-50 p-2 rounded">
                                    {movimentacoes.slice(0, 3).map((mov, i) => (
                                      <div key={i} className="mb-2 text-xs border-b pb-1">
                                        <p>Tipo: {mov.tipo}</p>
                                        <p>Origem: {mov.caixa_origem?.[0]?.nome || "null"}</p>
                                        <p>Destino: {mov.caixa_destino?.[0]?.nome || "null"}</p>
                                        <p>Valor: R$ {mov.valor.toFixed(2)}</p>
                                        <p>Data: {mov.data_hora ? format(new Date(mov.data_hora), "dd/MM HH:mm") : "-"}</p>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Fechamento */}
      <FechamentoCaixaModal
        open={modalFechamento}
        onOpenChange={setModalFechamento}
        caixa={caixaFechamento}
      />
    </MainLayout>
  );
}
