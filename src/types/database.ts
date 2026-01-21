export type StatusAtendimento = 
  | 'aguardando_avaliacao' 
  | 'aguardando_pagamento' 
  | 'finalizado';

export interface ItemCategoria {
  id: string;
  slug: string;
  nome: string;
  tipo: 'compra' | 'venda' | 'ambos';
  requer_valor: boolean;
  ordem: number;
  ativo: boolean;
}

export interface AtendimentoItem {
  id?: string;
  categoria_id: string;
  quantidade: number;
  valor_total?: number | null;
  categoria?: ItemCategoria;
}

export interface Atendimento {
  id: string;
  nome_cliente: string;
  hora_chegada: string;
  hora_encerramento?: string | null;
  status: StatusAtendimento;
  itens?: AtendimentoItem[];
  qtd_baby: number | null;
  qtd_1_a_16: number | null;
  qtd_calcados: number | null;
  qtd_brinquedos: number | null;
  qtd_itens_medios: number | null;
  qtd_itens_grandes: number | null;
  descricao_itens_extra: string | null;
  valor_total_negociado: number | null;
  desconto_aplicado?: number | null;
  pagamento_1_metodo: string | null;
  pagamento_1_valor: number | null;
  pagamento_1_banco?: string | null;
  pagamento_2_metodo: string | null;
  pagamento_2_valor: number | null;
  pagamento_2_banco?: string | null;
  pagamento_3_metodo: string | null;
  pagamento_3_valor: number | null;
  pagamento_3_banco?: string | null;
  origem_avaliacao?: string | null; // presencial | whatsapp
  created_at: string;
  updated_at: string;
}

export interface Estoque {
  id: string;
  categoria: string;
  categoria_id?: string | null;
  quantidade_atual: number;
  updated_at: string;
}

export interface VendaItem {
  id?: string;
  categoria_id: string;
  quantidade: number;
  categoria?: ItemCategoria;
}

export interface Venda {
  id: string;
  itens?: VendaItem[];
  qtd_baby_vendida: number | null;
  qtd_1_a_16_vendida: number | null;
  qtd_calcados_vendida: number | null;
  qtd_brinquedos_vendida: number | null;
  qtd_itens_medios_vendida: number | null;
  qtd_itens_grandes_vendida: number | null;
  valor_total_venda: number; // Nome correto da coluna no banco
  metodo_pagto_1: string | null;
  valor_pagto_1: number | null;
  metodo_pagto_2: string | null;
  valor_pagto_2: number | null;
  metodo_pagto_3: string | null;
  valor_pagto_3: number | null;
  created_at: string;
}

export interface Configuracao {
  id: string;
  valor_item_grande: number;
  valor_item_medio: number;
  valor_brinquedo: number;
  updated_at: string;
}

export interface FechamentoCaixa {
  id: string;
  caixa_id: string;
  data_fechamento: string;
  valor_sistema: number;
  valor_contado: number;
  diferenca: number;
  justificativa: string | null;
  status: 'aprovado' | 'pendente_aprovacao' | 'rejeitado';
  requer_revisao: boolean;
  aprovado_por: string | null;
  data_aprovacao: string | null;
  motivo_rejeicao: string | null;
  detalhes_pagamentos: string | null;
  created_at: string;
  created_by: string | null;
}
