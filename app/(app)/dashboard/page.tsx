'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Mic, Sparkles, AlertTriangle, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, CreditCard, RefreshCw, X,
} from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useFinanceStore } from '@/lib/store/useFinanceStore'
import ModeToggle from '@/components/shared/ModeToggle'
import NotificationPrompt from '@/components/shared/NotificationPrompt'
import { formatCurrency, getPercentageChange, getHealthStatus, cn } from '@/lib/utils'
import type { ViewMode, CreditCard as CC } from '@/types'
import {
  format, parseISO, subMonths,
  isSameDay, isSameMonth, isSameWeek,
  addDays, addWeeks, addMonths, addYears,
  startOfWeek, endOfWeek,
  isToday, isThisMonth, isThisYear,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

const CATEGORY_COLORS = ['#6366F1', '#10B981', '#F43F5E', '#F59E0B', '#06B6D4', '#8B5CF6', '#EC4899']
const INCOME_COLORS  = ['#10B981', '#34D399', '#059669', '#6EE7B7', '#A7F3D0']

type PeriodType = 'day' | 'week' | 'month' | 'year'

const PERIOD_TABS: { type: PeriodType; label: string }[] = [
  { type: 'day', label: 'Dia' },
  { type: 'week', label: 'Semana' },
  { type: 'month', label: 'Mês' },
  { type: 'year', label: 'Ano' },
]

function getPeriodLabel(type: PeriodType, anchor: Date): string {
  switch (type) {
    case 'day': return format(anchor, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
    case 'week': {
      const s = startOfWeek(anchor, { weekStartsOn: 1 })
      const e = endOfWeek(anchor, { weekStartsOn: 1 })
      return `${format(s, 'd MMM', { locale: ptBR })} – ${format(e, 'd MMM', { locale: ptBR })}`
    }
    case 'month': return format(anchor, "MMMM 'de' yyyy", { locale: ptBR })
    case 'year': return format(anchor, 'yyyy')
  }
}

function navigatePeriod(type: PeriodType, date: Date, dir: 1 | -1): Date {
  switch (type) {
    case 'day': return addDays(date, dir)
    case 'week': return addWeeks(date, dir)
    case 'month': return addMonths(date, dir)
    case 'year': return addYears(date, dir)
  }
}

function isCurrentPeriod(type: PeriodType, date: Date): boolean {
  if (type === 'day') return isToday(date)
  if (type === 'week') return isSameWeek(date, new Date(), { weekStartsOn: 1 })
  if (type === 'month') return isThisMonth(date)
  return isThisYear(date)
}

function txInPeriod(txDate: Date, type: PeriodType, anchor: Date): boolean {
  if (type === 'day') return isSameDay(txDate, anchor)
  if (type === 'month') return isSameMonth(txDate, anchor)
  if (type === 'year') return txDate.getFullYear() === anchor.getFullYear()
  const s = startOfWeek(anchor, { weekStartsOn: 1 })
  const e = endOfWeek(anchor, { weekStartsOn: 1 })
  return txDate >= s && txDate <= e
}

export default function DashboardPage() {
  const router = useRouter()
  const { transactions, viewMode, setViewMode, cards, updateTransaction, recurrences } = useFinanceStore()
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [anchor, setAnchor] = useState<Date>(new Date())
  const [confirmPayCard, setConfirmPayCard] = useState<{
    card: CC; total: number; txIds: string[]; dueDate: Date | null; daysUntilDue: number | null
    txs: { id: string; description: string; date: string; amount: number }[]
  } | null>(null)
  const [paidAlerts, setPaidAlerts] = useState<Set<string>>(new Set())
  const [payError, setPayError] = useState<string | null>(null)
  const [individuallyPaid, setIndividuallyPaid] = useState<Set<string>>(new Set())
  const [paySuccess, setPaySuccess] = useState(false)

  const filtered = useMemo(() =>
    transactions.filter(t => viewMode === 'all' || t.mode === viewMode),
    [transactions, viewMode]
  )

  const periodTx = useMemo(() =>
    filtered.filter(t => txInPeriod(parseISO(t.date), periodType, anchor)),
    [filtered, periodType, anchor]
  )

  const confirmedPeriodTx = useMemo(() =>
    periodTx.filter(t => t.status !== 'pending'),
    [periodTx]
  )

  const prevTx = useMemo(() => {
    const prev = navigatePeriod(periodType, anchor, -1)
    return filtered.filter(t => txInPeriod(parseISO(t.date), periodType, prev) && t.status !== 'pending')
  }, [filtered, periodType, anchor])

  const totalIncome  = confirmedPeriodTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = confirmedPeriodTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance      = totalIncome - totalExpense
  const prevIncome   = prevTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const prevExpense  = prevTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const incomeChange  = getPercentageChange(totalIncome, prevIncome)
  const expenseChange = getPercentageChange(totalExpense, prevExpense)
  const health        = getHealthStatus(balance, totalExpense)

  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : null

  // Consecutive days streak (days back from today with at least 1 confirmed transaction)
  const streak = useMemo(() => {
    let count = 0
    let d = new Date()
    d.setHours(0, 0, 0, 0)
    while (true) {
      const dateStr = format(d, 'yyyy-MM-dd')
      const hasAny = transactions.some(t => t.date.startsWith(dateStr) && t.status !== 'pending')
      if (!hasAny) break
      count++
      d = addDays(d, -1)
    }
    return count
  }, [transactions])

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {}
    confirmedPeriodTx.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }))
  }, [confirmedPeriodTx])

  const topIncomeCategories = useMemo(() => {
    const map: Record<string, number> = {}
    confirmedPeriodTx.filter(t => t.type === 'income').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }))
  }, [confirmedPeriodTx])

  // Gráfico de tendência
  const trendData = useMemo(() => {
    const confirmedFiltered = filtered.filter(t => t.status !== 'pending')

    // Ano: só meses até o atual (sem barras futuras vazias)
    if (periodType === 'year') {
      const year = anchor.getFullYear()
      const isCurrentYear = year === new Date().getFullYear()
      const monthsToShow = isCurrentYear ? new Date().getMonth() + 1 : 12
      return Array.from({ length: monthsToShow }, (_, i) => {
        const d = new Date(year, i, 1)
        const txs = confirmedFiltered.filter(t => isSameMonth(parseISO(t.date), d))
        return {
          label: format(d, 'MMM', { locale: ptBR }),
          income: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
          expense: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        }
      })
    }

    // Dia / Semana: sempre 7 dias completos
    if (periodType === 'day' || periodType === 'week') {
      const weekStart = startOfWeek(anchor, { weekStartsOn: 1 })
      return Array.from({ length: 7 }, (_, i) => {
        const day = addDays(weekStart, i)
        const txs = confirmedFiltered.filter(t => isSameDay(parseISO(t.date), day))
        return {
          label: format(day, 'EEE', { locale: ptBR }),
          income: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
          expense: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
          isSelected: isSameDay(day, anchor),
        }
      })
    }

    // Mês: sempre 6 meses fixos
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(anchor, 5 - i)
      const txs = confirmedFiltered.filter(t => isSameMonth(parseISO(t.date), d))
      return {
        label: format(d, 'MMM/yy', { locale: ptBR }),
        income: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      }
    })
  }, [filtered, periodType, anchor])

  // Próximas recorrências (30 dias)
  const upcomingRecurrences = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const in30Days = addDays(today, 30)
    return recurrences
      .filter(r => {
        if (!r.active) return false
        if (viewMode !== 'all' && r.mode !== viewMode) return false
        const nextDate = parseISO(r.next_date)
        return nextDate >= today && nextDate <= in30Days
      })
      .sort((a, b) => parseISO(a.next_date).getTime() - parseISO(b.next_date).getTime())
      .slice(0, 5)
  }, [recurrences, viewMode])

  const periodName = { day: 'dia', week: 'semana', month: 'mês', year: 'ano' }[periodType]

  const aiInsight = useMemo(() => {
    if (totalIncome === 0 && totalExpense === 0)
      return `Nenhum lançamento neste ${periodName}. Comece registrando sua primeira entrada ou saída.`
    const parts: string[] = []
    const sign = balance >= 0 ? 'positivo' : 'negativo'
    const ctx = viewMode === 'business' ? 'na empresa' : viewMode === 'personal' ? 'nas finanças pessoais' : ''
    parts.push(`Resultado ${sign} de ${formatCurrency(Math.abs(balance))}${ctx ? ' ' + ctx : ''}`)
    if (categoryData[0]) {
      const pct = totalExpense > 0 ? Math.round((categoryData[0].amount / totalExpense) * 100) : 0
      parts.push(`maior gasto: ${categoryData[0].name} (${pct}% das saídas)`)
    }
    if (topIncomeCategories[0]) {
      const pct = totalIncome > 0 ? Math.round((topIncomeCategories[0].amount / totalIncome) * 100) : 0
      parts.push(`principal receita: ${topIncomeCategories[0].name} (${pct}% das entradas)`)
    }
    if (savingsRate !== null) {
      if (savingsRate >= 20) parts.push(`taxa de poupança de ${savingsRate}% — excelente`)
      else if (savingsRate > 0) parts.push(`taxa de poupança de ${savingsRate}% — pode melhorar`)
      else parts.push(`despesas maiores que receitas — atenção ao fluxo de caixa`)
    }
    return parts.join('. ') + '.'
  }, [balance, categoryData, topIncomeCategories, savingsRate, viewMode, periodName, totalIncome, totalExpense])

  const healthConfig = {
    good:    { color: 'text-income-500',  bg: 'bg-income-50',  border: 'border-income-200',  icon: CheckCircle,    label: 'Saúde boa',   desc: 'Você está no positivo' },
    warning: { color: 'text-amber-500',   bg: 'bg-amber-50',   border: 'border-amber-200',   icon: AlertTriangle,  label: 'Atenção',     desc: 'Margem pequena' },
    danger:  { color: 'text-expense-500', bg: 'bg-expense-50', border: 'border-expense-200', icon: XCircle,        label: 'Risco',       desc: 'Despesas maiores que receitas' },
  }[health]

  const useBarChart  = periodType !== 'month'
  const trendTitle   = { day: 'Esta semana (dia a dia)', week: 'Esta semana (dia a dia)', month: 'Últimos 6 meses', year: `Meses de ${anchor.getFullYear()}` }[periodType]
  const isCurrent    = isCurrentPeriod(periodType, anchor)

  const pendingByCard = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const result: { card: CC; total: number; txIds: string[]; dueDate: Date | null; daysUntilDue: number | null }[] = []
    for (const card of cards) {
      if (!card.active || paidAlerts.has(card.id)) continue
      const pendingTx = filtered.filter(t => t.card_id === card.id && t.status === 'pending' && t.type === 'expense')
      if (pendingTx.length === 0) continue
      let dueDate: Date | null = null
      let daysUntilDue: number | null = null
      if (card.dueDay) {
        const cutoff = card.closingDay ?? card.dueDay
        let month = today.getMonth()
        let year = today.getFullYear()
        if (today.getDate() >= cutoff) month += 1
        while (month > 11) { month -= 12; year++ }
        dueDate = new Date(year, month, card.dueDay)
        dueDate.setHours(0, 0, 0, 0)
        daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      }
      result.push({ card, total: pendingTx.reduce((s, t) => s + t.amount, 0), txIds: pendingTx.map(t => t.id), dueDate, daysUntilDue })
    }
    return result.sort((a, b) => {
      if (a.daysUntilDue === null) return 1
      if (b.daysUntilDue === null) return -1
      return a.daysUntilDue - b.daysUntilDue
    })
  }, [cards, filtered, paidAlerts])

  const remainingTxIds = useMemo(() =>
    confirmPayCard ? confirmPayCard.txIds.filter(id => !individuallyPaid.has(id)) : [],
    [confirmPayCard, individuallyPaid]
  )
  const remainingTotal = useMemo(() =>
    confirmPayCard ? confirmPayCard.txs.filter(t => !individuallyPaid.has(t.id)).reduce((s, t) => s + t.amount, 0) : 0,
    [confirmPayCard, individuallyPaid]
  )

  async function handleMarkAsPaid(txIds: string[], cardId: string) {
    setPayError(null)
    try {
      await Promise.all(txIds.map(id => updateTransaction(id, { status: 'confirmed' })))
      setPaidAlerts(prev => { const s = new Set(prev); s.add(cardId); return s })
      setConfirmPayCard(null)
      setIndividuallyPaid(new Set())
      setPaySuccess(true)
      setTimeout(() => setPaySuccess(false), 4000)
    } catch {
      setPayError('Erro ao confirmar pagamento. Tente novamente.')
    }
  }

  async function handlePayItem(txId: string) {
    setPayError(null)
    try {
      await updateTransaction(txId, { status: 'confirmed' })
      setIndividuallyPaid(prev => new Set(prev).add(txId))
    } catch {
      setPayError('Erro ao confirmar item. Tente novamente.')
    }
  }

  const futureCardBills = useMemo(() => {
    const map: Record<string, { total: number; sortKey: number; label: string; items: { cardName: string; amount: number }[] }> = {}
    filtered.forEach(t => {
      if (!t.card_id || t.type !== 'expense' || t.status !== 'pending') return
      const card = cards.find(c => c.id === t.card_id)
      if (!card?.dueDay || !card.active) return
      const d = parseISO(t.date)
      let dueDate: Date
      if (d.getDate() === card.dueDay) {
        dueDate = new Date(d.getFullYear(), d.getMonth(), card.dueDay)
      } else {
        const cutoff = card.closingDay ?? card.dueDay
        let month = d.getMonth()
        let year = d.getFullYear()
        if (d.getDate() >= cutoff) month += 1
        while (month > 11) { month -= 12; year++ }
        dueDate = new Date(year, month, card.dueDay)
      }
      const key = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`
      const label = format(dueDate, "MMMM 'de' yyyy", { locale: ptBR })
      const cardName = card.name ?? 'Cartão'
      if (!map[key]) map[key] = { total: 0, sortKey: dueDate.getFullYear() * 100 + dueDate.getMonth(), label, items: [] }
      map[key].total += t.amount
      const existing = map[key].items.find(i => i.cardName === cardName)
      if (existing) existing.amount += t.amount
      else map[key].items.push({ cardName, amount: t.amount })
    })
    return Object.values(map).sort((a, b) => a.sortKey - b.sortKey).slice(0, 3)
  }, [filtered, cards])

  const savingsColor =
    savingsRate === null ? 'text-slate-400'
    : savingsRate >= 20 ? 'text-income-500'
    : savingsRate > 0   ? 'text-amber-500'
    : 'text-expense-500'

  const savingsBg =
    savingsRate === null ? 'bg-slate-50'
    : savingsRate >= 20 ? 'bg-income-50'
    : savingsRate > 0   ? 'bg-amber-50'
    : 'bg-expense-50'

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-6xl mx-auto">

      {/* Toast de sucesso após pagar */}
      {paySuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] animate-fade-up pointer-events-none">
          <div className="bg-income-500 text-white px-6 py-3 rounded-2xl shadow-float flex items-center gap-3 font-semibold text-sm whitespace-nowrap">
            <CheckCircle className="w-5 h-5 shrink-0" />
            🎉 Fatura paga com sucesso!
          </div>
        </div>
      )}

      {/* Header com saldo hero */}
      <div className="space-y-3">
        <div className="text-center py-3">
          <p className="text-xs text-slate-400 font-medium mb-3 capitalize">{getPeriodLabel(periodType, anchor)}</p>
          <p className={cn('text-5xl font-black tracking-tight leading-none', balance >= 0 ? 'text-income-500' : 'text-expense-500')}>
            {balance < 0 ? '-' : ''}{formatCurrency(Math.abs(balance))}
          </p>
          <p className="text-sm text-slate-400 mt-2">saldo do {periodName}</p>
          {streak > 1 && (
            <div className="inline-flex items-center gap-1.5 mt-3 bg-amber-50 text-amber-600 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-200">
              🔥 {streak} dias consecutivos registrando
            </div>
          )}
        </div>
        <ModeToggle value={viewMode} onChange={(m) => setViewMode(m as ViewMode)} size="sm" className="w-full" />
        <NotificationPrompt />
      </div>

      {/* Seletor de período */}
      <div className="space-y-3">
        <div className="flex bg-slate-100 rounded-2xl p-1 gap-0.5">
          {PERIOD_TABS.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => { setPeriodType(type); setAnchor(new Date()) }}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-semibold transition-all',
                periodType === type ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setAnchor(d => navigatePeriod(periodType, d, -1))}
            className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800 capitalize">{getPeriodLabel(periodType, anchor)}</span>
            {!isCurrent && (
              <button
                onClick={() => setAnchor(new Date())}
                className="text-xs font-semibold text-primary-500 bg-primary-50 px-2 py-0.5 rounded-lg hover:bg-primary-100 transition-colors"
              >
                Hoje
              </button>
            )}
          </div>
          <button
            onClick={() => setAnchor(d => navigatePeriod(periodType, d, 1))}
            className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* 4 Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Entradas" value={totalIncome} change={incomeChange} type="income" icon={TrendingUp} periodName={periodName} />
        <MetricCard label="Saídas" value={totalExpense} change={expenseChange} type="expense" icon={TrendingDown} periodName={periodName} />
        <MetricCard label="Saldo" value={balance} type={balance >= 0 ? 'income' : 'expense'} icon={balance >= 0 ? TrendingUp : TrendingDown} periodName={periodName} />
        {/* Taxa de poupança */}
        <div className={cn('card p-4 lg:p-5 animate-fade-up', savingsBg)}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Poupança</span>
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', savingsBg)}>
              <ArrowUpRight className={cn('w-4 h-4', savingsColor)} />
            </div>
          </div>
          <p className={cn('text-xl lg:text-2xl font-bold', savingsColor)}>
            {savingsRate === null ? '—' : `${savingsRate}%`}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            {savingsRate === null ? 'sem receitas' : savingsRate >= 20 ? 'excelente' : savingsRate > 0 ? 'pode melhorar' : 'no negativo'}
          </p>
        </div>
      </div>

      {/* Painel A Pagar — todos os cartões com saldo pendente */}
      {pendingByCard.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="font-semibold text-slate-800">A Pagar</h3>
            <span className="ml-auto text-sm font-bold text-amber-600">
              {formatCurrency(pendingByCard.reduce((s, p) => s + p.total, 0))}
            </span>
          </div>
          <div className="space-y-1">
            {pendingByCard.map(pending => {
              const days = pending.daysUntilDue
              const isOverdue  = days !== null && days < 0
              const isDueToday = days === 0
              const isUrgent   = days !== null && days <= 3
              const dueLabel = days === null
                ? 'Sem data de vencimento'
                : days < 0
                  ? `Vencida há ${Math.abs(days)} dia${Math.abs(days) > 1 ? 's' : ''}`
                  : days === 0
                    ? 'Vence hoje'
                    : `Vence em ${days} dia${days > 1 ? 's' : ''}`
              return (
                <div
                  key={pending.card.id}
                  className={cn(
                    'flex items-center gap-3 py-3 px-3 rounded-xl border-b border-slate-50 last:border-0 -mx-3',
                    isOverdue || isDueToday ? 'bg-expense-50' : isUrgent ? 'bg-amber-50' : ''
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">💳 {pending.card.name}</p>
                    <p className={cn('text-xs font-semibold', isOverdue || isDueToday ? 'text-expense-500' : isUrgent ? 'text-amber-500' : 'text-slate-400')}>
                      {dueLabel}
                    </p>
                  </div>
                  <div className="text-right shrink-0 mr-2">
                    <p className="text-sm font-bold text-expense-500">{formatCurrency(pending.total)}</p>
                    <p className="text-xs text-slate-400">{pending.txIds.length} item{pending.txIds.length > 1 ? 's' : ''}</p>
                  </div>
                  <button
                    onClick={() => {
                      setIndividuallyPaid(new Set())
                      setConfirmPayCard({
                        ...pending,
                        txs: filtered.filter(t => pending.txIds.includes(t.id)).map(t => ({
                          id: t.id, description: t.description, date: t.date, amount: t.amount,
                        })),
                      })
                    }}
                    className={cn(
                      'shrink-0 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors',
                      isOverdue || isDueToday ? 'bg-expense-500 hover:bg-expense-600' : 'bg-primary-500 hover:bg-primary-600'
                    )}
                  >
                    {isOverdue ? 'Pagar já' : isDueToday ? 'Pagar hoje' : 'Ver e pagar'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Banner de saúde + IA side-by-side */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className={cn('rounded-2xl p-4 border flex items-center gap-3', healthConfig.bg, healthConfig.border)}>
          <healthConfig.icon className={cn('w-5 h-5 shrink-0', healthConfig.color)} />
          <div className="flex-1 min-w-0">
            <p className={cn('font-semibold text-sm', healthConfig.color)}>{healthConfig.label}</p>
            <p className="text-slate-600 text-sm">{healthConfig.desc}</p>
          </div>
          <button
            onClick={() => router.push('/registrar')}
            className="flex items-center gap-1.5 bg-primary-500 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-primary-600 transition-colors shrink-0"
          >
            <Mic className="w-3.5 h-3.5" /> Registrar
          </button>
        </div>

        <div className="card p-4 bg-gradient-to-br from-primary-50 to-indigo-50 border-primary-100 flex items-start gap-3">
          <div className="w-8 h-8 bg-primary-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-primary-800 text-xs mb-1">Análise IA</p>
            <p className="text-slate-700 text-sm leading-relaxed">{aiInsight}</p>
          </div>
        </div>
      </div>

      {/* Gráfico + Breakdown */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-4">{trendTitle}</h3>
          <ResponsiveContainer width="100%" height={180}>
            {useBarChart ? (
              <BarChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }} formatter={(v: number) => [formatCurrency(v)]} />
                <Bar dataKey="income" fill="#10B981" name="Entradas" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="expense" fill="#F43F5E" name="Saídas" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            ) : (
              <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }} formatter={(v: number) => [formatCurrency(v)]} />
                <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} fill="url(#incomeGrad)" name="Entradas" />
                <Area type="monotone" dataKey="expense" stroke="#F43F5E" strokeWidth={2} fill="url(#expenseGrad)" name="Saídas" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Coluna direita: maiores gastos + fontes de receita */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 mb-4 text-sm">Maiores gastos</h3>
            {categoryData.length > 0 ? (
              <div className="space-y-3">
                {categoryData.map((c, i) => {
                  const pct = totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0
                  return (
                    <div key={c.name} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[i] }} />
                          <span className="truncate">{c.name}</span>
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                          <span className="text-[10px] text-slate-400">{pct}%</span>
                          <span className="text-xs font-semibold text-slate-800">{formatCurrency(c.amount)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: CATEGORY_COLORS[i] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Sem gastos neste período</p>
            )}
          </div>

          {topIncomeCategories.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 mb-4 text-sm">Fontes de receita</h3>
              <div className="space-y-3">
                {topIncomeCategories.map((c, i) => {
                  const pct = totalIncome > 0 ? Math.round((c.amount / totalIncome) * 100) : 0
                  return (
                    <div key={c.name} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: INCOME_COLORS[i] }} />
                          <span className="truncate">{c.name}</span>
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                          <span className="text-[10px] text-slate-400">{pct}%</span>
                          <span className="text-xs font-semibold text-income-600">{formatCurrency(c.amount)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-income-50 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: INCOME_COLORS[i] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Próximas recorrências */}
      {upcomingRecurrences.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4 text-primary-500" />
            </div>
            <h3 className="font-semibold text-slate-800">Próximas recorrências</h3>
            <span className="text-xs text-slate-400 ml-auto">próximos 30 dias</span>
          </div>
          <div className="space-y-1">
            {upcomingRecurrences.map(r => {
              const nextDate = parseISO(r.next_date)
              const today = new Date(); today.setHours(0, 0, 0, 0)
              const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              const dayLabel = daysUntil === 0 ? 'Hoje' : daysUntil === 1 ? 'Amanhã' : `Em ${daysUntil} dias`
              return (
                <div key={r.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                    r.type === 'income' ? 'bg-income-50' : 'bg-expense-50')}>
                    {r.type === 'income'
                      ? <TrendingUp className="w-3.5 h-3.5 text-income-500" />
                      : <TrendingDown className="w-3.5 h-3.5 text-expense-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{r.title}</p>
                    <p className="text-xs text-slate-400">{r.category}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn('text-sm font-semibold', r.type === 'income' ? 'text-income-500' : 'text-expense-500')}>
                      {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount)}
                    </p>
                    <p className="text-xs text-slate-400">{dayLabel}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Faturas projetadas */}
      {futureCardBills.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
              <TrendingDown className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="font-semibold text-slate-800">Faturas projetadas</h3>
          </div>
          <div className="space-y-3">
            {futureCardBills.map(bill => (
              <div key={bill.label} className="bg-slate-50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700 capitalize">{bill.label}</span>
                  <span className="text-sm font-bold text-expense-500">{formatCurrency(bill.total)}</span>
                </div>
                {bill.items.map(item => (
                  <div key={item.cardName} className="flex items-center justify-between pl-2">
                    <span className="text-xs text-slate-400">💳 {item.cardName}</span>
                    <span className="text-xs font-medium text-slate-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal confirmação de pagamento */}
      {confirmPayCard && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end" onClick={() => { setConfirmPayCard(null); setIndividuallyPaid(new Set()) }}>
          <div className="w-full bg-white rounded-t-3xl p-6 pb-10 space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">{confirmPayCard.card.name}</p>
                  <p className="text-xs text-slate-400">
                    {confirmPayCard.dueDate
                      ? `Vencimento: ${format(confirmPayCard.dueDate, "d 'de' MMMM", { locale: ptBR })}`
                      : 'Sem data de vencimento'}
                  </p>
                </div>
              </div>
              <button onClick={() => { setConfirmPayCard(null); setIndividuallyPaid(new Set()) }} className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Lista individual de itens */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Itens da fatura — toque para confirmar</p>
              {confirmPayCard.txs.map(tx => {
                const isPaid = individuallyPaid.has(tx.id)
                return (
                  <button
                    key={tx.id}
                    onClick={() => !isPaid && handlePayItem(tx.id)}
                    disabled={isPaid}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left',
                      isPaid ? 'bg-income-50' : 'bg-slate-50 hover:bg-slate-100 active:scale-[0.99]'
                    )}
                  >
                    <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center shrink-0',
                      isPaid ? 'bg-income-200' : 'bg-white border-2 border-slate-200'
                    )}>
                      {isPaid && <CheckCircle className="w-4 h-4 text-income-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium truncate', isPaid ? 'line-through text-slate-400' : 'text-slate-800')}>
                        {tx.description}
                      </p>
                      <p className="text-xs text-slate-400">{format(parseISO(tx.date), "d 'de' MMM", { locale: ptBR })}</p>
                    </div>
                    <span className={cn('text-sm font-semibold shrink-0', isPaid ? 'text-slate-400 line-through' : 'text-expense-500')}>
                      -{formatCurrency(tx.amount)}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Total restante */}
            <div className={cn('rounded-2xl p-4 text-center', remainingTxIds.length === 0 ? 'bg-income-50' : 'bg-slate-50')}>
              <p className="text-xs text-slate-400 mb-1">
                {remainingTxIds.length === 0 ? 'Tudo confirmado!' : 'Total restante'}
              </p>
              <p className={cn('text-3xl font-bold', remainingTxIds.length === 0 ? 'text-income-500' : 'text-slate-800')}>
                {remainingTxIds.length === 0 ? '✓ Pago' : formatCurrency(remainingTotal)}
              </p>
              {remainingTxIds.length > 0 && (
                <p className="text-xs text-slate-400 mt-1">{remainingTxIds.length} item{remainingTxIds.length > 1 ? 's' : ''} pendente{remainingTxIds.length > 1 ? 's' : ''}</p>
              )}
            </div>

            {payError && (
              <p className="text-xs text-expense-600 bg-expense-50 border border-expense-200 rounded-xl px-3 py-2 text-center">{payError}</p>
            )}

            <div className="space-y-2">
              {remainingTxIds.length > 0 ? (
                <button
                  onClick={() => handleMarkAsPaid(remainingTxIds, confirmPayCard.card.id)}
                  className="w-full bg-income-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-income-600 transition-colors"
                >
                  <CheckCircle className="w-5 h-5" /> Paguei tudo — {formatCurrency(remainingTotal)}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setPaidAlerts(prev => { const s = new Set(prev); s.add(confirmPayCard.card.id); return s })
                    setConfirmPayCard(null)
                    setIndividuallyPaid(new Set())
                    setPaySuccess(true)
                    setTimeout(() => setPaySuccess(false), 4000)
                  }}
                  className="w-full bg-income-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-income-600 transition-colors"
                >
                  <CheckCircle className="w-5 h-5" /> Concluído
                </button>
              )}
              <button
                onClick={() => { setConfirmPayCard(null); setPayError(null); setIndividuallyPaid(new Set()) }}
                className="w-full bg-slate-100 text-slate-600 font-semibold py-3 rounded-2xl text-sm hover:bg-slate-200 transition-colors"
              >
                {remainingTxIds.length === 0 ? 'Fechar' : 'Ainda não paguei'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function MetricCard({
  label, value, change, type, icon: Icon, periodName,
}: {
  label: string
  value: number
  change?: number
  type: 'income' | 'expense'
  icon: React.ComponentType<{ className?: string }>
  periodName: string
}) {
  const isPositive = (change ?? 0) >= 0
  const isIncome   = type === 'income'

  return (
    <div className="card p-4 lg:p-5 animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center',
          isIncome ? 'bg-income-50' : 'bg-expense-50'
        )}>
          <Icon className={cn('w-4 h-4', isIncome ? 'text-income-500' : 'text-expense-500')} />
        </div>
      </div>
      <p className={cn('text-xl lg:text-2xl font-bold', isIncome ? 'text-income-500' : 'text-expense-500')}>
        {formatCurrency(Math.abs(value))}
      </p>
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {isPositive
            ? <ArrowUpRight className="w-3.5 h-3.5 text-income-500" />
            : <ArrowDownRight className="w-3.5 h-3.5 text-expense-500" />}
          <span className={cn('text-xs font-medium', isPositive ? 'text-income-500' : 'text-expense-500')}>
            {Math.abs(change).toFixed(1)}% vs {periodName} anterior
          </span>
        </div>
      )}
    </div>
  )
}
