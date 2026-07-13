'use client'
import { useState, useMemo } from 'react'
import {
  CheckSquare, Plus, CheckCircle2, Circle, Clock, Inbox,
  AlertTriangle, ArrowRight, ChevronDown, X, Trash2,
} from 'lucide-react'
import { format, isPast, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useProductivityStore } from '@/lib/store/useProductivityStore'
import { formatError } from '@/lib/errors'
import ErrorBanner from '@/components/shared/ErrorBanner'
import ProdSubNav from '@/components/shared/ProdSubNav'
import { cn } from '@/lib/utils'
import HelpTooltip from '@/components/shared/HelpTooltip'
import { TASK_STATUS_LABELS, PRIORITY_LABELS } from '@/types/productivity'
import type { ErrorCode } from '@/lib/errors'
import type { TaskStatus, Priority } from '@/types/productivity'

type FilterTab = 'inbox' | 'today' | 'next' | 'waiting' | 'done'

const FILTER_TABS: { key: FilterTab; label: string; icon: React.ElementType }[] = [
  { key: 'inbox',   label: 'Entrada',  icon: Inbox       },
  { key: 'today',   label: 'Hoje',     icon: CheckSquare },
  { key: 'next',    label: 'Próximas', icon: ArrowRight  },
  { key: 'waiting', label: 'Espera',   icon: Clock       },
  { key: 'done',    label: 'Feitas',   icon: CheckCircle2 },
]

const PRIORITY_COLORS: Record<Priority, string> = {
  high:   'text-expense-500 bg-expense-50',
  medium: 'text-amber-600 bg-amber-50',
  low:    'text-slate-400 bg-slate-100',
}

export default function TarefasPage() {
  const {
    tasks, projects, areas, inbox,
    addTask, completeTask, updateTask, removeTask, processCapture, discardCapture,
    prodSyncStatus,
  } = useProductivityStore()

  const today = format(new Date(), 'yyyy-MM-dd')

  const [activeTab, setActiveTab] = useState<FilterTab>('inbox')
  const [appError, setAppError] = useState<{ title: string; description: string; action: string; code?: ErrorCode; severity: 'error' | 'warning' } | null>(null)

  // Add task form
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<Priority>('medium')
  const [newProjectId, setNewProjectId] = useState('')
  const [newDate, setNewDate] = useState('')
  const [adding, setAdding] = useState(false)

  // Capture processing
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const filteredTasks = useMemo(() => {
    switch (activeTab) {
      case 'inbox':
        return tasks.filter(t => t.status === 'inbox')
      case 'today':
        return tasks.filter(t =>
          t.scheduled_date === today && t.status !== 'done' && t.status !== 'cancelled' && t.status !== 'archived'
        )
      case 'next':
        return tasks.filter(t =>
          (t.status === 'next' || t.status === 'planned' || t.status === 'in_progress' || t.status === 'paused') &&
          t.scheduled_date !== today
        ).sort((a, b) => {
          if (a.scheduled_date && b.scheduled_date) return a.scheduled_date.localeCompare(b.scheduled_date)
          if (a.scheduled_date) return -1
          if (b.scheduled_date) return 1
          const prio = { high: 0, medium: 1, low: 2 }
          return prio[a.priority] - prio[b.priority]
        })
      case 'waiting':
        return tasks.filter(t => t.status === 'waiting')
      case 'done':
        return tasks.filter(t => t.status === 'done' || t.status === 'cancelled')
          .sort((a, b) => (b.completed_at ?? b.updated_at).localeCompare(a.completed_at ?? a.updated_at))
          .slice(0, 30)
    }
  }, [tasks, activeTab, today])

  const overdueTasks = useMemo(() =>
    tasks.filter(t => {
      if (t.status === 'done' || t.status === 'cancelled' || t.status === 'archived') return false
      if (!t.scheduled_date) return false
      return isPast(parseISO(t.scheduled_date)) && t.scheduled_date !== today
    }),
    [tasks, today]
  )

  const inboxCount = inbox.length

  async function handleAddTask() {
    const title = newTitle.trim()
    if (!title) return
    setAdding(true)
    setAppError(null)
    try {
      const status: TaskStatus = newDate ? 'planned' : activeTab === 'next' ? 'next' : 'inbox'
      await addTask({
        title,
        status,
        priority: newPriority,
        project_id: newProjectId || undefined,
        scheduled_date: newDate || undefined,
      })
      setNewTitle('')
      setNewDate('')
      setNewProjectId('')
      setShowAdd(false)
    } catch (err) {
      setAppError(formatError(err))
    } finally {
      setAdding(false)
    }
  }

  async function handleComplete(id: string) {
    try {
      await completeTask(id)
    } catch (err) {
      setAppError(formatError(err))
    }
  }

  async function handleProcessCapture(captureId: string, taskTitle: string) {
    if (!taskTitle.trim()) return
    setProcessingId(captureId)
    try {
      const newTask = await addTask({ title: taskTitle, status: 'inbox' as TaskStatus, priority: 'medium' as Priority })
      await processCapture(captureId, 'task', newTask?.id)
    } catch (err) {
      setAppError(formatError(err))
    } finally {
      setProcessingId(null)
    }
  }

  async function handleDiscard(captureId: string) {
    try {
      await discardCapture(captureId)
    } catch (err) {
      setAppError(formatError(err))
    }
  }

  async function handleDeleteTask(id: string) {
    try {
      await removeTask(id)
      setConfirmDeleteId(null)
    } catch (err) {
      setAppError(formatError(err))
      setConfirmDeleteId(null)
    }
  }

  if (prodSyncStatus === 'loading') {
    return (
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <div className="h-8 bg-slate-100 rounded-xl animate-pulse w-32" />
        {[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-5 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0">
          <CheckSquare className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">Tarefas</h1>
          <p className="text-xs text-slate-400">{tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled' && t.status !== 'archived').length} ativas</p>
        </div>
        <HelpTooltip id="prod.tasks" />
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center text-white hover:bg-primary-600 transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <ProdSubNav />

      {appError && (
        <ErrorBanner title={appError.title} description={appError.description} action={appError.action} severity={appError.severity} onClose={() => setAppError(null)} />
      )}

      {/* Atrasadas */}
      {overdueTasks.length > 0 && (
        <div className="bg-expense-50 border border-expense-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-expense-500" />
            <p className="text-sm font-bold text-expense-700">{overdueTasks.length} tarefa{overdueTasks.length > 1 ? 's' : ''} em atraso</p>
          </div>
          <div className="space-y-1.5">
            {overdueTasks.slice(0, 3).map(t => (
              <div key={t.id} className="flex items-center gap-2 text-sm text-expense-700">
                <span className="w-1 h-1 rounded-full bg-expense-400 shrink-0" />
                <span className="truncate">{t.title}</span>
                {t.scheduled_date && (
                  <span className="ml-auto shrink-0 text-[10px] text-expense-400">
                    {format(parseISO(t.scheduled_date), "d MMM", { locale: ptBR })}
                  </span>
                )}
              </div>
            ))}
            {overdueTasks.length > 3 && (
              <p className="text-xs text-expense-400 pl-3">+ {overdueTasks.length - 3} mais</p>
            )}
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-bold text-slate-700">Nova tarefa</p>
            <button onClick={() => { setShowAdd(false); setNewTitle('') }}
              className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddTask()}
            placeholder="Título da tarefa…"
            autoFocus
            className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white transition-all"
          />
          <div className="flex gap-2">
            <select
              value={newPriority}
              onChange={e => setNewPriority(e.target.value as Priority)}
              className="flex-1 px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white"
            >
              <option value="low">Prioridade baixa</option>
              <option value="medium">Prioridade média</option>
              <option value="high">Prioridade alta</option>
            </select>
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white"
            />
          </div>
          {projects.filter(p => p.status === 'active').length > 0 && (
            <select
              value={newProjectId}
              onChange={e => setNewProjectId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white"
            >
              <option value="">Sem projeto</option>
              {projects.filter(p => p.status === 'active').map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          )}
          <button
            onClick={handleAddTask}
            disabled={!newTitle.trim() || adding}
            className="w-full py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-40 transition-colors"
          >
            {adding ? 'Salvando…' : 'Adicionar tarefa'}
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 overflow-x-auto">
        {FILTER_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-1 justify-center',
              activeTab === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {label}
            {key === 'inbox' && inboxCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 bg-amber-400 text-white text-[9px] font-bold rounded-full leading-none">{inboxCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Inbox captures (only shown on inbox tab when inbox has items) */}
      {activeTab === 'inbox' && inbox.length > 0 && (
        <div className="card p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Caixa de entrada — processar</p>
          <div className="space-y-3">
            {inbox.map(capture => (
              <InboxCaptureItem
                key={capture.id}
                capture={capture}
                processing={processingId === capture.id}
                onProcess={(title) => handleProcessCapture(capture.id, title)}
                onDiscard={() => handleDiscard(capture.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="card p-5">
        {filteredTasks.length === 0 ? (
          <EmptyState tab={activeTab} onAdd={() => setShowAdd(true)} />
        ) : (
          <div className="space-y-2">
            {filteredTasks.map(task => {
              const project = projects.find(p => p.id === task.project_id)
              const area = areas.find(a => a.id === (task.area_id ?? project?.area_id))
              const isOverdue = task.scheduled_date && isPast(parseISO(task.scheduled_date)) && task.scheduled_date !== today && task.status !== 'done'

              return (
                <div key={task.id} className={cn(
                  'flex items-start gap-3 p-3 rounded-xl transition-all',
                  isOverdue ? 'bg-expense-50' : 'bg-slate-50'
                )}>
                  {task.status === 'done' ? (
                    <CheckCircle2 className="w-4 h-4 text-income-400 shrink-0 mt-0.5" />
                  ) : (
                    <button onClick={() => handleComplete(task.id)} className="shrink-0 mt-0.5">
                      <Circle className="w-4 h-4 text-slate-300 hover:text-income-500 transition-colors" />
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium',
                      task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'
                    )}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {project && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: area?.color ?? '#6366F1' }} />
                          {project.title}
                        </span>
                      )}
                      {task.scheduled_date && (
                        <span className={cn('text-[10px]', isOverdue ? 'text-expense-500 font-semibold' : 'text-slate-400')}>
                          {format(parseISO(task.scheduled_date), "d MMM", { locale: ptBR })}
                        </span>
                      )}
                      {task.waiting_for && (
                        <span className="text-[10px] text-amber-500">Aguardando: {task.waiting_for}</span>
                      )}
                      {task.next_step && (
                        <span className="text-[10px] text-primary-500">▶ {task.next_step}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {task.priority !== 'medium' && (
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', PRIORITY_COLORS[task.priority])}>
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                    )}
                    {confirmDeleteId === task.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="px-2 py-1 bg-expense-500 text-white text-[10px] font-bold rounded-lg"
                        >
                          Apagar
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="w-6 h-6 bg-slate-200 rounded-lg flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-slate-500" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(task.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-expense-400 hover:bg-expense-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function InboxCaptureItem({
  capture, processing, onProcess, onDiscard
}: {
  capture: { id: string; content: string; created_at: string }
  processing: boolean
  onProcess: (title: string) => void
  onDiscard: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editedTitle, setEditedTitle] = useState(capture.content)

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
      >
        <Inbox className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-700 flex-1 leading-snug line-clamp-2">{capture.content}</p>
        <ChevronDown className={cn('w-4 h-4 text-slate-400 shrink-0 transition-transform', expanded && 'rotate-180')} />
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-100 pt-3">
          <input
            value={editedTitle}
            onChange={e => setEditedTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary-400 bg-white"
            placeholder="Título da tarefa…"
          />
          <div className="flex gap-2">
            <button
              onClick={() => onProcess(editedTitle)}
              disabled={processing || !editedTitle.trim()}
              className="flex-1 py-2 bg-primary-500 text-white text-xs font-semibold rounded-lg hover:bg-primary-600 disabled:opacity-40 transition-colors"
            >
              {processing ? 'Criando…' : 'Criar como tarefa'}
            </button>
            <button
              onClick={onDiscard}
              className="px-3 py-2 bg-slate-100 text-slate-500 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({ tab, onAdd }: { tab: FilterTab; onAdd: () => void }) {
  const messages: Record<FilterTab, { title: string; sub: string }> = {
    inbox:   { title: 'Caixa vazia', sub: 'Nenhum item para processar. Use a captura rápida na visão geral.' },
    today:   { title: 'Dia livre', sub: 'Nenhuma tarefa agendada para hoje.' },
    next:    { title: 'Lista limpa', sub: 'Nenhuma tarefa próxima. Adicione tarefas para trabalhar em seguida.' },
    waiting: { title: 'Nada em espera', sub: 'Nenhuma tarefa aguardando resposta ou ação externa.' },
    done:    { title: 'Nenhuma tarefa concluída', sub: 'As tarefas concluídas recentemente aparecerão aqui.' },
  }
  const { title, sub } = messages[tab]
  return (
    <div className="text-center py-8">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
      {tab !== 'done' && (
        <button onClick={onAdd}
          className="mt-4 px-4 py-2 bg-primary-50 text-primary-600 text-sm font-semibold rounded-xl hover:bg-primary-100 transition-colors inline-flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Nova tarefa
        </button>
      )}
    </div>
  )
}
