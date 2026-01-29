import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
    timeZone: 'America/Sao_Paulo',
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
  const now = new Date();
  const brasiliaDate = convertToLocalTime(now.toISOString());
  
  if (!brasiliaDate) return now.toISOString();
  
  const year = brasiliaDate.getFullYear();
  const month = String(brasiliaDate.getMonth() + 1).padStart(2, '0');
  const day = String(brasiliaDate.getDate()).padStart(2, '0');
  const hour = String(brasiliaDate.getHours()).padStart(2, '0');
  const minute = String(brasiliaDate.getMinutes()).padStart(2, '0');
  const second = String(brasiliaDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

/**
 * Retorna apenas a DATA atual em Brasília no formato YYYY-MM-DD
 * Substitui new Date().toISOString().split('T')[0] quando você precisa de data local
 * @returns String da data atual em Brasília (ex: "2026-01-29")
 */
export function getDateBrasilia(): string {
  const now = new Date();
  const brasiliaDate = convertToLocalTime(now.toISOString());
  
  if (!brasiliaDate) return now.toISOString().split('T')[0];
  
  const year = brasiliaDate.getFullYear();
  const month = String(brasiliaDate.getMonth() + 1).padStart(2, '0');
  const day = String(brasiliaDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
