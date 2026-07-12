'use client'
import { useMemo, useState } from 'react'
import {
  TrendingUp, TrendingDown, Mic, Calendar, ChevronDown, X,
  Pencil, Search, Tag, CreditCard,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useFinanceStore, getProfilePermissions } from '@/lib/store/useFinanceStore'
import ModeToggle from '@/components/shared/ModeToggle'
import HelpTooltip from '@/components/shared/HelpTooltip'
import ErrorBanner from '@/components/shared/ErrorBanner'
import EditTransactionModal from '@/components/shared/EditTransactionModal'
import { formatError } from '@/lib/errors'
import type { ErrorCode } from '@/lib/errors'
import { formatCurrency, formatDate, formatTime, cn } from '@/lib/utils'
import { parseISO, format, startOfMonth, endOfMonth, subMonths, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ViewMode, Transaction } from '@/types'

type FilterType = 'all' | 'income' | 'expense' | 'pending'

interface PeriodOption {
  label: string
  value: string
  start: Date
  end: Date
}

function getPeriodOptions(): PeriodOption[] {
  const now = new Date()
  const options: PeriodOption[] = [
    { label: 'Hoje',        value: 'today', start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end: endOfDay(now) },
    { label: 'Últimos 7 dias', value: 'week',  start: new Date(now.getTime() - 7 * 86400000), end: endOfDay(now) },
    { label: 'Este mês',    value: 'month', start: startOfMonth(now), end: endOfMonth(now) },
  ]
  for (let i = 1; i <= 3; i++) {
    const d = subMonths(now, i)
    options.push({ label: format(d, 'MMMM yyyy', { locale: ptBR }), value: `month-${i}`, start: startOfMonth(d), end: endOfMonth(d) })
  }
  options.push({ label: 'Tudo', value: 'all', start: new Date(2000, 0, 1), end: new Date(2100, 11, 31, 23, 59, 59) })
  return options
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function TimelinePage() {
  const router = useRouter()
  const {
    transactions, viewMode, setViewMode,
    removeTransaction, updateTransaction, addTransaction,
    categoriesPersonal, categoriesBusiness, addCategory,
    cards, profiles, activeProfileId, addRecurrence,
  } = useFinanceStore()
  const perms = getProfilePermissions(profiles, activeProfileId)

  const [typeFilter, setTypeFilter]         = useState<FilterType>('all')
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [customStart, setCustomStart]       = useState('')
  const [customEnd, setCustomEnd]           = useState('')
  const [showPeriodPicker, setShowPeriodPicker] = useState(false)
  const [showCustom, setShowCustom]         = useState(false)
  const [editingTx, setEditingTx]           = useState<Transaction | null>(null)
  const [searchQuery, setSearchQuery]       = useState('')
  const [appError, setAppError]             = useState<{ title: string; description: string; action: string; code?: ErrorCode; severity: 'error' | 'warning' } | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set())
  const [showCardFilter, setShowCardFilter] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const periodOptions = getPeriodOptions()
  const currentPeriod = periodOptions.find(p => p.value === selectedPeriod)

  // Categorias disponíveis (das transações reais, não do store de config)
  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    transactions.forEach(t => {
      if (viewMode !== 'all' && t.mode !== viewMode) return
      if (typeFilter === 'income' && t.type !== 'income') return
      if (typeFilter === 'expense' && t.type !== 'expense') return
      if (typeFilter === 'pending' && t.status !== 'pending') return
      cats.add(t.category)
    })
    return Array.from(cats).sort()
  }, [transactions, viewMode, typeFilter])

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return transactions
      .filter(t => {
        if (viewMode !== 'all' && t.mode !== viewMode) return false
        if (typeFilter === 'income' && t.type !== 'income') return false
        if (typeFilter === 'expense' && t.type !== 'expense') return false
        if (typeFilter === 'pending' && t.status !== 'pending') return false
        if (selectedCategories.size > 0 && !selectedCategories.has(t.category)) return false
        if (selectedCardIds.size > 0 && !selectedCardIds.has(t.card_id ?? '')) return false
        if (q && !t.description.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) return false

        const date = parseISO(t.date)
        if (selectedPeriod === 'custom') {
          if (customStart && date < new Date(customStart)) return false
          if (customEnd && date > new Date(customEnd + 'T23:59:59')) return false
          return true
        }
        if (!currentPeriod) return true
        return date >= currentPeriod.start && date <= currentPeriod.end
      })
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
  }, [transactions, viewMode, typeFilter, selectedCategories, selectedCardIds, searchQuery, selectedPeriod, customStart, customEnd, currentPeriod])

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of filtered) {
      const key = t.date.split('T')[0]
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const totalIncome  = filtered.filter(t => t.type === 'income' && t.status !== 'pending').reduce((s, t) => s + t.amount, 0)
  const totalExpense = filtered.filter(t => t.type === 'expense' && t.status !== 'pending').reduce((s, t) => s + t.amount, 0)
  const totalPending = filtered.filter(t => t.type === 'expense' && t.status === 'pending').reduce((s, t) => s + t.amount, 0)
  const balance      = totalIncome - totalExpense

  const activePeriodLabel = selectedPeriod === 'custom'
    ? (customStart && customEnd ? `${customStart} → ${customEnd}` : 'Período personalizado')
    : currentPeriod?.label || 'Período'

  const activeFilterCount = [
    typeFilter !== 'all',
    selectedPeriod !== 'month',
    selectedCategories.size > 0,
    selectedCardIds.size > 0,
    searchQuery.trim() !== '',
  ].filter(Boolean).length

  function clearAllFilters() {
    setTypeFilter('all')
    setSelectedPeriod('month')
    setCustomStart('')
    setCustomEnd('')
    setSelectedCategories(new Set())
    setSelectedCardIds(new Set())
    setSearchQuery('')
    setShowCategoryFilter(false)
    setShowCardFilter(false)
  }

  function toggleCategory(cat: string) {
    setSelectedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  function toggleCardId(id: string) {
    setSelectedCardIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="max-w-2xl mx-auto p-4 lg:p-8 space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-bold text-slate-800">Histórico</h1>
            <HelpTooltip id="timeline.summary" />
          </div>
          <p className="text-slate-500 text-sm">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
            {activeFilterCount > 0 && <span className="ml-1.5 text-primary-500 font-semibold">· {activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''} ativo{activeFilterCount > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <ModeToggle value={viewMode} onChange={(m) => setViewMode(m as ViewMode)} size="sm" className="w-full" />
      </div>

      {/* Summary */}
      <div className={cn('grid gap-1.5', totalPending > 0 ? 'grid-cols-2' : 'grid-cols-3')}>
        <div className="card p-3">
          <div className="flex items-center gap-1 mb-0.5">
            <p className="text-[10px] text-slate-400 font-semibold">Entradas</p>
            <HelpTooltip id="dashboard.income" />
          </div>
          <p className="text-xs sm:text-sm font-bold text-income-500 truncate">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="card p-3">
          <div className="flex items-center gap-1 mb-0.5">
            <p className="text-[10px] text-slate-400 font-semibold">Saídas</p>
            <HelpTooltip id="dashboard.expense" />
          </div>
          <p className="text-xs sm:text-sm font-bold text-expense-500 truncate">{formatCurrency(totalExpense)}</p>
        </div>
        {totalPending > 0 ? (
          <div className="card p-3 border-2 border-amber-200 bg-amber-50">
            <div className="flex items-center gap-1 mb-0.5">
              <p className="text-[10px] text-amber-500 font-semibold">A pagar</p>
              <HelpTooltip id="dashboard.pending" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-amber-600 truncate">{formatCurrency(totalPending)}</p>
          </div>
        ) : (
          <div className="card p-3">
            <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Saldo</p>
            <p className={cn('text-xs sm:text-sm font-bold truncate', balance >= 0 ? 'text-income-500' : 'text-expense-500')}>
              {formatCurrency(balance)}
            </p>
          </div>
        )}
      </div>
      {totalPending > 0 && (
        <div className="card p-3 flex items-center justify-between">
          <p className="text-[10px] text-slate-400 font-semibold">Saldo (sem pendentes)</p>
          <p className={cn('text-xs sm:text-sm font-bold', balance >= 0 ? 'text-income-500' : 'text-expense-500')}>
            {formatCurrency(balance)}
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="card p-4 space-y-3">

        {/* Linha 0: Busca + toggle filtros */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar lançamento…"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border-2 border-slate-200 text-sm text-slate-800 outline-none focus:border-primary-400 bg-white transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0',
              showFilters || activeFilterCount > 0
                ? 'bg-primary-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {activeFilterCount > 0 && (
              <span className={cn('w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center shrink-0',
                showFilters ? 'bg-white text-primary-600' : 'bg-primary-500 text-white'
              )}>
                {activeFilterCount}
              </span>
            )}
            Filtros
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showFilters && 'rotate-180')} />
          </button>
        </div>

        {/* Filtros expansíveis */}
        {showFilters && <>

        {/* Linha 1: Tipo + Período + Limpar */}
        <div className="flex gap-2 flex-wrap items-center">
          {/* Tipo */}
          <div className="flex items-center gap-1.5">
            <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
              {[
                { value: 'all',     label: 'Todos' },
                { value: 'income',  label: '↑ Entrada' },
                { value: 'expense', label: '↓ Saída' },
                { value: 'pending', label: '⏱ A pagar' },
              ].map(f => (
                <button key={f.value} onClick={() => setTypeFilter(f.value as FilterType)}
                  className={cn('px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                    typeFilter === f.value
                      ? f.value === 'pending'
                        ? 'bg-amber-400 text-white shadow-sm'
                        : 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700')}>
                  {f.label}
                </button>
              ))}
            </div>
            <HelpTooltip id="timeline.filter-type" />
          </div>

          {/* Período */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[130px]">
          <div className="relative flex-1 min-w-0">
            <button onClick={() => { setShowPeriodPicker(!showPeriodPicker); setShowCustom(false) }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors">
              <div className="flex items-center gap-1.5 min-w-0">
                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{activePeriodLabel}</span>
              </div>
              <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform', showPeriodPicker && 'rotate-180')} />
            </button>
            {showPeriodPicker && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-card-lg border border-slate-100 z-30 overflow-hidden">
                {periodOptions.map(opt => (
                  <button key={opt.value}
                    onClick={() => { setSelectedPeriod(opt.value); setShowCustom(false); setShowPeriodPicker(false) }}
                    className={cn('w-full px-4 py-2.5 text-left text-sm transition-colors',
                      selectedPeriod === opt.value ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-slate-700 hover:bg-slate-50 font-medium')}>
                    {opt.label}
                  </button>
                ))}
                <button onClick={() => { setSelectedPeriod('custom'); setShowCustom(true); setShowPeriodPicker(false) }}
                  className={cn('w-full px-4 py-2.5 text-left text-sm font-medium transition-colors border-t border-slate-100',
                    selectedPeriod === 'custom' ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-slate-700 hover:bg-slate-50')}>
                  📅 Período personalizado
                </button>
              </div>
            )}
          </div>
          <HelpTooltip id="timeline.filter-period" />
          </div>

          {/* Limpar filtros */}
          {activeFilterCount > 0 && (
            <button onClick={clearAllFilters}
              className="flex items-center gap-1 px-3 py-2 bg-expense-50 text-expense-600 rounded-xl text-xs font-semibold hover:bg-expense-100 transition-colors shrink-0">
              <X className="w-3 h-3" /> Limpar ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Linha 2: Datas personalizadas */}
        {(showCustom || selectedPeriod === 'custom') && (
          <div className="flex gap-2 items-center">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-primary-400 bg-white" />
            <span className="text-slate-400 text-xs font-semibold shrink-0">até</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} min={customStart}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-primary-400 bg-white" />
            {(customStart || customEnd) && (
              <button onClick={() => { setCustomStart(''); setCustomEnd(''); setSelectedPeriod('month') }}
                className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200 shrink-0">
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>
        )}

        {/* Linha 3: Filtro por categoria */}
        <div>
          <button
            onClick={() => setShowCategoryFilter(!showCategoryFilter)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all w-full',
              showCategoryFilter || selectedCategories.size > 0
                ? 'bg-primary-50 text-primary-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <Tag className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 text-left">
              {selectedCategories.size > 0
                ? `${selectedCategories.size} categoria${selectedCategories.size > 1 ? 's' : ''} selecionada${selectedCategories.size > 1 ? 's' : ''}`
                : 'Filtrar por categoria'}
            </span>
            <HelpTooltip id="timeline.filter-category" />
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform shrink-0', showCategoryFilter && 'rotate-180')} />
          </button>

          {showCategoryFilter && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {availableCategories.map(cat => (
                <button key={cat} onClick={() => toggleCategory(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all',
                    selectedCategories.has(cat)
                      ? 'bg-primary-500 border-primary-500 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-primary-300 hover:bg-primary-50'
                  )}>
                  {cat}
                </button>
              ))}
              {availableCategories.length === 0 && (
                <p className="text-xs text-slate-400 py-1">Nenhuma categoria no período.</p>
              )}
            </div>
          )}
        </div>

        {/* Linha 4: Filtro por cartão */}
        {cards.length > 0 && (
          <div>
            <button
              onClick={() => setShowCardFilter(!showCardFilter)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all w-full',
                showCardFilter || selectedCardIds.size > 0
                  ? 'bg-primary-50 text-primary-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 text-left">
                {selectedCardIds.size > 0
                  ? `${selectedCardIds.size} cartão${selectedCardIds.size > 1 ? 'ões' : ''} selecionado${selectedCardIds.size > 1 ? 's' : ''}`
                  : 'Filtrar por cartão'}
              </span>
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform shrink-0', showCardFilter && 'rotate-180')} />
            </button>

            {showCardFilter && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {cards.map(card => (
                  <button key={card.id} onClick={() => toggleCardId(card.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all',
                      selectedCardIds.has(card.id)
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-primary-300 hover:bg-primary-50'
                    )}>
                    <CreditCard className="w-3 h-3 shrink-0" />
                    {card.name}{card.lastDigits ? ` ••${card.lastDigits}` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        </>}
      </div>

      {/* Error banner */}
      {appError && (
        <ErrorBanner
          title={appError.title}
          description={appError.description}
          action={appError.action}
          code={appError.code}
          severity={appError.severity}
          onClose={() => setAppError(null)}
        />
      )}

      {/* Timeline */}
      {grouped.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-slate-400 font-medium">Nenhum registro no período</p>
          <button onClick={() => router.push('/registrar')}
            className="mt-4 btn-primary flex items-center gap-2 mx-auto">
            <Mic className="w-4 h-4" /> Registrar agora
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([dateKey, txs]) => (
            <div key={dateKey}>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-sm font-bold text-slate-500">{formatDate(dateKey + 'T12:00:00')}</h3>
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs text-slate-400">{txs.length} reg.</span>
              </div>

              <div className="space-y-2">
                {txs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setEditingTx(t)}
                    className="card p-3.5 flex items-center gap-3 w-full text-left hover:shadow-card-hover transition-all active:scale-[0.99] group"
                  >
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                      t.type === 'income' ? 'bg-income-50' : 'bg-expense-50')}>
                      {t.type === 'income'
                        ? <TrendingUp className="w-4 h-4 text-income-500" />
                        : <TrendingDown className="w-4 h-4 text-expense-500" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-sm font-semibold text-slate-800 truncate">{t.description}</p>
                        <span className={cn('shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full',
                          t.mode === 'business' ? 'bg-primary-50 text-primary-600' : 'bg-slate-100 text-slate-500')}>
                          {t.mode === 'business' ? 'EMP' : 'PES'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-slate-400">{formatTime(t.date)}</span>
                        <span className="text-xs text-slate-300">·</span>
                        <span className="text-xs text-slate-400">{t.category}</span>
                        {t.profile_name && (
                          <>
                            <span className="text-xs text-slate-300">·</span>
                            <span className="text-xs text-slate-400">{t.profile_name}</span>
                          </>
                        )}
                        {t.is_recurring && <span className="text-xs text-primary-400">· 🔁</span>}
                        {t.card_id && (
                          <>
                            <span className="text-xs text-slate-300">·</span>
                            <CreditCard className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-xs text-slate-400">{cards.find(c => c.id === t.card_id)?.name ?? 'Cartão'}</span>
                          </>
                        )}
                        {t.status === 'pending' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">A pagar</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn('font-bold text-sm', t.type === 'income' ? 'text-income-500' : 'text-expense-500')}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                      <Pencil className="w-3.5 h-3.5 text-slate-300 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editingTx && (
        <EditTransactionModal
          tx={editingTx}
          onClose={() => setEditingTx(null)}
          onSave={async (data) => {
            try {
              await updateTransaction(editingTx.id, data)
              setEditingTx(null)
            } catch (err) {
              setAppError(formatError(err))
            }
          }}
          onDelete={async () => {
            try {
              await removeTransaction(editingTx.id)
              setEditingTx(null)
            } catch (err) {
              setAppError(formatError(err))
            }
          }}
          categoriesPersonal={categoriesPersonal}
          categoriesBusiness={categoriesBusiness}
          cards={cards}
          addCategory={addCategory}
          addTransaction={addTransaction}
          removeTransaction={removeTransaction}
          addRecurrence={addRecurrence}
          canEdit={perms.canEditTransactions}
          canDelete={perms.canDeleteTransactions}
        />
      )}

    </div>
  )
}
