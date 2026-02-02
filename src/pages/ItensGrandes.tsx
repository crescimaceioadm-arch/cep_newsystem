import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useItensGrandesIndividuais, useDarBaixaItemGrande, useUpdateItemGrande, useDeleteItemGrande } from "@/hooks/useItensGrandesIndividuais";
import { useTiposItensGrandes } from "@/hooks/useTiposItensGrandes";
import { useMarcasItensGrandes } from "@/hooks/useMarcasItensGrandes";
import { Search, Eye, Edit, AlertTriangle, Package, Save, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ItensGrandes() {
  const { data: itens, isLoading } = useItensGrandesIndividuais();
  const { data: tipos } = useTiposItensGrandes();
  const { data: marcas } = useMarcasItensGrandes();
  const darBaixa = useDarBaixaItemGrande();
  const atualizarItem = useUpdateItemGrande();
  const deletarItem = useDeleteItemGrande();
  
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "disponivel" | "vendido" | "baixa">("todos");
  const [itemSelecionado, setItemSelecionado] = useState<any>(null);
  const [modalBaixa, setModalBaixa] = useState(false);
  const [motivoBaixa, setMotivoBaixa] = useState("");
  const [modoEdicao, setModoEdicao] = useState(false);
  const [itemEdicao, setItemEdicao] = useState<any>(null);
  const [descricaoEdicao, setDescricaoEdicao] = useState("");
  const [valorVendaEdicao, setValorVendaEdicao] = useState("");
  const [valorCompraEdicao, setValorCompraEdicao] = useState("");
  const [tipoEdicao, setTipoEdicao] = useState("");
  const [marcaEdicao, setMarcaEdicao] = useState("");

  const itensFiltrados = (itens || []).filter((item) => {
    if (filtroStatus !== "todos" && item.status !== filtroStatus) return false;
    
    if (!busca) return true;
    
    const termo = busca.toLowerCase();
    const tipo = item.tipo?.nome?.toLowerCase() || "";
    const marca = item.marca?.nome?.toLowerCase() || "";
    const descricao = item.descricao?.toLowerCase() || "";
    
    return tipo.includes(termo) || marca.includes(termo) || descricao.includes(termo);
  });

  const handleDarBaixa = () => {
    if (!itemSelecionado || !motivoBaixa.trim()) {
      toast.error("Informe o motivo da baixa");
      return;
    }
    
    darBaixa.mutate(
      { id: itemSelecionado.id, motivo: motivoBaixa },
      {
        onSuccess: () => {
          toast.success("Baixa registrada");
          setModalBaixa(false);
          setItemSelecionado(null);
          setMotivoBaixa("");
        },
        onError: (error: any) => toast.error("Erro: " + error.message),
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "disponivel":
        return <Badge className="bg-green-500">Disponível</Badge>;
      case "vendido":
        return <Badge className="bg-blue-500">Vendido</Badge>;
      case "baixa":
        return <Badge variant="destructive">Baixa</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatData = (data: string) => {
    try {
      return format(new Date(data), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  const totais = {
    disponivel: itensFiltrados.filter(i => i.status === "disponivel").length,
    vendido: itensFiltrados.filter(i => i.status === "vendido").length,
    baixa: itensFiltrados.filter(i => i.status === "baixa").length,
    valorEstoque: itensFiltrados
      .filter(i => i.status === "disponivel")
      .reduce((sum, i) => sum + i.valor_compra, 0),
  };

  return (
    <MainLayout title="Itens Grandes">
      <div className="space-y-6">
        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totais.disponivel}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totais.vendido}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Baixas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{totais.baixa}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Valor em Estoque
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {totais.valorEstoque.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por tipo, marca ou descrição..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filtroStatus === "todos" ? "default" : "outline"}
                  onClick={() => setFiltroStatus("todos")}
                >
                  Todos
                </Button>
                <Button
                  variant={filtroStatus === "disponivel" ? "default" : "outline"}
                  onClick={() => setFiltroStatus("disponivel")}
                >
                  Disponíveis
                </Button>
                <Button
                  variant={filtroStatus === "vendido" ? "default" : "outline"}
                  onClick={() => setFiltroStatus("vendido")}
                >
                  Vendidos
                </Button>
                <Button
                  variant={filtroStatus === "baixa" ? "default" : "outline"}
                  onClick={() => setFiltroStatus("baixa")}
                >
                  Baixas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Itens Cadastrados ({itensFiltrados.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : itensFiltrados.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum item encontrado</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor Compra</TableHead>
                      <TableHead className="text-right">Valor Venda</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Entrada</TableHead>
                      <TableHead>Data Saída</TableHead>
                      <TableHead>Avaliadora</TableHead>
                      <TableHead>Vendedora</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensFiltrados.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.tipo?.nome}</TableCell>
                        <TableCell>{item.marca?.nome}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.descricao}</TableCell>
                        <TableCell className="text-right">R$ {item.valor_compra.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {item.valor_venda ? `R$ ${item.valor_venda.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>{formatData(item.data_entrada)}</TableCell>
                        <TableCell>{item.data_saida ? formatData(item.data_saida) : "-"}</TableCell>
                        <TableCell>{item.avaliadora_nome || "-"}</TableCell>
                        <TableCell>{item.vendedora_nome || "-"}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setItemSelecionado(item)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-600"
                              onClick={() => {
                                setItemEdicao(item);
                                setDescricaoEdicao(item.descricao);
                                setValorVendaEdicao(item.valor_venda ? item.valor_venda.toString() : "");
                                setValorCompraEdicao(item.valor_compra ? item.valor_compra.toString() : "");
                                setTipoEdicao(item.tipo_id);
                                setMarcaEdicao(item.marca_id);
                                setModoEdicao(true);
                              }}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {item.status === "disponivel" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => {
                                  setItemSelecionado(item);
                                  setModalBaixa(true);
                                }}
                                title="Dar baixa"
                              >
                                <AlertTriangle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => {
                                if (confirm("Tem certeza que deseja deletar este item? Esta ação não pode ser desfeita.")) {
                                  deletarItem.mutate(item.id, {
                                    onSuccess: () => toast.success("Item deletado com sucesso"),
                                    onError: (error: any) => toast.error("Erro: " + error.message),
                                  });
                                }
                              }}
                              disabled={deletarItem.isPending}
                              title="Deletar item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Edição */}
      <Dialog open={modoEdicao} onOpenChange={() => {
        setModoEdicao(false);
        setItemEdicao(null);
        setDescricaoEdicao("");
        setValorVendaEdicao("");
        setValorCompraEdicao("");
        setTipoEdicao("");
        setMarcaEdicao("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Item</DialogTitle>
          </DialogHeader>
          {itemEdicao && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo-edit">Tipo</Label>
                  <Select value={tipoEdicao} onValueChange={setTipoEdicao}>
                    <SelectTrigger id="tipo-edit">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tipos?.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id}>
                          {tipo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="marca-edit">Marca</Label>
                  <Select value={marcaEdicao} onValueChange={setMarcaEdicao}>
                    <SelectTrigger id="marca-edit">
                      <SelectValue placeholder="Selecione a marca" />
                    </SelectTrigger>
                    <SelectContent>
                      {marcas?.map((marca) => (
                        <SelectItem key={marca.id} value={marca.id}>
                          {marca.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="descricao-edit">Descrição</Label>
                <Input
                  id="descricao-edit"
                  value={descricaoEdicao}
                  onChange={(e) => setDescricaoEdicao(e.target.value)}
                  placeholder="Descrição do item"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valor-compra-edit">Valor de Compra (R$)</Label>
                  <Input
                    id="valor-compra-edit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorCompraEdicao}
                    onChange={(e) => setValorCompraEdicao(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="valor-venda-edit">Valor de Venda (R$)</Label>
                  <Input
                    id="valor-venda-edit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorVendaEdicao}
                    onChange={(e) => setValorVendaEdicao(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModoEdicao(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!itemEdicao || !tipoEdicao || !marcaEdicao) {
                  toast.error("Informe tipo e marca");
                  return;
                }
                atualizarItem.mutate(
                  {
                    id: itemEdicao.id,
                    dados: {
                      tipo_id: tipoEdicao,
                      marca_id: marcaEdicao,
                      descricao: descricaoEdicao,
                      valor_compra: valorCompraEdicao ? parseFloat(valorCompraEdicao) : itemEdicao.valor_compra,
                      valor_venda: valorVendaEdicao ? parseFloat(valorVendaEdicao) : null,
                    },
                  },
                  {
                    onSuccess: () => {
                      toast.success("Item atualizado com sucesso");
                      setModoEdicao(false);
                      setItemEdicao(null);
                      setDescricaoEdicao("");
                      setValorVendaEdicao("");
                      setValorCompraEdicao("");
                      setTipoEdicao("");
                      setMarcaEdicao("");
                    },
                    onError: (error: any) => toast.error("Erro: " + error.message),
                  }
                );
              }}
              disabled={atualizarItem.isPending}
            >
              {atualizarItem.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes */}
      <Dialog open={!!itemSelecionado && !modalBaixa} onOpenChange={() => setItemSelecionado(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Item</DialogTitle>
          </DialogHeader>
          {itemSelecionado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Tipo</Label>
                  <p className="font-medium">{itemSelecionado.tipo?.nome}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Marca</Label>
                  <p className="font-medium">{itemSelecionado.marca?.nome}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Descrição</Label>
                <p className="font-medium">{itemSelecionado.descricao}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Valor de Compra</Label>
                  <p className="font-medium">R$ {itemSelecionado.valor_compra.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Valor de Venda</Label>
                  <p className="font-medium">
                    {itemSelecionado.valor_venda ? `R$ ${itemSelecionado.valor_venda.toFixed(2)}` : "-"}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">{getStatusBadge(itemSelecionado.status)}</div>
              </div>
              {itemSelecionado.observacoes && (
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="text-sm">{itemSelecionado.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Baixa */}
      <Dialog open={modalBaixa} onOpenChange={setModalBaixa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar Baixa no Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Informe o motivo da baixa (perdido, danificado, doado, etc.)
            </p>
            <Textarea
              placeholder="Motivo da baixa..."
              value={motivoBaixa}
              onChange={(e) => setMotivoBaixa(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalBaixa(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDarBaixa} disabled={darBaixa.isPending}>
              {darBaixa.isPending ? "Processando..." : "Confirmar Baixa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
