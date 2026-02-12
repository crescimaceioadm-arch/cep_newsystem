import { format } from "date-fns";

export const FERIADOS_FIXOS: string[] = [
  // Preencha com datas no formato YYYY-MM-DD.
];

export function isFeriado(date: Date): boolean {
  const key = format(date, "yyyy-MM-dd");
  return FERIADOS_FIXOS.includes(key);
}
