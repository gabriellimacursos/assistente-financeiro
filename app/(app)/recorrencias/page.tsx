'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  RefreshCw, TrendingUp, TrendingDown, Pause, Play, Trash2,
  Plus, Mic, X, Check, Building2, User, ChevronRight,
} from 'lucide-react'
import { useFinanceStore } from '@/lib/store/useFinanceStore'
import { formatCurrency, formatShortDate, formatDateInput, RECURRENCE_LABELS, cn } from '@/lib/utils'
import type { Recurrence, RecurrenceFrequency, Mode } from '@/types'

type ModalMode = 'create' | 'edit' | null

const RECURRENCE_FREQ: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'monthly', label: '🔁 Todo mês' },
  { value: 'weekly', label: '📅 Toda semana' },
  { value: 'biweekly', label: '⏱ A cada 15 dias' },
  { value: 'yearly', label: '📆 Todo ano' },
]

// Categories come from store — injected at runtime

function emptyRecurrence(mode: Mode): Omit<Recurrence, 'id' | 'created_at'> {
  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  nextMonth.setDate(1)
  return {
    title: '',
    type: 'expense',
    mode,
    amount: 0,
    category: 'Outros',
    frequency: 'monthly',
    next_date: formatDateInput(nextMonth),
    active: true,
  }
}

export default function RecorrenciasPage() {
  const router = useRouter()
  const { recurrences, toggleRecurrence, removeRecurrence, addRecurrence, updateRecurrence, activeMode, categoriesPersonal, categoriesBusiness } = useFinanceStore()
  // Categorias filtradas por modo e tipo do formulário atual
  const getFormCategories = (mode: Mode, type: 'income' | 'expense') => {
    const raw = mode === 'business' ? categoriesBusiness : categoriesPersonal
    const pool = raw.map((c: any) => typeof c === 'string' ? { name: c, direction: 'both' } : c)
    return pool.filter((c: any) => c.direction === 'both' || c.direction === type).map((c: any) => c.name)
  }
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editing, setEditing] = useState<Recurrence | null>(null)
  const [form, setForm] = useState<Omit<Recurrence, 'id' | 'created_at'>>(emptyRecurrence(activeMode))
  const [amountStr, setAmountStr] = useState('')
  const [saving, setSaving] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)
  const [cardError, setCardError] = useState<string | null>(null)

  function openCreate() {
    const base = emptyRecurrence(activeMode)
    setForm(base)
    setAmountStr('')
    setEditing(null)
    setModalMode('create')
  }

  function openEdit(r: Recurrence) {
    setForm({
      title: r.title, type: r.type, mode: r.mode,
      amount: r.amount, category: r.category,
      frequency: r.frequency, next_date: r.next_date, active: r.active,
    })
    setAmountStr(r.amount.toString())
    setEditing(r)
    setModalMode('edit')
  }

  function closeModal() {
    setModalMode(null)
    setEditing(null)
    setDbError(null)
  }

  async function handleSave() {
    const amount = parseFloat(amountStr.replace(',', '.'))
    if (!form.title.trim() || isNaN(amount) || amount <= 0) return

    const data = { ...form, amount }

    setSaving(true)
    setDbError(null)
    try {
      if (modalMode === 'edit' && editing) {
        await updateRecurrence(editing.id, data)
      } else {
        await addRecurrence({
          ...data,
          id: '',
          active: true,
          created_at: new Date().toISOString(),
        })
      }
      closeModal()
    } catch {
      setDbError('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const active = recurrences.filter(r => r.active)
  const paused = recurrences.filter(r => !r.active)

  const totalMonthlyExpense = active
    .filter(r => r.type === 'expense' && r.frequency === 'monthly')
    .reduce((s, r) => s + r.amount, 0)
  const totalMonthlyIncome = active
    .filter(r => r.type === 'income' && r.frequency === 'monthly')
    .reduce((s, r) => s + r.amount, 0)

  return (
    <div className="max-w-2xl mx-auto p-4 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Recorrências</h1>
          <p className="text-slate-500 text-sm">Pagamentos e recebimentos fixos</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 btn-primary px-4 py-2.5 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nova</span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs text-slate-400 font-medium mb-1">Entradas fixas/mês</p>
          <p className="text-xl font-bold text-income-500">{formatCurrency(totalMonthlyIncome)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400 font-medium mb-1">Saídas fixas/mês</p>
          <p className="text-xl font-bold text-expense-500">{formatCurrency(totalMonthlyExpense)}</p>
        </div>
      </div>

      {/* Card-level error */}
      {cardError && (
        <div className="flex items-center justify-between bg-expense-50 border border-expense-200 text-expense-700 text-sm rounded-2xl px-4 py-3">
          <span>{cardError}</span>
          <button onClick={() => setCardError(null)} className="ml-3 text-expense-500 hover:text-expense-700 font-bold">✕</button>
        </div>
      )}

      {/* Active */}
      {active.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ativas ({active.length})</p>
          <div className="space-y-2">
            {active.map(r => (
              <RecurrenceCard key={r.id} recurrence={r}
                onEdit={() => openEdit(r)}
                onToggle={async () => { try { await toggleRecurrence(r.id) } catch { setCardError('Erro ao alterar recorrência. Tente novamente.') } }}
                onDelete={() => setConfirmDelete(r.id)}
                confirmDelete={confirmDelete === r.id}
                onConfirmDelete={async () => { try { await removeRecurrence(r.id); setConfirmDelete(null) } catch { setCardError('Erro ao remover. Tente novamente.') } }}
                onCancelDelete={() => setConfirmDelete(null)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Paused */}
      {paused.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pausadas ({paused.length})</p>
          <div className="space-y-2 opacity-60">
            {paused.map(r => (
              <RecurrenceCard key={r.id} recurrence={r}
                onEdit={() => openEdit(r)}
                onToggle={async () => { try { await toggleRecurrence(r.id) } catch { setCardError('Erro ao alterar recorrência. Tente novamente.') } }}
                onDelete={() => setConfirmDelete(r.id)}
                confirmDelete={confirmDelete === r.id}
                onConfirmDelete={async () => { try { await removeRecurrence(r.id); setConfirmDelete(null) } catch { setCardError('Erro ao remover. Tente novamente.') } }}
                onCancelDelete={() => setConfirmDelete(null)}
              />
            ))}
          </div>
        </div>
      )}

      {recurrences.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🔄</div>
          <p className="text-slate-500 font-medium mb-1">Nenhuma recorrência ainda</p>
          <p className="text-slate-400 text-sm mb-5">Crie manualmente ou registre um gasto recorrente por voz</p>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 mx-auto">
            <Plus className="w-4 h-4" /> Criar agora
          </button>
        </div>
      )}

      {/* FAB mobile */}
      <div className="lg:hidden fixed bottom-20 right-4 z-[55]">
        <button onClick={openCreate}
          className="w-14 h-14 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-float text-white active:scale-95 transition-transform">
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* ── Modal criar / editar ── */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end lg:items-center lg:justify-center" onClick={closeModal}>
          <div
            className="w-full lg:max-w-md bg-white rounded-t-3xl lg:rounded-3xl p-6 pb-10 lg:pb-6 space-y-4 max-h-[90vh] overflow-y-auto animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                {modalMode === 'create' ? 'Nova recorrência' : 'Editar recorrência'}
              </h2>
              <button onClick={closeModal} className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Nome */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Nome</label>
              <input
                autoFocus
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Aluguel, Netflix, Academia…"
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-white text-sm outline-none focus:border-primary-400 transition-all"
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setForm(f => ({ ...f, type: 'expense' }))}
                  className={cn('py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 border-2 transition-all',
                    form.type === 'expense' ? 'bg-expense-50 border-expense-400 text-expense-600' : 'border-slate-200 text-slate-400')}>
                  <TrendingDown className="w-4 h-4" /> Saída
                </button>
                <button onClick={() => setForm(f => ({ ...f, type: 'income' }))}
                  className={cn('py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 border-2 transition-all',
                    form.type === 'income' ? 'bg-income-50 border-income-400 text-income-600' : 'border-slate-200 text-slate-400')}>
                  <TrendingUp className="w-4 h-4" /> Entrada
                </button>
              </div>
            </div>

            {/* Valor */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Valor</label>
              <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-4 py-3 border-2 border-slate-200 focus-within:border-primary-400">
                <span className="text-slate-400 font-semibold text-sm">R$</span>
                <input
                  type="number"
                  value={amountStr}
                  onChange={e => setAmountStr(e.target.value)}
                  placeholder="0,00"
                  className="flex-1 bg-transparent text-xl font-bold text-slate-800 outline-none"
                />
              </div>
            </div>

            {/* Modo */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Conta</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setForm(f => ({ ...f, mode: 'business' }))}
                  className={cn('py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 border-2 transition-all',
                    form.mode === 'business' ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-slate-200 text-slate-400')}>
                  <Building2 className="w-4 h-4" /> Empresa
                </button>
                <button onClick={() => setForm(f => ({ ...f, mode: 'personal' }))}
                  className={cn('py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 border-2 transition-all',
                    form.mode === 'personal' ? 'bg-slate-100 border-slate-400 text-slate-700' : 'border-slate-200 text-slate-400')}>
                  <User className="w-4 h-4" /> Pessoal
                </button>
              </div>
            </div>

            {/* Frequência */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Frequência</label>
              <div className="grid grid-cols-2 gap-2">
                {RECURRENCE_FREQ.map(f => (
                  <button key={f.value} onClick={() => setForm(fm => ({ ...fm, frequency: f.value }))}
                    className={cn('py-3 px-3 rounded-2xl text-sm font-semibold border-2 transition-all text-left',
                      form.frequency === f.value ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-slate-200 text-slate-600 hover:border-primary-300')}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Categoria */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Categoria</label>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {getFormCategories(form.mode, form.type).map(cat => (
                  <button key={cat} onClick={() => setForm(f => ({ ...f, category: cat }))}
                    className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all',
                      form.category === cat ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-slate-200 text-slate-600 hover:border-primary-300')}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Próxima data */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Próxima data</label>
              <input type="date" value={form.next_date}
                onChange={e => setForm(f => ({ ...f, next_date: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-white text-sm font-semibold outline-none focus:border-primary-400 transition-all" />
            </div>

            {/* DB error */}
            {dbError && (
              <div className="flex items-center justify-between bg-expense-50 border border-expense-200 text-expense-700 text-sm rounded-2xl px-4 py-3">
                <span>{dbError}</span>
                <button onClick={() => setDbError(null)} className="ml-3 text-expense-500 hover:text-expense-700 font-bold">✕</button>
              </div>
            )}

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim() || !amountStr || parseFloat(amountStr) <= 0}
              className="btn-primary w-full flex items-center justify-center gap-2 text-base py-4"
            >
              <Check className="w-5 h-5" />
              {saving ? 'Salvando...' : modalMode === 'create' ? 'Criar recorrência' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RecurrenceCard({ recurrence: r, onEdit, onToggle, onDelete, confirmDelete, onConfirmDelete, onCancelDelete }: {
  recurrence: Recurrence
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  confirmDelete: boolean
  onConfirmDelete: () => void
  onCancelDelete: () => void
}) {
  return (
    <div className="card p-4 flex items-center gap-3 group hover:shadow-card-hover transition-all">
      <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center shrink-0',
        r.type === 'income' ? 'bg-income-50' : 'bg-expense-50')}>
        {r.type === 'income'
          ? <TrendingUp className="w-5 h-5 text-income-500" />
          : <TrendingDown className="w-5 h-5 text-expense-500" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{r.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-slate-400">{RECURRENCE_LABELS[r.frequency]}</span>
          <span className="text-xs text-slate-300">·</span>
          <span className="text-xs text-slate-400">Próx: {formatShortDate(r.next_date)}</span>
          <span className="text-xs text-slate-300">·</span>
          <span className={cn('text-xs font-medium', r.mode === 'business' ? 'text-primary-500' : 'text-slate-500')}>
            {r.mode === 'business' ? 'Empresa' : 'Pessoal'}
          </span>
        </div>
      </div>

      <p className={cn('font-bold text-base shrink-0', r.type === 'income' ? 'text-income-500' : 'text-expense-500')}>
        {formatCurrency(r.amount)}
      </p>

      {confirmDelete ? (
        <div className="flex gap-1 shrink-0">
          <button onClick={onConfirmDelete} className="w-8 h-8 bg-expense-500 rounded-xl flex items-center justify-center">
            <Trash2 className="w-4 h-4 text-white" />
          </button>
          <button onClick={onCancelDelete} className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs font-bold">✕</button>
        </div>
      ) : (
        <div className="flex gap-1 shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit}
            className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-primary-50 transition-colors text-slate-400 hover:text-primary-500 text-xs font-bold">
            ✎
          </button>
          <button onClick={onToggle}
            className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-primary-50 transition-colors">
            {r.active ? <Pause className="w-4 h-4 text-slate-500" /> : <Play className="w-4 h-4 text-primary-500" />}
          </button>
          <button onClick={onDelete}
            className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-expense-50 transition-colors">
            <Trash2 className="w-4 h-4 text-slate-400 hover:text-expense-400" />
          </button>
        </div>
      )}
    </div>
  )
}
