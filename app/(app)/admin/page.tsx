'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, Clock, CheckCircle, XCircle, Trash2, Shield,
  RefreshCw, Search, KeyRound, AlertTriangle, UserCheck, UserX,
  Mail, Calendar, Bell, Smartphone, Activity, TrendingUp, BarChart2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useFinanceStore } from '@/lib/store/useFinanceStore'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import HelpTooltip from '@/components/shared/HelpTooltip'
import ErrorBanner from '@/components/shared/ErrorBanner'
import { AppError, formatError } from '@/lib/errors'
import type { ErrorCode } from '@/lib/errors'

type RegistryUser = {
  id: string
  user_id: string
  email: string
  status: 'pending' | 'active' | 'suspended'
  is_admin: boolean
  created_at: string
}

type Toast = { id: number; message: string; type: 'success' | 'error' }

const STATUS_CONFIG = {
  pending:   { label: 'Aguardando', cls: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400' },
  active:    { label: 'Ativo',      cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  suspended: { label: 'Suspenso',   cls: 'bg-red-100 text-red-700',        dot: 'bg-red-400' },
}

let toastId = 0

export default function AdminPage() {
  const router = useRouter()
  const { isAdmin, syncStatus, profiles, activeProfileId } = useFinanceStore()
  const [users, setUsers] = useState<RegistryUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RegistryUser | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [appError, setAppError] = useState<{ title: string; description: string; action: string; code?: ErrorCode; severity: 'error' | 'warning' } | null>(null)
  const [notifTitle, setNotifTitle] = useState('')
  const [notifBody, setNotifBody] = useState('')
  const [notifUrl, setNotifUrl] = useState('/dashboard')
  const [sendingNotif, setSendingNotif] = useState(false)
  const [notifHistory, setNotifHistory] = useState<{ id: string; title: string; body: string; sent_at: string; recipient_count: number }[]>([])
  const [metrics, setMetrics] = useState<{
    totalDevices: number
    uniqueSubscribedUsers: number
    totalTransactions: number
    topUsers: { email: string; count: number }[]
  } | null>(null)
  const [loadingMetrics, setLoadingMetrics] = useState(false)

  useEffect(() => {
    if (syncStatus === 'loading') return
    const activeProfile = profiles.find(p => p.id === activeProfileId)
    const canAccess = isAdmin && (activeProfile?.isOwner ?? false)
    if (syncStatus === 'ready' && !canAccess) { router.replace('/dashboard'); return }
    if (syncStatus === 'ready' && canAccess) loadUsers()
  }, [syncStatus, isAdmin, router, profiles, activeProfileId])

  // Atualiza métricas quando a aba volta ao foco
  useEffect(() => {
    function onFocus() { loadMetrics() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  async function loadNotifHistory() {
    const { data } = await supabase
      .from('broadcast_notifications')
      .select('id, title, body, sent_at, recipient_count')
      .order('sent_at', { ascending: false })
      .limit(5)
    setNotifHistory(data ?? [])
  }

  async function loadMetrics() {
    setLoadingMetrics(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoadingMetrics(false); return }
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) setMetrics(await res.json())
      else setAppError(formatError(new AppError('ADM-004', 'Erro ao carregar métricas do sistema')))
    } catch {
      setAppError(formatError(new AppError('ADM-004', 'Falha de rede ao buscar métricas')))
    }
    setLoadingMetrics(false)
  }

  async function sendBroadcast() {
    if (!notifTitle.trim() || !notifBody.trim()) return
    setSendingNotif(true)
    setAppError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setAppError(formatError(new AppError('ADM-002', 'Sessão expirada. Faça login novamente.')))
      setSendingNotif(false)
      return
    }

    try {
      const res = await fetch('/api/push/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ title: notifTitle, body: notifBody, url: notifUrl }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.sent === 0) {
          addToast('Nenhum dispositivo inscrito ainda — ninguém ativou notificações', 'error')
        } else {
          addToast(`Enviado para ${data.sent} dispositivo${data.sent !== 1 ? 's' : ''} ✅`)
        }
        setNotifTitle('')
        setNotifBody('')
        loadNotifHistory()
      } else {
        setAppError(formatError(new AppError('ADM-003', data.error ?? 'Erro ao enviar notificação')))
      }
    } catch {
      setAppError(formatError(new AppError('ADM-003', 'Falha de rede ao enviar notificação. Verifique sua conexão.')))
    }
    setSendingNotif(false)
  }

  async function loadUsers() {
    setLoading(true)
    setAppError(null)
    const { data, error } = await supabase
      .from('user_registry')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setAppError(formatError(new AppError('ADM-001', error.message)))
    setUsers(data ?? [])
    setLoading(false)
    loadNotifHistory()
    loadMetrics()
  }

  async function updateStatus(userId: string, status: 'active' | 'suspended') {
    setProcessingId(userId)
    const { error } = await supabase
      .from('user_registry')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
    if (error) {
      addToast('Erro ao atualizar status', 'error')
    } else {
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, status } : u))
      const labels = { active: 'aprovado ✅', suspended: 'suspenso 🚫' }
      addToast(`Usuário ${labels[status]}`)
    }
    setProcessingId(null)
  }

  async function sendPasswordReset(email: string, userId: string) {
    setProcessingId(userId)
    const redirectTo = `${window.location.origin}/redefinir-senha`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) {
      addToast('Erro ao enviar e-mail de reset', 'error')
    } else {
      addToast(`Link de redefinição enviado para ${email} 🔑`)
    }
    setProcessingId(null)
  }

  async function deleteUserCompletely() {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.user_id)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { addToast('Sessão expirada', 'error'); setDeleteTarget(null); setDeletingId(null); return }

    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId: deleteTarget.user_id }),
    })

    if (res.ok) {
      setUsers(prev => prev.filter(u => u.user_id !== deleteTarget.user_id))
      addToast(`Usuário ${deleteTarget.email} deletado permanentemente 🗑️`)
    } else {
      const data = await res.json()
      addToast(data.error ?? 'Erro ao deletar usuário', 'error')
    }

    setDeleteTarget(null)
    setDeletingId(null)
  }

  const filtered = users.filter(u =>
    search.trim() === '' || u.email.toLowerCase().includes(search.toLowerCase())
  )
  const pending   = filtered.filter(u => u.status === 'pending')
  const active    = filtered.filter(u => u.status === 'active')
  const suspended = filtered.filter(u => u.status === 'suspended')

  if (loading || syncStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 lg:p-8 space-y-5 pb-24 lg:pb-8">

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={cn(
            'px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold animate-fade-up max-w-xs',
            t.type === 'success' ? 'bg-slate-800 text-white' : 'bg-red-500 text-white'
          )}>{t.message}</div>
        ))}
      </div>

      {/* Modal de confirmação de delete */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800">Deletar permanentemente?</h3>
              <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                Esta ação vai apagar <span className="font-semibold text-slate-700">{deleteTarget.email}</span> e <span className="font-semibold text-red-600">todos os dados desta conta</span> (perfis, lançamentos, cartões, etc.) para sempre. Não tem como desfazer.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl text-sm font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={deleteUserCompletely}
                disabled={!!deletingId}
                className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-sm font-bold hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deletingId ? 'Deletando...' : 'Sim, deletar tudo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Shield className="w-5 h-5 text-primary-500" />
            <h1 className="text-2xl font-bold text-slate-800">Painel Admin</h1>
            <HelpTooltip id="admin.panel" />
          </div>
          <p className="text-slate-500 text-sm">Controle total sobre os usuários</p>
        </div>
        <div className="flex items-center gap-2">
          <HelpTooltip id="admin.refresh" />
          <button
            onClick={loadUsers}
            className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors"
            title="Recarregar lista"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Error banner */}
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

      {/* Métricas do sistema */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary-500" />
            <h2 className="font-bold text-slate-800">Métricas do sistema</h2>
            <HelpTooltip id="admin.metrics" />
          </div>
          <button
            onClick={loadMetrics}
            disabled={loadingMetrics}
            className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors disabled:opacity-40"
            title="Atualizar métricas"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 text-slate-500', loadingMetrics && 'animate-spin')} />
          </button>
        </div>

        {loadingMetrics && !metrics ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : metrics ? (
          <div className="space-y-4">
            {/* Cards de métricas */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-primary-50 rounded-2xl p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Smartphone className="w-3.5 h-3.5 text-primary-500" />
                  <p className="text-[10px] text-primary-600 font-bold uppercase tracking-wider">Dispositivos push</p>
                </div>
                <p className="text-2xl font-bold text-primary-700">{metrics.totalDevices}</p>
                <p className="text-[10px] text-primary-500 mt-0.5">{metrics.uniqueSubscribedUsers} usuário{metrics.uniqueSubscribedUsers !== 1 ? 's' : ''} inscrito{metrics.uniqueSubscribedUsers !== 1 ? 's' : ''}</p>
              </div>
              <div className="bg-income-50 rounded-2xl p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Activity className="w-3.5 h-3.5 text-income-600" />
                  <p className="text-[10px] text-income-600 font-bold uppercase tracking-wider">Lançamentos</p>
                </div>
                <p className="text-2xl font-bold text-income-700">{metrics.totalTransactions.toLocaleString('pt-BR')}</p>
                <p className="text-[10px] text-income-500 mt-0.5">total no sistema</p>
              </div>
            </div>

            {/* Top usuários */}
            {metrics.topUsers.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-slate-400" />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mais ativos</p>
                </div>
                {metrics.topUsers.map((u, i) => {
                  const max = metrics.topUsers[0]?.count ?? 1
                  const pct = Math.round((u.count / max) * 100)
                  return (
                    <div key={u.email} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 w-3">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-xs text-slate-700 font-medium truncate">{u.email}</p>
                          <p className="text-[10px] text-slate-400 ml-2 shrink-0">{u.count} lanç.</p>
                        </div>
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-400 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-4">Clique em atualizar para carregar as métricas</p>
        )}
      </div>

      {/* Notificações Broadcast */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary-500" />
          <h2 className="font-bold text-slate-800">Enviar notificação</h2>
          <HelpTooltip id="admin.notifications" />
        </div>

        <div className="space-y-2">
          <input
            value={notifTitle}
            onChange={e => setNotifTitle(e.target.value)}
            placeholder="Título da notificação"
            className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white"
          />
          <textarea
            value={notifBody}
            onChange={e => setNotifBody(e.target.value)}
            placeholder="Mensagem…"
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white resize-none"
          />
          <div className="flex gap-2">
            <input
              value={notifUrl}
              onChange={e => setNotifUrl(e.target.value)}
              placeholder="URL de destino (ex: /dashboard)"
              className="flex-1 px-3 py-2 rounded-xl border-2 border-slate-200 text-xs outline-none focus:border-primary-400 bg-white"
            />
            <button
              onClick={sendBroadcast}
              disabled={sendingNotif || !notifTitle.trim() || !notifBody.trim()}
              className="px-4 py-2 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              {sendingNotif ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
              Enviar
            </button>
          </div>
        </div>

        {notifHistory.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Últimas enviadas</p>
            {notifHistory.map(n => (
              <div key={n.id} className="flex items-start justify-between gap-2 text-xs">
                <div>
                  <p className="font-semibold text-slate-700">{n.title}</p>
                  <p className="text-slate-400">{n.body}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-slate-400">{n.recipient_count} disp.</p>
                  <p className="text-slate-300">{format(parseISO(n.sent_at), 'd MMM HH:mm', { locale: ptBR })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Total',      value: users.length,                          color: 'text-slate-700' },
          { label: 'Aguardando', value: users.filter(u=>u.status==='pending').length,   color: 'text-amber-600' },
          { label: 'Ativos',     value: users.filter(u=>u.status==='active').length,    color: 'text-emerald-600' },
          { label: 'Suspensos',  value: users.filter(u=>u.status==='suspended').length, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="card p-3 text-center">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por e-mail…"
          className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white transition-all"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <XCircle className="w-4 h-4 text-slate-400 hover:text-slate-600" />
          </button>
        )}
      </div>

      {/* Aguardando aprovação */}
      {pending.length > 0 && (
        <Section
          title={`Aguardando aprovação (${pending.length})`}
          titleClass="text-amber-600"
          icon={<Clock className="w-4 h-4 text-amber-500" />}
        >
          {pending.map(u => (
            <UserRow key={u.user_id} user={u} processingId={processingId}
              onApprove={() => updateStatus(u.user_id, 'active')}
              onSuspend={() => updateStatus(u.user_id, 'suspended')}
              onReset={() => sendPasswordReset(u.email, u.user_id)}
              onDelete={() => setDeleteTarget(u)}
            />
          ))}
        </Section>
      )}

      {/* Ativos */}
      {active.length > 0 && (
        <Section
          title={`Ativos (${active.length})`}
          titleClass="text-slate-500"
          icon={<UserCheck className="w-4 h-4 text-emerald-500" />}
        >
          {active.map(u => (
            <UserRow key={u.user_id} user={u} processingId={processingId}
              onApprove={() => updateStatus(u.user_id, 'active')}
              onSuspend={() => updateStatus(u.user_id, 'suspended')}
              onReset={() => sendPasswordReset(u.email, u.user_id)}
              onDelete={() => setDeleteTarget(u)}
            />
          ))}
        </Section>
      )}

      {/* Suspensos */}
      {suspended.length > 0 && (
        <Section
          title={`Suspensos (${suspended.length})`}
          titleClass="text-slate-400"
          icon={<UserX className="w-4 h-4 text-red-400" />}
        >
          {suspended.map(u => (
            <UserRow key={u.user_id} user={u} processingId={processingId}
              onApprove={() => updateStatus(u.user_id, 'active')}
              onSuspend={() => updateStatus(u.user_id, 'suspended')}
              onReset={() => sendPasswordReset(u.email, u.user_id)}
              onDelete={() => setDeleteTarget(u)}
            />
          ))}
        </Section>
      )}

      {users.length === 0 && !loading && (
        <div className="text-center py-16">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum usuário ainda</p>
          <p className="text-slate-400 text-sm mt-1">Compartilhe o link para as pessoas se cadastrarem</p>
        </div>
      )}

      {filtered.length === 0 && users.length > 0 && (
        <div className="text-center py-10">
          <p className="text-slate-400 text-sm">Nenhum usuário encontrado para "<span className="font-semibold">{search}</span>"</p>
        </div>
      )}
    </div>
  )
}

function Section({ title, titleClass, icon, children }: {
  title: string
  titleClass: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {icon}
        <p className={cn('text-xs font-bold uppercase tracking-wider', titleClass)}>{title}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function UserRow({ user: u, processingId, onApprove, onSuspend, onReset, onDelete }: {
  user: RegistryUser
  processingId: string | null
  onApprove: () => void
  onSuspend: () => void
  onReset: () => void
  onDelete: () => void
}) {
  const badge = STATUS_CONFIG[u.status]
  const isProcessing = processingId === u.user_id

  return (
    <div className={cn('card p-4 transition-opacity', isProcessing && 'opacity-60')}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-indigo-100 rounded-2xl flex items-center justify-center shrink-0 font-bold text-primary-600 text-sm">
          {u.email[0].toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-semibold text-slate-800 truncate">{u.email}</p>
            {u.is_admin && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-primary-100 text-primary-600 rounded-full shrink-0">ADMIN</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full', badge.cls)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', badge.dot)} />
              {badge.label}
            </span>
            <HelpTooltip id={`admin.status-${u.status}`} size="sm" />
            {u.is_admin && <HelpTooltip id="admin.is-admin" size="sm" />}
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Calendar className="w-3 h-3" />
              {format(parseISO(u.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>
        </div>
      </div>

      {/* Ações — só para não-admins */}
      {!u.is_admin && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
          {u.status !== 'active' && (
            <ActionBtn
              onClick={onApprove}
              disabled={isProcessing}
              color="emerald"
              icon={<CheckCircle className="w-3.5 h-3.5" />}
              label={u.status === 'suspended' ? 'Reativar' : 'Aprovar'}
              helpId="admin.approve"
            />
          )}
          {u.status === 'active' && (
            <ActionBtn
              onClick={onSuspend}
              disabled={isProcessing}
              color="amber"
              icon={<XCircle className="w-3.5 h-3.5" />}
              label="Suspender"
              helpId="admin.suspend"
            />
          )}
          <ActionBtn
            onClick={onReset}
            disabled={isProcessing}
            color="blue"
            icon={<KeyRound className="w-3.5 h-3.5" />}
            label="Reset senha"
            helpId="admin.reset-password"
          />
          <ActionBtn
            onClick={onDelete}
            disabled={isProcessing}
            color="red"
            icon={<Trash2 className="w-3.5 h-3.5" />}
            label="Deletar tudo"
            helpId="admin.delete-user"
          />
        </div>
      )}
    </div>
  )
}

function ActionBtn({ onClick, disabled, color, icon, label, helpId }: {
  onClick: () => void
  disabled: boolean
  color: 'emerald' | 'amber' | 'blue' | 'red' | 'slate'
  icon: React.ReactNode
  label: string
  helpId?: string
}) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200',
    amber:   'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200',
    blue:    'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
    red:     'bg-red-50 text-red-600 hover:bg-red-100 border-red-200',
    slate:   'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed',
  }
  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-50',
          colors[color]
        )}
      >
        {icon}
        {label}
      </button>
      {helpId && <HelpTooltip id={helpId} size="sm" />}
    </div>
  )
}
