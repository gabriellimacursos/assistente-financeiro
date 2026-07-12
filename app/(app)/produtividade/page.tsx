'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Zap, Plus, CheckCircle2, Circle, Inbox, FolderKanban,
  ChevronRight, Target, Flame, ArrowRight, AlertTriangle, RefreshCw, Bell,
} from 'lucide-react'
import { format, isToday, isPast, parseISO, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useProductivityStore } from '@/lib/store/useProductivityStore'
import { formatError } from '@/lib/errors'
import ErrorBanner from '@/components/shared/ErrorBanner'
import ProdSubNav from '@/components/shared/ProdSubNav'
import { usePushPermission } from '@/components/shared/PushManager'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import HelpTooltip from '@/components/shared/HelpTooltip'
import type { ErrorCode } from '@/lib/errors'

export default function ProdutividadePage() {
  const router = useRouter()
  const {
    settings, areas, projects, tasks, todayFocus, weeklyOutcomes,
    inbox, addCapture, prodSyncStatus,
  } = useProductivityStore()

  const [quickCapture, setQuickCapture] = useState('')
  const [capturing, setCapturing] = useState(false)
  const [appError, setAppError] = useState<{ title: string; description: string; action: string; code?: ErrorCode; severity: 'error' | 'warning' } | null>(null)
  const [testingPush, setTestingPush] = useState(false)
  const [pushTestResult, setPushTestResult] = useState<'ok' | 'error' | null>(null)

  const { permission, subscribed, subscribe } = usePushPermission()

  const today = format(new Date(), 'yyyy-MM-dd')
  const todayLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const activeProjects = useMemo(() => projects.filter(p => p.status === 'active'), [projects])
  const maxActive = settings?.max_active_projects ?? 2
  const projectsOverLimit = activeProjects.length > maxActive

  const todayTasks = useMemo(() =>
    tasks.filter(t => t.scheduled_date === today && t.status !== 'done' && t.status !== 'cancelled'),
    [tasks, today]
  )

  const overdueTasks = useMemo(() =>
    tasks.filter(t => {
      if (t.status === 'done' || t.status === 'cancelled' || t.status === 'archived') return false
      if (!t.scheduled_date) return false
      return isPast(parseISO(t.scheduled_date)) && t.scheduled_date !== today
    }).slice(0, 3),
    [tasks, today]
  )

  const inboxCount = inbox.length

  const weekOutcomes = useMemo(() => weeklyOutcomes.filter(o => o.week_start === weekStart), [weeklyOutcomes, weekStart])
  const weekDone = weekOutcomes.filter(o => o.status === 'done').length

  const missionTask = useMemo(() => {
    if (todayFocus?.main_mission_id) return tasks.find(t => t.id === todayFocus.main_mission_id)
    return null
  }, [todayFocus, tasks])

  const missionText = todayFocus?.main_mission_text || missionTask?.title

  async function handleTestPush() {
    setTestingPush(true)
    setPushTestResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sem sessão')
      const res = await fetch('/api/push/test-tasks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      setPushTestResult(res.ok ? 'ok' : 'error')
    } catch {
      setPushTestResult('error')
    } finally {
      setTestingPush(false)
    }
  }

  async function handleQuickCapture() {
    const content = quickCapture.trim()
    if (!content) return
    setCapturing(true)
    try {
      await addCapture(content, 'quick')
      setQuickCapture('')
    } catch (err) {
      setAppError(formatError(err))
    } finally {
      setCapturing(false)
    }
  }

  if (prodSyncStatus === 'loading') {
    return (
      <div className="p-4 lg:p-8 space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Produtividade</h1>
            <p className="text-xs text-slate-400">Carregando...</p>
          </div>
        </div>
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-5 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-800">Produtividade</h1>
          <p className="text-xs text-slate-400 capitalize">{todayLabel}</p>
        </div>
        <HelpTooltip id="prod.overview" />
      </div>

      {/* Sub-nav */}
      <ProdSubNav />

      {/* Revisão semanal CTA */}
      <button
        onClick={() => router.push('/produtividade/revisao')}
        className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-50 to-primary-50 border border-primary-100 rounded-2xl hover:from-indigo-100 hover:to-primary-100 transition-all"
      >
        <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center shrink-0">
          <RefreshCw className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-slate-800">Revisão Semanal</p>
          <p className="text-xs text-slate-400">Feche a semana com clareza e planeje a próxima</p>
        </div>
        <ArrowRight className="w-4 h-4 text-primary-400 shrink-0" />
      </button>

      {appError && (
        <ErrorBanner title={appError.title} description={appError.description} action={appError.action} severity={appError.severity} onClose={() => setAppError(null)} />
      )}

      {/* Alerta: limite de projetos */}
      {projectsOverLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700">Limite de projetos ativos excedido</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Você tem {activeProjects.length} projetos ativos, mas o limite configurado é {maxActive}. Pause ou conclua algum para manter o foco.
            </p>
          </div>
        </div>
      )}

      {/* Missão do dia */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Missão de hoje</h2>
          <HelpTooltip id="prod.mission" className="ml-auto" />
        </div>
        {missionText ? (
          <div className="space-y-3">
            <button
              onClick={() => router.push('/produtividade/hoje')}
              className="w-full text-left bg-gradient-to-r from-primary-50 to-indigo-50 border border-primary-100 rounded-2xl p-4"
            >
              <p className="text-base font-bold text-slate-800 leading-snug">{missionText}</p>
              {missionTask?.next_step && (
                <p className="text-xs text-primary-600 mt-2">
                  <span className="font-semibold">Próximo passo:</span> {missionTask.next_step}
                </p>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={() => router.push('/produtividade/hoje')}
            className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all"
          >
            <span className="text-sm text-slate-400 font-medium">Definir missão principal do dia</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Hoje */}
      {(todayTasks.length > 0 || overdueTasks.length > 0) && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Tarefas do dia</h2>
            <button onClick={() => router.push('/produtividade/hoje')} className="text-xs font-semibold text-primary-500">Ver tudo</button>
          </div>
          <div className="space-y-2">
            {todayTasks.slice(0, 4).map(t => (
              <button key={t.id} onClick={() => router.push('/produtividade/tarefas')}
                className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-left">
                <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                <span className="text-sm text-slate-700 truncate">{t.title}</span>
                {t.priority === 'high' && <span className="ml-auto shrink-0 text-[10px] font-bold text-expense-500 bg-expense-50 px-1.5 py-0.5 rounded-full">Alta</span>}
              </button>
            ))}
            {overdueTasks.length > 0 && (
              <div className="pt-1">
                <p className="text-[10px] font-bold text-expense-500 uppercase tracking-wider mb-1.5">Atrasadas</p>
                {overdueTasks.map(t => (
                  <button key={t.id} onClick={() => router.push('/produtividade/tarefas')}
                    className="w-full flex items-center gap-3 p-3 bg-expense-50 rounded-xl mb-1.5 text-left">
                    <AlertTriangle className="w-3.5 h-3.5 text-expense-400 shrink-0" />
                    <span className="text-sm text-slate-700 truncate">{t.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Entregas da semana */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary-500" />
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Semana</h2>
          </div>
          <span className="text-xs text-slate-400">{weekDone}/{weekOutcomes.length} concluídas</span>
        </div>
        {weekOutcomes.length > 0 ? (
          <div className="space-y-2">
            {weekOutcomes.map(o => (
              <div key={o.id} className={cn(
                'flex items-center gap-3 p-3 rounded-xl',
                o.status === 'done' ? 'bg-income-50' : 'bg-slate-50'
              )}>
                {o.status === 'done'
                  ? <CheckCircle2 className="w-4 h-4 text-income-500 shrink-0" />
                  : <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium truncate', o.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700')}>{o.title}</p>
                  <p className="text-[10px] text-slate-400">{o.category_label}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <button onClick={() => router.push('/produtividade/hoje')}
            className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all">
            <span className="text-sm text-slate-400">Definir entregas desta semana</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Projetos ativos */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-primary-500" />
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Projetos ativos</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-bold', projectsOverLimit ? 'text-expense-500' : 'text-slate-400')}>
              {activeProjects.length}/{maxActive}
            </span>
            <button onClick={() => router.push('/produtividade/projetos')} className="text-xs font-semibold text-primary-500">Ver todos</button>
          </div>
        </div>
        {activeProjects.length > 0 ? (
          <div className="space-y-2">
            {activeProjects.slice(0, maxActive + 1).map(p => {
              const area = areas.find(a => a.id === p.area_id)
              return (
                <button key={p.id} onClick={() => router.push('/produtividade/projetos')}
                  className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-left">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: area?.color ?? '#6366F1' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.title}</p>
                    {area && <p className="text-[10px] text-slate-400">{area.name}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              )
            })}
          </div>
        ) : (
          <button onClick={() => router.push('/produtividade/projetos')}
            className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all">
            <span className="text-sm text-slate-400">Criar primeiro projeto</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Notificações de tarefas */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-primary-500" />
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Notificações de tarefas</h2>
        </div>
        {!subscribed ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Ative as notificações para receber um resumo das suas tarefas todo dia às 8h da manhã.
            </p>
            <button
              onClick={subscribe}
              className="w-full py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
            >
              <Bell className="w-4 h-4" /> Ativar notificações
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 py-2 px-3 bg-income-50 rounded-xl">
              <Bell className="w-4 h-4 text-income-500 shrink-0" />
              <p className="text-xs text-income-700 font-medium">Notificações ativas — resumo todo dia às 8h</p>
            </div>
            <button
              onClick={handleTestPush}
              disabled={testingPush}
              className="w-full py-2 bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-200 disabled:opacity-40 transition-colors"
            >
              {testingPush ? 'Enviando…' : 'Testar notificação agora'}
            </button>
            {pushTestResult === 'ok' && (
              <p className="text-xs text-income-600 text-center">Notificação enviada! Verifique seu dispositivo.</p>
            )}
            {pushTestResult === 'error' && (
              <p className="text-xs text-expense-600 text-center">Erro ao enviar. Verifique as permissões do navegador.</p>
            )}
          </div>
        )}
      </div>

      {/* Caixa de entrada */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-primary-500" />
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Captura rápida</h2>
            <HelpTooltip id="prod.capture" />
          </div>
          {inboxCount > 0 && (
            <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{inboxCount} na caixa</span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={quickCapture}
            onChange={e => setQuickCapture(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuickCapture()}
            placeholder="Capturar ideia, tarefa ou anotação…"
            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white transition-all"
          />
          <button
            onClick={handleQuickCapture}
            disabled={!quickCapture.trim() || capturing}
            className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center text-white hover:bg-primary-600 disabled:opacity-40 transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {inboxCount > 0 && (
          <button onClick={() => router.push('/produtividade/tarefas')}
            className="mt-3 w-full text-center text-xs font-semibold text-primary-500 hover:text-primary-600 transition-colors">
            Processar {inboxCount} item{inboxCount > 1 ? 's' : ''} da caixa de entrada →
          </button>
        )}
      </div>

    </div>
  )
}
