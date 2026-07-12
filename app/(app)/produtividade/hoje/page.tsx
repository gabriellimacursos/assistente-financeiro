'use client'
import { useState, useMemo } from 'react'
import {
  Flame, Plus, CheckCircle2, Circle, X, ChevronDown, Target, Pencil, Check, Timer,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useProductivityStore } from '@/lib/store/useProductivityStore'
import { formatError } from '@/lib/errors'
import ErrorBanner from '@/components/shared/ErrorBanner'
import ProdSubNav from '@/components/shared/ProdSubNav'
import { cn } from '@/lib/utils'
import HelpTooltip from '@/components/shared/HelpTooltip'
import type { ErrorCode } from '@/lib/errors'
import type { ProductivityTask } from '@/types/productivity'

export default function HojePage() {
  const router = useRouter()
  const {
    settings, tasks, todayFocus, weeklyOutcomes, areas,
    setTodayFocus, addTask, completeTask, addWeeklyOutcome, updateWeeklyOutcome,
    prodSyncStatus,
  } = useProductivityStore()

  const today = format(new Date(), 'yyyy-MM-dd')
  const todayLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const [appError, setAppError] = useState<{ title: string; description: string; action: string; code?: ErrorCode; severity: 'error' | 'warning' } | null>(null)

  // Missão
  const [editingMission, setEditingMission] = useState(false)
  const [missionText, setMissionText] = useState('')
  const [missionTaskId, setMissionTaskId] = useState('')
  const [savingMission, setSavingMission] = useState(false)

  // Task rápida
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [addingTask, setAddingTask] = useState(false)

  // Entrega semanal rápida
  const [newOutcomeTitle, setNewOutcomeTitle] = useState('')
  const [newOutcomeCat, setNewOutcomeCat] = useState(0)
  const [addingOutcome, setAddingOutcome] = useState(false)
  const [showAddOutcome, setShowAddOutcome] = useState(false)

  const outcomeLabels = settings?.outcome_labels ?? ['Dinheiro agora', 'Construção do futuro', 'Melhoria operacional']

  const todayTasks = useMemo(() =>
    tasks.filter(t => t.scheduled_date === today && t.status !== 'done' && t.status !== 'cancelled'),
    [tasks, today]
  )

  const inProgressTasks = useMemo(() =>
    tasks.filter(t => t.status === 'in_progress' && t.scheduled_date !== today),
    [tasks, today]
  )

  const weekOutcomes = useMemo(() =>
    weeklyOutcomes.filter(o => o.week_start === weekStart),
    [weeklyOutcomes, weekStart]
  )

  const missionTask = useMemo(() => {
    if (todayFocus?.main_mission_id) return tasks.find(t => t.id === todayFocus.main_mission_id)
    return null
  }, [todayFocus, tasks])

  const currentMission = todayFocus?.main_mission_text || missionTask?.title

  const secondaryTasks = useMemo(() =>
    (todayFocus?.secondary_task_ids ?? [])
      .map(id => tasks.find(t => t.id === id))
      .filter(Boolean) as ProductivityTask[],
    [todayFocus, tasks]
  )

  async function handleSaveMission() {
    setSavingMission(true)
    setAppError(null)
    try {
      await setTodayFocus({
        main_mission_id: missionTaskId || undefined,
        main_mission_text: missionText.trim() || undefined,
      })
      setEditingMission(false)
      setMissionText('')
      setMissionTaskId('')
    } catch (err) {
      setAppError(formatError(err))
    } finally {
      setSavingMission(false)
    }
  }

  function openEditMission() {
    setMissionText(todayFocus?.main_mission_text ?? missionTask?.title ?? '')
    setMissionTaskId(todayFocus?.main_mission_id ?? '')
    setEditingMission(true)
  }

  async function handleAddTask() {
    const title = newTaskTitle.trim()
    if (!title) return
    setAddingTask(true)
    setAppError(null)
    try {
      await addTask({ title, scheduled_date: today, status: 'planned' })
      setNewTaskTitle('')
    } catch (err) {
      setAppError(formatError(err))
    } finally {
      setAddingTask(false)
    }
  }

  async function handleCompleteTask(id: string) {
    try {
      await completeTask(id)
    } catch (err) {
      setAppError(formatError(err))
    }
  }

  async function handleToggleOutcome(id: string, currentStatus: string) {
    try {
      await updateWeeklyOutcome(id, {
        status: currentStatus === 'done' ? 'planned' : 'done',
        progress: currentStatus === 'done' ? 0 : 100,
      })
    } catch (err) {
      setAppError(formatError(err))
    }
  }

  async function handleAddOutcome() {
    const title = newOutcomeTitle.trim()
    if (!title) return
    setAddingOutcome(true)
    setAppError(null)
    try {
      await addWeeklyOutcome({
        title,
        category_label: outcomeLabels[newOutcomeCat] ?? outcomeLabels[0],
        category_index: newOutcomeCat,
      })
      setNewOutcomeTitle('')
      setShowAddOutcome(false)
    } catch (err) {
      setAppError(formatError(err))
    } finally {
      setAddingOutcome(false)
    }
  }

  if (prodSyncStatus === 'loading') {
    return (
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <div className="h-8 bg-slate-100 rounded-xl animate-pulse w-40" />
        {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-5 max-w-2xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Hoje</h1>
        <p className="text-sm text-slate-400 capitalize">{todayLabel}</p>
      </div>

      <ProdSubNav />

      {appError && (
        <ErrorBanner title={appError.title} description={appError.description} action={appError.action} severity={appError.severity} onClose={() => setAppError(null)} />
      )}

      {/* ── Missão principal ─────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Missão principal</h2>
          <HelpTooltip id="prod.mission" />
          {currentMission && !editingMission && (
            <button onClick={openEditMission} className="ml-auto w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors">
              <Pencil className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}
        </div>

        {editingMission ? (
          <div className="space-y-3">
            <textarea
              value={missionText}
              onChange={e => setMissionText(e.target.value)}
              placeholder="Qual é a sua missão principal hoje? O que, se concluído, tornaria este dia bem-sucedido?"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-primary-300 text-sm outline-none focus:border-primary-500 bg-white transition-all resize-none"
              autoFocus
            />
            {tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-1.5 font-medium">Ou vincular a uma tarefa existente:</p>
                <select
                  value={missionTaskId}
                  onChange={e => { setMissionTaskId(e.target.value); if (e.target.value) setMissionText('') }}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white"
                >
                  <option value="">Nenhuma tarefa vinculada</option>
                  {tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSaveMission}
                disabled={(!missionText.trim() && !missionTaskId) || savingMission}
                className="flex-1 py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-40 transition-colors"
              >
                {savingMission ? 'Salvando…' : 'Definir missão'}
              </button>
              <button
                onClick={() => setEditingMission(false)}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : currentMission ? (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-4">
            <p className="text-base font-bold text-slate-800 leading-snug">{currentMission}</p>
            {missionTask?.next_step && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                ▶ Próximo passo: {missionTask.next_step}
              </p>
            )}
            {missionTask?.done_definition && (
              <p className="text-xs text-slate-400 mt-1">
                ✓ Concluído quando: {missionTask.done_definition}
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={openEditMission}
            className="w-full p-4 border-2 border-dashed border-amber-200 rounded-2xl hover:border-amber-400 hover:bg-amber-50 transition-all text-left"
          >
            <p className="text-sm font-semibold text-slate-600">Definir missão principal</p>
            <p className="text-xs text-slate-400 mt-0.5">Qual é a coisa mais importante que você precisa concluir hoje?</p>
          </button>
        )}
      </div>

      {/* ── Botão Iniciar Foco ───────────────────────────────────────────── */}
      {currentMission && (
        <button
          onClick={() => {
            const url = missionTask?.id
              ? `/produtividade/foco?taskId=${missionTask.id}`
              : '/produtividade/foco'
            router.push(url)
          }}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all active:scale-[0.98]"
        >
          <Timer className="w-5 h-5" />
          Iniciar sessão de foco
        </button>
      )}

      {/* ── Tarefas secundárias ────────────────────────────────────────── */}
      {(secondaryTasks.length > 0 || currentMission) && (
        <div className="card p-5">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Tarefas secundárias</h2>
          <div className="space-y-2">
            {secondaryTasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <button onClick={() => handleCompleteTask(t.id)} className="shrink-0">
                  <Circle className="w-4 h-4 text-slate-300 hover:text-income-500 transition-colors" />
                </button>
                <span className="text-sm text-slate-700 flex-1">{t.title}</span>
              </div>
            ))}
            {secondaryTasks.length < 2 && (
              <p className="text-xs text-slate-400 text-center py-2">
                {secondaryTasks.length === 0 ? 'Até 2 tarefas secundárias (opcionais)' : '+ 1 tarefa secundária opcional'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Tarefas do dia ────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Tarefas de hoje</h2>
          <span className="text-xs text-slate-400">{todayTasks.length} tarefa{todayTasks.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="space-y-2 mb-4">
          {todayTasks.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-3">Nenhuma tarefa agendada para hoje</p>
          )}
          {todayTasks.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl group">
              <button onClick={() => handleCompleteTask(t.id)} className="shrink-0">
                <Circle className="w-4 h-4 text-slate-300 hover:text-income-500 transition-colors" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 truncate">{t.title}</p>
                {t.next_step && <p className="text-[10px] text-primary-500">▶ {t.next_step}</p>}
              </div>
              {t.priority === 'high' && (
                <span className="shrink-0 text-[10px] font-bold text-expense-500 bg-expense-50 px-1.5 py-0.5 rounded-full">Alta</span>
              )}
            </div>
          ))}
        </div>

        {/* Add quick task */}
        <div className="flex gap-2">
          <input
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddTask()}
            placeholder="+ Adicionar tarefa para hoje…"
            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white transition-all"
          />
          <button
            onClick={handleAddTask}
            disabled={!newTaskTitle.trim() || addingTask}
            className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center text-white hover:bg-primary-600 disabled:opacity-40 transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Em andamento ─────────────────────────────────────────────── */}
      {inProgressTasks.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Em andamento</h2>
          <div className="space-y-2">
            {inProgressTasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{t.title}</p>
                  {t.next_step && <p className="text-[10px] text-primary-600">▶ {t.next_step}</p>}
                </div>
                <button onClick={() => handleCompleteTask(t.id)}
                  className="shrink-0 w-7 h-7 bg-income-100 rounded-lg flex items-center justify-center hover:bg-income-200 transition-colors">
                  <Check className="w-3.5 h-3.5 text-income-600" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Entregas da semana ───────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary-500" />
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Entregas da semana</h2>
            <HelpTooltip id="prod.weekly" />
          </div>
          <button onClick={() => setShowAddOutcome(!showAddOutcome)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-primary-50 text-primary-600 rounded-xl text-xs font-semibold hover:bg-primary-100 transition-colors">
            <Plus className="w-3 h-3" /> Adicionar
          </button>
        </div>

        {showAddOutcome && (
          <div className="mb-4 p-4 bg-slate-50 rounded-2xl space-y-3">
            <div className="flex gap-1">
              {outcomeLabels.map((label, i) => (
                <button key={i} onClick={() => setNewOutcomeCat(i)}
                  className={cn('flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                    newOutcomeCat === i ? 'bg-primary-500 text-white border-transparent' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}>
                  {label.split(' ')[0]}
                </button>
              ))}
            </div>
            <input
              value={newOutcomeTitle}
              onChange={e => setNewOutcomeTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddOutcome()}
              placeholder={`Entrega em "${outcomeLabels[newOutcomeCat]}"…`}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={handleAddOutcome} disabled={!newOutcomeTitle.trim() || addingOutcome}
                className="flex-1 py-2 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-40">
                Salvar
              </button>
              <button onClick={() => { setShowAddOutcome(false); setNewOutcomeTitle('') }}
                className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {outcomeLabels.map((label, idx) => {
          const items = weekOutcomes.filter(o => o.category_index === idx)
          if (items.length === 0 && !showAddOutcome) return null
          return (
            <div key={idx} className="mb-4 last:mb-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
              <div className="space-y-2">
                {items.map(o => (
                  <button key={o.id} onClick={() => handleToggleOutcome(o.id, o.status)}
                    className={cn('w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all',
                      o.status === 'done' ? 'bg-income-50' : 'bg-slate-50 hover:bg-slate-100')}>
                    {o.status === 'done'
                      ? <CheckCircle2 className="w-4 h-4 text-income-500 shrink-0" />
                      : <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                    }
                    <span className={cn('text-sm flex-1 truncate', o.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700 font-medium')}>
                      {o.title}
                    </span>
                  </button>
                ))}
                {items.length === 0 && (
                  <p className="text-xs text-slate-400 pl-3">Nenhuma entrega nesta categoria</p>
                )}
              </div>
            </div>
          )
        })}

        {weekOutcomes.length === 0 && !showAddOutcome && (
          <p className="text-sm text-slate-400 text-center py-3">
            Defina as entregas principais desta semana para manter o foco no que importa.
          </p>
        )}
      </div>

    </div>
  )
}
