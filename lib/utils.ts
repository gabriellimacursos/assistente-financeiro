import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return 'Hoje'
  if (isYesterday(date)) return 'Ontem'
  return format(date, "d 'de' MMMM", { locale: ptBR })
}

export function formatTime(dateStr: string): string {
  return format(parseISO(dateStr), 'HH:mm')
}

export function formatShortDate(dateStr: string): string {
  return format(parseISO(dateStr), 'dd/MM/yyyy')
}

export function formatDateInput(date = new Date()): string {
  return format(date, 'yyyy-MM-dd')
}

export function formatMonth(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM', { locale: ptBR })
}

export function getPercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export function getHealthStatus(balance: number, totalExpense: number): 'good' | 'warning' | 'danger' {
  if (balance > 0 && balance > totalExpense * 0.2) return 'good'
  if (balance >= 0) return 'warning'
  return 'danger'
}

export const RECURRENCE_LABELS: Record<string, string> = {
  daily: 'Todo dia',
  weekly: 'Toda semana',
  biweekly: 'A cada 15 dias',
  monthly: 'Todo mês',
  yearly: 'Todo ano',
  custom: 'Personalizado',
}
