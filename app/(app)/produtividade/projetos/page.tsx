'use client'
import { useState, useMemo } from 'react'
import {
  FolderKanban, Plus, AlertTriangle, X, Trash2,
  Circle, CheckCircle2, Clock, Layers,
} from 'lucide-react'
import { useProductivityStore } from '@/lib/store/useProductivityStore'
import { formatError } from '@/lib/errors'
import ErrorBanner from '@/components/shared/ErrorBanner'
import ProdSubNav from '@/components/shared/ProdSubNav'
import { cn } from '@/lib/utils'
import HelpTooltip from '@/components/shared/HelpTooltip'
import { PROJECT_STATUS_LABELS, PRIORITY_LABELS } from '@/types/productivity'
import type { ErrorCode } from '@/lib/errors'
import type { ProjectStatus, Priority, WorkType } from '@/types/productivity'

type GroupTab = 'active' | 'waiting' | 'someday' | 'done'

const GROUP_TABS: { key: GroupTab; label: string }[] = [
  { key: 'active',  label: 'Ativos'   },
  { key: 'waiting', label: 'Em espera' },
  { key: 'someday', label: 'Depois'   },
  { key: 'done',    label: 'Concluídos' },
]

const STATUS_ICON: Record<GroupTab, React.ElementType> = {
  active:  Circle,
  waiting: Clock,
  someday: Layers,
  done:    CheckCircle2,
}

export default function ProjetosPage() {
  const {
    settings, projects, areas, tasks,
    addProject, updateProject, removeProject,
    prodSyncStatus,
  } = useProductivityStore()

  const [activeTab, setActiveTab] = useState<GroupTab>('active')
  const [showAdd, setShowAdd] = useState(false)
  const [appError, setAppError] = useState<{ title: string; description: string; action: string; code?: ErrorCode; severity: 'error' | 'warning' } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // New project form
  const [newTitle, setNewTitle] = useState('')
  const [newAreaId, setNewAreaId] = useState('')
  const [newObjective, setNewObjective] = useState('')
  const [newPriority, setNewPriority] = useState<Priority>('medium')
  const [newWorkType, setNewWorkType] = useState<WorkType>('operational')
  const [adding, setAdding] = useState(false)

  const maxActive = settings?.max_active_projects ?? 2
  const activeProjects = useMemo(() => projects.filter(p => p.status === 'active'), [projects])
  const projectsOverLimit = activeProjects.length > maxActive

  const filteredProjects = useMemo(() =>
    projects.filter(p => p.status === activeTab)
      .sort((a, b) => a.title.localeCompare(b.title)),
    [projects, activeTab]
  )

  const taskCountByProject = useMemo(() => {
    const counts: Record<string, { total: number; done: number }> = {}
    tasks.forEach(t => {
      if (!t.project_id) return
      if (!counts[t.project_id]) counts[t.project_id] = { total: 0, done: 0 }
      counts[t.project_id].total++
      if (t.status === 'done') counts[t.project_id].done++
    })
    return counts
  }, [tasks])

  async function handleAddProject() {
    const title = newTitle.trim()
    if (!title) return
    setAdding(true)
    setAppError(null)
    try {
      await addProject({
        title,
        area_id: newAreaId || undefined,
        objective: newObjective.trim() || undefined,
        priority: newPriority,
        work_type: newWorkType,
        status: 'active',
      })
      setNewTitle('')
      setNewAreaId('')
      setNewObjective('')
      setNewPriority('medium')
      setShowAdd(false)
    } catch (err) {
      setAppError(formatError(err))
    } finally {
      setAdding(false)
    }
  }

  async function handleChangeStatus(id: string, status: ProjectStatus) {
    try {
      await updateProject(id, { status })
    } catch (err) {
      setAppError(formatError(err))
    }
  }

  async function handleDeleteProject(id: string) {
    try {
      await removeProject(id)
      setConfirmDeleteId(null)
    } catch (err) {
      setAppError(formatError(err))
      setConfirmDeleteId(null)
    }
  }

  if (prodSyncStatus === 'loading') {
    return (
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <div className="h-8 bg-slate-100 rounded-xl animate-pulse w-36" />
        {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-5 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0">
          <FolderKanban className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">Projetos</h1>
          <p className={cn('text-xs font-semibold', projectsOverLimit ? 'text-expense-500' : 'text-slate-400')}>
            {activeProjects.length}/{maxActive} ativos
          </p>
        </div>
        <HelpTooltip id="prod.projects" />
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

      {/* Alerta de limite */}
      {projectsOverLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-700">Limite de projetos excedido</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Você tem {activeProjects.length} projetos ativos. Mova alguns para "Em espera" ou "Depois" para manter o foco.
            </p>
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700">Novo projeto</p>
            <button onClick={() => { setShowAdd(false); setNewTitle('') }}
              className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && newObjective === '' && handleAddProject()}
            placeholder="Nome do projeto…"
            autoFocus
            className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white transition-all"
          />
          <input
            value={newObjective}
            onChange={e => setNewObjective(e.target.value)}
            placeholder="Objetivo (opcional)…"
            className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white transition-all"
          />
          <div className="flex gap-2">
            <select
              value={newAreaId}
              onChange={e => setNewAreaId(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white"
            >
              <option value="">Sem área</option>
              {areas.filter(a => a.active).map(a => (
                <option key={a.id} value={a.id}>{a.icon ? `${a.icon} ` : ''}{a.name}</option>
              ))}
            </select>
            <select
              value={newPriority}
              onChange={e => setNewPriority(e.target.value as Priority)}
              className="flex-1 px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white"
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <select
            value={newWorkType}
            onChange={e => setNewWorkType(e.target.value as WorkType)}
            className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white"
          >
            <option value="strategic">Estratégico</option>
            <option value="operational">Operacional</option>
            <option value="administrative">Administrativo</option>
            <option value="personal">Pessoal</option>
          </select>
          <button
            onClick={handleAddProject}
            disabled={!newTitle.trim() || adding}
            className="w-full py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-40 transition-colors"
          >
            {adding ? 'Salvando…' : 'Criar projeto'}
          </button>
        </div>
      )}

      {/* Group tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 overflow-x-auto">
        {GROUP_TABS.map(({ key, label }) => {
          const count = projects.filter(p => p.status === key).length
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-1 justify-center',
                activeTab === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {label}
              {count > 0 && (
                <span className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none',
                  activeTab === key ? 'bg-primary-100 text-primary-700' : 'bg-slate-200 text-slate-500'
                )}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Project list */}
      <div className="space-y-3">
        {filteredProjects.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm font-semibold text-slate-500">{PROJECT_STATUS_LABELS[activeTab as ProjectStatus]} — nenhum projeto</p>
            {activeTab === 'active' && (
              <button onClick={() => setShowAdd(true)}
                className="mt-4 px-4 py-2 bg-primary-50 text-primary-600 text-sm font-semibold rounded-xl hover:bg-primary-100 transition-colors inline-flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Criar primeiro projeto
              </button>
            )}
          </div>
        ) : (
          filteredProjects.map(project => {
            const area = areas.find(a => a.id === project.area_id)
            const counts = taskCountByProject[project.id]
            const tasksDone = counts?.done ?? 0
            const tasksTotal = counts?.total ?? 0
            const pct = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0

            return (
              <div key={project.id} className="card p-5">
                {/* Top row */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0 mt-1.5"
                    style={{ background: area?.color ?? '#6366F1' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-bold leading-snug', project.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800')}>
                      {project.title}
                    </p>
                    {area && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{area.icon} {area.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {project.priority === 'high' && (
                      <span className="text-[10px] font-bold text-expense-500 bg-expense-50 px-1.5 py-0.5 rounded-full">Alta</span>
                    )}
                    {confirmDeleteId === project.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDeleteProject(project.id)}
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
                        onClick={() => setConfirmDeleteId(project.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-expense-400 hover:bg-expense-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Objective */}
                {project.objective && (
                  <p className="text-xs text-slate-500 mb-3 pl-6 leading-relaxed">{project.objective}</p>
                )}

                {/* Progress */}
                {tasksTotal > 0 && (
                  <div className="mb-3 pl-6">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-400">{tasksDone}/{tasksTotal} tarefas</span>
                      <span className="text-[10px] font-semibold text-slate-500">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-income-500' : 'bg-primary-500')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                {project.status !== 'done' && project.status !== 'archived' && (
                  <div className="flex gap-1.5 pl-6 flex-wrap">
                    {project.status !== 'active' && (
                      <button
                        onClick={() => handleChangeStatus(project.id, 'active')}
                        className="px-3 py-1.5 bg-primary-50 text-primary-600 text-[11px] font-semibold rounded-lg hover:bg-primary-100 transition-colors"
                      >
                        Ativar
                      </button>
                    )}
                    {project.status === 'active' && (
                      <button
                        onClick={() => handleChangeStatus(project.id, 'waiting')}
                        className="px-3 py-1.5 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        Em espera
                      </button>
                    )}
                    {project.status !== 'someday' && (
                      <button
                        onClick={() => handleChangeStatus(project.id, 'someday')}
                        className="px-3 py-1.5 bg-slate-100 text-slate-500 text-[11px] font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        Depois
                      </button>
                    )}
                    <button
                      onClick={() => handleChangeStatus(project.id, 'done')}
                      className="px-3 py-1.5 bg-income-50 text-income-600 text-[11px] font-semibold rounded-lg hover:bg-income-100 transition-colors"
                    >
                      Concluir
                    </button>
                  </div>
                )}

                {project.status === 'done' && (
                  <div className="flex items-center gap-1.5 pl-6">
                    <CheckCircle2 className="w-3.5 h-3.5 text-income-500" />
                    <span className="text-xs text-income-600 font-medium">Concluído</span>
                    <button
                      onClick={() => handleChangeStatus(project.id, 'active')}
                      className="ml-auto px-3 py-1.5 bg-slate-100 text-slate-500 text-[11px] font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Reabrir
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}
