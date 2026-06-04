'use client'
import { useMemo, useState } from 'react'
import {
  TrendingUp, TrendingDown, Trash2, Mic, Calendar, ChevronDown, X,
  Pencil, Check, Building2, User, Plus, Search, SlidersHorizontal, Tag,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useFinanceStore } from '@/lib/store/useFinanceStore'
import ModeToggle from '@/components/shared/ModeToggle'
import { formatCurrency, formatDate, formatTime, cn } from '@/lib/utils'
import { parseISO, format, startOfMonth, endOfMonth, subMonths, endOfDay, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ViewMode, Transaction, Mode } from '@/types'

type FilterType = 'all' | 'income' | 'expense'

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

// ─── Edit modal ────────────────────────────────────────────────────────────
interface EditModalProps {
  tx: Transaction
  onClose: () => void
  onSave: (data: Partial<Transaction>) => void
  onDelete: () => void
  categoriesPersonal: any[]
  categoriesBusiness: any[]
  addCategory: (name: string, mode: Mode, direction: 'income' | 'expense' | 'both') => void
}

function EditModal({ tx, onClose, onSave, onDelete, categoriesPersonal, categoriesBusiness, addCategory }: EditModalProps) {
  const [description, setDescription] = useState(tx.description)
  const [amount, setAmount]           = useState(tx.amount.toString())
  const [type, setType]               = useState(tx.type)
  const [mode, setMode]               = useState(tx.mode)
  const [category, setCategory]       = useState(tx.category)
  const [date, setDate]               = useState(tx.date.split('T')[0])
  const [confirmDel, setConfirmDel]   = useState(false)
  const [newCatInput, setNewCatInput] = useState('')
  const [newCatDir, setNewCatDir]     = useState<'income' | 'expense' | 'both'>(tx.type)

  const rawCats = mode === 'business' ? categoriesBusiness : categoriesPersonal
  const cats = rawCats
    .map((c: any) => typeof c === 'string' ? { name: c, direction: 'both' } : c)
    .filter((c: any) => c.direction === 'both' || c.direction === type)
    .map((c: any) => c.name as string)

  function handleSave() {
    const num = parseFloat(amount.replace(',', '.'))
    if (!description.trim() || isNaN(num) || num <= 0) return
    onSave({ description: description.trim(), amount: num, type, mode, category, date: date + 'T' + tx.date.split('T')[1] })
  }

  function handleCreateCat() {
    const name = newCatInput.trim()
    if (!name) return
    addCategory(name, mode, newCatDir)
    setCategory(name)
    setNewCatInput('')
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up"
        onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="px-5 pb-8 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pt-1">
            <h2 className="text-lg font-bold text-slate-800">Editar lançamento</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setConfirmDel(true)}
                className="w-9 h-9 bg-expense-50 rounded-xl flex items-center justify-center hover:bg-expense-100 transition-colors">
                <Trash2 className="w-4 h-4 text-expense-500" />
              </button>
              <button onClick={onClose} className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Confirmação de exclusão */}
          {confirmDel && (
            <div className="bg-expense-50 border-2 border-expense-200 rounded-2xl p-4 space-y-3">
              <p className="text-center text-sm font-semibold text-expense-700">Excluir este lançamento?</p>
              <p className="text-center text-xs text-expense-500">Essa ação não pode ser desfeita.</p>
              <div className="flex gap-2">
                <button onClick={onDelete}
                  className="flex-1 py-3 bg-expense-500 text-white font-semibold rounded-2xl hover:bg-expense-600 transition-colors text-sm">
                  Sim, excluir
                </button>
                <button onClick={() => setConfirmDel(false)}
                  className="flex-1 py-3 bg-white text-slate-700 font-semibold rounded-2xl border-2 border-slate-200 hover:bg-slate-50 transition-colors text-sm">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Tipo */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setType('income')}
                className={cn('py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border-2 transition-all',
                  type === 'income' ? 'bg-income-50 border-income-400 text-income-600' : 'border-slate-200 text-slate-400')}>
                <TrendingUp className="w-4 h-4" /> Entrada
              </button>
              <button onClick={() => setType('expense')}
                className={cn('py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border-2 transition-all',
                  type === 'expense' ? 'bg-expense-50 border-expense-400 text-expense-600' : 'border-slate-200 text-slate-400')}>
                <TrendingDown className="w-4 h-4" /> Saída
              </button>
            </div>
          </div>

          {/* Valor */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Valor</label>
            <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3 border-2 border-slate-200 focus-within:border-primary-400">
              <span className="text-slate-400 font-semibold">R$</span>
              <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0,00" className="flex-1 bg-transparent text-2xl font-bold text-slate-800 outline-none" />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Descrição</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Descrição do lançamento…"
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 text-sm font-medium text-slate-800 outline-none focus:border-primary-400 transition-all bg-white" />
          </div>

          {/* Modo */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Conta</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setMode('business')}
                className={cn('py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border-2 transition-all',
                  mode === 'business' ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-slate-200 text-slate-400')}>
                <Building2 className="w-4 h-4" /> Empresa
              </button>
              <button onClick={() => setMode('personal')}
                className={cn('py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border-2 transition-all',
                  mode === 'personal' ? 'bg-slate-100 border-slate-400 text-slate-700' : 'border-slate-200 text-slate-400')}>
                <User className="w-4 h-4" /> Pessoal
              </button>
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Categoria</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto">
              {cats.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={cn('py-2.5 px-2 rounded-xl text-xs font-semibold border-2 transition-all text-center',
                    category === cat ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-slate-200 text-slate-600 hover:border-primary-300')}>
                  {cat}
                </button>
              ))}
            </div>
            {/* Nova categoria inline */}
            <div className="mt-2 space-y-2 border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-400 text-center">Não achou? Crie uma nova</p>
              <div className="flex gap-2">
                <input value={newCatInput} onChange={e => setNewCatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateCat()}
                  placeholder="Nome da categoria…"
                  className="flex-1 px-3 py-2 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 transition-all" />
                <button onClick={handleCreateCat} disabled={!newCatInput.trim()}
                  className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center text-white hover:bg-primary-600 disabled:opacity-40 shrink-0">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-1.5">
                {(['income', 'expense', 'both'] as const).map(dir => {
                  const labels = { income: '↑ Entrada', expense: '↓ Saída', both: '↕ Ambos' }
                  return (
                    <button key={dir} onClick={() => setNewCatDir(dir)}
                      className={cn('flex-1 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all',
                        newCatDir === dir ? 'bg-primary-500 text-white border-primary-500' : 'border-slate-200 text-slate-500')}>
                      {labels[dir]}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Data */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Data</label>
            <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border-2 border-slate-200 focus-within:border-primary-400">
              <Calendar className="w-5 h-5 text-slate-400 shrink-0" />
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="flex-1 bg-transparent text-base font-semibold text-slate-800 outline-none" />
            </div>
          </div>

          {/* Botões */}
          <button onClick={handleSave}
            className="btn-primary w-full flex items-center justify-center gap-2 text-base py-4">
            <Check className="w-5 h-5" /> Salvar alterações
          </button>

        </div>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function TimelinePage() {
  const router = useRouter()
  const {
    transactions, viewMode, setViewMode,
    removeTransaction, updateTransaction,
    categoriesPersonal, categoriesBusiness, addCategory,
  } = useFinanceStore()

  const [typeFilter, setTypeFilter]         = useState<FilterType>('all')
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [customStart, setCustomStart]       = useState('')
  const [customEnd, setCustomEnd]           = useState('')
  const [showPeriodPicker, setShowPeriodPicker] = useState(false)
  const [showCustom, setShowCustom]         = useState(false)
  const [editingTx, setEditingTx]           = useState<Transaction | null>(null)
  const [searchQuery, setSearchQuery]       = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)

  const periodOptions = getPeriodOptions()
  const currentPeriod = periodOptions.find(p => p.value === selectedPeriod)

  // Categorias disponíveis (das transações reais, não do store de config)
  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    transactions.forEach(t => {
      if (viewMode !== 'all' && t.mode !== viewMode) return
      if (typeFilter !== 'all' && t.type !== typeFilter) return
      cats.add(t.category)
    })
    return Array.from(cats).sort()
  }, [transactions, viewMode, typeFilter])

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return transactions
      .filter(t => {
        if (viewMode !== 'all' && t.mode !== viewMode) return false
        if (typeFilter !== 'all' && t.type !== typeFilter) return false
        if (selectedCategories.size > 0 && !selectedCategories.has(t.category)) return false
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
  }, [transactions, viewMode, typeFilter, selectedCategories, searchQuery, selectedPeriod, customStart, customEnd, currentPeriod])

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of filtered) {
      const key = t.date.split('T')[0]
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance      = totalIncome - totalExpense

  const activePeriodLabel = selectedPeriod === 'custom'
    ? (customStart && customEnd ? `${customStart} → ${customEnd}` : 'Período personalizado')
    : currentPeriod?.label || 'Período'

  const activeFilterCount = [
    typeFilter !== 'all',
    selectedPeriod !== 'month',
    selectedCategories.size > 0,
    searchQuery.trim() !== '',
  ].filter(Boolean).length

  function clearAllFilters() {
    setTypeFilter('all')
    setSelectedPeriod('month')
    setCustomStart('')
    setCustomEnd('')
    setSelectedCategories(new Set())
    setSearchQuery('')
    setShowCategoryFilter(false)
  }

  function toggleCategory(cat: string) {
    setSelectedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  return (
    <div className="max-w-2xl mx-auto p-4 lg:p-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Histórico</h1>
          <p className="text-slate-500 text-sm">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
            {activeFilterCount > 0 && <span className="ml-1.5 text-primary-500 font-semibold">· {activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''} ativo{activeFilterCount > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <ModeToggle value={viewMode} onChange={(m) => setViewMode(m as ViewMode)} size="sm" />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-1.5">
        <div className="card p-3">
          <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Entradas</p>
          <p className="text-xs sm:text-sm font-bold text-income-500 truncate">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Saídas</p>
          <p className="text-xs sm:text-sm font-bold text-expense-500 truncate">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Saldo</p>
          <p className={cn('text-xs sm:text-sm font-bold truncate', balance >= 0 ? 'text-income-500' : 'text-expense-500')}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 space-y-3">

        {/* Linha 0: Busca por texto */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por descrição ou categoria…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border-2 border-slate-200 text-sm text-slate-800 outline-none focus:border-primary-400 bg-white transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Linha 1: Tipo + Período + Limpar */}
        <div className="flex gap-2 flex-wrap items-center">
          {/* Tipo */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
            {[
              { value: 'all',     label: 'Todos' },
              { value: 'income',  label: '↑ Entrada' },
              { value: 'expense', label: '↓ Saída' },
            ].map(f => (
              <button key={f.value} onClick={() => setTypeFilter(f.value as FilterType)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                  typeFilter === f.value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Período */}
          <div className="relative flex-1 min-w-[130px]">
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
      </div>

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
        <EditModal
          tx={editingTx}
          onClose={() => setEditingTx(null)}
          onSave={(data) => { updateTransaction(editingTx.id, data); setEditingTx(null) }}
          onDelete={() => { removeTransaction(editingTx.id); setEditingTx(null) }}
          categoriesPersonal={categoriesPersonal}
          categoriesBusiness={categoriesBusiness}
          addCategory={addCategory}
        />
      )}

      {/* FAB */}
      <div className="lg:hidden fixed bottom-20 right-4 z-40">
        <button onClick={() => router.push('/registrar')}
          className="w-14 h-14 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-float text-white active:scale-95 transition-transform">
          <Mic className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
