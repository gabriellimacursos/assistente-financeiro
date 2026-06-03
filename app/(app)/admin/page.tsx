'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Clock, CheckCircle, XCircle, Trash2, Shield, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useFinanceStore } from '@/lib/store/useFinanceStore'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type RegistryUser = {
  id: string
  user_id: string
  email: string
  status: 'pending' | 'active' | 'suspended'
  is_admin: boolean
  created_at: string
}

const STATUS_LABELS = {
  pending: { label: 'Aguardando', cls: 'bg-amber-100 text-amber-700' },
  active: { label: 'Ativo', cls: 'bg-income-100 text-income-700' },
  suspended: { label: 'Suspenso', cls: 'bg-expense-100 text-expense-700' },
}

export default function AdminPage() {
  const router = useRouter()
  const { isAdmin, syncStatus } = useFinanceStore()
  const [users, setUsers] = useState<RegistryUser[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)

  useEffect(() => {
    if (syncStatus === 'loading') return
    if (syncStatus === 'ready' && !isAdmin) {
      router.replace('/dashboard')
      return
    }
    if (syncStatus === 'ready' && isAdmin) loadUsers()
  }, [syncStatus, isAdmin, router])

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('user_registry')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(data ?? [])
    setLoading(false)
  }

  async function updateStatus(userId: string, status: 'active' | 'suspended') {
    await supabase.from('user_registry').update({ status, updated_at: new Date().toISOString() }).eq('user_id', userId)
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, status } : u))
  }

  async function deleteUser(userId: string) {
    await supabase.from('user_registry').delete().eq('user_id', userId)
    setUsers(prev => prev.filter(u => u.user_id !== userId))
    setConfirming(null)
  }

  const pending = users.filter(u => u.status === 'pending')
  const active = users.filter(u => u.status === 'active')
  const suspended = users.filter(u => u.status === 'suspended')

  if (loading || syncStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary-500" />
            <h1 className="text-2xl font-bold text-slate-800">Painel Admin</h1>
          </div>
          <p className="text-slate-500 text-sm">Gerencie quem acessa o sistema</p>
        </div>
        <button onClick={loadUsers} className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{users.length}</p>
          <p className="text-xs text-slate-400 mt-1">Total</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{pending.length}</p>
          <p className="text-xs text-slate-400 mt-1">Aguardando</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-income-600">{active.length}</p>
          <p className="text-xs text-slate-400 mt-1">Ativos</p>
        </div>
      </div>

      {/* Pending - destaque */}
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">
            Aguardando aprovação ({pending.length})
          </p>
          <div className="space-y-2">
            {pending.map(u => (
              <UserCard key={u.user_id} user={u}
                onApprove={() => updateStatus(u.user_id, 'active')}
                onSuspend={() => updateStatus(u.user_id, 'suspended')}
                onDelete={() => setConfirming(u.user_id)}
                confirming={confirming === u.user_id}
                onConfirmDelete={() => deleteUser(u.user_id)}
                onCancelDelete={() => setConfirming(null)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active */}
      {active.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ativos ({active.length})</p>
          <div className="space-y-2">
            {active.map(u => (
              <UserCard key={u.user_id} user={u}
                onApprove={() => updateStatus(u.user_id, 'active')}
                onSuspend={() => updateStatus(u.user_id, 'suspended')}
                onDelete={() => setConfirming(u.user_id)}
                confirming={confirming === u.user_id}
                onConfirmDelete={() => deleteUser(u.user_id)}
                onCancelDelete={() => setConfirming(null)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Suspended */}
      {suspended.length > 0 && (
        <div className="opacity-60">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Suspensos ({suspended.length})</p>
          <div className="space-y-2">
            {suspended.map(u => (
              <UserCard key={u.user_id} user={u}
                onApprove={() => updateStatus(u.user_id, 'active')}
                onSuspend={() => updateStatus(u.user_id, 'suspended')}
                onDelete={() => setConfirming(u.user_id)}
                confirming={confirming === u.user_id}
                onConfirmDelete={() => deleteUser(u.user_id)}
                onCancelDelete={() => setConfirming(null)}
              />
            ))}
          </div>
        </div>
      )}

      {users.length === 0 && (
        <div className="text-center py-16">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum usuário ainda</p>
          <p className="text-slate-400 text-sm mt-1">Compartilhe o link para as pessoas se cadastrarem</p>
        </div>
      )}
    </div>
  )
}

function UserCard({ user: u, onApprove, onSuspend, onDelete, confirming, onConfirmDelete, onCancelDelete }: {
  user: RegistryUser
  onApprove: () => void
  onSuspend: () => void
  onDelete: () => void
  confirming: boolean
  onConfirmDelete: () => void
  onCancelDelete: () => void
}) {
  const badge = STATUS_LABELS[u.status]
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0 font-bold text-slate-600 text-sm">
        {u.email[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-800 truncate">{u.email}</p>
          {u.is_admin && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-primary-100 text-primary-600 rounded-full shrink-0">ADMIN</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', badge.cls)}>{badge.label}</span>
          <span className="text-xs text-slate-400">
            {format(parseISO(u.created_at), "dd/MM/yyyy", { locale: ptBR })}
          </span>
        </div>
      </div>

      {!u.is_admin && (
        confirming ? (
          <div className="flex gap-1 shrink-0">
            <button onClick={onConfirmDelete} className="w-8 h-8 bg-expense-500 rounded-xl flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-white" />
            </button>
            <button onClick={onCancelDelete} className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 text-xs font-bold">✕</button>
          </div>
        ) : (
          <div className="flex gap-1 shrink-0">
            {u.status !== 'active' && (
              <button onClick={onApprove} title="Aprovar"
                className="w-8 h-8 bg-income-50 rounded-xl flex items-center justify-center hover:bg-income-100 transition-colors">
                <CheckCircle className="w-4 h-4 text-income-600" />
              </button>
            )}
            {u.status === 'active' && (
              <button onClick={onSuspend} title="Suspender"
                className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center hover:bg-amber-100 transition-colors">
                <XCircle className="w-4 h-4 text-amber-600" />
              </button>
            )}
            <button onClick={onDelete} title="Deletar"
              className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-expense-50 transition-colors">
              <Trash2 className="w-4 h-4 text-slate-400 hover:text-expense-500" />
            </button>
          </div>
        )
      )}
    </div>
  )
}
