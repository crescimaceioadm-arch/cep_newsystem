export type StatusAtendimento = 
  | 'aguardando_avaliacao' 
  | 'aguardando_pagamento' 
  | 'finalizado';

export interface Atendimento {
  id: string;
  nome_cliente: string;
  hora_chegada: string;
  hora_encerramento?: string | null;
  status: StatusAtendimento;
  qtd_baby: number | null;
  qtd_1_a_16: number | null;
  qtd_calcados: number | null;
  qtd_brinquedos: number | null;
  qtd_itens_medios: number | null;
  qtd_itens_grandes: number | null;
  descricao_itens_extra: string | null;
  valor_total_negociado: number | null;
  metodo_pagto_1: string | null;
  valor_pagto_1: number | null;
  metodo_pagto_2: string | null;
  valor_pagto_2: number | null;
  metodo_pagto_3: string | null;
  valor_pagto_3: number | null;
  origem_avaliacao?: string | null; // presencial | whatsapp
  created_at: string;
  updated_at: string;
}

export interface Estoque {
  id: string;
  categoria: string;
  quantidade_atual: number;
  updated_at: string;
}

export interface Venda {
  id: string;
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
