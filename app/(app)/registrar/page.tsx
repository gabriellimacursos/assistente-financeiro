'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Mic, MicOff, Check, X, RefreshCw, Building2, User,
  ChevronRight, TrendingUp, TrendingDown, DollarSign, Send, Calendar, CreditCard, ArrowLeftRight, Lock,
} from 'lucide-react'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { interpretFinancialInput, getCategoryOptions } from '@/lib/ai/interpreter'
import { useFinanceStore, getProfilePermissions } from '@/lib/store/useFinanceStore'
import { formatCurrency, formatShortDate, formatDateInput, cn } from '@/lib/utils'
import HelpTooltip from '@/components/shared/HelpTooltip'
import ErrorBanner from '@/components/shared/ErrorBanner'
import { formatError } from '@/lib/errors'
import type { ErrorCode } from '@/lib/errors'
import type { AIInterpretation, Transaction, RecurrenceFrequency, Mode } from '@/types'
import { format, parseISO, addMonths, addWeeks, addYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Step = 'idle' | 'listening' | 'processing' | 'clarifying' | 'confirming' | 'recurrence' | 'saved' | 'transfer'
type TransferDir = 'biz-to-personal' | 'personal-to-biz'
type EditField = 'type' | 'category' | 'amount' | 'mode' | 'date' | 'card' | 'installments' | null

function cardNextDueDate(card: { closingDay?: number; dueDay?: number }, monthOffset = 0): string {
  if (!card.dueDay) return ''
  const today = new Date()
  let month = today.getMonth()
  let year = today.getFullYear()
  const cutoff = card.closingDay ?? card.dueDay
  if (today.getDate() >= cutoff) month += 1
  month += monthOffset
  while (month > 11) { month -= 12; year++ }
  const d = new Date(year, month, card.dueDay)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}


const RECURRENCE_OPTIONS: { label: string; value: RecurrenceFrequency | 'none' }[] = [
  { label: '🔁 Todo mês', value: 'monthly' },
  { label: '📅 Toda semana', value: 'weekly' },
  { label: '⏱ A cada 15 dias', value: 'biweekly' },
  { label: '📆 Todo ano', value: 'yearly' },
  { label: '❌ Não', value: 'none' },
]

export default function RegistrarPage() {
  const { activeMode, setActiveMode, addTransaction, addRecurrence, addCategory, transactions, categoriesPersonal, categoriesBusiness, cards, profiles, activeProfileId } = useFinanceStore()
  const userCategories = { personal: categoriesPersonal, business: categoriesBusiness }
  const activeProfile = profiles.find(p => p.id === activeProfileId)
  const perms = getProfilePermissions(profiles, activeProfileId)
  const voice = useVoiceRecorder()

  const [step, setStep] = useState<Step>('idle')
  const [textInput, setTextInput] = useState('')
  const [interpretation, setInterpretation] = useState<AIInterpretation | null>(null)
  const [pendingText, setPendingText] = useState('')
  const [recurrenceChoice, setRecurrenceChoice] = useState<RecurrenceFrequency | 'none' | null>(null)
  const [editField, setEditField] = useState<EditField>(null)
  const [editAmount, setEditAmount] = useState('')
  const [clarificationInput, setClarificationInput] = useState('')
  const [selectedDate, setSelectedDate] = useState(formatDateInput())
  const [transferDir, setTransferDir] = useState<TransferDir>('biz-to-personal')
  const [transferAmount, setTransferAmount] = useState('')
  const [newCatInput, setNewCatInput] = useState('')
  const [newCatDirection, setNewCatDirection] = useState<'income' | 'expense' | 'both'>('both')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [installmentCount, setInstallmentCount] = useState(1)
  const [appError, setAppError] = useState<{ title: string; description: string; action: string; code?: ErrorCode; severity: 'error' | 'warning' } | null>(null)

  // Auto-set date to card due date when card is selected
  useEffect(() => {
    if (!selectedCardId) { setInstallmentCount(1); return }
    const card = cards.find(c => c.id === selectedCardId)
    if (!card?.dueDay) return
    const due = cardNextDueDate(card)
    if (due) setSelectedDate(due)
  }, [selectedCardId, cards])
  const inputRef = useRef<HTMLInputElement>(null)

  // Sugestões inteligentes baseadas no histórico
  const smartSuggestions = useMemo(() => {
    const counts = new Map<string, { transaction: Transaction; count: number }>()
    transactions.forEach(t => {
      if (t.mode !== activeMode) return
      const key = `${t.type}|${t.category}|${Math.round(t.amount / 10) * 10}`
      const existing = counts.get(key)
      if (existing) existing.count++
      else counts.set(key, { transaction: t, count: 1 })
    })
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(({ transaction }) => transaction)
  }, [transactions, activeMode])

  // Quando voz termina com texto, interpreta
  useEffect(() => {
    if (voice.state === 'processing' && voice.transcript && step === 'listening') {
      setTextInput(voice.transcript)
      handleInterpret(voice.transcript)
    }
  }, [voice.state, voice.transcript])

  // Quando voz volta ao idle sem texto (ex: parou sem falar nada), volta o step para idle
  useEffect(() => {
    if (voice.state === 'idle' && step === 'listening') {
      setStep('idle')
    }
  }, [voice.state, step])

  // Atualiza input com transcrição ao vivo
  useEffect(() => {
    if (voice.state === 'listening' && voice.transcript) {
      setTextInput(voice.transcript)
    }
  }, [voice.transcript, voice.state])

  async function handleInterpret(text: string) {
    if (!text.trim()) return
    setPendingText(text.trim())
    setStep('processing')
    const result = await interpretFinancialInput(text.trim(), activeMode, activeProfile, userCategories)
    setInterpretation(result)
    setEditAmount(result.amount.toString())

    if (result.needsClarification && result.clarificationQuestion) {
      setStep('clarifying')
    } else if (result.recurrenceSuggestion) {
      setStep('recurrence')
    } else {
      setStep('confirming')
    }
  }

  function handleSubmit() {
    const text = textInput.trim()
    if (!text) return
    handleInterpret(text)
  }

  function handleQuickRegister(t: Transaction) {
    const interp: AIInterpretation = {
      type: t.type, amount: t.amount, mode: t.mode,
      category: t.category, description: t.description,
      confidence: 1, needsClarification: false,
      recurrenceSuggestion: t.is_recurring,
    }
    setPendingText(t.description)
    setInterpretation(interp)
    setEditAmount(t.amount.toString())
    setSelectedDate(formatDateInput())
    setStep('confirming')
  }

  function handleClarificationAnswer(answer: string) {
    if (!interpretation) return
    let updated = { ...interpretation }

    const q = interpretation.clarificationQuestion ?? ''
    if (q.includes('entrada ou uma saída')) {
      updated.type = answer.includes('Recebi') ? 'income' : 'expense'
      updated.confidence = 0.95
    } else if (q.includes('valor')) {
      const num = parseFloat(answer.replace(',', '.').replace(/[^\d.]/g, ''))
      if (!isNaN(num) && num > 0) {
        updated.amount = num
        setEditAmount(num.toString())
      }
    } else if (q.includes('relacionado')) {
      updated.category = answer
    }

    // Determine next question in priority order: amount → category
    // "Outros" é uma resposta válida para categoria — não repergunta
    const needsAmount = !updated.amount || updated.amount === 0
    const categoryAnswered = q.includes('relacionado') // usuário acabou de responder categoria
    const needsCategory = !updated.category && !categoryAnswered

    if (needsAmount) {
      updated.needsClarification = true
      updated.clarificationQuestion = 'Qual foi o valor?'
      updated.clarificationOptions = undefined
      setClarificationInput('')
      setInterpretation(updated)
    } else if (needsCategory) {
      updated.needsClarification = true
      updated.clarificationQuestion = 'Isso foi relacionado a quê?'
      updated.clarificationOptions = getCategoryOptions(
        updated.type,
        updated.mode,
        updated.mode === 'business' ? categoriesBusiness : categoriesPersonal
      )
      setInterpretation(updated)
    } else {
      updated.needsClarification = false
      setInterpretation(updated)
      if (updated.recurrenceSuggestion) setStep('recurrence')
      else setStep('confirming')
    }
  }

  function applyEdit(field: EditField, value: string) {
    if (!interpretation) return
    if (field === 'type') setInterpretation({ ...interpretation, type: value as 'income' | 'expense' })
    else if (field === 'category') setInterpretation({ ...interpretation, category: value })
    else if (field === 'mode') setInterpretation({ ...interpretation, mode: value as Mode })
    else if (field === 'amount') {
      const num = parseFloat(value.replace(',', '.'))
      if (!isNaN(num) && num > 0) setInterpretation({ ...interpretation, amount: num })
    }
    else if (field === 'date') setSelectedDate(value)
    setEditField(null)
  }

  async function handleConfirm() {
    if (!interpretation) return
    setAppError(null)
    const description = interpretation.description.trim() || pendingText.trim() || interpretation.category
    const card = selectedCardId ? cards.find(c => c.id === selectedCardId) : null
    const isRecurring = recurrenceChoice !== null && recurrenceChoice !== 'none'

    try {
      // Criar recorrência primeiro, antes da transação
      let recurrenceId: string | undefined
      if (isRecurring && recurrenceChoice && recurrenceChoice !== 'none') {
        recurrenceId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
              const r = (Math.random() * 16) | 0
              return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
            })

        const txDate = parseISO(selectedDate + 'T12:00:00')
        const nextDate =
          recurrenceChoice === 'monthly'  ? addMonths(txDate, 1) :
          recurrenceChoice === 'weekly'   ? addWeeks(txDate, 1)  :
          recurrenceChoice === 'biweekly' ? addWeeks(txDate, 2)  :
          recurrenceChoice === 'yearly'   ? addYears(txDate, 1)  :
                                            addMonths(txDate, 1)

        await addRecurrence({
          id: recurrenceId,
          title: description,
          type: interpretation.type,
          mode: interpretation.mode,
          amount: interpretation.amount,
          category: interpretation.category,
          frequency: recurrenceChoice,
          next_date: format(nextDate, 'yyyy-MM-dd'),
          active: true,
          created_at: new Date().toISOString(),
        })
      }

      if (installmentCount > 1 && card?.dueDay) {
        const perAmount = Math.round((interpretation.amount / installmentCount) * 100) / 100
        for (let i = 0; i < installmentCount; i++) {
          const dueDate = cardNextDueDate(card, i)
          await addTransaction({
            id: `${Date.now()}_p${i}_${Math.random().toString(36).slice(2)}`,
            type: interpretation.type,
            mode: interpretation.mode,
            amount: perAmount,
            category: interpretation.category,
            description: `${description} (${i + 1}/${installmentCount})`,
            original_text: pendingText,
            date: dueDate + 'T00:00:00',
            is_recurring: false,
            card_id: selectedCardId || undefined,
            profile_id: activeProfileId,
            profile_name: activeProfile?.name,
            status: 'pending',
            created_at: new Date().toISOString(),
          })
        }
      } else {
        await addTransaction({
          id: Date.now().toString(),
          type: interpretation.type,
          mode: interpretation.mode,
          amount: interpretation.amount,
          category: interpretation.category,
          description,
          original_text: pendingText,
          date: selectedDate + 'T' + new Date().toTimeString().slice(0, 8),
          is_recurring: isRecurring,
          recurrence_id: recurrenceId,
          card_id: selectedCardId || undefined,
          profile_id: activeProfileId,
          profile_name: activeProfile?.name,
          status: selectedCardId ? 'pending' : 'confirmed',
          created_at: new Date().toISOString(),
        })
      }

      setStep('saved')
      setTimeout(() => {
        voice.reset()
        setStep('idle')
        setInterpretation(null)
        setPendingText('')
        setRecurrenceChoice(null)
        setEditField(null)
        setTextInput('')
        setSelectedDate(formatDateInput())
        setSelectedCardId(null)
        setInstallmentCount(1)
        inputRef.current?.focus()
      }, 1600)
    } catch (err) {
      setAppError(formatError(err))
    }
  }

  function handleTransferConfirm() {
    const amount = parseFloat(transferAmount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) return

    const isBizToPersonal = transferDir === 'biz-to-personal'
    const sourceMode: Mode = isBizToPersonal ? 'business' : 'personal'
    const destMode: Mode   = isBizToPersonal ? 'personal' : 'business'
    const label = isBizToPersonal ? 'Empresa → Pessoal' : 'Pessoal → Empresa'
    const now = new Date().toISOString()
    const dateTime = selectedDate + 'T' + new Date().toTimeString().slice(0, 8)
    const transferId = Date.now().toString()

    addTransaction({
      id: transferId + '_saida',
      type: 'expense',
      mode: sourceMode,
      amount,
      category: isBizToPersonal ? 'Pró-labore' : 'Aporte',
      description: `Transferência ${label}`,
      date: dateTime,
      is_recurring: false,
      status: 'confirmed',
      created_at: now,
    })
    addTransaction({
      id: transferId + '_entrada',
      type: 'income',
      mode: destMode,
      amount,
      category: isBizToPersonal ? 'Salário' : 'Aporte',
      description: `Transferência ${label}`,
      date: dateTime,
      is_recurring: false,
      status: 'confirmed',
      created_at: now,
    })

    setStep('saved')
    setTimeout(() => {
      setStep('idle')
      setTransferAmount('')
      setTextInput('')
      setSelectedDate(formatDateInput())
      inputRef.current?.focus()
    }, 1600)
  }

  function handleCancel() {
    voice.reset()
    setStep('idle')
    setInterpretation(null)
    setPendingText('')
    setRecurrenceChoice(null)
    setEditField(null)
    setTextInput('')
  }

  const handleMicClick = useCallback(() => {
    if (step === 'listening') {
      voice.stopListening()
      return
    }
    if (step !== 'idle') return
    setTextInput('')
    voice.startListening()
    setStep('listening')
  }, [step, voice])

  const isListening = step === 'listening'
  const isProcessing = step === 'processing'

  // ── SAVED ──────────────────────────────────────────────────────────────────
  if (step === 'saved') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="w-20 h-20 bg-income-50 rounded-3xl flex items-center justify-center mb-4 animate-slide-up">
          <Check className="w-10 h-10 text-income-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Registrado!</h2>
        <p className="text-slate-400 text-sm">Voltando em instantes…</p>
      </div>
    )
  }

  // ── RECURRENCE ─────────────────────────────────────────────────────────────
  if (step === 'recurrence') {
    return (
      <div className="max-w-md mx-auto p-6 pt-12 space-y-4">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <RefreshCw className="w-6 h-6 text-primary-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Esse lançamento se repete?</h2>
          <p className="text-slate-400 text-sm mt-1">Vou lembrar automaticamente</p>
        </div>
        <div className="space-y-2">
          {RECURRENCE_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => { setRecurrenceChoice(opt.value); setStep('confirming') }}
              className="w-full flex items-center justify-between px-5 py-4 bg-white rounded-2xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left font-medium text-slate-700 active:scale-[0.98]">
              {opt.label}
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── TRANSFER ───────────────────────────────────────────────────────────────
  if (step === 'transfer') {
    const isBizToPersonal = transferDir === 'biz-to-personal'
    return (
      <div className="max-w-md mx-auto p-6 pt-10 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Transferência entre contas</h2>
          <button onClick={() => { setStep('idle'); setTransferAmount('') }}
            className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Direção */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setTransferDir('biz-to-personal')}
            className={cn('py-4 rounded-2xl border-2 text-sm font-semibold flex flex-col items-center gap-1.5 transition-all',
              isBizToPersonal ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-slate-200 text-slate-500 hover:border-slate-300')}
          >
            <span className="flex items-center gap-1 text-base"><Building2 className="w-4 h-4" /> → <User className="w-4 h-4" /></span>
            <span>Empresa → Pessoal</span>
            <span className="text-xs opacity-70">ex: pró-labore, salário</span>
          </button>
          <button
            onClick={() => setTransferDir('personal-to-biz')}
            className={cn('py-4 rounded-2xl border-2 text-sm font-semibold flex flex-col items-center gap-1.5 transition-all',
              !isBizToPersonal ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-slate-200 text-slate-500 hover:border-slate-300')}
          >
            <span className="flex items-center gap-1 text-base"><User className="w-4 h-4" /> → <Building2 className="w-4 h-4" /></span>
            <span>Pessoal → Empresa</span>
            <span className="text-xs opacity-70">ex: aporte, investimento</span>
          </button>
        </div>

        {/* Valor */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Valor</label>
          <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border-2 border-slate-200 focus-within:border-primary-400">
            <span className="text-slate-400 font-semibold text-lg">R$</span>
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              value={transferAmount}
              onChange={e => setTransferAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTransferConfirm()}
              placeholder="0,00"
              className="flex-1 bg-transparent text-2xl font-bold text-slate-800 outline-none"
            />
          </div>
        </div>

        {/* Resumo */}
        {transferAmount && parseFloat(transferAmount) > 0 && (
          <div className="bg-slate-50 rounded-2xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Saída na {isBizToPersonal ? 'Empresa' : 'conta Pessoal'}</span>
              <span className="font-semibold text-expense-600">- {formatCurrency(parseFloat(transferAmount))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Entrada na conta {isBizToPersonal ? 'Pessoal' : 'Empresa'}</span>
              <span className="font-semibold text-income-600">+ {formatCurrency(parseFloat(transferAmount))}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleTransferConfirm}
          disabled={!transferAmount || parseFloat(transferAmount) <= 0}
          className="btn-primary w-full flex items-center justify-center gap-2 text-base py-4 disabled:opacity-40"
        >
          <Check className="w-5 h-5" /> Confirmar transferência
        </button>
      </div>
    )
  }

  // ── CLARIFYING ─────────────────────────────────────────────────────────────
  if (step === 'clarifying' && interpretation) {
    const isAmountQuestion = interpretation.clarificationQuestion?.includes('valor')
    return (
      <div className="max-w-md mx-auto p-6 pt-12 space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-3">🤔</div>
          <h2 className="text-xl font-bold text-slate-800">{interpretation.clarificationQuestion}</h2>
          {pendingText && <p className="text-slate-400 text-sm mt-1 italic">"{pendingText}"</p>}
        </div>

        {isAmountQuestion ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border-2 border-slate-200 focus-within:border-primary-400">
              <span className="text-slate-400 font-semibold text-lg">R$</span>
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                value={clarificationInput}
                onChange={e => setClarificationInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && clarificationInput && handleClarificationAnswer(clarificationInput)}
                placeholder="0,00"
                className="flex-1 bg-transparent text-2xl font-bold text-slate-800 outline-none"
              />
            </div>
            <button
              onClick={() => clarificationInput && handleClarificationAnswer(clarificationInput)}
              disabled={!clarificationInput}
              className="btn-primary w-full disabled:opacity-40"
            >
              Confirmar valor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {interpretation.clarificationOptions?.map((opt) => (
              <button key={opt} onClick={() => handleClarificationAnswer(opt)}
                className="px-4 py-4 bg-white rounded-2xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all font-semibold text-slate-700 text-sm active:scale-[0.98]">
                {opt}
              </button>
            ))}
          </div>
        )}

        <button onClick={handleCancel} className="w-full text-center text-slate-400 text-sm py-2 hover:text-slate-600">Cancelar</button>
      </div>
    )
  }

  // ── CONFIRMING ─────────────────────────────────────────────────────────────
  if (step === 'confirming' && interpretation) {
    const rawCats = interpretation.mode === 'business' ? categoriesBusiness : categoriesPersonal
    const allCats = rawCats.map((c: any) => typeof c === 'string' ? { name: c, direction: 'both' } : c)
    const categories = allCats
      .filter(c => c.direction === 'both' || c.direction === interpretation.type)
      .map(c => c.name)
    const dateFormatted = format(parseISO(selectedDate + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

    return (
      <div className="max-w-md mx-auto p-5 pt-6 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-slate-800">Confirmar registro</h2>
          <button onClick={handleCancel} className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Main value card — clicável para editar valor */}
        <div
          onClick={() => setEditField('amount')}
          className={cn(
            'rounded-3xl p-5 text-white relative overflow-hidden cursor-pointer active:scale-[0.99] transition-transform',
            interpretation.type === 'income'
              ? 'bg-gradient-to-br from-income-500 to-emerald-600'
              : 'bg-gradient-to-br from-expense-500 to-rose-600'
          )}
        >
          <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <p className="text-white/70 text-xs font-medium mb-1">
              {interpretation.type === 'income' ? '↑ Entrada' : '↓ Saída'} · toque para editar o valor
            </p>
            <p className="text-3xl sm:text-4xl font-bold">{formatCurrency(interpretation.amount)}</p>
            {pendingText && (
              <p className="text-white/75 text-sm mt-3 leading-snug break-words">
                {pendingText}
              </p>
            )}
          </div>
        </div>

        {/* Descrição que vai aparecer na timeline */}
        <div className="space-y-1">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider px-1">Descrição</p>
          <textarea
            value={interpretation.description}
            onChange={e => setInterpretation({ ...interpretation, description: e.target.value })}
            rows={2}
            placeholder="Ex: Gasolina no posto"
            className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 text-sm text-slate-700 outline-none focus:border-primary-400 bg-white resize-none transition-all"
          />
        </div>

        {/* Editable fields */}
        <div className="grid grid-cols-2 gap-2">
          <EditButton label="Tipo" value={interpretation.type === 'income' ? '↑ Entrada' : '↓ Saída'}
            color={interpretation.type === 'income' ? 'income' : 'expense'} onClick={() => setEditField('type')} helpId="registrar.confirm-type" />
          <EditButton label="Categoria" value={interpretation.category} onClick={() => {
            setNewCatDirection(interpretation.type)
            setNewCatInput('')
            setEditField('category')
          }} helpId="registrar.confirm-category" />
          <EditButton label="Modo" value={interpretation.mode === 'business' ? '🏢 Empresa' : '👤 Pessoal'} onClick={() => setEditField('mode')} />
          <EditButton label="Data" value={dateFormatted} onClick={() => setEditField('date')} helpId="registrar.confirm-date" />
          {cards.length > 0 && (
            <div className="col-span-2">
              <EditButton
                label="Cartão usado (opcional)"
                value={selectedCardId ? (cards.find(c => c.id === selectedCardId)?.name ?? 'Cartão') : 'Dinheiro / PIX'}
                onClick={() => setEditField('card')}
                helpId="registrar.confirm-card"
              />
            </div>
          )}
          {selectedCardId && (
            <div className="col-span-2">
              <EditButton
                label="Parcelas"
                value={installmentCount === 1 ? 'À vista (1x)' : `${installmentCount}x de ${formatCurrency(interpretation.amount / installmentCount)}`}
                onClick={() => setEditField('installments')}
              />
            </div>
          )}
        </div>

        {recurrenceChoice && recurrenceChoice !== 'none' && (
          <div className="bg-primary-50 rounded-2xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-primary-700 font-medium">🔁 Recorrência ativa</span>
            <button onClick={() => setRecurrenceChoice(null)} className="text-xs text-primary-400 hover:text-primary-600">remover</button>
          </div>
        )}

        {/* Confirm */}
        <div className="space-y-2 pt-1">
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
          <button onClick={handleConfirm} className="btn-primary w-full flex items-center justify-center gap-2 text-base py-4">
            <Check className="w-5 h-5" />
            {installmentCount > 1 ? `Confirmar ${installmentCount}x` : 'Confirmar'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setStep('recurrence')} className="btn-secondary flex items-center justify-center gap-1.5 text-sm">
              <RefreshCw className="w-3.5 h-3.5" />
              {recurrenceChoice ? 'Recorrência' : 'Recorrência'}
            </button>
            <button
              onClick={() => {
                voice.reset()
                setInterpretation(null)
                setPendingText('')
                setTextInput('')
                setRecurrenceChoice(null)
                setEditField(null)
                setStep('idle')
                setTimeout(() => {
                  voice.startListening()
                  setStep('listening')
                }, 100)
              }}
              className="btn-secondary flex items-center justify-center gap-1.5 text-sm"
            >
              <Mic className="w-3.5 h-3.5" /> Tentar de novo
            </button>
          </div>
        </div>

        {/* Edit modal */}
        {editField && (
          <div className="fixed inset-0 bg-black/40 z-[60] flex items-end" onClick={() => setEditField(null)}>
            <div className="w-full bg-white rounded-t-3xl p-6 pb-10 space-y-4 max-h-[80vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>

              {editField === 'type' && (
                <>
                  <h3 className="font-bold text-slate-800 text-center text-lg">Tipo do registro</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => applyEdit('type', 'income')}
                      className={cn('py-5 rounded-2xl font-bold text-lg flex flex-col items-center gap-2 border-2 transition-all',
                        interpretation.type === 'income' ? 'bg-income-50 border-income-400 text-income-600' : 'border-slate-200 text-slate-400')}>
                      <TrendingUp className="w-7 h-7" /> Entrada
                    </button>
                    <button onClick={() => applyEdit('type', 'expense')}
                      className={cn('py-5 rounded-2xl font-bold text-lg flex flex-col items-center gap-2 border-2 transition-all',
                        interpretation.type === 'expense' ? 'bg-expense-50 border-expense-400 text-expense-600' : 'border-slate-200 text-slate-400')}>
                      <TrendingDown className="w-7 h-7" /> Saída
                    </button>
                  </div>
                </>
              )}

              {editField === 'category' && (
                <>
                  <h3 className="font-bold text-slate-800 text-center text-lg">Isso foi relacionado a quê?</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map(cat => (
                      <button key={cat} onClick={() => applyEdit('category', cat)}
                        className={cn('py-3 px-2 rounded-2xl text-xs font-semibold border-2 transition-all text-center',
                          interpretation.category === cat ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-slate-200 text-slate-600 hover:border-primary-300')}>
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Nova categoria inline */}
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 text-center">Não achou? Crie uma nova</p>
                    <input
                      value={newCatInput}
                      onChange={e => setNewCatInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newCatInput.trim()) {
                          const name = newCatInput.trim()
                          addCategory(name, interpretation.mode, newCatDirection)
                          applyEdit('category', name)
                          setNewCatInput('')
                        }
                      }}
                      placeholder="Nome da categoria…"
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 transition-all"
                    />
                    <div className="flex gap-1.5">
                      {(['income', 'expense', 'both'] as const).map(dir => {
                        const labels = { income: '↑ Entrada', expense: '↓ Saída', both: '↕ Ambos' }
                        const colors = {
                          income:  newCatDirection === dir ? 'bg-income-500 text-white border-income-500'  : 'border-slate-200 text-slate-500',
                          expense: newCatDirection === dir ? 'bg-expense-500 text-white border-expense-500' : 'border-slate-200 text-slate-500',
                          both:    newCatDirection === dir ? 'bg-primary-500 text-white border-primary-500' : 'border-slate-200 text-slate-500',
                        }
                        return (
                          <button key={dir} onClick={() => setNewCatDirection(dir)}
                            className={cn('flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all', colors[dir])}>
                            {labels[dir]}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      onClick={() => {
                        const name = newCatInput.trim()
                        if (!name) return
                        addCategory(name, interpretation.mode, newCatDirection)
                        applyEdit('category', name)
                        setNewCatInput('')
                      }}
                      disabled={!newCatInput.trim()}
                      className="btn-primary w-full disabled:opacity-40"
                    >
                      Criar e selecionar
                    </button>
                  </div>
                </>
              )}

              {editField === 'mode' && (
                <>
                  <h3 className="font-bold text-slate-800 text-center text-lg">Qual conta?</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => applyEdit('mode', 'business')}
                      className={cn('py-5 rounded-2xl font-bold flex flex-col items-center gap-2 border-2 transition-all',
                        interpretation.mode === 'business' ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-slate-200 text-slate-400')}>
                      <Building2 className="w-7 h-7" /> Empresa
                    </button>
                    <button onClick={() => applyEdit('mode', 'personal')}
                      className={cn('py-5 rounded-2xl font-bold flex flex-col items-center gap-2 border-2 transition-all',
                        interpretation.mode === 'personal' ? 'bg-slate-100 border-slate-400 text-slate-700' : 'border-slate-200 text-slate-400')}>
                      <User className="w-7 h-7" /> Pessoal
                    </button>
                  </div>
                </>
              )}

              {editField === 'amount' && (
                <>
                  <h3 className="font-bold text-slate-800 text-center text-lg">Qual o valor?</h3>
                  <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3 border-2 border-slate-200 focus-within:border-primary-400">
                    <span className="text-slate-400 font-semibold">R$</span>
                    <input autoFocus type="number" value={editAmount}
                      onChange={e => setEditAmount(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && applyEdit('amount', editAmount)}
                      placeholder="0,00"
                      className="flex-1 bg-transparent text-2xl font-bold text-slate-800 outline-none" />
                  </div>
                  <button onClick={() => applyEdit('amount', editAmount)} className="btn-primary w-full">Aplicar</button>
                </>
              )}

              {editField === 'date' && (
                <>
                  <h3 className="font-bold text-slate-800 text-center text-lg">Quando foi isso?</h3>
                  <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3 border-2 border-slate-200 focus-within:border-primary-400">
                    <Calendar className="w-5 h-5 text-slate-400 shrink-0" />
                    <input
                      type="date"
                      autoFocus
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="flex-1 bg-transparent text-base font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[0, 1, 2].map(daysAgo => {
                      const d = new Date()
                      d.setDate(d.getDate() - daysAgo)
                      const val = formatDateInput(d)
                      const label = daysAgo === 0 ? 'Hoje' : daysAgo === 1 ? 'Ontem' : `${daysAgo} dias atrás`
                      return (
                        <button key={val} onClick={() => { setSelectedDate(val); setEditField(null) }}
                          className={cn('py-3 rounded-2xl text-sm font-semibold border-2 transition-all',
                            selectedDate === val ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-slate-200 text-slate-600 hover:border-primary-300')}>
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  <button onClick={() => applyEdit('date', selectedDate)} className="btn-primary w-full">Confirmar data</button>
                </>
              )}

              {editField === 'card' && (
                <>
                  <h3 className="font-bold text-slate-800 text-center text-lg">Pago com qual cartão?</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => { setSelectedCardId(null); setEditField(null) }}
                      className={cn('w-full px-5 py-3.5 rounded-2xl text-left font-semibold text-sm border-2 transition-all',
                        !selectedCardId ? 'bg-slate-100 border-slate-400 text-slate-800' : 'border-slate-200 text-slate-500')}
                    >
                      💵 Dinheiro / PIX
                    </button>
                    {cards.map(card => (
                      <button key={card.id}
                        onClick={() => { setSelectedCardId(card.id); setEditField(null) }}
                        className={cn('w-full px-5 py-3.5 rounded-2xl text-left font-semibold text-sm border-2 transition-all flex items-center justify-between',
                          selectedCardId === card.id ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-slate-200 text-slate-700 hover:border-primary-300')}
                      >
                        <span>💳 {card.name} {card.lastDigits ? `••${card.lastDigits}` : ''}</span>
                        <span className="text-xs text-slate-400">{card.mode === 'business' ? 'Empresa' : 'Pessoal'}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {editField === 'installments' && (
                <>
                  <h3 className="font-bold text-slate-800 text-center text-lg">Em quantas parcelas?</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 6, 8, 10, 12, 18, 24].map(n => (
                      <button key={n} onClick={() => { setInstallmentCount(n); setEditField(null) }}
                        className={cn('py-3 rounded-2xl text-sm font-semibold border-2 transition-all',
                          installmentCount === n ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-slate-200 text-slate-600 hover:border-primary-300')}>
                        {n === 1 ? '1x' : `${n}x`}
                      </button>
                    ))}
                  </div>
                  {installmentCount > 1 && (
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Valor por parcela</span>
                        <span className="font-bold text-slate-800">{formatCurrency(interpretation.amount / installmentCount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total</span>
                        <span className="font-semibold text-slate-600">{formatCurrency(interpretation.amount)}</span>
                      </div>
                      <p className="text-xs text-slate-400 pt-1">Cada parcela será lançada no vencimento do cartão</p>
                    </div>
                  )}
                </>
              )}

              <button onClick={() => setEditField(null)} className="w-full text-center text-slate-400 text-sm py-1">Fechar</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── IDLE / LISTENING / PROCESSING ──────────────────────────────────────────
  if (step === 'idle' && !perms.canAddTransactions) {
    return (
      <div className="max-w-md mx-auto px-5 flex flex-col min-h-[60vh] items-center justify-center space-y-4 pb-24">
        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center">
          <Lock className="w-9 h-9 text-amber-400" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-slate-700">Sem permissão</h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
            Seu perfil não tem permissão para registrar lançamentos. Peça ao administrador para atualizar suas permissões em Configurações.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-5 flex flex-col min-h-screen">

      {/* Header com toggle de modo */}
      <div className="pt-8 pb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold text-slate-800">O que aconteceu?</h1>
            <HelpTooltip id="registrar.text-input" />
          </div>
          {activeProfile && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={cn('w-4 h-4 rounded-full bg-gradient-to-br shrink-0', activeProfile.color)} />
              <p className="text-slate-400 text-xs">{activeProfile.name}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <HelpTooltip id="registrar.mode-toggle" />
          <div className="flex bg-slate-100 rounded-2xl p-1 gap-0.5">
            <button onClick={() => setActiveMode('business')}
              className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all',
                activeMode === 'business' ? 'bg-primary-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              <Building2 className="w-3 h-3" /> Empresa
            </button>
            <button onClick={() => setActiveMode('personal')}
              className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all',
                activeMode === 'personal' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              <User className="w-3 h-3" /> Pessoal
            </button>
          </div>
        </div>
      </div>

      {/* ── Input principal com microfone integrado ── */}
      <div className={cn(
        'relative flex items-center border-2 rounded-2xl transition-all duration-200 bg-white',
        isListening
          ? 'border-expense-400 shadow-[0_0_0_4px_rgba(244,63,94,0.1)]'
          : isProcessing
          ? 'border-primary-300 shadow-[0_0_0_4px_rgba(99,102,241,0.08)]'
          : 'border-slate-200 focus-within:border-primary-400 focus-within:shadow-[0_0_0_4px_rgba(99,102,241,0.08)]'
      )}>
        <input
          ref={inputRef}
          value={textInput}
          onChange={e => !isListening && !isProcessing && setTextInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !isListening && !isProcessing && handleSubmit()}
          placeholder={isListening ? 'Ouvindo…' : isProcessing ? 'Interpretando…' : 'Ex: gastei 80 de gasolina'}
          readOnly={isListening || isProcessing}
          className="flex-1 px-4 py-4 text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400 min-w-0"
        />

        <div className="flex items-center gap-1 pr-2 shrink-0">
          {/* Botão enviar texto */}
          {!isListening && !isProcessing && textInput.trim() && (
            <button onClick={handleSubmit}
              className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center text-white hover:bg-primary-600 active:scale-95 transition-all">
              <Send className="w-4 h-4" />
            </button>
          )}

          {/* Ajuda e microfone */}
          <HelpTooltip id="registrar.mic" />
          <button
            onClick={handleMicClick}
            disabled={isProcessing}
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 relative',
              isListening
                ? 'bg-expense-500 text-white'
                : isProcessing
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-slate-100 text-slate-500 hover:bg-primary-100 hover:text-primary-600'
            )}
          >
            {isListening && (
              <span className="absolute inset-0 rounded-xl bg-expense-400 animate-ping opacity-40" />
            )}
            {isListening
              ? <MicOff className="w-4 h-4 relative z-10" />
              : isProcessing
              ? <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              : <Mic className="w-4 h-4" />
            }
          </button>
        </div>
      </div>

      {/* Erro de voz */}
      {voice.error && (
        <div className="mt-3 bg-expense-50 rounded-xl px-4 py-3 border border-expense-200">
          <p className="text-expense-600 text-sm">{voice.error}</p>
        </div>
      )}

      {/* ── Sugestões frequentes — compactas ── */}
      {!isListening && !isProcessing && smartSuggestions.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-1.5 mb-2">
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Frequentes</p>
            <HelpTooltip id="registrar.smart-suggestions" />
          </div>
          <div className="flex flex-wrap gap-2">
            {smartSuggestions.map((t) => (
              <button
                key={t.id}
                onClick={() => handleQuickRegister(t)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all active:scale-[0.97] max-w-full"
              >
                <span className={cn('text-xs font-bold shrink-0', t.type === 'income' ? 'text-income-500' : 'text-expense-500')}>
                  {t.type === 'income' ? '+' : '-'}
                </span>
                <span className="text-xs text-slate-600 font-medium truncate">{t.category}</span>
                <span className="text-xs text-slate-400 shrink-0">{formatCurrency(t.amount)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Transferência entre contas ── */}
      {!isListening && !isProcessing && (
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setStep('transfer')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-all text-sm font-medium"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Transferir entre Empresa e Pessoal
          </button>
          <HelpTooltip id="registrar.transfer" />
        </div>
      )}

      {/* Espaço flexível */}
      <div className="flex-1" />
    </div>
  )
}

function EditButton({ label, value, onClick, color, helpId }: {
  label: string; value: string; onClick: () => void; color?: 'income' | 'expense'; helpId?: string
}) {
  return (
    <div className="relative">
      <button onClick={onClick}
        className={cn('w-full flex flex-col items-start px-4 py-3 rounded-2xl border-2 transition-all active:scale-[0.97] text-left',
          color === 'income' ? 'border-income-200 bg-income-50 hover:border-income-400'
          : color === 'expense' ? 'border-expense-200 bg-expense-50 hover:border-expense-400'
          : 'border-slate-200 bg-white hover:border-primary-300 hover:bg-primary-50')}>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className={cn('text-sm font-bold mt-0.5 truncate w-full',
          color === 'income' ? 'text-income-600' : color === 'expense' ? 'text-expense-600' : 'text-slate-800')}>
          {value}
        </span>
      </button>
      {helpId && (
        <div className="absolute top-2 right-2">
          <HelpTooltip id={helpId} size="sm" />
        </div>
      )}
    </div>
  )
}
