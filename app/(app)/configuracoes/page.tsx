'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronRight, LogOut, Plus, X, Building2, User,
  TrendingUp, TrendingDown, ArrowUpDown, Trash2,
} from 'lucide-react'
import { useFinanceStore } from '@/lib/store/useFinanceStore'
import { cn } from '@/lib/utils'
import type { Mode } from '@/types'

const PROFILE_COLORS = [
  'from-primary-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-500',
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-sky-600',
]

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
    profiles, addProfile, removeProfile, activeProfileId,
  } = useFinanceStore()
  const [catMode, setCatMode] = useState<Mode>('business')
  const [newCat, setNewCat] = useState('')
  const [newDirection, setNewDirection] = useState<Direction>('expense')
  const [removingCat, setRemovingCat] = useState<string | null>(null)

  // Profile management
  const [showAddProfile, setShowAddProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [newProfileColor, setNewProfileColor] = useState(PROFILE_COLORS[1])
  const [newProfilePin, setNewProfilePin] = useState('')
  const [removingProfile, setRemovingProfile] = useState<string | null>(null)

  const activeProfile = profiles.find(p => p.id === activeProfileId)

  function handleAddProfile() {
    const name = newProfileName.trim()
    if (!name) return
    addProfile({
      id: Date.now().toString(),
      name,
      initials: getInitials(name),
      color: newProfileColor,
      pin: newProfilePin.length === 4 ? newProfilePin : undefined,
      isOwner: false,
      created_at: new Date().toISOString(),
    })
    setNewProfileName('')
    setNewProfilePin('')
    setNewProfileColor(PROFILE_COLORS[1])
    setShowAddProfile(false)
  }

  // Garantia de compatibilidade caso o localStorage ainda tenha strings antigas
  const normalize = (cats: any[]): { name: string; direction: Direction }[] =>
    cats.map(c => typeof c === 'string' ? { name: c, direction: 'both' as Direction } : c)
  const currentCats = normalize(catMode === 'business' ? categoriesBusiness : categoriesPersonal)

  function handleAddCategory() {
    const name = newCat.trim()
    if (!name) return
    addCategory(name, catMode, newDirection)
    setNewCat('')
  }

  return (
    <div className="max-w-2xl mx-auto p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
        <p className="text-slate-500 text-sm">Personalize seu assistente financeiro</p>
      </div>

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
              {activeProfile.pin ? ' · PIN configurado' : ''}
            </p>
          </div>
        </div>
      )}

      {/* ── Perfis ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Perfis</p>
          <button onClick={() => setShowAddProfile(!showAddProfile)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-primary-50 text-primary-600 rounded-xl text-xs font-semibold hover:bg-primary-100 transition-colors">
            <Plus className="w-3 h-3" /> Adicionar
          </button>
        </div>

        <div className="card divide-y divide-slate-100">
          {profiles.map(profile => (
            <div key={profile.id} className="flex items-center gap-3 px-4 py-3.5">
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
                  {profile.pin ? ' · PIN configurado' : ' · Sem PIN'}
                </p>
              </div>
              {!profile.isOwner && (
                removingProfile === profile.id ? (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { removeProfile(profile.id); setRemovingProfile(null) }}
                      className="w-7 h-7 bg-expense-500 rounded-lg flex items-center justify-center">
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
            <input
              type="password" inputMode="numeric" maxLength={4}
              value={newProfilePin} onChange={e => setNewProfilePin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="PIN de 4 dígitos (opcional)"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white tracking-widest transition-all" />
            <div className="flex gap-2">
              <button onClick={handleAddProfile} disabled={!newProfileName.trim()}
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
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categorias</p>
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
                catMode === 'personal' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
            >
              <User className="w-3 h-3" /> Pessoal
            </button>
          </div>
        </div>

        <div className="card p-4 space-y-4">
          {/* Add category */}
          <div className="space-y-2">
            <input
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              placeholder={`Nome da nova categoria…`}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white transition-all"
            />
            {/* Direction toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium shrink-0">Usar para:</span>
              <div className="flex gap-1.5 flex-1">
                {DIRECTION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setNewDirection(opt.value)}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all flex-1 justify-center',
                      newDirection === opt.value
                        ? opt.color + ' border-transparent'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    )}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleAddCategory}
                disabled={!newCat.trim()}
                className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center text-white hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
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
                        onClick={() => { removeCategory(cat.name, catMode); setRemovingCat(null) }}
                        className="w-4 h-4 bg-expense-500 rounded-full flex items-center justify-center ml-1"
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
        </div>
      </div>

      <p className="text-center text-xs text-slate-300 pb-4">Versão 1.0.0</p>
    </div>
  )
}
