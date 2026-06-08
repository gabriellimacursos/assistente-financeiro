'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Mic, Sparkles, AlertTriangle, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, CreditCard, Bell, X, RefreshCw,
} from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useFinanceStore } from '@/lib/store/useFinanceStore'
import ModeToggle from '@/components/shared/ModeToggle'
import { formatCurrency, getPercentageChange, getHealthStatus, cn } from '@/lib/utils'
import type { ViewMode, CreditCard as CC } from '@/types'
import {
  format, parseISO, subMonths, startOfMonth,
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
      const s = startOfWeek(anchor, { weekStartsOn: 0 })
      const e = endOfWeek(anchor, { weekStartsOn: 0 })
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
  if (type === 'week') return isSameWeek(date, new Date(), { weekStartsOn: 0 })
  if (type === 'month') return isThisMonth(date)
  return isThisYear(date)
}

function txInPeriod(txDate: Date, type: PeriodType, anchor: Date): boolean {
  if (type === 'day') return isSameDay(txDate, anchor)
  if (type === 'month') return isSameMonth(txDate, anchor)
  if (type === 'year') return txDate.getFullYear() === anchor.getFullYear()
  const s = startOfWeek(anchor, { weekStartsOn: 0 })
  const e = endOfWeek(anchor, { weekStartsOn: 0 })
  return txDate >= s && txDate <= e
}

export default function DashboardPage() {
  const router = useRouter()
  const { transactions, viewMode, setViewMode, cards, updateTransaction, recurrences } = useFinanceStore()
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [anchor, setAnchor] = useState<Date>(new Date())
  const [confirmPayCard, setConfirmPayCard] = useState<{ card: CC; total: number; txIds: string[]; dueDate: Date; daysUntilDue: number } | null>(null)
  const [paidAlerts, setPaidAlerts] = useState<Set<string>>(new Set())
  const [payError, setPayError] = useState<string | null>(null)

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

    // Dia / Semana: sempre 7 dias completos (contexto da semana é necessário)
    if (periodType === 'day' || periodType === 'week') {
      const weekStart = startOfWeek(anchor, { weekStartsOn: 0 })
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

    // Mês: sempre 6 meses fixos (incluindo os sem dados, para o AreaChart não ficar vazio)
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

  // Alertas de fatura — vencimento calculado pelo dueDay do cartão, não pela data da compra
  const billAlerts = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const result: { card: CC; total: number; daysUntilDue: number; txIds: string[]; dueDate: Date }[] = []

    for (const card of cards) {
      if (!card.dueDay || !card.active) continue

      // Calcula o próximo vencimento real pelo dueDay do cartão
      const cutoff = card.closingDay ?? card.dueDay
      let year = today.getFullYear()
      let month = today.getMonth()
      if (today.getDate() >= cutoff) month += 1
      while (month > 11) { month -= 12; year++ }
      const dueDate = new Date(year, month, card.dueDay)
      dueDate.setHours(0, 0, 0, 0)

      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      // Só alerta se o vencimento está em até 7 dias ou já venceu
      if (daysUntilDue > 7) continue

      // Todas as transações pendentes do cartão
      const pendingTx = filtered.filter(t =>
        t.card_id === card.id && t.status === 'pending' && t.type === 'expense'
      )
      if (pendingTx.length === 0) continue

      result.push({
        card,
        total: pendingTx.reduce((s, t) => s + t.amount, 0),
        daysUntilDue,
        txIds: pendingTx.map(t => t.id),
        dueDate,
      })
    }
    return result.filter(a => !paidAlerts.has(a.card.id)).sort((a, b) => a.daysUntilDue - b.daysUntilDue)
  }, [cards, filtered, paidAlerts])

  async function handleMarkAsPaid(txIds: string[], cardId: string) {
    setPayError(null)
    try {
      await Promise.all(txIds.map(id => updateTransaction(id, { status: 'confirmed' })))
      setPaidAlerts(prev => { const s = new Set(prev); s.add(cardId); return s })
      setConfirmPayCard(null)
    } catch {
      setPayError('Erro ao confirmar pagamento. Tente novamente.')
    }
  }

  const recentTx = useMemo(() =>
    [...periodTx].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
    [periodTx]
  )

  const futureCardBills = useMemo(() => {
    const today = new Date()
    today.setHours(23, 59, 59, 0)
    const map: Record<string, { total: number; sortKey: number; label: string; items: { cardName: string; amount: number }[] }> = {}
    filtered.forEach(t => {
      if (!t.card_id || t.type !== 'expense') return
      const d = parseISO(t.date)
      if (d <= today) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = format(d, "MMMM 'de' yyyy", { locale: ptBR })
      const cardName = cards.find(c => c.id === t.card_id)?.name ?? 'Cartão'
      if (!map[key]) map[key] = { total: 0, sortKey: d.getFullYear() * 100 + d.getMonth(), label, items: [] }
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5 capitalize">{getPeriodLabel(periodType, anchor)}</p>
        </div>
        <ModeToggle value={viewMode} onChange={(m) => setViewMode(m as ViewMode)} size="sm" />
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

      {/* Alertas de fatura */}
      {billAlerts.map(alert => {
        const isOverdue  = alert.daysUntilDue < 0
        const isDueToday = alert.daysUntilDue === 0
        const label = isOverdue
          ? `Vencida há ${Math.abs(alert.daysUntilDue)} dia${Math.abs(alert.daysUntilDue) > 1 ? 's' : ''}`
          : isDueToday ? 'Vence hoje!'
          : `Vence em ${alert.daysUntilDue} dia${alert.daysUntilDue > 1 ? 's' : ''}`
        const color     = isOverdue || isDueToday ? 'bg-expense-50 border-expense-300' : 'bg-amber-50 border-amber-300'
        const textColor = isOverdue || isDueToday ? 'text-expense-700' : 'text-amber-700'
        const iconColor = isOverdue || isDueToday ? 'text-expense-500' : 'text-amber-500'
        return (
          <div key={alert.card.id} className={cn('rounded-2xl p-4 border flex items-center gap-3', color)}>
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', isOverdue || isDueToday ? 'bg-expense-100' : 'bg-amber-100')}>
              <Bell className={cn('w-4 h-4', iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('font-bold text-sm', textColor)}>💳 {alert.card.name} · {label}</p>
              <p className="text-slate-600 text-xs mt-0.5">Fatura de <span className="font-semibold">{formatCurrency(alert.total)}</span> aguardando confirmação</p>
            </div>
            <button onClick={() => setConfirmPayCard(alert)} className="shrink-0 bg-primary-500 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-primary-600 transition-colors">
              Pagar
            </button>
          </div>
        )
      })}

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

      {/* Registros do período */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Registros do período</h3>
          <button onClick={() => router.push('/timeline')} className="text-sm text-primary-500 font-medium hover:underline">
            Ver todos
          </button>
        </div>
        {recentTx.length === 0 ? (
          <div className="text-center py-8">
            <Mic className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Nenhum registro neste período.</p>
            <button onClick={() => router.push('/registrar')} className="mt-3 text-sm text-primary-500 font-semibold hover:underline">
              Registrar agora
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTx.map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                  t.type === 'income' ? 'bg-income-50' : 'bg-expense-50'
                )}>
                  {t.type === 'income'
                    ? <TrendingUp className="w-4 h-4 text-income-500" />
                    : <TrendingDown className="w-4 h-4 text-expense-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{t.description}</p>
                  <p className="text-xs text-slate-400">{t.category}</p>
                </div>
                <span className={cn('text-sm font-semibold shrink-0',
                  t.type === 'income' ? 'text-income-500' : 'text-expense-500'
                )}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal confirmação de pagamento */}
      {confirmPayCard && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end" onClick={() => setConfirmPayCard(null)}>
          <div className="w-full bg-white rounded-t-3xl p-6 pb-10 space-y-5 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">{confirmPayCard.card.name}</p>
                  <p className="text-xs text-slate-400">Vencimento: {format(confirmPayCard.dueDate, "d 'de' MMMM", { locale: ptBR })}</p>
                </div>
              </div>
              <button onClick={() => setConfirmPayCard(null)} className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">Total da fatura</p>
              <p className="text-3xl font-bold text-slate-800">{formatCurrency(confirmPayCard.total)}</p>
              <p className="text-xs text-slate-400 mt-1">{confirmPayCard.txIds.length} lançamento{confirmPayCard.txIds.length > 1 ? 's' : ''}</p>
            </div>
            {payError && (
              <p className="text-xs text-expense-600 bg-expense-50 border border-expense-200 rounded-xl px-3 py-2 text-center">{payError}</p>
            )}
            <div className="space-y-2">
              <button
                onClick={() => handleMarkAsPaid(confirmPayCard.txIds, confirmPayCard.card.id)}
                className="w-full bg-income-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-income-600 transition-colors"
              >
                <CheckCircle className="w-5 h-5" /> Paguei tudo — {formatCurrency(confirmPayCard.total)}
              </button>
              <button
                onClick={() => { setConfirmPayCard(null); setPayError(null) }}
                className="w-full bg-slate-100 text-slate-600 font-semibold py-3 rounded-2xl text-sm hover:bg-slate-200 transition-colors"
              >
                Ainda não paguei
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB mobile */}
      <div className="lg:hidden fixed bottom-20 right-4 z-[55]">
        <button
          onClick={() => router.push('/registrar')}
          className="w-14 h-14 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-float text-white active:scale-95 transition-transform"
        >
          <Mic className="w-6 h-6" />
        </button>
      </div>
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
