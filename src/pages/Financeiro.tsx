import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCaixa } from "@/contexts/CaixaContext";
import { useUser } from "@/contexts/UserContext";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCaixas,
  useMovimentacoesCaixa,
  useTransferenciaCaixa,
  useMovimentacaoManual,
  useSaldoInicial,
  useMovimentacoesDinheiro,
  useSaldoFinalHoje,
  useDeleteMovimentacao,
  useEditarMovimentacao,
  Caixa,
  MovimentacaoCaixa,
} from "@/hooks/useCaixas";
import { FechamentoCaixaModal } from "@/components/financeiro/FechamentoCaixaModal";
import { AjustarSaldoCaixaModal } from "@/components/financeiro/AjustarSaldoCaixaModal";
import { AbrirCaixaAvaliacaoModal, useCaixaAvaliacaoAberto } from "@/components/financeiro/AbrirCaixaAvaliacaoModal";
import { AprovacaoFechamentosCard } from "@/components/financeiro/AprovacaoFechamentosCard";
import { RelatorioFechamentosCard } from "@/components/financeiro/RelatorioFechamentosCard";
import { RelatorioMovimentacoesCard } from "@/components/financeiro/RelatorioMovimentacoesCard";
import { RelatorioFechamentosCaixaCard } from "@/components/financeiro/RelatorioFechamentosCaixaCard";
import { Wallet, ArrowLeftRight, Plus, Minus, Lock, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Trash2, Pencil, CheckCircle, XCircle, Unlock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { convertToLocalTime, getDateBrasilia, getBrasiliaRange } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// Componente para Card de Caixa com saldo final calculado
function CaixaCard({ 
  caixa, 
  onFechamento,
  onAjusteSaldo,
  onAbrirAvaliacao,
  fechamentoStatus,
  carregandoStatus,
  isAdmin = false,
  isAvaliacaoAberto = false,
  caixaSelecionado = null,
}: { 
  caixa: Caixa; 
  onFechamento: (caixa: Caixa) => void;
  onAjusteSaldo: (caixa: Caixa) => void;
  onAbrirAvaliacao?: (caixa: Caixa) => void;
  fechamentoStatus?: string | null;
  carregandoStatus?: boolean;
  isAdmin?: boolean;
  isAvaliacaoAberto?: boolean;
  caixaSelecionado?: string | null;
}) {
  const { data: saldoData, isLoading } = useSaldoFinalHoje(caixa.id);
  
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

  const getStatusInfo = () => {
    if (carregandoStatus) {
      return { texto: "Carregando status...", className: "text-muted-foreground", Icon: null };
    }
    
    // 1. Se tem fechamento aprovado hoje = FECHADO
    if (fechamentoStatus === "aprovado") {
      return { texto: "Fechado ✔", className: "text-green-600", Icon: CheckCircle };
    }
    
    // 2. Se tem fechamento pendente = EM APROVAÇÃO
    if (fechamentoStatus === "pendente_aprovacao") {
      return { texto: "Em aprovação ⏳", className: "text-amber-600", Icon: AlertTriangle };
    }
    
    // 3. Se NÃO tem fechamento hoje = ABERTO (está operando)
    // Isso vale para TODOS os caixas (Caixa 1, 2 e Avaliação)
    return { texto: "Caixa Aberto ✓", className: "text-blue-600", Icon: Unlock };
  };

  const statusInfo = getStatusInfo();

  const saldoFinal = saldoData?.saldoFinal ?? 0;

  return (
    <Card className={getCaixaCardClass(caixa.nome)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Wallet className={`h-5 w-5 ${getCaixaIconClass(caixa.nome)}`} />
          {caixa.nome}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-4xl font-bold">
          {isLoading ? "..." : `R$ ${saldoFinal.toFixed(2)}`}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Saldo Final Hoje
        </p>
      </CardContent>
      <div className="px-6 pb-4 space-y-2">
        {/* Botão de Abertura - apenas para Avaliação */}
        {caixa.nome === "Avaliação" && !isAvaliacaoAberto && onAbrirAvaliacao && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700"
            onClick={() => onAbrirAvaliacao(caixa)}
          >
            <Unlock className="h-4 w-4 mr-2" />
            Abrir Caixa
          </Button>
        )}
        
        {/* Botão de Fechamento */}
        <Button
          variant="outline"
          size="sm"
          className="w-full text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
          onClick={() => onFechamento(caixa)}
        >
          <Lock className="h-4 w-4 mr-2" />
          Realizar Fechamento
        </Button>
        
        {/* Botão de Ajuste - apenas Admin */}
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-blue-600 border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            onClick={() => onAjusteSaldo(caixa)}
          >
            <Wallet className="h-4 w-4 mr-2" />
            Ajustar Saldo
          </Button>
        )}
        
        {/* Status */}
        <p className={`text-xs font-medium ${statusInfo.className}`}>
          <span className="inline-flex items-center gap-1">
            {statusInfo.Icon && <statusInfo.Icon className="h-3.5 w-3.5" />}
            <span>Status: <strong>{statusInfo.texto}</strong></span>
          </span>
        </p>
      </div>
    </Card>
  );
}

export default function Financeiro() {
  const { caixaSelecionado } = useCaixa();
  const { cargo } = useUser();
  const isAdmin = cargo === 'admin';
  const queryClient = useQueryClient();
  const { isAberto: isAvaliacaoAberto } = useCaixaAvaliacaoAberto();
  
  const { data: caixas, isLoading: loadingCaixas, refetch } = useCaixas();
  const { data: movimentacoes, isLoading: loadingMov } = useMovimentacoesCaixa();
  const { mutate: transferir, isPending: transferindo } = useTransferenciaCaixa();
  const { mutate: movimentar, isPending: movimentando } = useMovimentacaoManual();
  const deleteMovimentacao = useDeleteMovimentacao();
  const { mutateAsync: editarMovimentacao, isPending: editandoMov } = useEditarMovimentacao();

  // Buscar caixa de Avaliação
  const caixaAvaliacao = useMemo(() => {
    return caixas?.find(c => c.nome === "Avaliação") || null;
  }, [caixas]);

  // Buscar saldo do caixa de avaliação
  const { data: saldoAvaliacao, isLoading: loadingSaldoAvaliacao } = useSaldoFinalHoje(
    caixaAvaliacao?.id || null
  );

  const { data: fechamentosHoje = [], isLoading: loadingFechamentosHoje } = useQuery({
    queryKey: ["fechamentos_hoje"],
    queryFn: async () => {
      const hoje = new Date();
      const { start, end } = getBrasiliaRange(hoje, hoje);
      
      const { data, error } = await supabase
        .from("fechamentos_caixa")
        .select("caixa_id, status, data_fechamento, caixa:caixas(nome)")
        .gte("data_fechamento", start)
        .lte("data_fechamento", end)
        .order("data_fechamento", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const statusPorCaixa = useMemo(() => {
    const map = new Map<string, string>();
    fechamentosHoje.forEach((f: any) => {
      if (f?.caixa_id && !map.has(f.caixa_id)) {
        map.set(f.caixa_id, f.status);
      }
    });
    return map;
  }, [fechamentosHoje]);

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

  // Ajuste de Saldo Modal
  const [modalAjusteSaldo, setModalAjusteSaldo] = useState(false);
  const [caixaAjusteSaldo, setCaixaAjusteSaldo] = useState<Caixa | null>(null);

  // Abertura de Caixa Avaliação Modal
  const [modalAbrirAvaliacao, setModalAbrirAvaliacao] = useState(false);
  const [caixaAbrirAvaliacao, setCaixaAbrirAvaliacao] = useState<Caixa | null>(null);

  // Filtro de Data - INICIALIZAR COM HOJE POR PADRÃO
  const [dataInicio, setDataInicio] = useState<string>(getDateBrasilia());
  const [dataFim, setDataFim] = useState<string>(getDateBrasilia());
  
  // Caixa selecionado para o extrato (pode ser diferente do caixa logado)
  const [caixaExtrato, setCaixaExtrato] = useState<string>("");
  
  // Estado para capturar erros
  const [erroRenderizacao, setErroRenderizacao] = useState<string | null>(null);

  // Estado para exclusão de movimentação
  const [movimentacaoParaExcluir, setMovimentacaoParaExcluir] = useState<MovimentacaoCaixa | null>(null);
  const [deletandoMov, setDeletandoMov] = useState(false);

  // Estado para edição de movimentação
  const [movimentacaoParaEditar, setMovimentacaoParaEditar] = useState<MovimentacaoCaixa | null>(null);
  const [valorEditar, setValorEditar] = useState("");
  const [motivoEditar, setMotivoEditar] = useState("");

  const sanitizeMoney = (value: string) => value.replace(/[^0-9.,-]/g, "").replace(",", ".");
  const roundToCents = (value: string) => {
    const num = Number.parseFloat(sanitizeMoney(value));
    if (Number.isNaN(num)) return "";
    const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
    return rounded.toFixed(2);
  };

  const handleConfirmarExclusaoMov = async () => {
    if (!movimentacaoParaExcluir) return;
    setDeletandoMov(true);
    try {
      await deleteMovimentacao.mutateAsync(movimentacaoParaExcluir);
    } finally {
      setDeletandoMov(false);
      setMovimentacaoParaExcluir(null);
    }
  };

  // Função para verificar se movimentação pode ser excluída
  const podeExcluir = (tipo: string) => {
    return ['entrada', 'saida', 'transferencia_entre_caixas'].includes(tipo);
  };

  const handleTransferencia = () => {
    if (!origem || !destino || !valorTransf || origem === destino) return;

    // Verificar se envolve Avaliação e se está aberto
    if ((origem === "Avaliação" || destino === "Avaliação") && !isAvaliacaoAberto) {
      toast.error("❌ O Caixa de Avaliação não está aberto. Abra o caixa antes de realizar transferências.");
      return;
    }

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

    // Verificar se é Avaliação e se está aberto
    if (caixaMov === "Avaliação" && !isAvaliacaoAberto) {
      toast.error("❌ O Caixa de Avaliação não está aberto. Abra o caixa antes de realizar movimentações.");
      return;
    }

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

  const openAbrirAvaliacao = (caixa: Caixa) => {
    setCaixaAbrirAvaliacao(caixa);
    setModalAbrirAvaliacao(true);
  };

  // 🛡️ Handlers seguros para mudança de data
  const handleDataInicioChange = (novaData: string) => {
    try {
      console.log("📅 Mudando data início:", novaData);
      setErroRenderizacao(null);
      setDataInicio(novaData || "");
    } catch (error) {
      console.error("❌ Erro ao mudar data início:", error);
      setErroRenderizacao("Erro ao mudar data inicial");
    }
  };

  const handleDataFimChange = (novaData: string) => {
    try {
      console.log("📅 Mudando data fim:", novaData);
      setErroRenderizacao(null);
      setDataFim(novaData || "");
    } catch (error) {
      console.error("❌ Erro ao mudar data fim:", error);
      setErroRenderizacao("Erro ao mudar data final");
    }
  };

  // Usar caixaExtrato se definido, senão usar caixaSelecionado, senão (se admin) usar primeiro caixa
  const caixaParaExtrato = useMemo(() => {
    if (caixaExtrato) return caixaExtrato;
    if (caixaSelecionado) return caixaSelecionado;
    // Se é admin e não há caixa selecionado, usar o primeiro caixa disponível
    if (isAdmin && caixas && caixas.length > 0) {
      return caixas[0].nome;
    }
    return null;
  }, [caixaExtrato, caixaSelecionado, isAdmin, caixas]);

  // Buscar caixa atual
  const caixaAtual = useMemo(() => {
    if (!caixaParaExtrato || !caixas) return null;
    return caixas.find(c => c.nome === caixaParaExtrato) || null;
  }, [caixaParaExtrato, caixas]);

  // Buscar saldo inicial (do fechamento do dia anterior)
  const { data: saldoInicialData } = useSaldoInicial(
    caixaAtual?.id || null,
    dataInicio || null
  );

  // Buscar movimentações em dinheiro do período
  const { data: movimentacoesPeriodo } = useMovimentacoesDinheiro(
    caixaAtual?.id || null,
    dataInicio || null,
    dataFim || null
  );

  // 🛡️ CÁLCULO BLINDADO: Extrato com try/catch
  const extratoCalculado = useMemo(() => {
    try {
      console.log("🧮 [CÁLCULO] Iniciando...");

      // Sem caixa selecionado
      if (!caixaParaExtrato || !caixaAtual) {
        return {
          caixaAtual: null,
          movimentacoes: [],
          saldoInicial: 0,
          saldoFinal: 0,
          totalEntradas: 0,
          totalSaidas: 0
        };
      }

      // Sem filtro de data: mostrar apenas últimas movimentações (sem saldo calculado)
      if (!dataInicio || !dataFim) {
        const movs = movimentacoes?.filter(mov => {
          const origemNome = mov.caixa_origem?.[0]?.nome;
          const destinoNome = mov.caixa_destino?.[0]?.nome;
          return origemNome === caixaParaExtrato || destinoNome === caixaParaExtrato;
        }).slice(0, 20) || [];

        return {
          caixaAtual,
          movimentacoes: movs,
          saldoInicial: 0,
          saldoFinal: 0,
          totalEntradas: 0,
          totalSaidas: 0
        };
      }

      // COM FILTRO DE DATA: Usar nova lógica
      const saldoInicial = saldoInicialData?.valor || 0;
      const movs = movimentacoesPeriodo || [];

      console.log("═══════════════════════════════════════");
      console.log("🧮 [CÁLCULO] DIAGNÓSTICO COMPLETO");
      console.log("═══════════════════════════════════════");
      console.log("📊 Dados recebidos:");
      console.log("  • Saldo Inicial:", saldoInicial, "(fonte:", saldoInicialData?.fonte, ")");
      console.log("  • Total de Movimentações:", movs.length);
      console.log("  • Caixa Selecionado:", caixaSelecionado);
      console.log("  • Caixa ID:", caixaAtual?.id);
      console.log("");

      if (movs.length === 0) {
        console.log("⚠️ ATENÇÃO: Nenhuma movimentação encontrada!");
        console.log("   Possíveis causas:");
        console.log("   1. Não há movimentações no período");
        console.log("   2. O caixa_id não corresponde");
        console.log("   3. As datas estão fora do range");
        console.log("═══════════════════════════════════════");
      }

      let totalEntradas = 0;
      let totalSaidas = 0;

      movs.forEach((mov, idx) => {
        const tipo = mov.tipo;
        const destinoId = mov.caixa_destino_id;
        const origemId = mov.caixa_origem_id;
        const caixaIdAtual = caixaAtual?.id;
        
        console.log(`\n📌 Movimentação #${idx + 1}:`);
        console.log(`   Tipo: ${tipo}`);
        console.log(`   Valor: R$ ${mov.valor}`);
        console.log(`   Data: ${mov.data_hora}`);
        console.log(`   Origem ID: ${origemId || 'N/A'}`);
        console.log(`   Destino ID: ${destinoId || 'N/A'}`);
        console.log(`   Caixa Atual ID: ${caixaIdAtual}`);

        // 💰 VENDAS = ENTRADA (destino é o caixa)
        if (tipo === 'venda') {
        if (destinoId === caixaIdAtual) {
           totalEntradas += mov.valor;
        }  
}   
      // 🎯 PAGAMENTO AVALIAÇÃO = SAÍDA (origem é o caixa)
      else if (tipo === 'pagamento_avaliacao') {
      if (origemId === caixaIdAtual) {
        totalSaidas += mov.valor;
      }
}
        // 📥 ENTRADAS MANUAIS = ENTRADA (positivo)
        else if (tipo === 'entrada') {
          totalEntradas += mov.valor;
          console.log(`   ✅ CLASSIFICAÇÃO: ENTRADA (+${mov.valor})`);
        }
        // 📤 SAÍDAS = NEGATIVO (subtrai)
        else if (tipo === 'saida') {
          totalSaidas += mov.valor;
          console.log(`   ❌ CLASSIFICAÇÃO: SAÍDA (-${mov.valor})`);
        }
        // 🔄 TRANSFERÊNCIAS: depende da direção
        else if (tipo === 'transferencia_entre_caixas') {
          // Se o destino é o caixa selecionado = RECEBEU dinheiro (entrada)
          if (destinoId === caixaIdAtual) {
            totalEntradas += mov.valor;
            console.log(`   ✅ CLASSIFICAÇÃO: ENTRADA por Transferência (+${mov.valor})`);
          } 
          // Se a origem é o caixa selecionado = ENVIOU dinheiro (saída)
          else if (origemId === caixaIdAtual) {
            totalSaidas += mov.valor;
            console.log(`   ❌ CLASSIFICAÇÃO: SAÍDA por Transferência (-${mov.valor})`);
          } else {
            console.log(`   ⚠️ ATENÇÃO: Transferência não corresponde ao caixa selecionado!`);
          }
        }
      });

      const saldoFinal = saldoInicial + totalEntradas - totalSaidas;

      console.log("");
      console.log("═══════════════════════════════════════");
      console.log("🎯 RESULTADO FINAL:");
      console.log("═══════════════════════════════════════");
      console.log(`   Saldo Inicial:    R$ ${saldoInicial.toFixed(2)}`);
      console.log(`   Total Entradas:  +R$ ${totalEntradas.toFixed(2)}`);
      console.log(`   Total Saídas:    -R$ ${totalSaidas.toFixed(2)}`);
      console.log(`   ─────────────────────────────────────`);
      console.log(`   Saldo Final:      R$ ${saldoFinal.toFixed(2)}`);
      console.log("");
      console.log(`   Fórmula: ${saldoInicial} + ${totalEntradas} - ${totalSaidas} = ${saldoFinal}`);
      console.log("═══════════════════════════════════════");

      return {
        caixaAtual,
        movimentacoes: movs,
        saldoInicial,
        saldoFinal,
        totalEntradas,
        totalSaidas
      };

    } catch (error) {
      console.error("❌ [CÁLCULO] Erro crítico:", error);
      setErroRenderizacao(`Erro ao calcular extrato: ${error}`);
      return {
        caixaAtual: null,
        movimentacoes: [],
        saldoInicial: 0,
        saldoFinal: 0,
        totalEntradas: 0,
        totalSaidas: 0
      };
    }
  }, [caixaSelecionado, caixaAtual, movimentacoes, movimentacoesPeriodo, saldoInicialData, dataInicio, dataFim]);

  const handleOpenEditar = (mov: MovimentacaoCaixa) => {
    setMovimentacaoParaEditar(mov);
    setValorEditar(mov.valor.toFixed(2));
    setMotivoEditar(mov.motivo || "");
  };

  const resetEditarState = () => {
    setMovimentacaoParaEditar(null);
    setValorEditar("");
    setMotivoEditar("");
  };

  const handleConfirmarEdicaoMov = async () => {
    if (!movimentacaoParaEditar) return;

    const valorNormalizado = roundToCents(valorEditar);
    const valorNumber = valorNormalizado ? parseFloat(valorNormalizado) : NaN;

    if (!Number.isFinite(valorNumber) || valorNumber <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    try {
      await editarMovimentacao({
        movimentacao: movimentacaoParaEditar,
        novoValor: valorNumber,
        novoMotivo: motivoEditar.trim(),
      });
      resetEditarState();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao editar movimentação");
    }
  };

  // Handler para atualizar todos os dados relevantes
  const handleAtualizarFinanceiro = () => {
    // Invalida todas as queries relevantes para garantir atualização total
    queryClient.invalidateQueries({ queryKey: ["caixas"] });
    queryClient.invalidateQueries({ queryKey: ["movimentacoes_caixa"] });
    queryClient.invalidateQueries({ queryKey: ["movimentacoes_dinheiro"] });
    queryClient.invalidateQueries({ queryKey: ["saldo_inicial"] });
    queryClient.invalidateQueries({ queryKey: ["saldo_final_hoje"] });
    queryClient.invalidateQueries({ queryKey: ["fechamentos_hoje"] });
    // Se quiser garantir, pode invalidar tudo:
    // queryClient.invalidateQueries();
    refetch(); // ainda chama o refetch dos caixas para manter compatibilidade
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
          <Button variant="outline" onClick={handleAtualizarFinanceiro}>
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
              <CaixaCard 
                key={caixa.id} 
                caixa={caixa} 
                onFechamento={openFechamento}
                onAjusteSaldo={(c) => {
                  setCaixaAjusteSaldo(c);
                  setModalAjusteSaldo(true);
                }}
                onAbrirAvaliacao={openAbrirAvaliacao}
                fechamentoStatus={statusPorCaixa.get(caixa.id)}
                carregandoStatus={loadingFechamentosHoje}
                isAdmin={isAdmin}
                isAvaliacaoAberto={isAvaliacaoAberto}
                caixaSelecionado={caixaSelecionado}
              />
            ))
          )}
        </div>

        {/* Painel de Operações */}
        <Tabs defaultValue="transferencia" className="w-full">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-2'}`}>
            <TabsTrigger value="transferencia">
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Transferência
            </TabsTrigger>
            <TabsTrigger value="movimentacao">
              <Plus className="h-4 w-4 mr-2" />
              Movimentação Manual
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="aprovacao">
                  <Lock className="h-4 w-4 mr-2" />
                  Aprovações
                </TabsTrigger>
                <TabsTrigger value="relatorio">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Relatório
                </TabsTrigger>
                <TabsTrigger value="movimentacoes-manuais">
                  <Pencil className="h-4 w-4 mr-2" />
                  Movimentações
                </TabsTrigger>
              </>
            )}
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
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={valorTransf}
                      onChange={(e) => setValorTransf(sanitizeMoney(e.target.value))}
                      onBlur={(e) => {
                        if (e.target.value) {
                          setValorTransf(roundToCents(e.target.value));
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
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={valorMov}
                      onChange={(e) => setValorMov(sanitizeMoney(e.target.value))}
                      onBlur={(e) => {
                        if (e.target.value) {
                          setValorMov(roundToCents(e.target.value));
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

          {/* Aba Aprovações (Admin Only) */}
          {isAdmin && (
            <TabsContent value="aprovacao">
              <AprovacaoFechamentosCard />
            </TabsContent>
          )}
N
          {/* Aba Relatório (Admin Only) */}
          {isAdmin && (
            <TabsContent value="relatorio">
              <RelatorioFechamentosCard />
              <RelatorioFechamentosCaixaCard />
            </TabsContent>
          )}

          {/* Aba Movimentações Manuais (Admin Only) */}
          {isAdmin && (
            <TabsContent value="movimentacoes-manuais">
              <RelatorioMovimentacoesCard />
            </TabsContent>
          )}
        </Tabs>

        {/* Extrato do Caixa Selecionado */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <CardTitle>Extrato do Caixa:</CardTitle>
                  <Select value={caixaParaExtrato || ""} onValueChange={setCaixaExtrato}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Selecione o caixa" />
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
                {extratoCalculado.caixaAtual && extratoCalculado.saldoFinal !== undefined && (
                  <div className="text-sm font-normal text-muted-foreground">
                    Saldo Atual: <span className="font-bold text-purple-600">R$ {extratoCalculado.saldoFinal.toFixed(2)}</span>
                  </div>
                )}
              </div>
              
              {/* Filtros de Data */}
              {caixaParaExtrato && (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg flex-wrap">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="dataInicio" className="text-sm whitespace-nowrap">Data Início:</Label>
                      <Input
                        id="dataInicio"
                        type="date"
                        value={dataInicio}
                        onChange={(e) => handleDataInicioChange(e.target.value)}
                        className="w-[160px]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="dataFim" className="text-sm whitespace-nowrap">Data Fim:</Label>
                      <Input
                        id="dataFim"
                        type="date"
                        value={dataFim}
                        onChange={(e) => handleDataFimChange(e.target.value)}
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
                  <div className="text-sm px-3 space-y-2">
                    {dataInicio && dataFim ? (
                      <div className="bg-blue-50 p-3 rounded border border-blue-200">
                        <p className="font-bold text-blue-900">🔍 Buscando movimentações:</p>
                        <p className="text-blue-700">Período: {dataInicio} até {dataFim}</p>
                        <p className="text-blue-700">Encontradas: {extratoCalculado.movimentacoes.length}</p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <p className="text-gray-700">📋 Mostrando últimas {movimentacoes?.length || 0} movimentações do sistema</p>
                        <p className="text-xs text-gray-500">Selecione um período para filtrar</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* 🚨 TELA DE ERRO VISUAL */}
            {erroRenderizacao ? (
              <Card className="border-red-500 bg-red-50">
                <CardContent className="py-8">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <AlertTriangle className="h-12 w-12 text-red-600" />
                    <div>
                      <h3 className="text-lg font-bold text-red-900 mb-2">Erro ao Carregar Extrato</h3>
                      <p className="text-sm text-red-700 mb-4">{erroRenderizacao}</p>
                      <Button 
                        onClick={() => {
                          setErroRenderizacao(null);
                          window.location.reload();
                        }}
                        variant="destructive"
                      >
                        Recarregar Página
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : !caixaParaExtrato ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Selecione um caixa usando o dropdown acima</p>
              </div>
            ) : loadingMov || loadingCaixas ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : (
              <>
                {/* 📊 CARDS DE RESUMO */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {/* Card 1: Saldo Anterior */}
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Saldo Anterior
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-blue-900">
                        R$ {extratoCalculado.saldoInicial?.toFixed(2) ?? "0.00"}
                      </p>
                      {dataInicio && saldoInicialData?.fonte && (
                        <p className="text-xs text-blue-600 mt-1">
                          {saldoInicialData.fonte === 'fechamento' ? '✓ Fechamento' : 
                           saldoInicialData.fonte === 'fechamento_anterior' ? '⚠ Fechamento anterior' :
                           saldoInicialData.fonte === 'sem_fechamento' ? '⚠ Sem fechamento' : 'Calculado'}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Card 2: Total Entradas */}
                  <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Entradas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-green-900">
                        + R$ {extratoCalculado.totalEntradas?.toFixed(2) ?? "0.00"}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Vendas e recebimentos
                      </p>
                    </CardContent>
                  </Card>

                  {/* Card 3: Total Saídas */}
                  <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                        <TrendingDown className="h-4 w-4" />
                        Saídas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-red-900">
                        - R$ {extratoCalculado.totalSaidas?.toFixed(2) ?? "0.00"}
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        Despesas e retiradas
                      </p>
                    </CardContent>
                  </Card>

                  {/* Card 4: Saldo Atual */}
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Saldo Atual
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-purple-900">
                        R$ {extratoCalculado.saldoFinal?.toFixed(2) ?? "0.00"}
                      </p>
                      <p className="text-xs text-purple-600 mt-1">
                        Do período
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/*  TABELA ESTILO EXTRATO BANCÁRIO */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Extrato de Movimentações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead className="text-right">Entrada (+)</TableHead>
                          <TableHead className="text-right">Saída (-)</TableHead>
                          <TableHead className="text-right font-bold">Saldo</TableHead>
                          {isAdmin && <TableHead className="text-center">Ações</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Primeira Linha: SALDO INICIAL */}
                        {dataInicio && dataFim && (
                          <TableRow className="bg-blue-50 font-bold border-b-2">
                            <TableCell colSpan={isAdmin ? 6 : 5} className="text-right text-blue-900">
                              📊 SALDO INICIAL:
                            </TableCell>
                            <TableCell className="text-right text-blue-700 text-lg">
                              R$ {extratoCalculado.saldoInicial?.toFixed(2) ?? "0.00"}
                            </TableCell>
                            {isAdmin && <TableCell />}
                          </TableRow>
                        )}

                        {/* Movimentações */}
                        {(() => {
                          try {
                            let saldoAcumulado = extratoCalculado.saldoInicial;
                            
                            // 🐛 DEBUG: Log de TODAS as movimentações
                            console.log("🔍 RENDERIZANDO TABELA - Total de movimentações:", extratoCalculado.movimentacoes.length);
                            extratoCalculado.movimentacoes.forEach((m, i) => {
                              console.log(`  #${i+1}: tipo="${m.tipo}", valor=${m.valor}, origem=${m.caixa_origem?.[0]?.nome || 'null'}, destino=${m.caixa_destino?.[0]?.nome || 'null'}`);
                            });
                            
                            return extratoCalculado.movimentacoes.map((mov) => {
                              const tipo = mov.tipo;
                              const destinoId = mov.caixa_destino_id;
                              const origemId = mov.caixa_origem_id;
                              const caixaIdAtual = caixaAtual?.id;
                              
                              let isEntrada = false;
                              let isSaida = false;
                              let descricao = "";
                              
                              // 💰 VENDAS = ENTRADA (positivo)
                              if (tipo === 'venda') {
                                // Só conta como entrada se o destino é este caixa
                                if (destinoId === caixaIdAtual) {
                                  isEntrada = true;
                                  descricao = "💰 Venda";
                                }
                              }
                              // 🎯 PAGAMENTO DE AVALIAÇÃO = SAÍDA (negativo) - origem é o caixa
                              else if (tipo === 'pagamento_avaliacao') {
                                if (origemId === caixaIdAtual) {
                                  isSaida = true;
                                  descricao = "🎯 Avaliação";
                                }
                              }
                              // 📥 ENTRADAS MANUAIS = ENTRADA (positivo)
                              else if (tipo === 'entrada') {
                                isEntrada = true;
                                descricao = "📥 Entrada";
                              }
                              // 📤 SAÍDAS/DESPESAS = SAÍDA (negativo)
                              else if (tipo === 'saida') {
                                isSaida = true;
                                descricao = "📤 Despesa/Saída";
                              }
                              // 🔄 TRANSFERÊNCIAS (tipo real: "transferencia_entre_caixas")
                              else if (tipo === 'transferencia_entre_caixas') {
                                // Se o destino é o caixa atual = RECEBEU
                                if (destinoId === caixaIdAtual) {
                                  isEntrada = true;
                                  descricao = `🔄 Transferência recebida`;
                                } 
                                // Se a origem é o caixa atual = ENVIOU
                                else if (origemId === caixaIdAtual) {
                                  isSaida = true;
                                  descricao = `🔄 Transferência enviada`;
                                }
                              }
                              // 🚨 TIPO NÃO RECONHECIDO - DEBUG
                              else {
                                descricao = `⚠️ TIPO DESCONHECIDO: "${tipo}"`;
                                console.warn(`🚨 TIPO NÃO RECONHECIDO:`, mov);
                              }
                              
                              // Se não é entrada nem saída, não renderizar (pular)
                              if (!isEntrada && !isSaida) {
                                return null;
                              }
                              
                              // Calcular saldo após esta movimentação
                              if (isEntrada) saldoAcumulado += mov.valor;
                              else if (isSaida) saldoAcumulado -= mov.valor;
                              
                              return (
                                <TableRow key={mov.id} className="hover:bg-gray-50">
                                  <TableCell className="whitespace-nowrap">
                                    {mov.data_hora ? (() => {
                                      const dataLocal = convertToLocalTime(mov.data_hora);
                                      return dataLocal ? format(dataLocal, "dd/MM HH:mm", { locale: ptBR }) : "-";
                                    })() : "-"}
                                  </TableCell>
                                  <TableCell className="font-medium">{descricao}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                                    {mov.motivo || "-"}
                                  </TableCell>
                                  <TableCell className="text-right text-green-600 font-semibold">
                                    {isEntrada ? `R$ ${mov.valor.toFixed(2)}` : "-"}
                                  </TableCell>
                                  <TableCell className="text-right text-red-600 font-semibold">
                                    {isSaida ? `R$ ${mov.valor.toFixed(2)}` : "-"}
                                  </TableCell>
                                  <TableCell className="text-right font-bold bg-gray-50">
                                    R$ {saldoAcumulado.toFixed(2)}
                                  </TableCell>
                                  {isAdmin && (
                                    <TableCell className="text-center">
                                      {podeExcluir(tipo) ? (
                                        <div className="flex items-center justify-center gap-1">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                                            onClick={() => handleOpenEditar(mov)}
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => setMovimentacaoParaExcluir(mov)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                  )}
                                </TableRow>
                              );
                            });
                          } catch (err) {
                            console.error("Erro ao renderizar movimentações:", err);
                            setErroRenderizacao(`Erro na tabela: ${err}`);
                            return null;
                          }
                        })()}

                        {/* Última Linha: SALDO FINAL */}
                        {dataInicio && dataFim && extratoCalculado.movimentacoes.length > 0 && (
                          <TableRow className="bg-purple-50 font-bold border-t-2">
                            <TableCell colSpan={isAdmin ? 6 : 5} className="text-right text-purple-900">
                              🎯 SALDO FINAL:
                            </TableCell>
                            <TableCell className="text-right text-purple-700 text-lg">
                              R$ {extratoCalculado.saldoFinal?.toFixed(2) ?? "0.00"}
                            </TableCell>
                            {isAdmin && <TableCell />}
                          </TableRow>
                        )}

                        {/* Sem movimentações */}
                        {extratoCalculado.movimentacoes.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8">
                              <div className="space-y-4">
                                <p className="text-muted-foreground">
                                  Nenhuma movimentação encontrada para o período
                                </p>
                                {dataInicio && dataFim && (
                                  <div className="text-sm bg-yellow-50 border border-yellow-200 rounded p-4 text-left">
                                    <p className="font-bold text-yellow-900 mb-2">🔍 DEBUG - Informações da Busca:</p>
                                    <div className="space-y-1 text-yellow-800">
                                      <p>• <strong>Caixa ID:</strong> {caixaAtual?.id || 'não encontrado'}</p>
                                      <p>• <strong>Período:</strong> {dataInicio} até {dataFim}</p>
                                      <p>• <strong>Tabela:</strong> movimentacoes_caixa</p>
                                      <p>• <strong>Nota:</strong> A tabela movimentacoes_caixa NÃO tem coluna de método de pagamento</p>
                                      <p>• <strong>Tipos esperados:</strong> entrada, saida, transferencia_entrada, transferencia_saida</p>
                                      <p className="mt-2 text-xs">📋 Abra o Console (F12) para ver os logs detalhados da query</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
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

      {/* Modal de Ajuste de Saldo */}
      {caixaAjusteSaldo && (
        <AjustarSaldoCaixaModal
          open={modalAjusteSaldo}
          onOpenChange={setModalAjusteSaldo}
          caixaId={caixaAjusteSaldo.id}
          caixaNome={caixaAjusteSaldo.nome}
          onSuccess={() => {
            refetch();
          }}
        />
      )}

      {/* Modal de Abertura de Caixa Avaliação */}
      {caixaAbrirAvaliacao && (
        <AbrirCaixaAvaliacaoModal
          open={modalAbrirAvaliacao}
          onOpenChange={setModalAbrirAvaliacao}
          saldoSistema={saldoAvaliacao?.saldoFinal ?? 0}
          isLoading={loadingSaldoAvaliacao}
          onSuccess={() => {
            refetch();
          }}
        />
      )}

      {/* Dialog de edição de movimentação */}
      <Dialog open={!!movimentacaoParaEditar} onOpenChange={(open) => !open && resetEditarState()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar movimentação</DialogTitle>
            <DialogDescription>
              Ajuste valor ou motivo. O saldo dos caixas envolvidos será recalculado automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={valorEditar}
                onChange={(e) => setValorEditar(sanitizeMoney(e.target.value))}
                onBlur={(e) => {
                  if (e.target.value) {
                    setValorEditar(roundToCents(e.target.value));
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input
                value={motivoEditar}
                onChange={(e) => setMotivoEditar(e.target.value)}
                placeholder="Descreva o motivo"
              />
            </div>
            {movimentacaoParaEditar && (
              <p className="text-xs text-muted-foreground">
                Tipo: {movimentacaoParaEditar.tipo === 'transferencia_entre_caixas' ? 'Transferência' : movimentacaoParaEditar.tipo === 'entrada' ? 'Entrada' : 'Saída'}
              </p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={resetEditarState} disabled={editandoMov}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarEdicaoMov} disabled={editandoMov}>
              {editandoMov ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão de movimentação */}
      <AlertDialog open={!!movimentacaoParaExcluir} onOpenChange={(open) => !open && setMovimentacaoParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta movimentação?
              <br /><br />
              <strong>Tipo:</strong> {movimentacaoParaExcluir?.tipo === 'transferencia_entre_caixas' ? 'Transferência' : movimentacaoParaExcluir?.tipo === 'entrada' ? 'Entrada' : 'Saída'}
              <br />
              <strong>Valor:</strong> R$ {movimentacaoParaExcluir?.valor?.toFixed(2)}
              <br />
              <strong>Motivo:</strong> {movimentacaoParaExcluir?.motivo || '-'}
              <br /><br />
              <span className="text-destructive font-medium">
                Os saldos dos caixas envolvidos serão revertidos automaticamente.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletandoMov}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExclusaoMov}
              disabled={deletandoMov}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletandoMov ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
