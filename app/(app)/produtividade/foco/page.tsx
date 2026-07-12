'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Play, Pause, Square, ArrowLeft, Plus,
  CheckCircle2, Flame, Coffee, Target,
} from 'lucide-react'
import { useProductivityStore } from '@/lib/store/useProductivityStore'
import { formatError } from '@/lib/errors'
import HelpTooltip from '@/components/shared/HelpTooltip'
import { cn } from '@/lib/utils'
import type { ErrorCode } from '@/lib/errors'

type Phase = 'idle' | 'focus' | 'break'

// ── Inner component (uses useSearchParams — must be inside Suspense) ──────────

function FocoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const taskId = searchParams.get('taskId') ?? ''

  const { settings, tasks, completeTask, updateTask } = useProductivityStore()

  const FOCUS_SECS = (settings?.focus_duration ?? 75) * 60
  const BREAK_SECS  = (settings?.break_duration  ?? 15) * 60

  const [phase,             setPhase]             = useState<Phase>('idle')
  const [timeLeft,          setTimeLeft]           = useState(FOCUS_SECS)
  const [running,           setRunning]            = useState(false)
  const [interruptions,     setInterruptions]      = useState(0)
  const [sessionsCompleted, setSessionsCompleted]  = useState(0)
  const [showSummary,       setShowSummary]        = useState(false)
  const [resumeNote,        setResumeNote]         = useState('')
  const [saving,            setSaving]             = useState(false)
  const [appError, setAppError] = useState<{ title: string; description: string; action: string; code?: ErrorCode; severity: 'error' | 'warning' } | null>(null)

  const task = tasks.find(t => t.id === taskId)

  // ── Countdown tick ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running || timeLeft <= 0) return
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(timer)
  }, [running, timeLeft])

  // ── Phase transition when time hits 0 ──────────────────────────────────────
  useEffect(() => {
    if (timeLeft > 0 || !running) return
    if (phase === 'focus') {
      setSessionsCompleted(s => s + 1)
      setPhase('break')
      setTimeLeft(BREAK_SECS)
    } else {
      setPhase('focus')
      setTimeLeft(FOCUS_SECS)
    }
  }, [timeLeft, running, phase, FOCUS_SECS, BREAK_SECS])

  function handleStart() {
    setPhase('focus')
    setTimeLeft(FOCUS_SECS)
    setRunning(true)
  }

  function handleStop() {
    setRunning(false)
    setShowSummary(true)
  }

  async function handleFinish(markDone: boolean) {
    setSaving(true)
    setAppError(null)
    try {
      if (task) {
        if (markDone) {
          await completeTask(task.id)
        } else if (resumeNote.trim()) {
          await updateTask(task.id, { resume_note: resumeNote.trim() })
        }
      }
      router.push('/produtividade/hoje')
    } catch (err) {
      setAppError(formatError(err))
      setSaving(false)
    }
  }

  const totalSecs    = phase === 'break' ? BREAK_SECS : FOCUS_SECS
  const pct          = timeLeft / (totalSecs || 1)
  const mins         = Math.floor(timeLeft / 60)
  const secs         = timeLeft % 60
  const isFocus      = phase === 'focus'

  // SVG circle
  const R  = 88
  const C  = 2 * Math.PI * R
  const strokeOffset = C * (1 - pct)

  // ── Summary screen ──────────────────────────────────────────────────────────
  if (showSummary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 space-y-5">
          <div className="text-center">
            <div className="w-16 h-16 bg-income-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-income-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Sessão encerrada</h2>
            <div className="flex items-center justify-center gap-4 mt-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800">{sessionsCompleted}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">sessões</p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800">{interruptions}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">interrupções</p>
              </div>
            </div>
          </div>

          {task && (
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tarefa</p>
              <p className="text-sm font-semibold text-slate-800">{task.title}</p>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Próximo passo (opcional)
            </label>
            <textarea
              value={resumeNote}
              onChange={e => setResumeNote(e.target.value)}
              placeholder="O que falta fazer para concluir esta tarefa?"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white resize-none"
            />
          </div>

          {appError && (
            <p className="text-xs text-expense-600 bg-expense-50 rounded-xl px-3 py-2">{appError.description}</p>
          )}

          <div className="space-y-2">
            {task && (
              <button
                onClick={() => handleFinish(true)}
                disabled={saving}
                className="w-full py-3 bg-income-500 text-white font-semibold rounded-2xl hover:bg-income-600 disabled:opacity-40 transition-colors"
              >
                {saving ? 'Salvando…' : 'Marcar tarefa como concluída'}
              </button>
            )}
            <button
              onClick={() => handleFinish(false)}
              disabled={saving}
              className="w-full py-3 bg-slate-100 text-slate-700 font-semibold rounded-2xl hover:bg-slate-200 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Salvando…' : 'Salvar e voltar'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Idle / start screen ─────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950 flex flex-col items-center justify-center p-6 gap-8 relative">
        <button
          onClick={() => router.back()}
          className="absolute top-6 left-6 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div className="absolute top-6 right-6">
          <HelpTooltip id="prod.focus" />
        </div>

        <div className="text-center">
          <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Flame className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Sessão de Foco</h1>
          <p className="text-slate-400 mt-1 text-sm">
            {FOCUS_SECS / 60} min foco · {BREAK_SECS / 60} min pausa
          </p>
        </div>

        {task ? (
          <div className="w-full max-w-sm bg-white/10 border border-white/10 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Trabalhando em</p>
            <p className="text-white font-semibold leading-snug">{task.title}</p>
            {task.next_step && (
              <p className="text-amber-300 text-xs mt-2">▶ {task.next_step}</p>
            )}
          </div>
        ) : (
          <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <Target className="w-5 h-5 text-slate-400 mx-auto mb-1" />
            <p className="text-slate-400 text-sm">Sessão livre — sem tarefa vinculada</p>
          </div>
        )}

        <button
          onClick={handleStart}
          className="w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center shadow-2xl shadow-amber-500/30 hover:bg-amber-400 transition-all active:scale-95"
        >
          <Play className="w-10 h-10 text-white ml-1" />
        </button>
      </div>
    )
  }

  // ── Active timer ────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      'min-h-screen flex flex-col items-center justify-between p-6 transition-colors duration-1000',
      isFocus
        ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950'
        : 'bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950'
    )}>

      {/* Top bar */}
      <div className="w-full flex items-center justify-between pt-2">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div className={cn(
          'px-4 py-1.5 rounded-full text-xs font-bold tracking-wider',
          isFocus ? 'bg-amber-500/20 text-amber-300' : 'bg-teal-500/20 text-teal-300'
        )}>
          {isFocus ? `FOCO — SESSÃO ${sessionsCompleted + 1}` : 'PAUSA ATIVA'}
        </div>

        {/* Interruption button */}
        <button
          onClick={() => setInterruptions(i => i + 1)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
          title="Registrar interrupção"
        >
          <Plus className="w-4 h-4 text-expense-300" />
          <span className="text-expense-300 text-xs font-bold">{interruptions}</span>
        </button>
      </div>

      {/* Circle timer */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <svg width="220" height="220" className="-rotate-90">
            {/* Track */}
            <circle
              cx="110" cy="110" r={R}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="8"
            />
            {/* Progress */}
            <circle
              cx="110" cy="110" r={R}
              fill="none"
              stroke={isFocus ? '#F59E0B' : '#14B8A6'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={strokeOffset}
              style={{ transition: 'stroke-dashoffset 0.9s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-white tabular-nums tracking-tight">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
            <div className={cn('flex items-center gap-1.5 mt-2')}>
              {isFocus
                ? <Flame className="w-4 h-4 text-amber-400" />
                : <Coffee className="w-4 h-4 text-teal-400" />
              }
              <span className={cn('text-xs font-bold tracking-widest', isFocus ? 'text-amber-400' : 'text-teal-400')}>
                {isFocus ? 'FOCO' : 'PAUSA'}
              </span>
            </div>
          </div>
        </div>

        {/* Task */}
        {task && (
          <div className="text-center max-w-xs px-4">
            <p className="text-white font-semibold leading-snug">{task.title}</p>
            {task.next_step && (
              <p className="text-amber-300 text-xs mt-1.5">▶ {task.next_step}</p>
            )}
          </div>
        )}

        {/* Sessions dots */}
        {sessionsCompleted > 0 && (
          <div className="flex items-center gap-2">
            {Array.from({ length: sessionsCompleted }).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-amber-400" />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-8 pb-10">
        <button
          onClick={handleStop}
          className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-colors"
          title="Encerrar sessão"
        >
          <Square className="w-6 h-6 text-white" />
        </button>

        <button
          onClick={() => setRunning(r => !r)}
          className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95',
            isFocus
              ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/30'
              : 'bg-teal-500 hover:bg-teal-400 shadow-teal-500/30'
          )}
        >
          {running
            ? <Pause className="w-8 h-8 text-white" />
            : <Play  className="w-8 h-8 text-white ml-1" />
          }
        </button>

        <div className="w-14 h-14 flex flex-col items-center justify-center">
          <span className={cn('text-lg font-bold', isFocus ? 'text-amber-400' : 'text-teal-400')}>
            {sessionsCompleted}
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider leading-none">
            {sessionsCompleted === 1 ? 'sessão' : 'sessões'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Page export with Suspense (required for useSearchParams in App Router) ────

export default function FocoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-amber-950 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-amber-500/30 border-t-amber-500 animate-spin" />
      </div>
    }>
      <FocoContent />
    </Suspense>
  )
}
