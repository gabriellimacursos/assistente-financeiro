'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, Circle, X, Plus, ArrowRight,
  Trophy, AlertTriangle, Inbox, Target, ChevronDown, RotateCcw,
} from 'lucide-react'
import { format, startOfWeek, addWeeks, addDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useProductivityStore } from '@/lib/store/useProductivityStore'
import { formatError } from '@/lib/errors'
import HelpTooltip from '@/components/shared/HelpTooltip'
import { cn } from '@/lib/utils'
import type { ErrorCode } from '@/lib/errors'
import type { Priority, TaskStatus } from '@/types/productivity'

const STEPS = [
  { label: 'Conquistas',      emoji: '🏆' },
  { label: 'Pendências',      emoji: '📋' },
  { label: 'Inbox',           emoji: '📥' },
  { label: 'Próxima semana',  emoji: '🎯' },
  { label: 'Concluir',        emoji: '✅' },
]

export default function RevisaoPage() {
  const router = useRouter()
  const {
    settings, tasks, weeklyOutcomes, inbox,
    updateTask, completeTask, postponeTask,
    updateWeeklyOutcome, addWeeklyOutcome,
    processCapture, discardCapture, addTask,
  } = useProductivityStore()

  const today = new Date()
  const weekStart    = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd      = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd')
  const nextWeekStart = format(addWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1), 'yyyy-MM-dd')
  const weekLabel    = format(parseISO(weekStart), "'Semana de' d 'de' MMMM", { locale: ptBR })

  const [step, setStep] = useState(0)
  const [appError, setAppError] = useState<{ title: string; description: string; action: string; code?: ErrorCode; severity: 'error' | 'warning' } | null>(null)
  const [working, setWorking] = useState<string | null>(null)

  // Step 3 — inbox
  const [expandedCapture, setExpandedCapture] = useState<string | null>(null)
  const [captureTitle, setCaptureTitle] = useState('')

  // Step 4 — plan next week
  const [newOutcomeTitle, setNewOutcomeTitle]  = useState('')
  const [newOutcomeCat,   setNewOutcomeCat]    = useState(0)
  const [addingOutcome,   setAddingOutcome]    = useState(false)

  const outcomeLabels = settings?.outcome_labels ?? ['Dinheiro agora', 'Construção do futuro', 'Melhoria operacional']

  // ── Derived data ────────────────────────────────────────────────────────────

  const thisWeekOutcomes = useMemo(() =>
    weeklyOutcomes.filter(o => o.week_start === weekStart),
    [weeklyOutcomes, weekStart]
  )

  const nextWeekOutcomes = useMemo(() =>
    weeklyOutcomes.filter(o => o.week_start === nextWeekStart),
    [weeklyOutcomes, nextWeekStart]
  )

  const thisWeekTasks = useMemo(() =>
    tasks.filter(t => t.scheduled_date && t.scheduled_date >= weekStart && t.scheduled_date <= weekEnd),
    [tasks, weekStart, weekEnd]
  )

  const doneTasks    = useMemo(() => thisWeekTasks.filter(t => t.status === 'done'), [thisWeekTasks])
  const pendingTasks = useMemo(() =>
    thisWeekTasks.filter(t => t.status !== 'done' && t.status !== 'cancelled' && t.status !== 'archived'),
    [thisWeekTasks]
  )
  const doneOutcomes    = useMemo(() => thisWeekOutcomes.filter(o => o.status === 'done'),    [thisWeekOutcomes])
  const pendingOutcomes = useMemo(() => thisWeekOutcomes.filter(o => o.status !== 'done' && o.status !== 'cancelled'), [thisWeekOutcomes])
  const pendingCaptures = useMemo(() => inbox.filter(c => c.status === 'new'), [inbox])

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function run(id: string, fn: () => Promise<void>) {
    setWorking(id)
    setAppError(null)
    try { await fn() }
    catch (err) { setAppError(formatError(err)) }
    finally { setWorking(null) }
  }

  async function handleCarryTask(taskId: string) {
    await run(taskId, () => postponeTask(taskId, nextWeekStart))
  }

  async function handleCancelTask(taskId: string) {
    await run(taskId, () => updateTask(taskId, { status: 'cancelled' as TaskStatus }))
  }

  async function handleCarryOutcome(outcomeId: string, title: string, catLabel: string, catIdx: number) {
    await run(outcomeId, async () => {
      await updateWeeklyOutcome(outcomeId, { status: 'cancelled' })
      await addWeeklyOutcome({ title, category_label: catLabel, category_index: catIdx })
    })
  }

  async function handleCancelOutcome(id: string) {
    await run(id, () => updateWeeklyOutcome(id, { status: 'cancelled' }))
  }

  async function handleProcessCapture(captureId: string, title: string) {
    if (!title.trim()) return
    await run(captureId, async () => {
      const newTask = await addTask({ title: title.trim(), status: 'inbox' as TaskStatus, priority: 'medium' as Priority })
      await processCapture(captureId, 'task', newTask?.id)
    })
    setExpandedCapture(null)
    setCaptureTitle('')
  }

  async function handleDiscardCapture(id: string) {
    await run(id, () => discardCapture(id))
  }

  async function handleAddNextWeekOutcome() {
    const title = newOutcomeTitle.trim()
    if (!title) return
    setAddingOutcome(true)
    try {
      await addWeeklyOutcome({
        title,
        category_label: outcomeLabels[newOutcomeCat] ?? outcomeLabels[0],
        category_index:  newOutcomeCat,
      })
      setNewOutcomeTitle('')
    } catch (err) {
      setAppError(formatError(err))
    } finally {
      setAddingOutcome(false)
    }
  }

  // ── Step content ─────────────────────────────────────────────────────────────

  function renderStep() {
    switch (step) {

      // ── 0 · Conquistas ────────────────────────────────────────────────────
      case 0:
        return (
          <div className="space-y-5">
            <div className="text-center py-4">
              <div className="text-5xl mb-3">🏆</div>
              <h2 className="text-xl font-bold text-slate-800">O que você conquistou</h2>
              <p className="text-sm text-slate-400 mt-1">{weekLabel}</p>
            </div>

            {doneOutcomes.length === 0 && doneTasks.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl p-6 text-center">
                <p className="text-slate-400 text-sm">Nenhuma tarefa ou entrega marcada como concluída esta semana.</p>
                <p className="text-xs text-slate-400 mt-2">Tudo bem — a revisão ajuda a mudar isso na próxima semana.</p>
              </div>
            ) : (
              <>
                {doneOutcomes.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Entregas concluídas</p>
                    <div className="space-y-2">
                      {doneOutcomes.map(o => (
                        <div key={o.id} className="flex items-center gap-3 p-3 bg-income-50 rounded-xl">
                          <CheckCircle2 className="w-4 h-4 text-income-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{o.title}</p>
                            <p className="text-[10px] text-income-500">{o.category_label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {doneTasks.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Tarefas concluídas</p>
                    <div className="space-y-2">
                      {doneTasks.map(t => (
                        <div key={t.id} className="flex items-center gap-3 p-3 bg-income-50 rounded-xl">
                          <CheckCircle2 className="w-4 h-4 text-income-500 shrink-0" />
                          <p className="text-sm text-slate-700 truncate flex-1">{t.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-r from-income-50 to-primary-50 rounded-2xl p-4 text-center border border-income-100">
                  <p className="text-2xl font-bold text-slate-800">{doneTasks.length + doneOutcomes.length}</p>
                  <p className="text-sm text-slate-500">conquista{(doneTasks.length + doneOutcomes.length) !== 1 ? 's' : ''} esta semana</p>
                </div>
              </>
            )}
          </div>
        )

      // ── 1 · Pendências ───────────────────────────────────────────────────
      case 1:
        return (
          <div className="space-y-5">
            <div className="text-center py-4">
              <div className="text-5xl mb-3">📋</div>
              <h2 className="text-xl font-bold text-slate-800">O que ficou pendente</h2>
              <p className="text-sm text-slate-400 mt-1">Decida o destino de cada item</p>
            </div>

            {pendingTasks.length === 0 && pendingOutcomes.length === 0 ? (
              <div className="bg-income-50 border border-income-100 rounded-2xl p-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-income-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-income-700">Nenhuma pendência! Semana limpa.</p>
              </div>
            ) : (
              <>
                {pendingOutcomes.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Entregas não concluídas</p>
                    <div className="space-y-2">
                      {pendingOutcomes.map(o => (
                        <div key={o.id} className="border border-slate-200 rounded-xl p-4">
                          <div className="flex items-start gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 leading-snug">{o.title}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{o.category_label}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCarryOutcome(o.id, o.title, o.category_label, o.category_index)}
                              disabled={working === o.id}
                              className="flex-1 py-2 bg-primary-50 text-primary-600 text-xs font-semibold rounded-lg hover:bg-primary-100 disabled:opacity-40 transition-colors flex items-center justify-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Próxima semana
                            </button>
                            <button
                              onClick={() => handleCancelOutcome(o.id)}
                              disabled={working === o.id}
                              className="flex-1 py-2 bg-slate-100 text-slate-500 text-xs font-semibold rounded-lg hover:bg-slate-200 disabled:opacity-40 transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pendingTasks.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Tarefas não concluídas</p>
                    <div className="space-y-2">
                      {pendingTasks.map(t => (
                        <div key={t.id} className="border border-slate-200 rounded-xl p-4">
                          <div className="flex items-start gap-2 mb-3">
                            <Circle className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                            <p className="text-sm font-semibold text-slate-800 flex-1 leading-snug">{t.title}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCarryTask(t.id)}
                              disabled={working === t.id}
                              className="flex-1 py-2 bg-primary-50 text-primary-600 text-xs font-semibold rounded-lg hover:bg-primary-100 disabled:opacity-40 transition-colors flex items-center justify-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Próxima semana
                            </button>
                            <button
                              onClick={() => handleCancelTask(t.id)}
                              disabled={working === t.id}
                              className="flex-1 py-2 bg-slate-100 text-slate-500 text-xs font-semibold rounded-lg hover:bg-slate-200 disabled:opacity-40 transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )

      // ── 2 · Inbox ────────────────────────────────────────────────────────
      case 2:
        return (
          <div className="space-y-5">
            <div className="text-center py-4">
              <div className="text-5xl mb-3">📥</div>
              <h2 className="text-xl font-bold text-slate-800">Caixa de entrada</h2>
              <p className="text-sm text-slate-400 mt-1">
                {pendingCaptures.length === 0
                  ? 'Caixa vazia'
                  : `${pendingCaptures.length} item${pendingCaptures.length > 1 ? 's' : ''} para processar`}
              </p>
            </div>

            {pendingCaptures.length === 0 ? (
              <div className="bg-income-50 border border-income-100 rounded-2xl p-6 text-center">
                <Inbox className="w-8 h-8 text-income-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-income-700">Inbox zerado!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingCaptures.map(capture => {
                  const isExpanded = expandedCapture === capture.id
                  return (
                    <div key={capture.id} className="border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => {
                          if (isExpanded) { setExpandedCapture(null) }
                          else { setExpandedCapture(capture.id); setCaptureTitle(capture.content) }
                        }}
                        className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
                      >
                        <Inbox className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-slate-700 flex-1 leading-snug line-clamp-2">{capture.content}</p>
                        <ChevronDown className={cn('w-4 h-4 text-slate-400 shrink-0 transition-transform', isExpanded && 'rotate-180')} />
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
                          <input
                            value={captureTitle}
                            onChange={e => setCaptureTitle(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary-400 bg-white"
                            placeholder="Título da tarefa…"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleProcessCapture(capture.id, captureTitle)}
                              disabled={working === capture.id || !captureTitle.trim()}
                              className="flex-1 py-2 bg-primary-500 text-white text-xs font-semibold rounded-lg hover:bg-primary-600 disabled:opacity-40"
                            >
                              {working === capture.id ? 'Criando…' : 'Criar como tarefa'}
                            </button>
                            <button
                              onClick={() => handleDiscardCapture(capture.id)}
                              disabled={working === capture.id}
                              className="px-3 py-2 bg-slate-100 text-slate-500 text-xs font-semibold rounded-lg hover:bg-slate-200"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )

      // ── 3 · Próxima semana ────────────────────────────────────────────────
      case 3: {
        const nextWeekLabel = format(parseISO(nextWeekStart), "d 'de' MMMM", { locale: ptBR })
        return (
          <div className="space-y-5">
            <div className="text-center py-4">
              <div className="text-5xl mb-3">🎯</div>
              <h2 className="text-xl font-bold text-slate-800">Planejar próxima semana</h2>
              <p className="text-sm text-slate-400 mt-1">Semana de {nextWeekLabel}</p>
            </div>

            {/* Add outcome form */}
            <div className="card p-4 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nova entrega</p>
              <div className="flex gap-1">
                {outcomeLabels.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setNewOutcomeCat(i)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                      newOutcomeCat === i
                        ? 'bg-primary-500 text-white border-transparent'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    )}
                  >
                    {label.split(' ')[0]}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newOutcomeTitle}
                  onChange={e => setNewOutcomeTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddNextWeekOutcome()}
                  placeholder={`Entrega em "${outcomeLabels[newOutcomeCat]}"…`}
                  className="flex-1 px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white"
                />
                <button
                  onClick={handleAddNextWeekOutcome}
                  disabled={!newOutcomeTitle.trim() || addingOutcome}
                  className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center text-white hover:bg-primary-600 disabled:opacity-40 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Next week outcomes added */}
            {nextWeekOutcomes.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Planejado para a próxima semana</p>
                <div className="space-y-2">
                  {nextWeekOutcomes.map(o => (
                    <div key={o.id} className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl">
                      <Target className="w-4 h-4 text-primary-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{o.title}</p>
                        <p className="text-[10px] text-primary-500">{o.category_label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {nextWeekOutcomes.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-2">
                Adicione ao menos uma entrega para a próxima semana.
              </p>
            )}
          </div>
        )
      }

      // ── 4 · Concluir ─────────────────────────────────────────────────────
      case 4: {
        const carriedCount  = thisWeekTasks.filter(t => t.scheduled_date === nextWeekStart).length
        const cancelledCount = thisWeekTasks.filter(t => t.status === 'cancelled').length
        const remainingInbox = pendingCaptures.length

        return (
          <div className="space-y-5">
            <div className="text-center py-4">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-xl font-bold text-slate-800">Revisão concluída</h2>
              <p className="text-sm text-slate-400 mt-1">{weekLabel}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard value={doneTasks.length + doneOutcomes.length} label="concluídos" color="text-income-600 bg-income-50" />
              <StatCard value={nextWeekOutcomes.length}                label="entregas planejadas" color="text-primary-600 bg-primary-50" />
              <StatCard value={carriedCount}                           label="transferidos" color="text-amber-600 bg-amber-50" />
              <StatCard value={cancelledCount}                         label="cancelados" color="text-slate-600 bg-slate-100" />
            </div>

            {remainingInbox > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
                <Inbox className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-700">
                  {remainingInbox} item{remainingInbox > 1 ? 's' : ''} ainda na inbox — processe depois.
                </p>
              </div>
            )}

            <div className="bg-gradient-to-r from-primary-50 to-indigo-50 border border-primary-100 rounded-2xl p-4">
              <p className="text-sm font-semibold text-primary-800">
                Boa semana! Confira seus planos em <span className="font-bold">/produtividade/hoje</span> na segunda-feira.
              </p>
            </div>

            <button
              onClick={() => router.push('/produtividade')}
              className="w-full py-4 bg-primary-500 text-white font-bold rounded-2xl hover:bg-primary-600 transition-colors text-base"
            >
              Fechar revisão →
            </button>
          </div>
        )
      }

      default:
        return null
    }
  }

  // ── Layout ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.push('/produtividade')}
              className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
            <div className="flex-1">
              <h1 className="text-base font-bold text-slate-800">Revisão Semanal</h1>
              <p className="text-xs text-slate-400">{STEPS[step].emoji} {STEPS[step].label}</p>
            </div>
            <HelpTooltip id="prod.review" />
          </div>

          {/* Progress bar */}
          <div className="flex gap-1">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 h-1.5 rounded-full transition-all',
                  i < step  ? 'bg-primary-500' :
                  i === step ? 'bg-primary-300' :
                  'bg-slate-200'
                )}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-slate-400">Passo {step + 1} de {STEPS.length}</span>
            <span className="text-[10px] text-slate-400">{STEPS[step].label}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {appError && (
          <div className="mb-4 bg-expense-50 border border-expense-200 rounded-2xl p-4">
            <p className="text-sm text-expense-700">{appError.description}</p>
          </div>
        )}

        {renderStep()}

        {/* Navigation */}
        {step < STEPS.length - 1 && (
          <div className="mt-8 flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-5 py-3 bg-white border border-slate-200 text-slate-600 font-semibold rounded-2xl hover:bg-slate-50 transition-colors"
              >
                Voltar
              </button>
            )}
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex-1 py-3 bg-primary-500 text-white font-bold rounded-2xl hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
            >
              Próximo
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Stat card helper ──────────────────────────────────────────────────────────

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className={cn('rounded-2xl p-4 text-center', color.split(' ')[1])}>
      <p className={cn('text-3xl font-bold', color.split(' ')[0])}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  )
}
