'use client'
import { useState, useMemo } from 'react'
import {
  Plus, X, Check, TrendingUp, TrendingDown, CreditCard,
  Building2, User, Trash2, Edit2, ChevronLeft, CheckCircle, BarChart2, Pencil,
} from 'lucide-react'
import { useFinanceStore, getProfilePermissions } from '@/lib/store/useFinanceStore'
import { formatCurrency, formatTime, cn } from '@/lib/utils'
import HelpTooltip from '@/components/shared/HelpTooltip'
import ErrorBanner from '@/components/shared/ErrorBanner'
import EditTransactionModal from '@/components/shared/EditTransactionModal'
import { formatError } from '@/lib/errors'
import type { ErrorCode } from '@/lib/errors'
import type { CreditCard as CC, Mode, Transaction } from '@/types'
import { isSameMonth, subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from 'recharts'

const CARD_COLORS = [
  { label: 'Roxo', value: 'from-purple-600 to-indigo-700' },
  { label: 'Verde', value: 'from-emerald-500 to-teal-700' },
  { label: 'Azul', value: 'from-blue-500 to-cyan-700' },
  { label: 'Rosa', value: 'from-pink-500 to-rose-700' },
  { label: 'Laranja', value: 'from-orange-500 to-amber-600' },
  { label: 'Cinza', value: 'from-slate-600 to-slate-800' },
  { label: 'Ouro', value: 'from-yellow-500 to-amber-700' },
  { label: 'Vermelho', value: 'from-red-500 to-rose-700' },
]

const CATEGORY_COLORS = ['#6366F1', '#10B981', '#F43F5E', '#F59E0B', '#06B6D4', '#8B5CF6', '#EC4899']

function emptyCard(mode: Mode): Omit<CC, 'id' | 'created_at'> {
  return { name: '', lastDigits: '', mode, color: CARD_COLORS[0].value, active: true }
}

export default function CartoesPage() {
  const {
    cards, addCard, updateCard, removeCard,
    transactions, updateTransaction, addTransaction, removeTransaction,
    addCategory, addRecurrence,
    categoriesPersonal, categoriesBusiness,
    activeMode, profiles, activeProfileId,
  } = useFinanceStore()
  const perms = getProfilePermissions(profiles, activeProfileId)
  const canManage = perms.canManageCards
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingCard, setEditingCard] = useState<CC | null>(null)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [form, setForm] = useState<Omit<CC, 'id' | 'created_at'>>(emptyCard(activeMode))
  const [limitStr, setLimitStr] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [appError, setAppError] = useState<{ title: string; description: string; action: string; code?: ErrorCode; severity: 'error' | 'warning' } | null>(null)
  const [payAllLoading, setPayAllLoading] = useState(false)
  const [paySuccess, setPaySuccess] = useState(false)
  const [individuallyPaid, setIndividuallyPaid] = useState<Set<string>>(new Set())

  const now = new Date()

  // Spending per card this month
  const spendingByCard = useMemo(() => {
    const map: Record<string, number> = {}
    transactions.forEach(t => {
      if (t.card_id && t.type === 'expense' && isSameMonth(new Date(t.date), now)) {
        map[t.card_id] = (map[t.card_id] || 0) + t.amount
      }
    })
    return map
  }, [transactions])

  // Transactions for selected card
  const cardTransactions = useMemo(() => {
    if (!selectedCard) return []
    return transactions
      .filter(t => t.card_id === selectedCard)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [selectedCard, transactions])

  const selectedCardData = cards.find(c => c.id === selectedCard)

  function openCreate() {
    setForm(emptyCard(activeMode))
    setLimitStr('')
    setEditingCard(null)
    setShowModal(true)
  }

  function openEdit(card: CC) {
    setForm({ name: card.name, lastDigits: card.lastDigits, mode: card.mode, color: card.color, limit: card.limit, closingDay: card.closingDay, dueDay: card.dueDay, active: card.active })
    setLimitStr(card.limit?.toString() || '')
    setEditingCard(card)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    setAppError(null)
    const limit = limitStr ? parseFloat(limitStr) : undefined
    const data = { ...form, limit, lastDigits: form.lastDigits.slice(-4) }
    try {
      if (editingCard) {
        await updateCard(editingCard.id, data)
      } else {
        await addCard({ ...data, id: '', active: true, created_at: new Date().toISOString() })
      }
      setShowModal(false)
    } catch (err) {
      setAppError(formatError(err))
    } finally {
      setSaving(false)
    }
  }

  // ── Card detail view ──────────────────────────────────────────────────────
  if (selectedCard && selectedCardData) {
    // Total this month (pending + confirmed) — same as card list
    const spent = spendingByCard[selectedCard] || 0
    const pct = selectedCardData.limit ? Math.min(100, (spent / selectedCardData.limit) * 100) : null

    // Pending transactions (fatura em aberto) — all dates
    const pendingTx = cardTransactions.filter(t => t.type === 'expense' && t.status === 'pending')

    // Confirmed spend this month
    const confirmedSpent = cardTransactions
      .filter(t => t.type === 'expense' && t.status === 'confirmed' && isSameMonth(new Date(t.date), now))
      .reduce((s, t) => s + t.amount, 0)

    // Pending total
    const pendingTotal = pendingTx.reduce((s, t) => s + t.amount, 0)

    // Average last 6 months
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i)
      const monthTxs = cardTransactions.filter(t =>
        t.type === 'expense' && isSameMonth(new Date(t.date), d)
      )
      return {
        label: format(d, 'MMM/yy', { locale: ptBR }),
        total: monthTxs.reduce((s, t) => s + t.amount, 0),
        isCurrentMonth: isSameMonth(d, now),
      }
    })
    const avg6 = last6Months.reduce((s, m) => s + m.total, 0) / 6

    // Due date calculation
    let currentDueDate: Date | null = null
    let daysUntilDue: number | null = null
    if (selectedCardData.dueDay) {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const cutoff = selectedCardData.closingDay ?? selectedCardData.dueDay
      let month = today.getMonth()
      let year = today.getFullYear()
      if (today.getDate() >= cutoff) month += 1
      while (month > 11) { month -= 12; year++ }
      currentDueDate = new Date(year, month, selectedCardData.dueDay)
      currentDueDate.setHours(0, 0, 0, 0)
      daysUntilDue = Math.ceil((currentDueDate.getTime() - today.getTime()) / 86400000)
    }

    // Remaining to pay (pending and not yet individually paid)
    const remainingToPayTx = pendingTx.filter(t => !individuallyPaid.has(t.id))
    const remainingTotal = remainingToPayTx.reduce((s, t) => s + t.amount, 0)

    // Category breakdown for this card (this month)
    const catBreakdown = cardTransactions
      .filter(t => t.type === 'expense' && isSameMonth(new Date(t.date), now))
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount
        return acc
      }, {} as Record<string, number>)
    const catList = Object.entries(catBreakdown).sort((a, b) => b[1] - a[1])

    // Previous 3 months (excluding current)
    const prevMonths = Array.from({ length: 3 }, (_, i) => {
      const d = subMonths(now, 3 - i)
      const monthTxs = cardTransactions.filter(t =>
        t.type === 'expense' && isSameMonth(new Date(t.date), d)
      )
      return {
        label: format(d, 'MMMM/yy', { locale: ptBR }),
        total: monthTxs.reduce((s, t) => s + t.amount, 0),
      }
    })

    const handlePayAll = async () => {
      setPayAllLoading(true)
      try {
        const toPayIds = pendingTx.filter(t => !individuallyPaid.has(t.id)).map(t => t.id)
        await Promise.all(toPayIds.map(id => updateTransaction(id, { status: 'confirmed' })))
        setPaySuccess(true)
        setIndividuallyPaid(new Set())
        setTimeout(() => setPaySuccess(false), 3000)
      } catch (err) {
        setAppError(formatError(err))
      } finally {
        setPayAllLoading(false)
      }
    }

    const handlePayItem = async (txId: string) => {
      try {
        await updateTransaction(txId, { status: 'confirmed' })
        setIndividuallyPaid(prev => new Set(prev).add(txId))
      } catch (err) {
        setAppError(formatError(err))
      }
    }

    return (
      <>
      <div className="max-w-2xl mx-auto p-4 lg:p-8 space-y-5">
        {/* Back */}
        <button
          onClick={() => { setSelectedCard(null); setIndividuallyPaid(new Set()); setPaySuccess(false) }}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-medium text-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Todos os cartões
        </button>

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

        {/* Card visual */}
        <div className={cn('rounded-3xl p-6 text-white relative overflow-hidden bg-gradient-to-br', selectedCardData.color)}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-white/70 text-xs font-medium">{selectedCardData.mode === 'business' ? '🏢 Empresa' : '👤 Pessoal'}</p>
                <p className="text-xl font-bold mt-0.5">{selectedCardData.name}</p>
              </div>
              <CreditCard className="w-8 h-8 text-white/60" />
            </div>
            <p className="text-white/60 text-sm font-mono tracking-widest">•••• •••• •••• {selectedCardData.lastDigits || '????'}</p>
            {selectedCardData.closingDay && (
              <p className="text-white/50 text-xs mt-3">Fecha dia {selectedCardData.closingDay} · Vence dia {selectedCardData.dueDay}</p>
            )}
          </div>
        </div>

        {/* 3 quick metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4 text-center space-y-1">
            <p className="text-xs text-slate-500 font-medium">Confirmado</p>
            <p className="text-base font-bold text-expense-500 leading-tight">{formatCurrency(confirmedSpent)}</p>
          </div>
          <div className={cn('card p-4 text-center space-y-1', pendingTotal > 0 && 'border-amber-300 bg-amber-50')}>
            <p className="text-xs text-slate-500 font-medium">A pagar</p>
            <p className={cn('text-base font-bold leading-tight', pendingTotal > 0 ? 'text-amber-500' : 'text-slate-400')}>
              {formatCurrency(pendingTotal)}
            </p>
          </div>
          <div className="card p-4 text-center space-y-1">
            <p className="text-xs text-slate-500 font-medium">Média/mês</p>
            <p className="text-base font-bold text-slate-700 leading-tight">{formatCurrency(avg6)}</p>
          </div>
        </div>

        {/* Spending bar */}
        {pct !== null && (
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-600">Uso do limite</p>
              <p className={cn('text-xl font-bold', pct > 80 ? 'text-expense-500' : pct > 50 ? 'text-amber-500' : 'text-income-500')}>
                {pct.toFixed(0)}%
              </p>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', pct > 80 ? 'bg-expense-500' : pct > 50 ? 'bg-amber-400' : 'bg-income-500')}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Gasto: {formatCurrency(spent)}</span>
              <span>Limite: {formatCurrency(selectedCardData.limit!)}</span>
            </div>
          </div>
        )}

        {/* Fatura em aberto */}
        {paySuccess ? (
          <div className="card p-5 flex items-center gap-3 bg-income-50 border-income-200">
            <CheckCircle className="w-6 h-6 text-income-500 shrink-0" />
            <div>
              <p className="font-semibold text-income-700">Fatura paga!</p>
              <p className="text-sm text-income-600">Saldo atualizado com sucesso.</p>
            </div>
          </div>
        ) : pendingTx.length > 0 && (
          <div className="card p-5 space-y-4 border-amber-200">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">Fatura em aberto</p>
                {currentDueDate && daysUntilDue !== null && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Vence {format(currentDueDate, "dd 'de' MMMM", { locale: ptBR })}
                    {daysUntilDue === 0 ? ' — hoje!' : daysUntilDue === 1 ? ' — amanhã' : ` — em ${daysUntilDue} dias`}
                  </p>
                )}
              </div>
              <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full">
                {formatCurrency(remainingTotal)}
              </span>
            </div>

            {/* Pending items */}
            <div className="space-y-2">
              {pendingTx.map(t => {
                const paid = individuallyPaid.has(t.id)
                return (
                  <button
                    key={t.id}
                    onClick={() => !paid && handlePayItem(t.id)}
                    disabled={paid}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                      paid
                        ? 'border-income-200 bg-income-50 opacity-60'
                        : 'border-slate-200 hover:border-amber-300 active:scale-[0.99]'
                    )}
                  >
                    <div className={cn(
                      'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                      paid ? 'border-income-400 bg-income-400' : 'border-slate-300'
                    )}>
                      {paid && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-semibold truncate', paid ? 'line-through text-slate-400' : 'text-slate-800')}>
                        {t.description}
                      </p>
                      <p className="text-xs text-slate-400">{formatTime(t.date)} · {t.category}</p>
                    </div>
                    <span className={cn('font-bold text-sm shrink-0', paid ? 'text-slate-400' : 'text-expense-500')}>
                      {formatCurrency(t.amount)}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Pay all button or done state */}
            {remainingToPayTx.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-3 text-income-600 font-semibold text-sm">
                <CheckCircle className="w-5 h-5" />
                Tudo confirmado!
              </div>
            ) : (
              <button
                onClick={handlePayAll}
                disabled={payAllLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-income-500 text-white font-bold text-sm hover:bg-income-600 active:scale-[0.99] transition-all disabled:opacity-60"
              >
                <CheckCircle className="w-4 h-4" />
                {payAllLoading ? 'Processando...' : `Paguei tudo — ${formatCurrency(remainingTotal)}`}
              </button>
            )}
          </div>
        )}

        {/* Gráfico últimos 6 meses */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">Gastos — últimos 6 meses</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={last6Months} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Gasto']}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 13 }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Bar
                dataKey="total"
                radius={[6, 6, 0, 0]}
                fill="#6366F1"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Histórico de faturas — últimas 3 */}
        <div className="card p-5 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Histórico de faturas</p>
          {prevMonths.every(m => m.total === 0) ? (
            <p className="text-xs text-slate-400">Sem faturas anteriores registradas.</p>
          ) : (
            <div className="space-y-2">
              {prevMonths.map((m, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <p className="text-sm text-slate-600 capitalize">{m.label}</p>
                  <p className={cn('text-sm font-bold', m.total > 0 ? 'text-expense-500' : 'text-slate-400')}>
                    {formatCurrency(m.total)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category breakdown */}
        {catList.length > 0 && (
          <div className="card p-5">
            <p className="text-sm font-semibold text-slate-700 mb-3">Por categoria — este mês</p>
            <div className="space-y-2.5">
              {catList.map(([cat, amt], i) => {
                const pctCat = spent > 0 ? (amt / spent) * 100 : 0
                const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length]
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">{cat}</span>
                        <span className="font-bold text-slate-600 text-xs">{pctCat.toFixed(0)}% · {formatCurrency(amt)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pctCat}%`, background: color }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Transaction list */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Todos os lançamentos</p>
          {cardTransactions.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-slate-400 text-sm">Nenhum lançamento vinculado a este cartão ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cardTransactions.map(t => (
                <button
                  key={t.id}
                  onClick={() => setEditingTx(t)}
                  className="card p-3.5 flex items-center gap-3 w-full text-left hover:shadow-card-hover transition-all active:scale-[0.99] group"
                >
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                    t.type === 'income' ? 'bg-income-50' : 'bg-expense-50')}>
                    {t.type === 'income' ? <TrendingUp className="w-4 h-4 text-income-500" /> : <TrendingDown className="w-4 h-4 text-expense-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{t.description}</p>
                    <div className="flex gap-1.5 text-xs text-slate-400 flex-wrap">
                      <span>{formatTime(t.date)}</span>
                      <span>·</span>
                      <span>{t.category}</span>
                      {t.status === 'pending' && (
                        <>
                          <span>·</span>
                          <span className="text-amber-500 font-semibold">A pagar</span>
                        </>
                      )}
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
          )}
        </div>
      </div>

      {/* Edit transaction modal */}
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
      </>
    )
  }

  // ── Card list ─────────────────────────────────────────────────────────────
  const totalSpentCards = Object.values(spendingByCard).reduce((s, v) => s + v, 0)

  return (
    <div className="max-w-2xl mx-auto p-4 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-bold text-slate-800">Cartões</h1>
            <HelpTooltip id="cartoes.list" />
          </div>
          <p className="text-slate-500 text-sm">Controle por cartão de crédito</p>
        </div>
        {canManage && (
          <button onClick={openCreate} className="flex items-center gap-2 btn-primary px-4 py-2.5 text-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo cartão</span>
          </button>
        )}
      </div>

      {/* Total this month */}
      {cards.length > 0 && (
        <div className="card p-5 bg-gradient-to-br from-slate-700 to-slate-900 text-white">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Total nos cartões este mês</p>
            <HelpTooltip id="cartoes.total" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalSpentCards)}</p>
          <p className="text-white/50 text-xs mt-1">{cards.filter(c => c.active).length} cartões ativos</p>
        </div>
      )}

      {/* Card list */}
      {cards.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">💳</div>
          <p className="text-slate-500 font-medium mb-1">Nenhum cartão ainda</p>
          <p className="text-slate-400 text-sm mb-5">Adicione seus cartões para controlar os gastos por cartão</p>
          {canManage && (
            <button onClick={openCreate} className="btn-primary flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" /> Adicionar cartão
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map(card => {
            const spent = spendingByCard[card.id] || 0
            const pct = card.limit ? Math.min(100, (spent / card.limit) * 100) : null
            return (
              <div key={card.id} className={cn('relative group', !card.active && 'opacity-50')}>
                {/* Card visual — clicável */}
                <button
                  onClick={() => setSelectedCard(card.id)}
                  className={cn('w-full text-left rounded-2xl p-5 text-white relative overflow-hidden bg-gradient-to-br transition-transform active:scale-[0.99] hover:shadow-card-lg', card.color)}
                >
                  <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3" />
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-bold text-lg">{card.name}</p>
                          <span className="text-white/60 text-xs bg-white/15 px-2 py-0.5 rounded-full">
                            {card.mode === 'business' ? 'Empresa' : 'Pessoal'}
                          </span>
                        </div>
                        {card.lastDigits && (
                          <p className="text-white/50 text-sm font-mono">•••• {card.lastDigits}</p>
                        )}
                      </div>
                      <CreditCard className="w-7 h-7 text-white/40" />
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-white/60 text-xs mb-0.5">Gasto este mês</p>
                        <p className="text-2xl font-bold">{formatCurrency(spent)}</p>
                      </div>
                      {card.limit && (
                        <p className="text-white/50 text-xs">Limite {formatCurrency(card.limit)}</p>
                      )}
                    </div>

                    {pct !== null && (
                      <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', pct > 80 ? 'bg-red-300' : 'bg-white/70')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                </button>

                {/* Action buttons */}
                {canManage && <div className="absolute top-3 right-3 flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-10">
                  <button onClick={e => { e.stopPropagation(); openEdit(card) }}
                    className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors">
                    <Edit2 className="w-3.5 h-3.5 text-white" />
                  </button>
                  {confirmDelete === card.id ? (
                    <>
                      <button onClick={async e => {
                        e.stopPropagation()
                        setSaving(true)
                        setAppError(null)
                        try {
                          await removeCard(card.id)
                          setConfirmDelete(null)
                        } catch (err) {
                          setAppError(formatError(err))
                          setConfirmDelete(null)
                        } finally {
                          setSaving(false)
                        }
                      }}
                        disabled={saving}
                        className="w-8 h-8 bg-expense-500 rounded-lg flex items-center justify-center disabled:opacity-60">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setConfirmDelete(null) }}
                        className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    </>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); setConfirmDelete(card.id) }}
                      className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-red-500/60 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  )}
                </div>}
              </div>
            )
          })}
        </div>
      )}

      {/* FAB mobile */}
      {canManage && (
        <div className="lg:hidden fixed bottom-20 right-4 z-[55]">
          <button onClick={openCreate}
            className="w-14 h-14 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-float text-white active:scale-95 transition-transform">
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* ── Modal add/edit card ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end lg:items-center lg:justify-center" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-lg mx-auto lg:max-w-md bg-white rounded-t-3xl lg:rounded-3xl p-6 pb-28 lg:pb-6 space-y-4 max-h-[90vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">{editingCard ? 'Editar cartão' : 'Novo cartão'}</h2>
              <button onClick={() => setShowModal(false)} className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Preview mini */}
            <div className={cn('rounded-2xl p-4 bg-gradient-to-br text-white text-center font-bold', form.color)}>
              {form.name || 'Nome do cartão'} {form.lastDigits ? `•••• ${form.lastDigits.slice(-4)}` : ''}
            </div>

            {/* Nome */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Nome do cartão</label>
              <input autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Nubank, Inter, Bradesco…"
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 transition-all" />
            </div>

            {/* Últimos 4 dígitos */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Últimos 4 dígitos (opcional)</label>
              <input value={form.lastDigits} onChange={e => setForm(f => ({ ...f, lastDigits: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                placeholder="1234" maxLength={4}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 text-sm font-mono outline-none focus:border-primary-400 transition-all" />
            </div>

            {/* Conta */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Conta</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setForm(f => ({ ...f, mode: 'personal' }))}
                  className={cn('py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 border-2 transition-all',
                    form.mode === 'personal' ? 'bg-slate-100 border-slate-400 text-slate-700' : 'border-slate-200 text-slate-400')}>
                  <User className="w-4 h-4" /> Pessoal
                </button>
                <button onClick={() => setForm(f => ({ ...f, mode: 'business' }))}
                  className={cn('py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 border-2 transition-all',
                    form.mode === 'business' ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-slate-200 text-slate-400')}>
                  <Building2 className="w-4 h-4" /> Empresa
                </button>
              </div>
            </div>

            {/* Cor */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {CARD_COLORS.map(c => (
                  <button key={c.value} onClick={() => setForm(f => ({ ...f, color: c.value }))}
                    className={cn('w-9 h-9 rounded-xl bg-gradient-to-br transition-all', c.value,
                      form.color === c.value ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : 'hover:scale-105')} />
                ))}
              </div>
            </div>

            {/* Limite (opcional) */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Limite (opcional)</label>
                <HelpTooltip id="cartoes.spending-bar" />
              </div>
              <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-4 py-3 border-2 border-slate-200 focus-within:border-primary-400">
                <span className="text-slate-400 text-sm font-semibold">R$</span>
                <input type="number" value={limitStr} onChange={e => setLimitStr(e.target.value)}
                  placeholder="0" className="flex-1 bg-transparent text-base font-bold text-slate-800 outline-none" />
              </div>
            </div>

            {/* Datas de fechamento/vencimento */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fecha dia</label>
                  <HelpTooltip id="cartoes.closing-day" />
                </div>
                <input type="number" min={1} max={31}
                  value={form.closingDay || ''} onChange={e => setForm(f => ({ ...f, closingDay: parseInt(e.target.value) || undefined }))}
                  placeholder="Ex: 3"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 transition-all" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vence dia</label>
                  <HelpTooltip id="cartoes.due-day" />
                </div>
                <input type="number" min={1} max={31}
                  value={form.dueDay || ''} onChange={e => setForm(f => ({ ...f, dueDay: parseInt(e.target.value) || undefined }))}
                  placeholder="Ex: 10"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 transition-all" />
              </div>
            </div>

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

            <button onClick={handleSave} disabled={!form.name.trim() || saving}
              className="btn-primary w-full flex items-center justify-center gap-2 text-base py-4 disabled:opacity-60">
              <Check className="w-5 h-5" />
              {saving ? 'Salvando...' : editingCard ? 'Salvar alterações' : 'Criar cartão'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
