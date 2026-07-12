'use client'
import { useState } from 'react'
import {
  TrendingUp, TrendingDown, Trash2, Calendar, X,
  Check, CheckCircle, Building2, User, Plus, Loader2, RefreshCw, CreditCard,
} from 'lucide-react'
import HelpTooltip from '@/components/shared/HelpTooltip'
import { formatCurrency, cn } from '@/lib/utils'
import { parseISO, format, addMonths, addWeeks, addYears } from 'date-fns'
import type { Transaction, Mode, CreditCard as CC, Recurrence, RecurrenceFrequency, CategoryItem } from '@/types'

const RECURRENCE_OPTIONS: { label: string; value: RecurrenceFrequency }[] = [
  { label: '🔁 Todo mês',       value: 'monthly'  },
  { label: '📅 Toda semana',    value: 'weekly'   },
  { label: '⏱ A cada 15 dias', value: 'biweekly' },
  { label: '📆 Todo ano',       value: 'yearly'   },
]

function cardNextDueDate(card: { closingDay?: number; dueDay?: number }, monthOffset = 0): string {
  if (!card.dueDay) return ''
  const today = new Date()
  let month = today.getMonth()
  let year  = today.getFullYear()
  const cutoff = card.closingDay ?? card.dueDay
  if (today.getDate() >= cutoff) month += 1
  month += monthOffset
  while (month > 11) { month -= 12; year++ }
  const d = new Date(year, month, card.dueDay)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface EditTransactionModalProps {
  tx: Transaction
  onClose: () => void
  onSave: (data: Partial<Transaction>) => Promise<void>
  onDelete: () => Promise<void>
  categoriesPersonal: CategoryItem[]
  categoriesBusiness: CategoryItem[]
  cards: CC[]
  addCategory: (name: string, mode: Mode, direction: 'income' | 'expense' | 'both') => void
  addTransaction: (t: Transaction) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  addRecurrence: (r: Recurrence) => Promise<void>
  canEdit?: boolean
  canDelete?: boolean
}

export default function EditTransactionModal({
  tx, onClose, onSave, onDelete,
  categoriesPersonal, categoriesBusiness, cards,
  addCategory, addTransaction, removeTransaction, addRecurrence,
  canEdit = true, canDelete = true,
}: EditTransactionModalProps) {
  const [description, setDescription]     = useState(tx.description)
  const [amount, setAmount]               = useState(tx.amount.toString())
  const [type, setType]                   = useState(tx.type)
  const [mode, setMode]                   = useState(tx.mode)
  const [category, setCategory]           = useState(tx.category)
  const [date, setDate]                   = useState(tx.date.split('T')[0])
  const [cardId, setCardId]               = useState<string | null>(tx.card_id ?? null)
  const [installmentCount, setInstallmentCount] = useState(1)
  const [isRecurring, setIsRecurring]     = useState(tx.is_recurring)
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFrequency>('monthly')
  const [confirmDel, setConfirmDel]       = useState(false)
  const [newCatInput, setNewCatInput]     = useState('')
  const [newCatDir, setNewCatDir]         = useState<'income' | 'expense' | 'both'>(tx.type)
  const [saving, setSaving]               = useState(false)
  const [deleting, setDeleting]           = useState(false)

  const rawCats = mode === 'business' ? categoriesBusiness : categoriesPersonal
  const cats = rawCats
    .map((c: any) => typeof c === 'string' ? { name: c, direction: 'both' } : c)
    .filter((c: any) => c.direction === 'both' || c.direction === type)
    .map((c: any) => c.name as string)

  async function handleSave() {
    const num = parseFloat(amount.replace(',', '.'))
    if (!description.trim() || isNaN(num) || num <= 0) return
    setSaving(true)
    try {
      if (installmentCount > 1 && cardId) {
        const card = cards.find(c => c.id === cardId)
        if (card?.dueDay) {
          const perAmount = Math.round((num / installmentCount) * 100) / 100
          await removeTransaction(tx.id)
          for (let i = 0; i < installmentCount; i++) {
            const dueDate = cardNextDueDate(card, i)
            await addTransaction({
              id: `${Date.now()}_p${i}_${Math.random().toString(36).slice(2)}`,
              type,
              mode,
              amount: perAmount,
              category,
              description: `${description.trim()} (${i + 1}/${installmentCount})`,
              date: dueDate + 'T00:00:00',
              is_recurring: false,
              card_id: cardId,
              profile_id: tx.profile_id,
              profile_name: tx.profile_name,
              status: 'pending',
              created_at: new Date().toISOString(),
            })
          }
          onClose()
          return
        }
      }

      let recurrenceId = tx.recurrence_id
      if (isRecurring && !tx.is_recurring) {
        const newId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`
        const txDate = parseISO(date + 'T12:00:00')
        const nextDate =
          recurrenceFreq === 'monthly'  ? addMonths(txDate, 1) :
          recurrenceFreq === 'weekly'   ? addWeeks(txDate, 1)  :
          recurrenceFreq === 'biweekly' ? addWeeks(txDate, 2)  :
          recurrenceFreq === 'yearly'   ? addYears(txDate, 1)  :
                                          addMonths(txDate, 1)
        await addRecurrence({
          id: newId,
          title: description.trim(),
          type,
          mode,
          amount: num,
          category,
          frequency: recurrenceFreq,
          next_date: format(nextDate, 'yyyy-MM-dd'),
          active: true,
          created_at: new Date().toISOString(),
        })
        recurrenceId = newId
      }

      const status = cardId ? 'pending' : 'confirmed'
      await onSave({
        description: description.trim(),
        amount: num,
        type,
        mode,
        category,
        date: date + 'T' + tx.date.split('T')[1],
        card_id: cardId ?? undefined,
        status,
        is_recurring: isRecurring,
        recurrence_id: recurrenceId,
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  function handleCreateCat() {
    const name = newCatInput.trim()
    if (!name) return
    addCategory(name, mode, newCatDir)
    setCategory(name)
    setNewCatInput('')
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-auto bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="px-5 pb-8 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-bold text-slate-800">
                {canEdit ? 'Editar lançamento' : 'Visualizar lançamento'}
              </h2>
              <HelpTooltip id="timeline.edit-modal" />
            </div>
            <div className="flex items-center gap-2">
              {canDelete && (
                <button
                  onClick={() => setConfirmDel(true)}
                  disabled={saving || deleting}
                  className="w-9 h-9 bg-expense-50 rounded-xl flex items-center justify-center hover:bg-expense-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Excluir lançamento"
                >
                  <Trash2 className="w-4 h-4 text-expense-500" />
                </button>
              )}
              <HelpTooltip id="timeline.delete" />
              <button
                onClick={onClose}
                disabled={saving || deleting}
                className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

          {!canEdit && !canDelete && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-xs text-amber-700 font-medium">
                Seu perfil não tem permissão para editar ou excluir lançamentos.
              </span>
            </div>
          )}

          {/* Confirmação de exclusão */}
          {confirmDel && (
            <div className="bg-expense-50 border-2 border-expense-200 rounded-2xl p-4 space-y-3">
              <p className="text-center text-sm font-semibold text-expense-700">Excluir este lançamento?</p>
              <p className="text-center text-xs text-expense-500">Essa ação não pode ser desfeita.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-3 bg-expense-500 text-white font-semibold rounded-2xl hover:bg-expense-600 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {deleting ? 'Excluindo…' : 'Sim, excluir'}
                </button>
                <button
                  onClick={() => setConfirmDel(false)}
                  disabled={deleting}
                  className="flex-1 py-3 bg-white text-slate-700 font-semibold rounded-2xl border-2 border-slate-200 hover:bg-slate-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Confirmar pagamento — só para transações pendentes */}
          {tx.status === 'pending' && canEdit && !confirmDel && (
            <div className="bg-income-50 border-2 border-income-200 rounded-2xl p-4 space-y-2">
              <p className="text-sm font-semibold text-income-700 text-center">💳 Fatura aguardando pagamento</p>
              <button
                onClick={async () => {
                  setSaving(true)
                  try { await onSave({ status: 'confirmed' }) }
                  finally { setSaving(false) }
                }}
                disabled={saving || deleting}
                className="w-full py-3 bg-income-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-income-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed text-sm"
              >
                <CheckCircle className="w-4 h-4" /> Confirmar pagamento
              </button>
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

          {/* Cartão / Pagamento */}
          {cards.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Forma de pagamento</label>
              <div className="space-y-1.5">
                <button
                  onClick={() => setCardId(null)}
                  className={cn('w-full px-4 py-3 rounded-2xl text-left font-semibold text-sm border-2 transition-all flex items-center gap-2',
                    !cardId ? 'bg-slate-100 border-slate-400 text-slate-800' : 'border-slate-200 text-slate-500 hover:border-slate-300')}
                >
                  💵 Dinheiro / PIX
                </button>
                {cards.map(card => (
                  <button key={card.id}
                    onClick={() => setCardId(card.id)}
                    className={cn('w-full px-4 py-3 rounded-2xl text-left font-semibold text-sm border-2 transition-all flex items-center justify-between',
                      cardId === card.id ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-slate-200 text-slate-700 hover:border-primary-300')}
                  >
                    <span className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 shrink-0" />
                      {card.name}{card.lastDigits ? ` ••${card.lastDigits}` : ''}
                    </span>
                    <span className="text-xs text-slate-400">{card.mode === 'business' ? 'Empresa' : 'Pessoal'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Data */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Data</label>
            <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border-2 border-slate-200 focus-within:border-primary-400">
              <Calendar className="w-5 h-5 text-slate-400 shrink-0" />
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="flex-1 bg-transparent text-base font-semibold text-slate-800 outline-none" />
            </div>
          </div>

          {/* Parcelas */}
          {cardId && type === 'expense' && (
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Parcelas</label>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 6, 8, 10, 12, 18, 24].map(n => (
                  <button key={n} onClick={() => setInstallmentCount(n)}
                    className={cn('py-2.5 rounded-xl text-xs font-semibold border-2 transition-all',
                      installmentCount === n ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-slate-200 text-slate-600 hover:border-primary-300')}>
                    {n === 1 ? '1x' : `${n}x`}
                  </button>
                ))}
              </div>
              {installmentCount > 1 && (
                <div className="mt-2 p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-1">
                  <p className="text-xs font-semibold text-amber-700">Parcelamento em {installmentCount}x</p>
                  <p className="text-xs text-amber-600">
                    {installmentCount}x de {formatCurrency(parseFloat(amount.replace(',', '.') || '0') / installmentCount)} · Este lançamento será substituído pelas parcelas.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Recorrência */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Recorrência
              </label>
              <button
                onClick={() => setIsRecurring(v => !v)}
                className={cn('relative w-10 h-5 rounded-full transition-colors shrink-0',
                  isRecurring ? 'bg-primary-500' : 'bg-slate-300')}
              >
                <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all',
                  isRecurring ? 'left-5' : 'left-0.5')} />
              </button>
            </div>
            {isRecurring && (
              <div className="grid grid-cols-2 gap-1.5">
                {RECURRENCE_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setRecurrenceFreq(opt.value)}
                    className={cn('py-2.5 px-3 rounded-xl border-2 text-xs font-semibold text-left transition-all',
                      recurrenceFreq === opt.value
                        ? 'bg-primary-50 border-primary-400 text-primary-700'
                        : 'border-slate-200 text-slate-600 hover:border-primary-300')}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botões */}
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving || deleting}
              className="btn-primary w-full flex items-center justify-center gap-2 text-base py-4 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Salvando…</>
                : <><Check className="w-5 h-5" /> Salvar alterações</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
