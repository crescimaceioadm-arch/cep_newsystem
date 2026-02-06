import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BR_TIMEZONE = "America/Sao_Paulo";

function getBrasiliaParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  const hour = parts.find((p) => p.type === "hour")?.value;
  const minute = parts.find((p) => p.type === "minute")?.value;
  const second = parts.find((p) => p.type === "second")?.value;

  return { year, month, day, hour, minute, second };
}

/**
 * Formata uma data para string ISO local no fuso de Brasília (sem timezone)
 * Ex: "2026-02-05T14:30:00"
 */
export function formatDateTimeBrasilia(date: Date): string {
  const { year, month, day, hour, minute, second } = getBrasiliaParts(date);
  if (!year || !month || !day || !hour || !minute || !second) {
    return date.toISOString().replace("Z", "").split(".")[0];
  }

  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

/**
 * Retorna o range (início/fim) do período no fuso de Brasília
 * Converte para UTC para queries corretas no Supabase (que está em UTC)
 * 
 * Brasília = UTC-3, então:
 * - XX/XX 00:00 Brasília = XX/XX 03:00 UTC
 * - XX/XX 23:59:59 Brasília = (XX/XX+1) 02:59:59 UTC
 */
export function getBrasiliaRange(from: Date, to: Date) {
  // Extrair ano, mês, dia em Brasília (não em UTC)
  const fromParts = getBrasiliaParts(from);
  const toParts = getBrasiliaParts(to);
  
  const fy = parseInt(fromParts.year || "2026");
  const fm = parseInt(fromParts.month || "01");
  const fd = parseInt(fromParts.day || "01");
  
  const ty = parseInt(toParts.year || "2026");
  const tm = parseInt(toParts.month || "01");
  const td = parseInt(toParts.day || "01");
  
  // Criar datas em UTC de forma correta
  // 00:00 Brasília = 03:00 UTC (add 3 horas)
  const startUTC = new Date(Date.UTC(fy, fm - 1, fd, 3, 0, 0));
  
  // 23:59:59 Brasília = 02:59:59 UTC do dia seguinte (add 3 horas, próximo dia)
  const endUTC = new Date(Date.UTC(ty, tm - 1, td + 1, 2, 59, 59));
  
  return { 
    start: startUTC.toISOString(), 
    end: endUTC.toISOString() 
  };
}

/**
 * Converte um timestamp UTC (ISO string) para o fuso horário de Brasília
 * @param isoString - String ISO do timestamp (ex: "2025-01-27T18:30:00Z")
 * @returns Date object ajustado para o horário de Brasília
 */
export function convertToLocalTime(isoString?: string | null): Date | null {
  if (!isoString) return null;
  
  const utcDate = new Date(isoString);
  if (isNaN(utcDate.getTime())) return null;
  
  // Brasília está em UTC-3 (ou UTC-2 em horário de verão)
  // Usar Intl.DateTimeFormat para obter o offset correto (considerando DST)
  const brasiliaFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: BR_TIMEZONE,
  });
  
  // Pegar a data formatada em Brasília
  const parts = brasiliaFormatter.formatToParts(utcDate);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  const second = parts.find(p => p.type === 'second')?.value;
  
  if (!year || !month || !day || !hour || !minute || !second) return utcDate;
  
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
}

/**
 * Retorna a data/hora ATUAL em Brasília no formato ISO string
 * Substitui new Date().toISOString() quando você precisa de data/hora local
 * @returns String ISO da data/hora atual em Brasília (ex: "2026-01-29T15:30:00")
 */
export function getDateTimeBrasilia(): string {
  return formatDateTimeBrasilia(new Date());
}

/**
 * Retorna a data/hora ATUAL em UTC (ISO string) ajustada do fuso de Brasília
 * Use esta função ao salvar timestamps no Supabase (que está em UTC)
 * @returns String ISO da data/hora UTC (ex: "2026-01-29T18:30:00.000Z")
 */
export function getDateTimeUTC(): string {
  const now = new Date();
  return now.toISOString();
}

/**
 * Converte um horário de Brasília para UTC (para salvar no banco)
 * @param brasiliaDateStr - String no formato "YYYY-MM-DDTHH:mm:ss"
 * @returns String ISO em UTC
 */
export function brasiliaToUTC(brasiliaDateStr: string): string {
  const localDate = new Date(brasiliaDateStr);
  // Adiciona 3 horas para converter Brasília (UTC-3) para UTC
  localDate.setHours(localDate.getHours() + 3);
  return localDate.toISOString();
}

/**
 * Retorna apenas a DATA atual em Brasília no formato YYYY-MM-DD
 * Substitui new Date().toISOString().split('T')[0] quando você precisa de data local
 * @returns String da data atual em Brasília (ex: "2026-01-29")
 */
export function getDateBrasilia(): string {
  return formatDateTimeBrasilia(new Date()).split("T")[0];
}
