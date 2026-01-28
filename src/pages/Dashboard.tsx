import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startOfMonth, endOfMonth, endOfDay, isToday, format, isSameDay, parseISO, startOfWeek, endOfWeek, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Crown, Users, TrendingUp, DollarSign, ShoppingBag, Package, CreditCard, BarChart3, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEstoque } from "@/hooks/useEstoque";
import { useUser } from "@/contexts/UserContext";
import { convertToLocalTime } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ptBR as dayPickerPtBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

// --- UTILITÁRIOS ---
const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// --- CORES (Mantendo as suas originais + Novas para vendas) ---
const COLORS = { 
  dinheiro: "#34d399", 
  gira: "#f7ca43",      
  recusado: "#f87171", 
  estoque: "#7da4ff",  
  compras: "#fbbf24",  
  vendas: "#8884d8",   // Nova cor para vendas
  qtd: "#82ca9d"       // Nova cor para qtd
};
const PIE_COLORS = ["#fbbf24", "#7da4ff", "#34d399", "#f7ca43", "#f87171", "#a78bfa"];
const SALES_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

// --- TOOLTIP PERSONALIZADO (SEU ORIGINAL) ---
const CustomTooltip = ({ active, payload, label, type = "currency" }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-xl z-50">
        <p className="font-bold text-gray-700 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-600 capitalize">{entry.name}: {type === "currency" ? formatCurrency(entry.value) : `${entry.value} un`}</span>
          </div>
        ))}
         {payload.length > 1 && type === "currency" && (
           <div className="mt-2 pt-2 border-t border-gray-100">
             <p className="font-bold text-gray-800">
               Total: {formatCurrency(payload.reduce((acc: any, curr: any) => acc + curr.value, 0))}
             </p>
           </div>
        )}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
    const { cargo } = useUser();
    const [config, setConfig] = useState<any>(null);
  const [allAtendimentos, setAllAtendimentos] = useState<any[]>([]);
  const [abaSelecionada, setAbaSelecionada] = useState<string>("equipe");
  const [allAtendimentosMesInteiro, setAllAtendimentosMesInteiro] = useState<any[]>([]); // Novo: sempre o mês inteiro
  const [allVendas, setAllVendas] = useState<any[]>([]); // Estado Novo para Vendas
  const [loading, setLoading] = useState(true);
  const { data: estoque } = useEstoque();

  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);

  // Seletor de período (mês atual por padrão)
  const [periodo, setPeriodo] = useState<DateRange>({ from: inicioMes, to: fimMes });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    // Faixas rápidas: hoje, semana, mês
    const quickRanges = {
        hoje: {
            from: startOfDay(hoje),
            to: startOfDay(hoje)
        },
        semana: {
            from: startOfWeek(hoje, { weekStartsOn: 1 }),
            to: endOfWeek(hoje, { weekStartsOn: 1 })
        },
        mes: {
            from: inicioMes,
            to: fimMes
        }
    } as const;

    const applyQuickRange = (key: keyof typeof quickRanges) => {
        const range = quickRanges[key];
        setPeriodo({ from: range.from, to: range.to });
    };

    const isQuickRangeActive = (key: keyof typeof quickRanges) => {
        const range = quickRanges[key];
        return (
            periodo?.from && periodo?.to &&
            isSameDay(periodo.from, range.from) &&
            isSameDay(periodo.to, range.to)
        );
    };

  // --- FETCH DE DADOS (JUNTOS MAS SEPARADOS) ---
    useEffect(() => {
        // Buscar configuração dos valores dos itens
        async function fetchConfig() {
          const { data } = await supabase.from('configuracao').select('*').single();
          setConfig(data);
        }
        fetchConfig();
    async function fetchData() {
      setLoading(true);
            const inicio = periodo?.from ? periodo.from : inicioMes;
            const fim = periodo?.to ? periodo.to : fimMes;

            // 1. Busca Atendimentos do PERÍODO SELECIONADO (para a tabela)
            // 1a. Finalizados usando a data de fechamento/encerramento dentro do período
            const { data: atendFinalizados } = await supabase
                .from("atendimentos")
                .select("*")
                .eq("status", "finalizado")
                .gte("hora_encerramento", inicio.toISOString())
                .lte("hora_encerramento", endOfDay(fim).toISOString());

            // 1b. Recusados usando a data de fechamento/encerramento dentro do período
            const { data: atendRecusados } = await supabase
                .from("atendimentos")
                .select("*")
                .eq("status", "recusado")
                .gte("hora_encerramento", inicio.toISOString())
                .lte("hora_encerramento", endOfDay(fim).toISOString());

            // 1c. Demais atendimentos (não-finalizados e não-recusados) usando a data de criação dentro do período
            const { data: atendOutros } = await supabase
                .from("atendimentos")
                .select("*")
                .neq("status", "finalizado")
                .neq("status", "recusado")
                .gte("created_at", inicio.toISOString())
                .lte("created_at", endOfDay(fim).toISOString());

      // 2. Busca Atendimentos do MÊS INTEIRO (para o gráfico de rosca)
      const { data: atendFinalizadosMes } = await supabase
        .from("atendimentos")
        .select("*")
        .eq("status", "finalizado")
        .gte("hora_encerramento", inicioMes.toISOString())
        .lte("hora_encerramento", endOfDay(fimMes).toISOString());

      // 2b. Buscar itens de todas as avaliações (para classificação por bolsa/fralda)
      const { data: itens } = await supabase
        .from("atendimento_itens")
        .select("*, item_categories(id, slug, nome)");

      const itensByAtendimento = new Map<string, any[]>();
      (itens || []).forEach((it: any) => {
        const list = itensByAtendimento.get(it.atendimento_id) || [];
        list.push({
          id: it.id,
          categoria_id: it.categoria_id,
          quantidade: it.quantidade,
          valor_total: it.valor_total,
          categoria: it.item_categories,
        });
        itensByAtendimento.set(it.atendimento_id, list);
      });

      // Mapear atendimentos com seus itens
      const mapearComItens = (lista: any[]) =>
        (lista || []).map((a: any) => ({
          ...a,
          itens: itensByAtendimento.get(a.id) || [],
        }));

      // 3. Busca Vendas (Novo código)
      const { data: vendas } = await supabase
        .from("vendas")
        .select("*")
                .gte("created_at", inicio.toISOString())
                .lte("created_at", endOfDay(fim).toISOString());

    setAllAtendimentos([...mapearComItens(atendFinalizados), ...mapearComItens(atendRecusados), ...mapearComItens(atendOutros)]);
      setAllAtendimentosMesInteiro(mapearComItens(atendFinalizadosMes)); // Novo: sempre o mês inteiro
      setAllVendas(vendas || []);
      setLoading(false);
    }
    fetchData();
    }, [periodo]);

  // ==================================================================================
  // LÓGICA 1: COMPRAS E AVALIAÇÕES (SEU CÓDIGO ORIGINAL INTACTO)
  // ==================================================================================
  
  const classificarPagamento = (item: any): "dinheiro" | "gira" => {
    // Verifica cada método de pagamento individualmente
    const metodos = [
      item.pagamento_1_metodo, 
      item.pagamento_2_metodo, 
      item.pagamento_3_metodo, 
      item.pagamento_4_metodo
    ].map(m => (m || "").toLowerCase());
    
    // Se QUALQUER método contiver "dinheiro" ou "pix", classifica como dinheiro
    if (metodos.some(metodo => metodo.includes("dinheiro") || metodo.includes("pix"))) {
      return "dinheiro";
    }
    
    // Senão, classifica como gira (padrão para outros métodos)
    return "gira";
  };

  const metrics = useMemo(() => {
        const finalizadosMes = allAtendimentos.filter(a => a.status === "finalizado");
        const finalizadosHoje = finalizadosMes.filter(a => {
            const dataFechamento = a.hora_encerramento || a.created_at;
            return dataFechamento ? isToday(new Date(dataFechamento)) : false;
        });
    const recusadosMes = allAtendimentos.filter(a => a.status === "recusado");

    const calcularTotais = (lista: any[]) => {
      let d = { dinheiro: 0, gira: 0, qtdDinheiro: 0, qtdGira: 0 };
      lista.forEach(item => {
        const val = Number(item.valor_total_negociado || 0);
        if (val > 0) {
            if (classificarPagamento(item) === "gira") { 
                d.gira += val; 
                d.qtdGira++; 
            } else { 
                d.dinheiro += val; 
                d.qtdDinheiro++; 
            }
        }
      });
      return { ...d, total: d.dinheiro + d.gira };
    };

    const metricasHoje = calcularTotais(finalizadosHoje);
    const metricasMes = calcularTotais(finalizadosMes);

    const mapAv = new Map();
    finalizadosMes.forEach(a => {
        const nome = a.avaliadora_nome || "N/A";
        const val = Number(a.valor_total_negociado || 0);
        const curr = mapAv.get(nome) || { d:0, g:0, r:0, valG:0 };
        if (classificarPagamento(a) === "gira") { curr.g++; curr.valG += val; } else { curr.d++; }
        mapAv.set(nome, curr);
    });
    recusadosMes.forEach(a => {
        const nome = a.avaliadora_nome || "N/A";
        const curr = mapAv.get(nome) || { d:0, g:0, r:0, valG:0 };
        curr.r++;
        mapAv.set(nome, curr);
    });
    
    const performanceData = Array.from(mapAv.entries()).map(([n, d]) => ({
        nome: n, aprovadoDinheiro: d.d, aprovadoGira: d.g, recusado: d.r, totalGiraValor: d.valG, total: d.d+d.g+d.r
    })).sort((a,b) => b.total - a.total);

    let rainha = { nome: "-", valor: 0, percentual: 0 };
    performanceData.forEach(d => {
        if(d.totalGiraValor > rainha.valor) rainha = { nome: d.nome, valor: d.totalGiraValor, percentual: ((d.aprovadoGira/(d.aprovadoDinheiro+d.aprovadoGira))*100)||0 };
    });

    const pieData = [
       { name: "Baby", value: finalizadosMes.reduce((acc, curr) => acc + (curr.qtd_baby || 0), 0) },
       { name: "Infantil", value: finalizadosMes.reduce((acc, curr) => acc + (curr.qtd_1_a_16 || 0), 0) },
       { name: "Calçados", value: finalizadosMes.reduce((acc, curr) => acc + (curr.qtd_calcados || 0), 0) },
       { name: "Brinquedos", value: finalizadosMes.reduce((acc, curr) => acc + (curr.qtd_brinquedos || 0), 0) },
    ].filter(d => d.value > 0);

    const comprasPorCat = {
        baby: finalizadosMes.reduce((acc, a) => acc + (a.qtd_baby || 0), 0),
        infantil: finalizadosMes.reduce((acc, a) => acc + (a.qtd_1_a_16 || 0), 0),
        calcados: finalizadosMes.reduce((acc, a) => acc + (a.qtd_calcados || 0), 0),
        brinquedos: finalizadosMes.reduce((acc, a) => acc + (a.qtd_brinquedos || 0), 0),
        itens_medios: finalizadosMes.reduce((acc, a) => acc + (a.qtd_itens_medios || 0), 0),
        itens_grandes: finalizadosMes.reduce((acc, a) => acc + (a.qtd_itens_grandes || 0), 0),
    };

    return { metricasHoje, metricasMes, performanceData, rainha, comprasPorCat, pieData };
  }, [allAtendimentos]);

  const dataFinanceiro = [
    { name: "Mês", dinheiro: metrics.metricasMes.dinheiro, gira: metrics.metricasMes.gira },
    { name: "Hoje", dinheiro: metrics.metricasHoje.dinheiro, gira: metrics.metricasHoje.gira },
  ];
  const dataQtd = [
    { name: "Mês", dinheiro: metrics.metricasMes.qtdDinheiro, gira: metrics.metricasMes.qtdGira },
    { name: "Hoje", dinheiro: metrics.metricasHoje.qtdDinheiro, gira: metrics.metricasHoje.qtdGira },
  ];
  
  const dataComparativo = [
    { name: "Baby", compras: metrics.comprasPorCat.baby, estoque: 0 },
    { name: "Infantil", compras: metrics.comprasPorCat.infantil, estoque: 0 },
  ];

  if (estoque) {
    estoque.forEach(e => {
        const cat = e.categoria.toLowerCase();
        if (cat.includes("baby")) dataComparativo[0].estoque = e.quantidade_atual;
        if (cat.includes("infantil") || cat.includes("16")) dataComparativo[1].estoque = e.quantidade_atual;
    });
  }

  // ==================================================================================
  // LÓGICA 2: VENDAS (NOVA LÓGICA EXPANDIDA)
  // ==================================================================================
  
  const salesMetrics = useMemo(() => {
    const vendasHoje = allVendas.filter(v => isSameDay(parseISO(v.created_at), hoje));

    // === KPIs PRINCIPAIS ===
    const totalVendidoHoje = vendasHoje.reduce((acc, curr) => acc + Number(curr.valor_total_venda || 0), 0);
    const totalVendidoMes = allVendas.reduce((acc, curr) => acc + Number(curr.valor_total_venda || 0), 0);
    const qtdVendasHoje = vendasHoje.length;
    const qtdVendasMes = allVendas.length;
    
    // === CONTAGEM DE PEÇAS POR CATEGORIA ===
    const contarPecasPorCategoria = (lista: any[]) => ({
      baby: lista.reduce((acc, curr) => acc + (curr.qtd_baby_vendida || 0), 0),
      infantil: lista.reduce((acc, curr) => acc + (curr.qtd_1_a_16_vendida || 0), 0),
      calcados: lista.reduce((acc, curr) => acc + (curr.qtd_calcados_vendida || 0), 0),
      brinquedos: lista.reduce((acc, curr) => acc + (curr.qtd_brinquedos_vendida || 0), 0),
      itens_medios: lista.reduce((acc, curr) => acc + (curr.qtd_itens_medios_vendida || 0), 0),
      itens_grandes: lista.reduce((acc, curr) => acc + (curr.qtd_itens_grandes_vendida || 0), 0),
    });
    
    const pecasHoje = contarPecasPorCategoria(vendasHoje);
    const pecasMes = contarPecasPorCategoria(allVendas);
    
    const totalPecasHoje = Object.values(pecasHoje).reduce((a, b) => a + b, 0);
    const totalPecasMes = Object.values(pecasMes).reduce((a, b) => a + b, 0);

    // === TICKET MÉDIO ===
    const ticketMedioGeral = qtdVendasMes > 0 ? totalVendidoMes / qtdVendasMes : 0;

    // === VENDAS POR VENDEDORA (DIA E MÊS) ===
    const vendedorasMap = new Map();
    
    allVendas.forEach(venda => {
        const nome = venda.vendedora_nome || "Sem Vendedora";
        const valor = Number(venda.valor_total_venda || 0);
        const ehHoje = isSameDay(parseISO(venda.created_at), hoje);
        
        const current = vendedorasMap.get(nome) || { 
          valorMes: 0, qtdMes: 0, valorHoje: 0, qtdHoje: 0 
        };
        
        current.valorMes += valor;
        current.qtdMes += 1;
        
        if (ehHoje) {
          current.valorHoje += valor;
          current.qtdHoje += 1;
        }
        
        vendedorasMap.set(nome, current);
    });
    
    const vendedorasData = Array.from(vendedorasMap, ([nome, data]) => ({
      nome,
      ...data,
      ticketMedio: data.qtdMes > 0 ? data.valorMes / data.qtdMes : 0
    })).sort((a, b) => b.valorMes - a.valorMes);

    // === VENDAS EM GIRA-CRÉDITO ===
    let totalGiraCreditoMes = 0;
    let totalGiraCreditoHoje = 0;
    
    allVendas.forEach(venda => {
      const ehHoje = isSameDay(parseISO(venda.created_at), hoje);
      let valorGiraVenda = 0;
      
      // Verificar nos 3 métodos de pagamento - apenas "gira" é contabilizado
      [
        { metodo: venda.metodo_pagto_1, valor: venda.valor_pagto_1 },
        { metodo: venda.metodo_pagto_2, valor: venda.valor_pagto_2 },
        { metodo: venda.metodo_pagto_3, valor: venda.valor_pagto_3 },
      ].forEach(pag => {
        const metodo = (pag.metodo || "").toLowerCase();
        if (metodo.includes("gira")) {
          valorGiraVenda += Number(pag.valor || 0);
        }
      });
      
      totalGiraCreditoMes += valorGiraVenda;
      if (ehHoje) {
        totalGiraCreditoHoje += valorGiraVenda;
      }
    });

    // === ANÁLISE DE TIPOS DE PAGAMENTO (HOJE) ===
    let pagamentosHoje = {
      giraCredito: 0,
      dinheiro: 0,
      pix: 0,
      todosCreditos: 0,
      debito: 0
    };

    vendasHoje.forEach(venda => {
      [
        { metodo: venda.metodo_pagto_1, valor: venda.valor_pagto_1 },
        { metodo: venda.metodo_pagto_2, valor: venda.valor_pagto_2 },
        { metodo: venda.metodo_pagto_3, valor: venda.valor_pagto_3 },
      ].forEach(pag => {
        const metodo = (pag.metodo || "").toLowerCase();
        const valor = Number(pag.valor || 0);
        
        if (metodo.includes("gira")) {
          pagamentosHoje.giraCredito += valor;
        } else if (metodo.includes("dinheiro")) {
          pagamentosHoje.dinheiro += valor;
        } else if (metodo.includes("pix")) {
          pagamentosHoje.pix += valor;
        } else if (metodo.includes("crédito") || metodo.includes("credito")) {
          pagamentosHoje.todosCreditos += valor;
        } else if (metodo.includes("débito") || metodo.includes("debito")) {
          pagamentosHoje.debito += valor;
        }
      });
    });

    const totalPagamentosHoje = pagamentosHoje.giraCredito + pagamentosHoje.dinheiro + pagamentosHoje.pix + pagamentosHoje.todosCreditos + pagamentosHoje.debito;
    const porcentagensPagamentos = totalPagamentosHoje > 0 ? {
      giraCredito: (pagamentosHoje.giraCredito / totalPagamentosHoje) * 100,
      dinheiro: (pagamentosHoje.dinheiro / totalPagamentosHoje) * 100,
      pix: (pagamentosHoje.pix / totalPagamentosHoje) * 100,
      todosCreditos: (pagamentosHoje.todosCreditos / totalPagamentosHoje) * 100,
      debito: (pagamentosHoje.debito / totalPagamentosHoje) * 100
    } : { giraCredito: 0, dinheiro: 0, pix: 0, todosCreditos: 0, debito: 0 };

    // === ANÁLISE DE TIPOS DE PAGAMENTO (MÊS/PERÍODO) ===
    let pagamentosMes = {
      giraCredito: 0,
      dinheiro: 0,
      pix: 0,
      todosCreditos: 0,
      debito: 0
    };

    allVendas.forEach(venda => {
      [
        { metodo: venda.metodo_pagto_1, valor: venda.valor_pagto_1 },
        { metodo: venda.metodo_pagto_2, valor: venda.valor_pagto_2 },
        { metodo: venda.metodo_pagto_3, valor: venda.valor_pagto_3 },
      ].forEach(pag => {
        const metodo = (pag.metodo || "").toLowerCase();
        const valor = Number(pag.valor || 0);
        
        if (metodo.includes("gira")) {
          pagamentosMes.giraCredito += valor;
        } else if (metodo.includes("dinheiro")) {
          pagamentosMes.dinheiro += valor;
        } else if (metodo.includes("pix")) {
          pagamentosMes.pix += valor;
        } else if (metodo.includes("crédito") || metodo.includes("credito")) {
          pagamentosMes.todosCreditos += valor;
        } else if (metodo.includes("débito") || metodo.includes("debito")) {
          pagamentosMes.debito += valor;
        }
      });
    });

    const totalPagamentosMes = pagamentosMes.giraCredito + pagamentosMes.dinheiro + pagamentosMes.pix + pagamentosMes.todosCreditos + pagamentosMes.debito;
    const porcentagensPagamentosMes = totalPagamentosMes > 0 ? {
      giraCredito: (pagamentosMes.giraCredito / totalPagamentosMes) * 100,
      dinheiro: (pagamentosMes.dinheiro / totalPagamentosMes) * 100,
      pix: (pagamentosMes.pix / totalPagamentosMes) * 100,
      todosCreditos: (pagamentosMes.todosCreditos / totalPagamentosMes) * 100,
      debito: (pagamentosMes.debito / totalPagamentosMes) * 100
    } : { giraCredito: 0, dinheiro: 0, pix: 0, todosCreditos: 0, debito: 0 };

    // === PICOS DE VENDAS POR HORÁRIO ===
    const vendasPorHora = new Map();
    allVendas.forEach(venda => {
      const dataLocal = convertToLocalTime(venda.created_at);
      const hora = dataLocal ? dataLocal.getHours() : 0;
      const faixaHoraria = `${hora}h`;
      const valor = Number(venda.valor_total_venda || 0);
      vendasPorHora.set(faixaHoraria, (vendasPorHora.get(faixaHoraria) || 0) + valor);
    });
    
    const picosHorarios = Array.from(vendasPorHora, ([hora, valor]) => ({ 
      hora, 
      valor 
    })).sort((a, b) => {
      const horaA = parseInt(a.hora);
      const horaB = parseInt(b.hora);
      return horaA - horaB;
    });

    return { 
      totalVendidoHoje, 
      totalVendidoMes, 
      qtdVendasHoje,
      qtdVendasMes,
      pecasHoje,
      pecasMes,
      totalPecasHoje,
      totalPecasMes,
      ticketMedioGeral,
      vendedorasData,
      totalGiraCreditoMes,
      totalGiraCreditoHoje,
      picosHorarios,
      pagamentosHoje,
      porcentagensPagamentos,
      pagamentosMes,
      porcentagensPagamentosMes
    };
  }, [allVendas, hoje]);

  // === PICOS DE HORÁRIOS FILTRADO POR PERÍODO ===
  const picosHorariosFiltrados = useMemo(() => {
    const vendasPorHora = new Map();
    allVendas.forEach(venda => {
      const dataLocal = convertToLocalTime(venda.created_at);
      const hora = dataLocal ? dataLocal.getHours() : 0;
      const faixaHoraria = `${hora}h`;
      const valor = Number(venda.valor_total_venda || 0);
      vendasPorHora.set(faixaHoraria, (vendasPorHora.get(faixaHoraria) || 0) + valor);
    });
    
    return Array.from(vendasPorHora, ([hora, valor]) => ({ 
      hora, 
      valor 
    })).sort((a, b) => {
      const horaA = parseInt(a.hora);
      const horaB = parseInt(b.hora);
      return horaA - horaB;
    });
  }, [allVendas]);

    // Totais para o donut: vendas vs gastos em dinheiro (avaliações) - FILTRA POR PERÍODO
    const donutResumoMes = useMemo(() => {
        const totalVendasMes = salesMetrics.totalVendidoMes;
        
        // Usar os atendimentos do PERÍODO FILTRADO
        const totalGastosDinheiroMes = allAtendimentos
            .filter((a) => a.status === "finalizado")
            .reduce((acc, a) => acc + (classificarPagamento(a) === "dinheiro" ? Number(a.valor_total_negociado || 0) : 0), 0);

        const percentual = totalVendasMes > 0 ? (totalGastosDinheiroMes / totalVendasMes) * 100 : 0;

        const data = [
            { name: "Gastos em dinheiro", value: totalGastosDinheiroMes, color: "#ef4444" },
            { name: "Demais vendas", value: Math.max(totalVendasMes - totalGastosDinheiroMes, 0), color: "#22c55e" },
        ];

        return { totalVendasMes, totalGastosDinheiroMes, percentual, data };
    }, [salesMetrics.totalVendidoMes, allAtendimentos]);

    // Tabela de gasto em dinheiro por grupos de avaliações (com base no período selecionado)
    const tabelaGastos = useMemo(() => {
      const finalizadosPeriodo = allAtendimentos.filter((a) => a.status === "finalizado");

      const ehDinheiro = (a: any) => classificarPagamento(a) === "dinheiro";
      const ehGira = (a: any) => classificarPagamento(a) === "gira";

      // Classificação única por avaliação com precedência: Grandes > Enxoval > Brinquedos > Bolsa/Fralda > Só roupas/sapatos > Outras > Outros
      const classificarAvaliacao = (a: any): string => {
        const hasGrandes = (a.qtd_itens_grandes || 0) > 0;
        const hasEnxoval = (a.qtd_itens_medios || 0) > 0; // Enxoval
        const hasBrinquedos = (a.qtd_brinquedos || 0) > 0;
        const roupasSapatosQtd = (a.qtd_baby || 0) + (a.qtd_1_a_16 || 0) + (a.qtd_calcados || 0);
        const hasRoupasOuSapatos = roupasSapatosQtd > 0;
        
        // Verificar itens dinâmicos (bolsa, fralda, etc.)
        let hasBolsaOuFralda = false;
        if (a.itens && Array.isArray(a.itens)) {
          hasBolsaOuFralda = a.itens.some((item: any) => {
            const cat = item.categoria;
            const slug = cat?.slug || "";
            return slug.includes("bolsa") || slug.includes("fralda");
          });
        }

        const hasQualquerItem = hasGrandes || hasEnxoval || hasBrinquedos || hasRoupasOuSapatos || hasBolsaOuFralda;

        if (!hasQualquerItem) return "Outros (sem item registrado)";
        if (hasGrandes) return "Com Itens grandes";
        if (hasEnxoval) return "Com Enxoval";
        if (hasBrinquedos) return "Com Brinquedos";
        if (hasBolsaOuFralda) return "Bolsa/Fralda";
        if (hasRoupasOuSapatos) return "Só roupas/sapatos";
        return "Com outras categorias";
      };

      // Agrupar avaliações por categoria classificada
      const gruposMap = new Map<string, any[]>();
      finalizadosPeriodo.forEach(a => {
        const cat = classificarAvaliacao(a);
        const arr = gruposMap.get(cat) || [];
        arr.push(a);
        gruposMap.set(cat, arr);
      });

      const totalGrupo = (lista: any[], filtro: (a: any) => boolean) =>
        lista.filter(filtro).reduce((acc, a) => acc + Number(a.valor_total_negociado || 0), 0);

      const getAvaliacoesPorGrupo = (lista: any[]) =>
        lista.filter(ehDinheiro).map(a => ({
          cliente: a.nome_cliente || a.cliente_nome || "Sem nome",
          data: a.hora_encerramento ? format(parseISO(a.hora_encerramento), "dd/MM/yyyy", { locale: ptBR }) : "",
          valor: Number(a.valor_total_negociado || 0),
          pagamento_1_metodo: a.pagamento_1_metodo,
          pagamento_2_metodo: a.pagamento_2_metodo,
          pagamento_3_metodo: a.pagamento_3_metodo,
          pagamento_4_metodo: a.pagamento_4_metodo,
          qtd_baby: a.qtd_baby || 0,
          qtd_1_a_16: a.qtd_1_a_16 || 0,
          qtd_calcados: a.qtd_calcados || 0,
          qtd_brinquedos: a.qtd_brinquedos || 0,
          qtd_itens_medios: a.qtd_itens_medios || 0,
          qtd_itens_grandes: a.qtd_itens_grandes || 0,
          itens: a.itens || [],
          descricao_itens: a.descricao_itens_extra || ""
        }));

      // Ordem solicitada de exibição
      const order = [
        "Só roupas/sapatos",
        "Com Itens grandes",
        "Com Enxoval",
        "Com Brinquedos",
        "Bolsa/Fralda",
        "Com outras categorias",
      ];

      const rows = order.map(categoria => {
        const lista = gruposMap.get(categoria) || [];
        return {
          categoria,
          totalDinheiro: totalGrupo(lista, ehDinheiro),
          qtdDinheiro: lista.filter(ehDinheiro).length,
          detalhes: getAvaliacoesPorGrupo(lista),
          totalGira: totalGrupo(lista, ehGira),
          qtdGira: lista.filter(ehGira).length,
        };
      });

      const totalGeralDinheiro = rows.reduce((acc, r) => acc + r.totalDinheiro, 0);
      const totalGeralGira = rows.reduce((acc, r) => acc + r.totalGira, 0);
      const totalQtdDinheiro = rows.reduce((acc, r) => acc + r.qtdDinheiro, 0);
      const totalQtdGira = rows.reduce((acc, r) => acc + r.qtdGira, 0);
      return { rows, totalGeralDinheiro, totalGeralGira, totalQtdDinheiro, totalQtdGira };
    }, [allAtendimentos]);


  // ==================================================================================
  // RENDERIZAÇÃO (TABS)
  // ==================================================================================
  
  // Se for perfil caixa, mostrar apenas Performance da Equipe
  if (cargo === 'caixa') {
    return (
      <MainLayout title="Dashboard">
        <div className="relative -m-6">
          {/* === CABEÇALHO FIXO === */}
          <div className="sticky top-0 z-50 bg-white border-b px-6 py-4 shadow-sm">
            <div className="flex flex-col justify-between items-start gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Performance da Equipe</h2>
                <p className="text-muted-foreground">{format(hoje, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
              </div>
              
              {/* Seletor de período universal */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={isQuickRangeActive("hoje") ? "default" : "outline"}
                  onClick={() => applyQuickRange("hoje")}
                >
                  Hoje
                </Button>
                <Button
                  size="sm"
                  variant={isQuickRangeActive("semana") ? "default" : "outline"}
                  onClick={() => applyQuickRange("semana")}
                >
                  Semana
                </Button>
                <Button
                  size="sm"
                  variant={isQuickRangeActive("mes") ? "default" : "outline"}
                  onClick={() => applyQuickRange("mes")}
                >
                  Mês
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[260px] justify-start text-left font-normal">
                      {periodo?.from && periodo?.to
                        ? `${format(periodo.from, "dd/MM/yyyy", { locale: ptBR })} — ${format(periodo.to, "dd/MM/yyyy", { locale: ptBR })}`
                        : "Selecionar período"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      selected={periodo as any}
                      onSelect={(range) => setPeriodo(range as DateRange)}
                      defaultMonth={periodo?.from || inicioMes}
                      locale={ptBR}
                      numberOfMonths={2}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* === CONTEÚDO === */}
          <div className="px-6 py-6 space-y-6">
            {/* === GRÁFICOS DE VENDAS POR VENDEDORA === */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico: Valor Total de Vendas por Vendedora */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex gap-2 items-center">
                  <TrendingUp className="w-4"/> Total de Vendas por Vendedora
                </CardTitle>
                <p className="text-xs text-muted-foreground">Período: {periodo?.from && periodo?.to ? `${format(periodo.from, "dd/MM/yyyy", { locale: ptBR })} — ${format(periodo.to, "dd/MM/yyyy", { locale: ptBR })}` : "Mês atual"}</p>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesMetrics.vendedorasData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="nome" angle={-15} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="valorMes" name="Valor Total" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico: Quantidade de Vendas por Vendedora */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex gap-2 items-center">
                  <BarChart3 className="w-4"/> Quantidade de Vendas por Vendedora
                </CardTitle>
                <p className="text-xs text-muted-foreground">Período: {periodo?.from && periodo?.to ? `${format(periodo.from, "dd/MM/yyyy", { locale: ptBR })} — ${format(periodo.to, "dd/MM/yyyy", { locale: ptBR })}` : "Mês atual"}</p>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesMetrics.vendedorasData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="nome" angle={-15} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip content={<CustomTooltip type="number" />} />
                    <Bar dataKey="qtdMes" name="Quantidade" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          {/* === DESEMPENHO POR VENDEDORA (VISUAL E COMPARATIVO) === */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {salesMetrics.vendedorasData.map((vendedora, index) => {
              const maxValorMes = Math.max(...salesMetrics.vendedorasData.map(v => v.valorMes));
              const maxQtdMes = Math.max(...salesMetrics.vendedorasData.map(v => v.qtdMes));
              const maxValorHoje = Math.max(...salesMetrics.vendedorasData.map(v => v.valorHoje));
              const maxQtdHoje = Math.max(...salesMetrics.vendedorasData.map(v => v.qtdHoje));
              const isClienteNaoAtendido = vendedora.nome.toLowerCase().includes('cliente não atendido');
              
              return (
                <Card key={index} className={`border-2 hover:shadow-lg transition-all ${isClienteNaoAtendido ? 'border-red-500' : ''}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-full ${isClienteNaoAtendido ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-purple-500 to-pink-500'} flex items-center justify-center text-white font-bold`}>
                        {vendedora.nome.charAt(0)}
                      </div>
                      <div>
                        <div className="text-base font-bold">{vendedora.nome}</div>
                        <div className="text-xs text-muted-foreground">Vendedora</div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Valor do Mês com barra */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <div className="text-[10px] text-gray-600">Mês - Valor</div>
                          <div className="text-sm font-bold text-blue-700">{formatCurrency(vendedora.valorMes)}</div>
                        </div>
                        <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                            style={{ width: `${maxValorMes > 0 ? (vendedora.valorMes / maxValorMes * 100) : 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Quantidade do Mês com barra */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <div className="text-[10px] text-gray-600">Mês - Qtd</div>
                          <div className="text-sm font-bold text-purple-700">{vendedora.qtdMes}</div>
                        </div>
                        <div className="w-full h-2 bg-purple-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
                            style={{ width: `${maxQtdMes > 0 ? (vendedora.qtdMes / maxQtdMes * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Valor de Hoje com barra */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <div className="text-[10px] text-gray-600">Hoje - Valor</div>
                          <div className="text-sm font-bold text-green-700">{formatCurrency(vendedora.valorHoje)}</div>
                        </div>
                        <div className="w-full h-2 bg-green-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                            style={{ width: `${maxValorHoje > 0 ? (vendedora.valorHoje / maxValorHoje * 100) : 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Quantidade de Hoje com barra */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <div className="text-[10px] text-gray-600">Hoje - Qtd</div>
                          <div className="text-sm font-bold text-teal-700">{vendedora.qtdHoje}</div>
                        </div>
                        <div className="w-full h-2 bg-teal-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-teal-500 to-teal-600 transition-all duration-500"
                            style={{ width: `${maxQtdHoje > 0 ? (vendedora.qtdHoje / maxQtdHoje * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* === PERFORMANCE EQUIPE AVALIAÇÃO (GRÁFICO DE BARRAS) === */}
          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2 items-center">
                <Users className="w-5"/> Performance Equipe Avaliação
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Período: {periodo?.from && periodo?.to 
                  ? `${format(periodo.from, "dd/MM/yyyy", { locale: ptBR })} — ${format(periodo.to, "dd/MM/yyyy", { locale: ptBR })}` 
                  : "Mês atual"}
              </p>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={metrics.performanceData}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="nome" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="aprovadoDinheiro" name="Aprovado em Dinheiro" stackId="a" fill="#10b981" />
                  <Bar dataKey="aprovadoGira" name="Aprovado em Gira" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="recusado" name="Recusado" stackId="a" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  // Dashboard completo para admin e outros perfis
  return (
    <MainLayout title="Dashboard Estratégico">
      <div className="relative -m-6">
        {/* === CABEÇALHO FIXO === */}
        <div className="sticky top-0 z-50 bg-white border-b px-6 py-4 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Visão Geral</h2>
                <p className="text-muted-foreground">{format(hoje, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
              </div>
              
              {/* Seletor de período universal */}
              <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant={isQuickRangeActive("hoje") ? "default" : "outline"}
                    onClick={() => applyQuickRange("hoje")}
                  >
                    Hoje
                  </Button>
                  <Button
                    size="sm"
                    variant={isQuickRangeActive("semana") ? "default" : "outline"}
                    onClick={() => applyQuickRange("semana")}
                  >
                    Semana
                  </Button>
                  <Button
                    size="sm"
                    variant={isQuickRangeActive("mes") ? "default" : "outline"}
                    onClick={() => applyQuickRange("mes")}
                  >
                    Mês
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[260px] justify-start text-left font-normal">
                        {periodo?.from && periodo?.to
                          ? `${format(periodo.from, "dd/MM/yyyy", { locale: ptBR })} — ${format(periodo.to, "dd/MM/yyyy", { locale: ptBR })}`
                          : "Selecionar período"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="range"
                        selected={periodo as any}
                        onSelect={(range) => setPeriodo(range as DateRange)}
                        defaultMonth={periodo?.from || inicioMes}
                        locale={ptBR}
                        numberOfMonths={2}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>

        {/* === CONTEÚDO === */}
        <div className="px-6 py-6 space-y-6">
          {/* === CARDS DE RESUMO NO TOPO === */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-1 pt-3">
              <CardTitle className="text-xs font-medium text-blue-700">💰 Vendas - Mês</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-xl font-bold text-blue-900">{formatCurrency(salesMetrics.totalVendidoMes)}</div>
              <p className="text-[10px] text-blue-600 mt-0.5">{salesMetrics.qtdVendasMes} vendas</p>
              
              {/* Barra de distribuição de pagamentos */}
              <div className="mt-3 w-full h-6 bg-blue-50 rounded overflow-hidden flex">
                {salesMetrics.porcentagensPagamentosMes.giraCredito > 0 && (
                  <div 
                    className="bg-orange-300 transition-all duration-500"
                    style={{ width: `${salesMetrics.porcentagensPagamentosMes.giraCredito}%` }}
                    title={`Gira-crédito: ${salesMetrics.porcentagensPagamentosMes.giraCredito.toFixed(1)}% (${formatCurrency(salesMetrics.pagamentosMes.giraCredito)})`}
                  />
                )}
                {salesMetrics.porcentagensPagamentosMes.dinheiro > 0 && (
                  <div 
                    className="bg-green-300 transition-all duration-500"
                    style={{ width: `${salesMetrics.porcentagensPagamentosMes.dinheiro}%` }}
                    title={`Dinheiro: ${salesMetrics.porcentagensPagamentosMes.dinheiro.toFixed(1)}% (${formatCurrency(salesMetrics.pagamentosMes.dinheiro)})`}
                  />
                )}
                {salesMetrics.porcentagensPagamentosMes.pix > 0 && (
                  <div 
                    className="bg-teal-300 transition-all duration-500"
                    style={{ width: `${salesMetrics.porcentagensPagamentosMes.pix}%` }}
                    title={`Pix: ${salesMetrics.porcentagensPagamentosMes.pix.toFixed(1)}% (${formatCurrency(salesMetrics.pagamentosMes.pix)})`}
                  />
                )}
                {salesMetrics.porcentagensPagamentosMes.todosCreditos > 0 && (
                  <div 
                    className="bg-blue-300 transition-all duration-500"
                    style={{ width: `${salesMetrics.porcentagensPagamentosMes.todosCreditos}%` }}
                    title={`Créditos: ${salesMetrics.porcentagensPagamentosMes.todosCreditos.toFixed(1)}% (${formatCurrency(salesMetrics.pagamentosMes.todosCreditos)})`}
                  />
                )}
                {salesMetrics.porcentagensPagamentosMes.debito > 0 && (
                  <div 
                    className="bg-purple-300 transition-all duration-500"
                    style={{ width: `${salesMetrics.porcentagensPagamentosMes.debito}%` }}
                    title={`Débito: ${salesMetrics.porcentagensPagamentosMes.debito.toFixed(1)}% (${formatCurrency(salesMetrics.pagamentosMes.debito)})`}
                  />
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-1 pt-3">
              <CardTitle className="text-xs font-medium text-green-700">💵 Vendas - Hoje</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-xl font-bold text-green-900">{formatCurrency(salesMetrics.totalVendidoHoje)}</div>
              <p className="text-[10px] text-green-600 mt-0.5">{salesMetrics.qtdVendasHoje} vendas</p>
              
              {/* Barra de distribuição de pagamentos */}
              <div className="mt-3 w-full h-6 bg-green-50 rounded overflow-hidden flex">
                {salesMetrics.porcentagensPagamentos.giraCredito > 0 && (
                  <div 
                    className="bg-orange-300 transition-all duration-500"
                    style={{ width: `${salesMetrics.porcentagensPagamentos.giraCredito}%` }}
                    title={`Gira-crédito: ${salesMetrics.porcentagensPagamentos.giraCredito.toFixed(1)}% (${formatCurrency(salesMetrics.pagamentosHoje.giraCredito)})`}
                  />
                )}
                {salesMetrics.porcentagensPagamentos.dinheiro > 0 && (
                  <div 
                    className="bg-green-300 transition-all duration-500"
                    style={{ width: `${salesMetrics.porcentagensPagamentos.dinheiro}%` }}
                    title={`Dinheiro: ${salesMetrics.porcentagensPagamentos.dinheiro.toFixed(1)}% (${formatCurrency(salesMetrics.pagamentosHoje.dinheiro)})`}
                  />
                )}
                {salesMetrics.porcentagensPagamentos.pix > 0 && (
                  <div 
                    className="bg-teal-300 transition-all duration-500"
                    style={{ width: `${salesMetrics.porcentagensPagamentos.pix}%` }}
                    title={`Pix: ${salesMetrics.porcentagensPagamentos.pix.toFixed(1)}% (${formatCurrency(salesMetrics.pagamentosHoje.pix)})`}
                  />
                )}
                {salesMetrics.porcentagensPagamentos.todosCreditos > 0 && (
                  <div 
                    className="bg-blue-300 transition-all duration-500"
                    style={{ width: `${salesMetrics.porcentagensPagamentos.todosCreditos}%` }}
                    title={`Créditos: ${salesMetrics.porcentagensPagamentos.todosCreditos.toFixed(1)}% (${formatCurrency(salesMetrics.pagamentosHoje.todosCreditos)})`}
                  />
                )}
                {salesMetrics.porcentagensPagamentos.debito > 0 && (
                  <div 
                    className="bg-purple-300 transition-all duration-500"
                    style={{ width: `${salesMetrics.porcentagensPagamentos.debito}%` }}
                    title={`Débito: ${salesMetrics.porcentagensPagamentos.debito.toFixed(1)}% (${formatCurrency(salesMetrics.pagamentosHoje.debito)})`}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-1 pt-3">
              <CardTitle className="text-xs font-medium text-purple-700">🎯 Ticket Médio - Mês</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-xl font-bold text-purple-900">{formatCurrency(salesMetrics.ticketMedioGeral)}</div>
              <p className="text-[10px] text-purple-600 mt-0.5">Média por venda</p>
            </CardContent>
          </Card>

          <Card className="border-teal-200 bg-teal-50">
            <CardHeader className="pb-1 pt-3">
              <CardTitle className="text-xs font-medium text-teal-700">🎯 Ticket Médio - Hoje</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-xl font-bold text-teal-900">
                {formatCurrency(salesMetrics.qtdVendasHoje > 0 ? salesMetrics.totalVendidoHoje / salesMetrics.qtdVendasHoje : 0)}
              </div>
              <p className="text-[10px] text-teal-600 mt-0.5">Média de hoje</p>
            </CardContent>
          </Card>
        </div>

        {/* === RESUMO: ROSCA (1/3) + TABELA DE GASTOS (2/3) === */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-fr items-stretch">
          {/* Donut de resumo mensal - 1 coluna */}
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resumo: Vendas vs Gastos</CardTitle>
              <p className="text-xs text-muted-foreground">Período: {periodo?.from && periodo?.to ? `${format(periodo.from, "dd/MM/yyyy", { locale: ptBR })} — ${format(periodo.to, "dd/MM/yyyy", { locale: ptBR })}` : "Mês atual"}</p>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-col items-center justify-center gap-3 h-full">
                <div className="w-full flex justify-center items-center">
                  <div className="w-[180px] h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donutResumoMes.data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                          {donutResumoMes.data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip type="currency" />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="space-y-1.5 w-full text-center">
                  <div className="text-[10px] text-muted-foreground">Total vendas (período)</div>
                  <div className="text-lg font-bold text-green-600">{formatCurrency(donutResumoMes.totalVendasMes)}</div>
                  <div className="text-[10px] text-muted-foreground">Gastos em dinheiro</div>
                  <div className="text-base font-semibold text-red-600">{formatCurrency(donutResumoMes.totalGastosDinheiroMes)}</div>
                  <div className="text-[10px] text-muted-foreground">% sobre vendas</div>
                  <div className="text-base font-semibold">{donutResumoMes.percentual.toFixed(1)}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de gastos em dinheiro - 2 colunas */}
          <Card className="h-full md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Gasto em dinheiro por tipo de avaliação</CardTitle>
              <p className="text-xs text-muted-foreground">Período: {periodo?.from && periodo?.to ? `${format(periodo.from, "dd/MM/yyyy", { locale: ptBR })} — ${format(periodo.to, "dd/MM/yyyy", { locale: ptBR })}` : "Mês atual"}</p>
            </CardHeader>
            <CardContent className="max-h-[420px] overflow-auto">
              <div className="min-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Total em dinheiro</TableHead>
                      <TableHead className="text-right">Nº avaliações</TableHead>
                      <TableHead className="text-right">Total Gira Crédito</TableHead>
                      <TableHead className="text-right">Nº avaliações Gira</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tabelaGastos.rows.map((row) => {
                      const isExpanded = expandedCategories.has(row.categoria);
                      const toggleExpanded = () => {
                        const newExpanded = new Set(expandedCategories);
                        if (newExpanded.has(row.categoria)) {
                          newExpanded.delete(row.categoria);
                        } else {
                          newExpanded.add(row.categoria);
                        }
                        setExpandedCategories(newExpanded);
                      };

                      return (
                        <>
                          <TableRow key={row.categoria} className="cursor-pointer hover:bg-gray-50" onClick={toggleExpanded}>
                            <TableCell className="flex items-center gap-2">
                              <ChevronDown 
                                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                              {row.categoria}
                            </TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(row.totalDinheiro)}</TableCell>
                            <TableCell className="text-right">{row.qtdDinheiro}</TableCell>
                            <TableCell className="text-right font-semibold text-yellow-700">{formatCurrency(row.totalGira)}</TableCell>
                            <TableCell className="text-right">{row.qtdGira}</TableCell>
                          </TableRow>
                          {isExpanded && row.detalhes && row.detalhes.length > 0 && (
                            <TableRow className="bg-gray-50/50">
                              <TableCell colSpan={5} className="p-4">
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-sm text-gray-700">Avaliações em dinheiro nesta categoria:</h4>
                                  <div className="overflow-x-auto">
                                    <Table className="text-sm">
                                      <TableHeader>
                                        <TableRow className="bg-white border-b border-gray-200">
                                          <TableHead className="text-xs">Cliente</TableHead>
                                          <TableHead className="text-xs">Data</TableHead>
                                          <TableHead className="text-xs">Qtd. Itens</TableHead>
                                          <TableHead className="text-xs">Descrição dos Itens</TableHead>
                                          <TableHead className="text-xs text-right">Valor</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {row.detalhes.map((detalhe, idx) => (
                                          <TableRow key={idx} className="border-b border-gray-100 hover:bg-gray-100/50">
                                            <TableCell className="text-xs text-gray-700">{detalhe.cliente}</TableCell>
                                            <TableCell className="text-xs text-gray-700">{detalhe.data}</TableCell>
                                            <TableCell className="text-xs text-gray-700">
                                              {detalhe.qtd_baby > 0 && <div>Baby: {detalhe.qtd_baby}</div>}
                                              {detalhe.qtd_1_a_16 > 0 && <div>1 a 16: {detalhe.qtd_1_a_16}</div>}
                                              {detalhe.qtd_calcados > 0 && <div>Calçados: {detalhe.qtd_calcados}</div>}
                                              {detalhe.qtd_brinquedos > 0 && <div>Brinquedos: {detalhe.qtd_brinquedos}</div>}
                                              {detalhe.qtd_itens_medios > 0 && <div>Enxoval: {detalhe.qtd_itens_medios}</div>}
                                              {detalhe.qtd_itens_grandes > 0 && <div>Itens Grandes: {detalhe.qtd_itens_grandes}</div>}
                                              {Array.isArray(detalhe.itens) && detalhe.itens.map((item: any, idx: number) => {
                                                const slug = item.categoria?.slug || "";
                                                const isCategoryLegacy = ["baby", "1a16", "calcados", "brinquedos", "itens_medios", "itens_grandes"].includes(slug);
                                                return !isCategoryLegacy && item?.quantidade > 0 && (
                                                  <div key={idx}>{item.categoria?.nome || 'Item'}: {item.quantidade}</div>
                                                );
                                              })}
                                            </TableCell>
                                            <TableCell className="text-xs text-gray-700">{detalhe.descricao_itens}</TableCell>
                                            <TableCell className="text-xs text-right font-medium text-gray-800">{formatCurrency(detalhe.valor)}</TableCell>
                                          </TableRow>
                                        ))}
                                        <TableRow className="bg-gray-100 font-semibold">
                                          <TableCell colSpan={4} className="text-xs">Subtotal da categoria</TableCell>
                                          <TableCell className="text-xs text-right">{formatCurrency(row.totalDinheiro)}</TableCell>
                                        </TableRow>
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                          {isExpanded && (!row.detalhes || row.detalhes.length === 0) && (
                            <TableRow className="bg-gray-50/50">
                              <TableCell colSpan={5} className="p-4 text-center text-sm text-gray-500">
                                Nenhuma avaliação em dinheiro nesta categoria no período selecionado.
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                    <TableRow>
                      <TableCell className="font-medium">Total</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(tabelaGastos.totalGeralDinheiro)}</TableCell>
                      <TableCell className="text-right">{tabelaGastos.totalQtdDinheiro}</TableCell>
                      <TableCell className="text-right font-bold text-yellow-700">{formatCurrency(tabelaGastos.totalGeralGira)}</TableCell>
                      <TableCell className="text-right">{tabelaGastos.totalQtdGira}</TableCell>
                    </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

        {/* === PROPORÇÃO DE PAGAMENTOS === */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Valor de Avaliações por Forma de Pagamento */}
          <Card className="border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex flex-col">
                  <span>Proporção de Pagamentos - Mês (Valor)</span>
                  <span className="text-[11px] text-muted-foreground">Base: avaliações finalizadas</span>
                </span>
                <span className="text-xs text-gray-500">{formatCurrency(metrics.metricasMes.total)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Barra de progresso */}
                <div className="relative w-full h-12 bg-gray-200 rounded-lg overflow-hidden shadow-inner">
                  <div 
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-white font-bold transition-all duration-500"
                    style={{ width: `${metrics.metricasMes.total > 0 ? (metrics.metricasMes.dinheiro / metrics.metricasMes.total * 100) : 0}%` }}
                  >
                    {metrics.metricasMes.total > 0 && (metrics.metricasMes.dinheiro / metrics.metricasMes.total * 100).toFixed(1)}%
                  </div>
                  <div 
                    className="absolute right-0 top-0 h-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold transition-all duration-500"
                    style={{ width: `${metrics.metricasMes.total > 0 ? (metrics.metricasMes.gira / metrics.metricasMes.total * 100) : 0}%` }}
                  >
                    {metrics.metricasMes.total > 0 && (metrics.metricasMes.gira / metrics.metricasMes.total * 100).toFixed(1)}%
                  </div>
                </div>
                
                {/* Legenda */}
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-600 rounded"></div>
                    <span className="text-gray-700">Dinheiro/PIX: <strong>{formatCurrency(metrics.metricasMes.dinheiro)}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-amber-600 rounded"></div>
                    <span className="text-gray-700">Gira-Crédito: <strong>{formatCurrency(metrics.metricasMes.gira)}</strong></span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quantidade de Avaliações por Forma de Pagamento */}
          <Card className="border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex flex-col">
                  <span>Proporção de Pagamentos - Mês (Qtd)</span>
                  <span className="text-[11px] text-muted-foreground">Base: avaliações finalizadas</span>
                </span>
                <span className="text-xs text-gray-500">{metrics.metricasMes.qtdDinheiro + metrics.metricasMes.qtdGira} avaliações</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Barra de progresso */}
                <div className="relative w-full h-12 bg-gray-200 rounded-lg overflow-hidden shadow-inner">
                  <div 
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-white font-bold transition-all duration-500"
                    style={{ width: `${(metrics.metricasMes.qtdDinheiro + metrics.metricasMes.qtdGira) > 0 ? (metrics.metricasMes.qtdDinheiro / (metrics.metricasMes.qtdDinheiro + metrics.metricasMes.qtdGira) * 100) : 0}%` }}
                  >
                    {(metrics.metricasMes.qtdDinheiro + metrics.metricasMes.qtdGira) > 0 && (metrics.metricasMes.qtdDinheiro / (metrics.metricasMes.qtdDinheiro + metrics.metricasMes.qtdGira) * 100).toFixed(1)}%
                  </div>
                  <div 
                    className="absolute right-0 top-0 h-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold transition-all duration-500"
                    style={{ width: `${(metrics.metricasMes.qtdDinheiro + metrics.metricasMes.qtdGira) > 0 ? (metrics.metricasMes.qtdGira / (metrics.metricasMes.qtdDinheiro + metrics.metricasMes.qtdGira) * 100) : 0}%` }}
                  >
                    {(metrics.metricasMes.qtdDinheiro + metrics.metricasMes.qtdGira) > 0 && (metrics.metricasMes.qtdGira / (metrics.metricasMes.qtdDinheiro + metrics.metricasMes.qtdGira) * 100).toFixed(1)}%
                  </div>
                </div>
                
                {/* Legenda */}
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-600 rounded"></div>
                    <span className="text-gray-700">Dinheiro/PIX: <strong>{metrics.metricasMes.qtdDinheiro} avaliações</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-amber-600 rounded"></div>
                    <span className="text-gray-700">Gira-Crédito: <strong>{metrics.metricasMes.qtdGira} avaliações</strong></span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* === GRÁFICO DE PICOS DE VENDAS (fora das abas) === */}
        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center"><BarChart3 className="w-5"/> Picos de Vendas por Horário</CardTitle>
            <p className="text-xs text-muted-foreground">Período: {periodo?.from && periodo?.to ? `${format(periodo.from, "dd/MM/yyyy", { locale: ptBR })} — ${format(periodo.to, "dd/MM/yyyy", { locale: ptBR })}` : "Mês atual"}</p>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={picosHorariosFiltrados}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hora" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="valor" name="Valor Vendido" fill="#0088FE" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* --- AQUI COMEÇA O SISTEMA DE ABAS --- */}
        <Tabs value={abaSelecionada} onValueChange={setAbaSelecionada} className="w-full">
            {/* Seletor de abas */}
            <div className="flex justify-center mb-6">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="equipe">Performance das Equipes</TabsTrigger>
                <TabsTrigger value="estoque">Estoque</TabsTrigger>
              </TabsList>
            </div>

            {/* --- ABA 1: PERFORMANCE DAS EQUIPES --- */}
            <TabsContent value="equipe" className="space-y-6 animate-in fade-in-50">
                
                {/* === GRÁFICOS DE BARRAS: VALOR E QUANTIDADE POR VENDEDORA === */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Gráfico: Total de Vendas por Vendedora */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex gap-2 items-center">
                                <TrendingUp className="w-4"/> Total de Vendas por Vendedora
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">Período: {periodo?.from && periodo?.to ? `${format(periodo.from, "dd/MM/yyyy", { locale: ptBR })} — ${format(periodo.to, "dd/MM/yyyy", { locale: ptBR })}` : "Mês atual"}</p>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={salesMetrics.vendedorasData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="nome" angle={-15} textAnchor="end" height={80} />
                                    <YAxis />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="valorMes" name="Valor Total" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Gráfico: Quantidade de Vendas por Vendedora */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex gap-2 items-center">
                                <BarChart3 className="w-4"/> Quantidade de Vendas por Vendedora
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">Período: {periodo?.from && periodo?.to ? `${format(periodo.from, "dd/MM/yyyy", { locale: ptBR })} — ${format(periodo.to, "dd/MM/yyyy", { locale: ptBR })}` : "Mês atual"}</p>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={salesMetrics.vendedorasData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="nome" angle={-15} textAnchor="end" height={80} />
                                    <YAxis />
                                    <Tooltip content={<CustomTooltip type="number" />} />
                                    <Bar dataKey="qtdMes" name="Quantidade" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
                
                {/* === DESEMPENHO POR VENDEDORA (VISUAL E COMPARATIVO) === */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {salesMetrics.vendedorasData.map((vendedora, index) => (
                        <Card key={index} className="border-2 hover:shadow-lg transition-all">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                                        {vendedora.nome.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="text-base font-bold">{vendedora.nome}</div>
                                        <div className="text-xs text-gray-500">Ticket Médio: {formatCurrency(vendedora.ticketMedio)}</div>
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Valor Total Mês */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs text-gray-600">Valor Total - Mês</span>
                                            <span className="text-sm font-bold text-blue-700">{formatCurrency(vendedora.valorMes)}</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                                                style={{ width: `${Math.min((vendedora.valorMes / Math.max(...salesMetrics.vendedorasData.map(v => v.valorMes)) * 100), 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Quantidade Mês */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs text-gray-600">Quantidade - Mês</span>
                                            <span className="text-sm font-bold text-purple-700">{vendedora.qtdMes} vendas</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-500"
                                                style={{ width: `${Math.min((vendedora.qtdMes / Math.max(...salesMetrics.vendedorasData.map(v => v.qtdMes)) * 100), 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Valor Hoje */}
                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                                        <div className="bg-green-50 p-2 rounded">
                                            <div className="text-[10px] text-gray-600">Hoje - Valor</div>
                                            <div className="text-sm font-bold text-green-700">{formatCurrency(vendedora.valorHoje)}</div>
                                        </div>
                                        <div className="bg-green-50 p-2 rounded">
                                            <div className="text-[10px] text-gray-600">Hoje - Qtd</div>
                                            <div className="text-sm font-bold text-green-700">{vendedora.qtdHoje}</div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* === PERFORMANCE DA EQUIPE (GRÁFICO DE BARRAS) === */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex gap-2 items-center"><Users className="w-5"/> Performance da Equipe</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={metrics.performanceData}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="nome" type="category" width={100} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="aprovadoDinheiro" name="Aprovado em Dinheiro" stackId="a" fill="#10b981" />
                                <Bar dataKey="aprovadoGira" name="Aprovado em Gira" stackId="a" fill="#f59e0b" />
                                <Bar dataKey="recusado" name="Recusado" stackId="a" fill="#ef4444" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* --- ABA 2: ESTOQUE --- */}
            <TabsContent value="estoque" className="space-y-6 animate-in fade-in-50">
                
                {/* === VENDAS x COMPRAS POR CATEGORIA (MÊS) === */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex gap-2 items-center"><Package className="w-5"/> Vendas x Compras por Categoria (Mês)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { categoria: 'Baby', Vendas: salesMetrics.pecasMes.baby, Compras: metrics.comprasPorCat.baby },
                                { categoria: 'Infantil', Vendas: salesMetrics.pecasMes.infantil, Compras: metrics.comprasPorCat.infantil },
                                { categoria: 'Calçados', Vendas: salesMetrics.pecasMes.calcados, Compras: metrics.comprasPorCat.calcados },
                                { categoria: 'Brinquedos', Vendas: salesMetrics.pecasMes.brinquedos, Compras: metrics.comprasPorCat.brinquedos },
                                { categoria: 'Itens Médios', Vendas: salesMetrics.pecasMes.itens_medios, Compras: metrics.comprasPorCat.itens_medios },
                                { categoria: 'Itens Grandes', Vendas: salesMetrics.pecasMes.itens_grandes, Compras: metrics.comprasPorCat.itens_grandes },
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="categoria" angle={-15} textAnchor="end" height={80} />
                                <YAxis />
                                <Tooltip content={<CustomTooltip type="number" />} />
                                <Legend />
                                <Bar dataKey="Vendas" name="Vendas (mês)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Compras" name="Compras (mês)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                {/* Quadro replicado Compras vs Estoque */}
                                {/* Quadro de Gasto em dinheiro por tipo de avaliação */}
                                <Card className="mt-6 border shadow">
                                  <CardHeader>
                                    <CardTitle className="text-base font-bold">Avaliações por tipo de pagamento e itens</CardTitle>
                                    <div className="text-sm text-muted-foreground">Período: {periodo?.from && periodo?.to ? `${format(periodo.from, "dd/MM/yyyy", { locale: ptBR })} — ${format(periodo.to, "dd/MM/yyyy", { locale: ptBR })}` : "Mês atual"}</div>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full text-sm">
                                        <thead>
                                          <tr className="border-b">
                                            <th className="text-left py-2 px-2 font-semibold">Categoria</th>
                                            <th className="text-right py-2 px-2 font-semibold">Total em dinheiro</th>
                                            <th className="text-right py-2 px-2 font-semibold">Nº avaliações</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr className="border-b">
                                            <td className="py-2 px-2">Com itens grandes</td>
                                            <td className="py-2 px-2 text-right">{formatCurrency(metrics.comprasPorCat.itens_grandes * (config?.valor_item_grande || 0))}</td>
                                            <td className="py-2 px-2 text-right">{metrics.comprasPorCat.itens_grandes}</td>
                                          </tr>
                                          <tr className="border-b">
                                            <td className="py-2 px-2">Sem grandes, com médios ou brinquedos</td>
                                            <td className="py-2 px-2 text-right">{formatCurrency(metrics.comprasPorCat.itens_medios * (config?.valor_item_medio || 0) + metrics.comprasPorCat.brinquedos * (config?.valor_brinquedo || 0))}</td>
                                            <td className="py-2 px-2 text-right">{metrics.comprasPorCat.itens_medios + metrics.comprasPorCat.brinquedos}</td>
                                          </tr>
                                          <tr className="border-b">
                                            <td className="py-2 px-2">Só roupas/sapatos</td>
                                            <td className="py-2 px-2 text-right">{formatCurrency(metrics.comprasPorCat.baby * (config?.valor_brinquedo || 0) + metrics.comprasPorCat.infantil * (config?.valor_brinquedo || 0) + metrics.comprasPorCat.calcados * (config?.valor_brinquedo || 0))}</td>
                                            <td className="py-2 px-2 text-right">{metrics.comprasPorCat.baby + metrics.comprasPorCat.infantil + metrics.comprasPorCat.calcados}</td>
                                          </tr>
                                          <tr className="border-b">
                                            <td className="py-2 px-2">Outros (sem itens registrados)</td>
                                            <td className="py-2 px-2 text-right">{formatCurrency(0)}</td>
                                            <td className="py-2 px-2 text-right">0</td>
                                          </tr>
                                          <tr className="font-bold">
                                            <td className="py-2 px-2">Total</td>
                                            <td className="py-2 px-2 text-right">{
                                              formatCurrency(
                                                metrics.comprasPorCat.itens_grandes * (config?.valor_item_grande || 0)
                                                + metrics.comprasPorCat.itens_medios * (config?.valor_item_medio || 0)
                                                + metrics.comprasPorCat.brinquedos * (config?.valor_brinquedo || 0)
                                                + metrics.comprasPorCat.baby * (config?.valor_brinquedo || 0)
                                                + metrics.comprasPorCat.infantil * (config?.valor_brinquedo || 0)
                                                + metrics.comprasPorCat.calcados * (config?.valor_brinquedo || 0)
                                              )
                                            }</td>
                                            <td className="py-2 px-2 text-right">{
                                              metrics.comprasPorCat.itens_grandes
                                              + metrics.comprasPorCat.itens_medios
                                              + metrics.comprasPorCat.brinquedos
                                              + metrics.comprasPorCat.baby
                                              + metrics.comprasPorCat.infantil
                                              + metrics.comprasPorCat.calcados
                                            }</td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </CardContent>
                                </Card>
                <Card className="border-2 border-blue-500 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg flex gap-2 text-blue-700"><TrendingUp className="w-5"/> COMPRAS VS ESTOQUE (DESTAQUE)</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px] flex items-center justify-center">
                    {dataComparativo && dataComparativo.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={dataComparativo} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip cursor={{fill: 'transparent'}} />
                          <Legend />
                          <Bar dataKey="compras" name="Comprado" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="estoque" name="Estoque" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center text-gray-500">Nenhum dado disponível para exibir o gráfico.</div>
                    )}
                  </CardContent>
                </Card>

                {/* === MIX DE PEÇAS + QUANTIDADE EM ESTOQUE === */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* Quantidade em Estoque por Categoria */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex gap-2"><Package className="w-4"/> Peças em Estoque por Categoria</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {estoque && [
                                    { nome: 'Baby', qtd: estoque.filter((item: any) => item.categoria === 'baby').reduce((sum: number, item: any) => sum + (item.quantidade || 0), 0), color: 'bg-pink-500' },
                                    { nome: 'Infantil', qtd: estoque.filter((item: any) => item.categoria === 'infantil').reduce((sum: number, item: any) => sum + (item.quantidade || 0), 0), color: 'bg-blue-500' },
                                    { nome: 'Calçados', qtd: estoque.filter((item: any) => item.categoria === 'calcados').reduce((sum: number, item: any) => sum + (item.quantidade || 0), 0), color: 'bg-purple-500' },
                                    { nome: 'Brinquedos', qtd: estoque.filter((item: any) => item.categoria === 'brinquedos').reduce((sum: number, item: any) => sum + (item.quantidade || 0), 0), color: 'bg-yellow-500' },
                                    { nome: 'Itens Médios', qtd: estoque.filter((item: any) => item.categoria === 'itens_medios').reduce((sum: number, item: any) => sum + (item.quantidade || 0), 0), color: 'bg-green-500' },
                                    { nome: 'Itens Grandes', qtd: estoque.filter((item: any) => item.categoria === 'itens_grandes').reduce((sum: number, item: any) => sum + (item.quantidade || 0), 0), color: 'bg-red-500' },
                                ].map((cat, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${cat.color}`}></div>
                                            <span className="font-medium text-sm">{cat.nome}</span>
                                        </div>
                                        <span className="text-lg font-bold text-gray-800">{cat.qtd}</span>
                                    </div>
                                ))}
                                <div className="pt-3 border-t mt-3">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-gray-700">Total em Estoque:</span>
                                        <span className="text-xl font-bold text-blue-600">
                                            {estoque?.reduce((sum: number, item: any) => sum + (item.quantidade || 0), 0) || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* === COMPRAS VS ESTOQUE === */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex gap-2"><TrendingUp className="w-4"/> Compras vs Estoque</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                        <ResponsiveContainer>
                            <BarChart data={dataComparativo}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Legend />
                                <Bar dataKey="compras" name="Comprado" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="estoque" name="Estoque" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
        </div>
    </MainLayout>
  );
}
