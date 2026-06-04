'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronRight, LogOut, Plus, X, Building2, User,
  TrendingUp, TrendingDown, ArrowUpDown, Trash2, Shield, Lock, LockOpen, Settings2,
} from 'lucide-react'
import { useFinanceStore } from '@/lib/store/useFinanceStore'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Mode, ProfilePermissions } from '@/types'
import { DEFAULT_MEMBER_PERMISSIONS } from '@/types'
import HelpTooltip from '@/components/shared/HelpTooltip'
import ErrorBanner from '@/components/shared/ErrorBanner'
import { formatError } from '@/lib/errors'
import type { ErrorCode } from '@/lib/errors'

const PROFILE_COLORS = [
  'from-primary-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-500',
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-sky-600',
]

const SYSTEM_PIN_KEY = 'app-system-pin'

function getInitials(name: string) {
  return name.trim().split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
}

type Direction = 'income' | 'expense' | 'both'

const DIRECTION_OPTIONS: { value: Direction; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'income',  label: 'Entrada', icon: <TrendingUp className="w-3 h-3" />,   color: 'bg-income-500 text-white' },
  { value: 'expense', label: 'Saída',   icon: <TrendingDown className="w-3 h-3" />, color: 'bg-expense-500 text-white' },
  { value: 'both',    label: 'Ambos',   icon: <ArrowUpDown className="w-3 h-3" />,  color: 'bg-primary-500 text-white' },
]

function directionBadge(direction: Direction) {
  if (direction === 'income')  return { label: '↑', title: 'Entrada', cls: 'bg-income-100 text-income-600' }
  if (direction === 'expense') return { label: '↓', title: 'Saída',   cls: 'bg-expense-100 text-expense-600' }
  return                              { label: '↕', title: 'Ambos',   cls: 'bg-slate-100 text-slate-500' }
}

export default function ConfiguracoesPage() {
  const router = useRouter()
  const {
    categoriesPersonal, categoriesBusiness, addCategory, removeCategory,
    profiles, addProfile, removeProfile, updateProfile, activeProfileId, clearCloudSession,
  } = useFinanceStore()
  const [catMode, setCatMode] = useState<Mode>('business')
  const [newCat, setNewCat] = useState('')
  const [newDirection, setNewDirection] = useState<Direction>('expense')
  const [removingCat, setRemovingCat] = useState<string | null>(null)
  const [pinEditId, setPinEditId] = useState<string | null>(null)
  const [pinEditValue, setPinEditValue] = useState('')
  const [permEditId, setPermEditId] = useState<string | null>(null)

  // Profile management
  const [showAddProfile, setShowAddProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [newProfileColor, setNewProfileColor] = useState(PROFILE_COLORS[1])
  const [removingProfile, setRemovingProfile] = useState<string | null>(null)
  const [systemPin, setSystemPin] = useState(
    typeof window !== 'undefined' ? localStorage.getItem(SYSTEM_PIN_KEY) ?? '' : ''
  )
  const [securitySaved, setSecuritySaved] = useState<string | null>(null)
  const [appError, setAppError] = useState<{ title: string; description: string; action: string; code?: ErrorCode; severity: 'error' | 'warning' } | null>(null)
  const [saving, setSaving] = useState(false)

  const activeProfile = profiles.find(p => p.id === activeProfileId)

  function normalizePin(value: string) {
    return value.replace(/\D/g, '').slice(0, 4)
  }

  async function handleAddProfile() {
    const name = newProfileName.trim()
    if (!name) return
    setSaving(true)
    setAppError(null)
    try {
      await addProfile({
        id: Date.now().toString(),
        name,
        initials: getInitials(name),
        color: newProfileColor,
        pin: undefined,
        isOwner: false,
        created_at: new Date().toISOString(),
      })
      setNewProfileName('')
      setNewProfileColor(PROFILE_COLORS[1])
      setShowAddProfile(false)
    } catch (err) {
      setAppError(formatError(err))
    } finally {
      setSaving(false)
    }
  }

  function handleSaveSystemPin() {
    if (typeof window === 'undefined' || systemPin.length !== 4) return
    localStorage.setItem(SYSTEM_PIN_KEY, systemPin)
    setSecuritySaved('PIN do sistema atualizado')
  }

  function handleRemoveSystemPin() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(SYSTEM_PIN_KEY)
    setSystemPin('')
    setSecuritySaved('PIN do sistema removido')
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    clearCloudSession()
    router.push('/login')
  }

  // Garantia de compatibilidade caso o localStorage ainda tenha strings antigas
  const normalize = (cats: any[]): { name: string; direction: Direction }[] =>
    cats.map(c => typeof c === 'string' ? { name: c, direction: 'both' as Direction } : c)
  const currentCats = normalize(catMode === 'business' ? categoriesBusiness : categoriesPersonal)

  async function handleAddCategory() {
    const name = newCat.trim()
    if (!name) return
    setSaving(true)
    setAppError(null)
    try {
      await addCategory(name, catMode, newDirection)
      setNewCat('')
    } catch (err) {
      setAppError(formatError(err))
    } finally {
      setSaving(false)
    }
  }

  const isOwner = activeProfile?.isOwner ?? false

  // ── Acesso limitado para perfis não-donos ───────────────────────────────
  if (!isOwner) {
    return (
      <div className="max-w-2xl mx-auto p-4 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
        </div>
        {activeProfile && (
          <div className="card p-5 flex items-center gap-4">
            <div className={cn('w-14 h-14 bg-gradient-to-br rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0', activeProfile.color)}>
              {activeProfile.initials}
            </div>
            <div>
              <p className="font-bold text-slate-800">{activeProfile.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">Membro</p>
            </div>
          </div>
        )}
        <div className="card p-4 flex items-start gap-3">
          <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-slate-700">Acesso limitado</p>
              <HelpTooltip id="config.access-limited" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Apenas o perfil principal pode alterar configurações do sistema. Troque para o perfil principal para ter acesso completo.
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Conta</p>
          <div className="card divide-y divide-slate-100">
            <button onClick={() => router.push('/login')}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-expense-50 transition-colors text-left">
              <div className="w-9 h-9 bg-expense-50 rounded-xl flex items-center justify-center shrink-0">
                <LogOut className="w-4 h-4 text-expense-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-expense-600">Trocar perfil</p>
                <p className="text-xs text-slate-400">Voltar para a seleção de perfis</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
            <button onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-expense-50 transition-colors text-left">
              <div className="w-9 h-9 bg-expense-50 rounded-xl flex items-center justify-center shrink-0">
                <LogOut className="w-4 h-4 text-expense-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-expense-600">Sair da conta</p>
                <p className="text-xs text-slate-400">Encerrar sessão neste dispositivo</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-slate-300 pb-4">Versão 1.0.0</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
        <p className="text-slate-500 text-sm">Personalize seu assistente financeiro</p>
      </div>

      {/* DB error banner */}
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

      {/* Active profile card */}
      {activeProfile && (
        <div className="card p-5 flex items-center gap-4">
          <div className={cn('w-14 h-14 bg-gradient-to-br rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0', activeProfile.color)}>
            {activeProfile.initials}
          </div>
          <div>
            <p className="font-bold text-slate-800">{activeProfile.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeProfile.isOwner ? 'Dono do sistema' : 'Membro'}
            </p>
          </div>
        </div>
      )}

      {/* ── Perfis ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Perfis</p>
            <HelpTooltip id="config.profiles" />
          </div>
          <button onClick={() => setShowAddProfile(!showAddProfile)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-primary-50 text-primary-600 rounded-xl text-xs font-semibold hover:bg-primary-100 transition-colors">
            <Plus className="w-3 h-3" /> Adicionar
          </button>
        </div>

        <div className="card overflow-hidden">
          {profiles.map((profile, idx) => (
            <div key={profile.id} className={idx > 0 ? 'border-t border-slate-100' : ''}>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm shrink-0', profile.color)}>
                  {profile.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-slate-800 truncate">{profile.name}</p>
                    {profile.id === activeProfileId && (
                      <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 bg-primary-100 text-primary-600 rounded-full">ATIVO</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {profile.isOwner ? 'Dono' : 'Membro'}
                  </p>
                </div>
                {/* Botão de PIN */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => { setPinEditId(pinEditId === profile.id ? null : profile.id); setPinEditValue(''); setPermEditId(null) }}
                    className={cn('w-7 h-7 flex items-center justify-center rounded-lg transition-colors',
                      profile.pin ? 'text-slate-600 bg-slate-100 hover:bg-slate-200' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50'
                    )}
                    title={profile.pin ? 'PIN configurado — clique para editar' : 'Clique para definir um PIN'}
                  >
                    {profile.pin ? <Lock className="w-3.5 h-3.5" /> : <LockOpen className="w-3.5 h-3.5" />}
                  </button>
                  <HelpTooltip id="config.profile-pin" />
                </div>
                {/* Botão de Permissões (somente perfis não-donos) */}
                {!profile.isOwner && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => { setPermEditId(permEditId === profile.id ? null : profile.id); setPinEditId(null) }}
                      className={cn('w-7 h-7 flex items-center justify-center rounded-lg transition-colors',
                        permEditId === profile.id ? 'text-primary-600 bg-primary-100' : 'text-slate-400 hover:text-primary-500 hover:bg-primary-50'
                      )}
                      title="Configurar permissões"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                    <HelpTooltip id="config.profile-permissions" />
                  </div>
                )}
                {!profile.isOwner && (
                  removingProfile === profile.id ? (
                    <div className="flex gap-1 shrink-0">
                      <button
                        disabled={saving}
                        onClick={async () => {
                          setSaving(true)
                          setAppError(null)
                          try {
                            await removeProfile(profile.id)
                            setRemovingProfile(null)
                          } catch (err) {
                            setAppError(formatError(err))
                          } finally {
                            setSaving(false)
                          }
                        }}
                        className="w-7 h-7 bg-expense-500 rounded-lg flex items-center justify-center disabled:opacity-40">
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                      <button onClick={() => setRemovingProfile(null)}
                        className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 text-xs font-bold">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setRemovingProfile(profile.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-expense-400 hover:bg-expense-50 transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )
                )}
              </div>
              {/* Editor de Permissões inline */}
              {permEditId === profile.id && !profile.isOwner && (
                <PermissionsEditor
                  profile={profile}
                  saving={saving}
                  onSave={async (perms) => {
                    setSaving(true)
                    setAppError(null)
                    try {
                      await updateProfile(profile.id, { permissions: perms })
                      setPermEditId(null)
                    } catch (err) {
                      setAppError(formatError(err))
                    } finally {
                      setSaving(false)
                    }
                  }}
                  onClose={() => setPermEditId(null)}
                />
              )}

              {/* Editor de PIN inline */}
              {pinEditId === profile.id && (
                <div className="px-4 pb-4 pt-3 bg-slate-50 border-t border-slate-100 space-y-2">
                  <p className="text-xs text-slate-500 font-medium">PIN de 4 dígitos para <span className="font-bold text-slate-700">{profile.name}</span></p>
                  <input
                    autoFocus
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinEditValue}
                    onChange={e => setPinEditValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="• • • •"
                    className="w-full max-w-[200px] mx-auto px-4 py-3 rounded-xl border-2 border-slate-200 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-primary-400 bg-white transition-all"
                  />
                  <button
                    disabled={pinEditValue.length !== 4 || saving}
                    onClick={async () => {
                      if (pinEditValue.length !== 4) return
                      setSaving(true)
                      setAppError(null)
                      try {
                        await updateProfile(profile.id, { pin: pinEditValue })
                        setPinEditId(null)
                        setPinEditValue('')
                      } catch (err) {
                        setAppError(formatError(err))
                      } finally {
                        setSaving(false)
                      }
                    }}
                    className="w-full py-3 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-40 transition-colors"
                  >
                    Salvar PIN
                  </button>
                  {profile.pin && (
                    <button
                      disabled={saving}
                      onClick={async () => {
                        setSaving(true)
                        setAppError(null)
                        try {
                          await updateProfile(profile.id, { pin: undefined })
                          setPinEditId(null)
                        } catch (err) {
                          setAppError(formatError(err))
                        } finally {
                          setSaving(false)
                        }
                      }}
                      className="w-full text-center text-xs text-expense-500 font-semibold hover:text-expense-600 disabled:opacity-40 transition-colors py-1"
                    >
                      Remover PIN
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Formulário de novo perfil */}
        {showAddProfile && (
          <div className="card p-4 mt-3 space-y-3">
            <p className="text-sm font-bold text-slate-700">Novo perfil</p>
            <input value={newProfileName} onChange={e => setNewProfileName(e.target.value)}
              placeholder="Nome da pessoa…"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white transition-all" />
            <div>
              <p className="text-xs text-slate-400 mb-2">Cor</p>
              <div className="flex gap-2 flex-wrap">
                {PROFILE_COLORS.map(color => (
                  <button key={color} onClick={() => setNewProfileColor(color)}
                    className={cn('w-8 h-8 rounded-lg bg-gradient-to-br transition-all', color,
                      newProfileColor === color ? 'ring-2 ring-offset-1 ring-primary-500 scale-110' : 'hover:scale-105')} />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddProfile} disabled={!newProfileName.trim() || saving}
                className="flex-1 py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-40 transition-colors">
                Criar perfil
              </button>
              <button onClick={() => setShowAddProfile(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400 text-center mt-2">
          Para trocar de perfil, saia e volte ao login
        </p>
      </div>

      {/* ── Categorias ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categorias</p>
            <HelpTooltip id="config.categories" />
          </div>
          <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setCatMode('business')}
              className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                catMode === 'business' ? 'bg-primary-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}
            >
              <Building2 className="w-3 h-3" /> Empresa
            </button>
            <button
              onClick={() => setCatMode('personal')}
              className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                catMode === 'personal' ? 'bg-primary-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}
            >
              <User className="w-3 h-3" /> Pessoal
            </button>
          </div>
        </div>

        <div className="card p-4 space-y-4">
          {/* Add category */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                placeholder="Nome da nova categoria…"
                className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white transition-all"
              />
              <button
                onClick={handleAddCategory}
                disabled={!newCat.trim() || saving}
                className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center text-white hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {/* Direction toggle */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-slate-400 font-medium">Usar para:</span>
                <HelpTooltip id="config.category-direction" />
              </div>
              <div className="flex gap-1.5 flex-1">
                {DIRECTION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setNewDirection(opt.value)}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all flex-1 justify-center',
                      newDirection === opt.value
                        ? opt.color + ' border-transparent'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    )}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1"><span className="w-5 h-5 rounded-md bg-income-100 text-income-600 flex items-center justify-center font-bold text-[10px]">↑</span> Só entrada</span>
            <span className="flex items-center gap-1"><span className="w-5 h-5 rounded-md bg-expense-100 text-expense-600 flex items-center justify-center font-bold text-[10px]">↓</span> Só saída</span>
            <span className="flex items-center gap-1"><span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px]">↕</span> Ambos</span>
          </div>

          {/* Category list */}
          <div className="flex flex-wrap gap-2">
            {currentCats.map(cat => {
              const badge = directionBadge(cat.direction)
              return (
                <div key={cat.name} className="group relative">
                  {removingCat === cat.name ? (
                    <div className="flex items-center gap-1 px-2.5 py-1.5 bg-expense-50 border-2 border-expense-300 rounded-xl">
                      <span className="text-xs font-semibold text-expense-700">{cat.name}</span>
                      <button
                        disabled={saving}
                        onClick={async () => {
                          setSaving(true)
                          setAppError(null)
                          try {
                            await removeCategory(cat.name, catMode)
                            setRemovingCat(null)
                          } catch (err) {
                            setAppError(formatError(err))
                          } finally {
                            setSaving(false)
                          }
                        }}
                        className="w-4 h-4 bg-expense-500 rounded-full flex items-center justify-center ml-1 disabled:opacity-40"
                      >
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                      <button
                        onClick={() => setRemovingCat(null)}
                        className="text-expense-400 text-xs hover:text-expense-600 ml-0.5"
                      >✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRemovingCat(cat.name)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all hover:border-expense-300 hover:bg-expense-50 group',
                        catMode === 'business'
                          ? 'bg-primary-50 border-primary-200 text-primary-700'
                          : 'bg-slate-100 border-slate-200 text-slate-700'
                      )}
                    >
                      <span className={cn('w-4 h-4 rounded flex items-center justify-center font-bold text-[10px] shrink-0', badge.cls)}
                        title={badge.title}>
                        {badge.label}
                      </span>
                      {cat.name}
                      <X className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {currentCats.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">
              Nenhuma categoria. Adicione uma acima.
            </p>
          )}

          <p className="text-xs text-slate-400 text-center">
            Toque em uma categoria para removê-la
          </p>
        </div>
      </div>

      {/* ── Conta ── */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Conta</p>
        <div className="card divide-y divide-slate-100">

          <button
            onClick={() => router.push('/login')}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-expense-50 transition-colors text-left"
          >
            <div className="w-9 h-9 bg-expense-50 rounded-xl flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4 text-expense-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-expense-600">Trocar perfil</p>
              <p className="text-xs text-slate-400">Voltar para a seleção de perfis</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-expense-50 transition-colors text-left"
          >
            <div className="w-9 h-9 bg-expense-50 rounded-xl flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4 text-expense-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-expense-600">Sair da conta</p>
              <p className="text-xs text-slate-400">Encerrar sessão neste dispositivo</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-slate-300 pb-4">Versão 1.0.0</p>
    </div>
  )
}

// ─── Permissions Editor ─────────────────────────────────────────────────────

const PERM_ITEMS: { key: keyof ProfilePermissions; label: string; description: string }[] = [
  { key: 'canAddTransactions',    label: 'Registrar lançamentos',   description: 'Pode adicionar entradas e saídas' },
  { key: 'canEditTransactions',   label: 'Editar lançamentos',      description: 'Pode alterar lançamentos existentes' },
  { key: 'canDeleteTransactions', label: 'Excluir lançamentos',     description: 'Pode apagar lançamentos' },
  { key: 'canManageCategories',   label: 'Gerenciar categorias',    description: 'Pode criar e remover categorias' },
  { key: 'canManageCards',        label: 'Gerenciar cartões',       description: 'Pode adicionar, editar e remover cartões' },
  { key: 'canManageRecurrences',  label: 'Gerenciar recorrências',  description: 'Pode criar e alterar pagamentos recorrentes' },
]

function PermissionsEditor({ profile, saving, onSave, onClose }: {
  profile: { id: string; name: string; permissions?: ProfilePermissions }
  saving: boolean
  onSave: (perms: ProfilePermissions) => Promise<void>
  onClose: () => void
}) {
  const [perms, setPerms] = useState<ProfilePermissions>({
    ...DEFAULT_MEMBER_PERMISSIONS,
    ...(profile.permissions ?? {}),
  })

  function toggle(key: keyof ProfilePermissions) {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="px-4 pb-4 pt-3 bg-primary-50 border-t border-primary-100 space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="w-3.5 h-3.5 text-primary-500" />
        <p className="text-xs text-primary-700 font-semibold">Permissões de <span className="font-bold">{profile.name}</span></p>
      </div>
      <div className="space-y-1.5">
        {PERM_ITEMS.map(({ key, label, description }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left',
              perms[key]
                ? 'bg-white border-primary-300 text-slate-800'
                : 'bg-white/50 border-slate-200 text-slate-400'
            )}
          >
            <div className={cn(
              'w-10 h-5 rounded-full transition-colors relative shrink-0',
              perms[key] ? 'bg-primary-500' : 'bg-slate-200'
            )}>
              <span className={cn(
                'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                perms[key] ? 'translate-x-5' : 'translate-x-0.5'
              )} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-none">{label}</p>
              <p className="text-[10px] mt-0.5 text-slate-400 leading-snug">{description}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          disabled={saving}
          onClick={() => onSave(perms)}
          className="flex-1 py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-40 transition-colors"
        >
          Salvar permissões
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-2.5 bg-white text-slate-600 text-sm font-semibold rounded-xl border-2 border-slate-200 hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
