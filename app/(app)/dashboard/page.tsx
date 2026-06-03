'use client'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight,
  Mic, Building2, User, Sparkles, AlertTriangle, CheckCircle, XCircle,
} from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { useFinanceStore } from '@/lib/store/useFinanceStore'
import ModeToggle from '@/components/shared/ModeToggle'
import { formatCurrency, getPercentageChange, getHealthStatus, cn } from '@/lib/utils'
import type { ViewMode } from '@/types'
import { format, parseISO, subMonths, isSameMonth, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const CATEGORY_COLORS = ['#6366F1', '#10B981', '#F43F5E', '#F59E0B', '#06B6D4', '#8B5CF6', '#EC4899']

export default function DashboardPage() {
  const router = useRouter()
  const { transactions, viewMode, setViewMode } = useFinanceStore()

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (viewMode === 'all') return true
      return t.mode === viewMode
    })
  }, [transactions, viewMode])

  const now = new Date()
  const thisMonth = filtered.filter(t => isSameMonth(parseISO(t.date), now))
  const lastMonth = filtered.filter(t => isSameMonth(parseISO(t.date), subMonths(now, 1)))

  const totalIncome = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpense

  const prevIncome = lastMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const prevExpense = lastMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const incomeChange = getPercentageChange(totalIncome, prevIncome)
  const expenseChange = getPercentageChange(totalExpense, prevExpense)

  const health = getHealthStatus(balance, totalExpense)

  // Category breakdown
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {}
    thisMonth.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }))
  }, [thisMonth])

  // Monthly trend (last 6 months, sorted chronologically)
  const monthlyData = useMemo(() => {
    const map: Record<string, { income: number; expense: number; sortKey: number }> = {}
    const sixMonthsAgo = subMonths(now, 5)
    filtered
      .filter(t => parseISO(t.date) >= startOfMonth(sixMonthsAgo))
      .forEach(t => {
        const d = parseISO(t.date)
        const key = format(d, 'MMM', { locale: ptBR })
        const sortKey = d.getFullYear() * 100 + d.getMonth()
        if (!map[key]) map[key] = { income: 0, expense: 0, sortKey }
        if (t.type === 'income') map[key].income += t.amount
        else map[key].expense += t.amount
      })
    return Object.entries(map)
      .sort((a, b) => a[1].sortKey - b[1].sortKey)
      .map(([month, vals]) => ({ month, income: vals.income, expense: vals.expense }))
  }, [filtered, now])

  // Top income sources
  const incomeSources = useMemo(() => {
    const map: Record<string, number> = {}
    thisMonth.filter(t => t.type === 'income').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [thisMonth])

  const aiInsight = useMemo(() => {
    const sign = balance >= 0 ? 'positivo' : 'negativo'
    const topExpense = categoryData[0]?.name || 'outros'
    const topIncome = incomeSources[0]?.[0] || 'diversas fontes'
    const expTrend = expenseChange > 0 ? `aumentaram ${expenseChange.toFixed(0)}%` : `diminuíram ${Math.abs(expenseChange).toFixed(0)}%`
    const ctx = viewMode === 'business' ? 'sua empresa está' : viewMode === 'personal' ? 'suas finanças pessoais estão' : 'seu resultado geral está'
    return `Este mês ${ctx} ${sign} em ${formatCurrency(Math.abs(balance))}. O maior gasto foi com ${topExpense}. A maior receita veio de ${topIncome}. Suas despesas ${expTrend} em relação ao mês anterior.`
  }, [balance, categoryData, incomeSources, expenseChange, viewMode])

  const healthConfig = {
    good: { color: 'text-income-500', bg: 'bg-income-50', border: 'border-income-200', icon: CheckCircle, label: 'Saúde boa', desc: 'Você está no positivo' },
    warning: { color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle, label: 'Atenção', desc: 'Margem pequena' },
    danger: { color: 'text-expense-500', bg: 'bg-expense-50', border: 'border-expense-200', icon: XCircle, label: 'Risco', desc: 'Despesas maiores que receitas' },
  }[health]

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">{format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>
        <ModeToggle value={viewMode} onChange={(m) => setViewMode(m as ViewMode)} size="sm" />
      </div>

      {/* Health banner */}
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
          <Mic className="w-3.5 h-3.5" />
          Registrar
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Entradas"
          value={totalIncome}
          change={incomeChange}
          type="income"
          icon={TrendingUp}
        />
        <MetricCard
          label="Saídas"
          value={totalExpense}
          change={expenseChange}
          type="expense"
          icon={TrendingDown}
        />
        <MetricCard
          label="Saldo"
          value={balance}
          type={balance >= 0 ? 'income' : 'expense'}
          icon={balance >= 0 ? TrendingUp : TrendingDown}
          colSpan
        />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Area chart */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-4">Entradas vs Saídas</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
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
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }}
                formatter={(v: number) => [formatCurrency(v)]}
              />
              <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} fill="url(#incomeGrad)" name="Entradas" />
              <Area type="monotone" dataKey="expense" stroke="#F43F5E" strokeWidth={2} fill="url(#expenseGrad)" name="Saídas" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category pie */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Maiores gastos</h3>
          {categoryData.length > 0 ? (
            <div className="space-y-2.5">
              {categoryData.map((c, i) => (
                <div key={c.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[i] }} />
                  <span className="text-xs text-slate-600 flex-1 truncate">{c.name}</span>
                  <span className="text-xs font-semibold text-slate-800">{formatCurrency(c.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Sem gastos este mês</p>
          )}
        </div>
      </div>

      {/* AI Insight */}
      <div className="card p-5 bg-gradient-to-br from-primary-50 to-indigo-50 border-primary-100">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-primary-800 text-sm mb-1">Análise da IA</p>
            <p className="text-slate-700 text-sm leading-relaxed">{aiInsight}</p>
          </div>
        </div>
      </div>

      {/* Recent transactions preview */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Últimos registros</h3>
          <button
            onClick={() => router.push('/timeline')}
            className="text-sm text-primary-500 font-medium hover:underline"
          >
            Ver todos
          </button>
        </div>
        {thisMonth.length === 0 ? (
          <div className="text-center py-8">
            <Mic className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Nenhum registro este mês ainda.</p>
            <button onClick={() => router.push('/registrar')} className="mt-3 text-sm text-primary-500 font-semibold hover:underline">
              Registrar agora
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {thisMonth.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                  t.type === 'income' ? 'bg-income-50' : 'bg-expense-50'
                )}>
                  {t.type === 'income'
                    ? <TrendingUp className="w-4 h-4 text-income-500" />
                    : <TrendingDown className="w-4 h-4 text-expense-500" />
                  }
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

      {/* FAB for mobile voice */}
      <div className="lg:hidden fixed bottom-20 right-4 z-40">
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
  label, value, change, type, icon: Icon, colSpan,
}: {
  label: string
  value: number
  change?: number
  type: 'income' | 'expense'
  icon: React.ComponentType<{ className?: string }>
  colSpan?: boolean
}) {
  const isPositive = (change ?? 0) >= 0
  const isIncome = type === 'income'

  return (
    <div className={cn('card p-4 lg:p-5 animate-fade-up', colSpan && 'col-span-2')}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center',
          isIncome ? 'bg-income-50' : 'bg-expense-50'
        )}>
          <Icon className={cn('w-4 h-4', isIncome ? 'text-income-500' : 'text-expense-500')} />
        </div>
      </div>
      <p className={cn('text-xl lg:text-2xl font-bold',
        isIncome ? 'text-income-500' : 'text-expense-500'
      )}>
        {formatCurrency(Math.abs(value))}
      </p>
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {isPositive
            ? <ArrowUpRight className="w-3.5 h-3.5 text-income-500" />
            : <ArrowDownRight className="w-3.5 h-3.5 text-expense-500" />
          }
          <span className={cn('text-xs font-medium', isPositive ? 'text-income-500' : 'text-expense-500')}>
            {Math.abs(change).toFixed(1)}% vs mês anterior
          </span>
        </div>
      )}
    </div>
  )
}
