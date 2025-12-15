import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

        {/* Tabela Últimas Movimentações */}
        <Card>
          <CardHeader>
            <CardTitle>Últimas Movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMov ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Caixa</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentacoes?.map((mov) => {
                    const caixaNome = mov.caixa_origem?.[0]?.nome || mov.caixa_destino?.[0]?.nome || "-";
                    const isEntrada = mov.tipo.includes("entrada") || mov.tipo === "venda";
                    return (
                      <TableRow key={mov.id}>
                        <TableCell>
                          {mov.data_hora ? format(new Date(mov.data_hora), "dd/MM HH:mm", { locale: ptBR }) : "-"}
                        </TableCell>
                        <TableCell>{caixaNome}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              isEntrada
                                ? "bg-green-500/20 text-green-700"
                                : "bg-red-500/20 text-red-700"
                            }`}
                          >
                            {mov.tipo}
                          </span>
                        </TableCell>
                        <TableCell
                          className={isEntrada ? "text-green-600" : "text-red-600"}
                        >
                          {isEntrada ? "+" : "-"} R$ {mov.valor.toFixed(2)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{mov.motivo || "-"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {(!movimentacoes || movimentacoes.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhuma movimentação encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
