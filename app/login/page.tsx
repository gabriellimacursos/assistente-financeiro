'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp, Plus, Check, X, Eye, EyeOff, ChevronRight, ChevronLeft,
  Briefcase, User2, Laptop, TrendingDown, Shield, Clock, XCircle,
} from 'lucide-react'
import { useFinanceStore } from '@/lib/store/useFinanceStore'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { UserProfile, ProfileType } from '@/types'

const PROFILE_COLORS = [
  'from-primary-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-500',
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-sky-600',
]

const PROFILE_TYPES: { value: ProfileType; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'entrepreneur', label: 'Empreendedor',  description: 'Tenho empresa ou negócio próprio', icon: <Briefcase className="w-5 h-5" /> },
  { value: 'freelancer',   label: 'Autônomo',      description: 'Trabalho por conta própria / freelancer', icon: <Laptop className="w-5 h-5" /> },
  { value: 'employee',     label: 'CLT / Salário', description: 'Tenho emprego com salário fixo', icon: <User2 className="w-5 h-5" /> },
  { value: 'investor',     label: 'Investidor',    description: 'Vivo de rendimentos e investimentos', icon: <TrendingDown className="w-5 h-5" /> },
  { value: 'other',        label: 'Outro',         description: 'Outro tipo de renda', icon: <TrendingUp className="w-5 h-5" /> },
]

const INCOME_OPTIONS: Record<ProfileType, string[]> = {
  entrepreneur: ['Curso Online', 'Curso Presencial', 'Assistência Técnica', 'Consultoria', 'Venda de Produto', 'Parceria', 'Outros'],
  freelancer:   ['Freelance', 'Serviço Prestado', 'Projeto', 'Consultoria', 'Mentoria', 'Outros'],
  employee:     ['Salário', 'Bônus', 'PLR', 'Comissão', 'Hora Extra', 'Outros'],
  investor:     ['Dividendos', 'Aluguel recebido', 'Renda Fixa', 'Fundos', 'Cripto', 'Outros'],
  other:        ['Salário', 'Freelance', 'Venda', 'Investimento', 'Outros'],
}

const EXPENSE_OPTIONS = [
  'Combustível', 'Alimentação', 'Mercado', 'Aluguel', 'Internet', 'Energia',
  'Saúde', 'Educação', 'Academia', 'Lazer', 'Cartão', 'Transporte', 'Outros',
]

function getInitials(name: string) {
  return name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function traduzirErro(msg: string): string {
  if (msg.includes('already registered') || msg.includes('user_already_exists') || msg.includes('already been registered'))
    return 'Este e-mail já está cadastrado. Clique em "Entrar" para fazer login.'
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials'))
    return 'E-mail ou senha incorretos. Verifique e tente novamente.'
  if (msg.includes('Email not confirmed'))
    return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.'
  if (msg.includes('Password should be at least'))
    return 'A senha precisa ter pelo menos 6 caracteres.'
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('over_email_send_rate_limit'))
    return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.'
  if (msg.includes('sending confirmation') || msg.includes('Error sending') || msg.includes('email_send'))
    return 'Não foi possível enviar o e-mail de confirmação. Tente novamente em alguns minutos.'
  if (msg.includes('Unable to validate email address'))
    return 'E-mail inválido. Verifique o endereço digitado.'
  if (msg.includes('Network') || msg.includes('fetch'))
    return 'Sem conexão. Verifique sua internet e tente novamente.'
  return msg
}

// ─── Sistema PIN — protege o app antes de ver os perfis ───────────────────
const SYSTEM_PIN_KEY = 'app-system-pin'

function useSystemPin() {
  const stored = typeof window !== 'undefined' ? localStorage.getItem(SYSTEM_PIN_KEY) : null
  return { systemPin: stored, hasSystemPin: !!stored }
}

export default function LoginPage() {
  const router = useRouter()
  const { profiles, setActiveProfileId, addProfile, initializeCloud, syncStatus, syncError, userStatus, clearCloudSession } = useFinanceStore()
  const { systemPin, hasSystemPin } = useSystemPin()
  const [authReady, setAuthReady] = useState(false)
  const [accountEmail, setAccountEmail] = useState('')
  const [accountPassword, setAccountPassword] = useState('')
  const [accountMode, setAccountMode] = useState<'login' | 'signup' | 'forgot'>('login')
  const [accountLoading, setAccountLoading] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [accountNotice, setAccountNotice] = useState<string | null>(null)
  const [accountDone, setAccountDone] = useState(false)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      if (data.session?.user) {
        await initializeCloud(data.session.user.id)
      }
      setAuthReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) initializeCloud(session.user.id)
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [initializeCloud])

  // Sistema: desbloqueio
  const [systemUnlocked, setSystemUnlocked] = useState(!hasSystemPin)
  const [sysPin, setSysPin] = useState('')
  const [sysPinError, setSysPinError] = useState(false)
  const [showSysPin, setShowSysPin] = useState(false)

  // Perfil selecionado — se não há perfis, vai direto para criação
  const [step, setStep] = useState<'profiles' | 'add-1' | 'add-2' | 'add-3'>(
    profiles.length === 0 ? 'add-1' : 'profiles'
  )
  // Novo perfil — dados base
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PROFILE_COLORS[1])
  // Onboarding financeiro
  const [profileType, setProfileType] = useState<ProfileType | null>(null)
  const [selectedIncome, setSelectedIncome] = useState<Set<string>>(new Set())
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set())
  const [preferredMode, setPreferredMode] = useState<'business' | 'personal' | 'both'>('both')

  useEffect(() => {
    if (syncStatus !== 'ready') return
    if (profiles.length > 0 && step.startsWith('add-') && !newName.trim()) {
      setStep('profiles')
    } else if (profiles.length === 0 && step === 'profiles') {
      setStep('add-1')
    }
  }, [syncStatus, profiles.length, step, newName])

  // ── Sistema desbloqueio ──────────────────────────────────────────────────
  function handleSystemUnlock() {
    if (sysPin === systemPin) {
      setSystemUnlocked(true)
      setSysPin('')
    } else {
      setSysPinError(true)
      setSysPin('')
    }
  }

  // ── Selecionar perfil ────────────────────────────────────────────────────
  function handleSelectProfile(profile: UserProfile) {
    setActiveProfileId(profile.id)
    router.push('/registrar')
  }

  // -- Criar perfil ─────────────────────────────────────────────────────────
  function handleCreateProfile() {
    const name = newName.trim()
    if (!name) return
    const type = profileType ?? 'other'
    const profile: UserProfile = {
      id: Date.now().toString(),
      name,
      initials: getInitials(name),
      color: newColor,
      pin: undefined,
      isOwner: profiles.filter(p => p.isOwner).length === 0,
      created_at: new Date().toISOString(),
      profileType: type,
      incomeSources: Array.from(selectedIncome),
      typicalExpenses: Array.from(selectedExpenses),
      preferredMode,
    }
    addProfile(profile)
    // Reset
    setNewName(''); setNewColor(PROFILE_COLORS[1])
    setProfileType(null); setSelectedIncome(new Set()); setSelectedExpenses(new Set())
    setPreferredMode('both')
    setStep('profiles')
  }

  function toggleSet(set: Set<string>, setFn: (s: Set<string>) => void, value: string) {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setFn(next)
  }

  async function handleAccountSubmit() {
    const email = accountEmail.trim()
    if (!email || (accountMode !== 'forgot' && accountPassword.length < 6)) return
    setAccountLoading(true)
    setAccountError(null)
    setAccountNotice(null)
    try {
      if (accountMode === 'forgot') {
        const redirectTo = `${window.location.origin}/redefinir-senha`
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
        if (error) throw error
        setAccountNotice('Enviamos um link para redefinir sua senha. Abra seu e-mail e siga as instruções.')
        setAccountDone(true)
        return
      }

      const redirectTo = `${window.location.origin}/auth/callback`
      const result = accountMode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password: accountPassword })
        : await supabase.auth.signUp({ email, password: accountPassword, options: { emailRedirectTo: redirectTo } })

      if (result.error) throw result.error
      if (result.data.session?.user) {
        await initializeCloud(result.data.session.user.id)
      } else if (accountMode === 'signup') {
        // Supabase retorna "sucesso" sem sessão quando o e-mail já está cadastrado (proteção contra enumeração)
        // Identities vazias indicam conta já existente
        if (result.data.user && (result.data.user.identities?.length === 0)) {
          setAccountMode('login')
          setAccountError('Este e-mail já tem uma conta. Entre com sua senha.')
          return
        }
        setAccountNotice('Conta criada! Enviamos um e-mail de confirmação. Confirme e volte para entrar.')
        setAccountDone(true)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao acessar a conta'
      // E-mail já cadastrado → troca para login automaticamente
      if (msg.includes('already registered') || msg.includes('user_already_exists')) {
        setAccountMode('login')
        setAccountError('Este e-mail já tem uma conta. Entre com sua senha.')
      } else {
        setAccountError(traduzirErro(msg))
      }
    } finally {
      setAccountLoading(false)
    }
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  if ((syncStatus === 'idle' || syncStatus === 'error') && accountDone) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="w-16 h-16 bg-income-100 rounded-3xl flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-income-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {accountMode === 'forgot' ? 'E-mail enviado!' : 'Cadastro realizado!'}
            </h2>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">{accountNotice}</p>
          </div>
          <button
            onClick={() => { setAccountDone(false); setAccountMode('login'); setAccountNotice(null); setAccountEmail(''); setAccountPassword('') }}
            className="w-full py-3 bg-slate-100 text-slate-700 rounded-2xl text-sm font-semibold hover:bg-slate-200 transition-colors"
          >
            Voltar para o login
          </button>
        </div>
      </div>
    )
  }

  if (syncStatus === 'idle' || syncStatus === 'error') {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Assistente Financeiro</h1>
            <p className="text-sm text-slate-500">Entre na sua conta para sincronizar seus dados em qualquer dispositivo.</p>
          </div>

          <div className="card p-5 space-y-3">
            <div className="grid grid-cols-2 gap-1 bg-slate-100 rounded-xl p-1">
              <button onClick={() => setAccountMode('login')}
                className={cn('py-2 rounded-lg text-sm font-semibold transition-all', accountMode === 'login' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500')}>
                Entrar
              </button>
              <button onClick={() => setAccountMode('signup')}
                className={cn('py-2 rounded-lg text-sm font-semibold transition-all', accountMode === 'signup' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500')}>
                Criar conta
              </button>
            </div>

            <input
              type="email"
              value={accountEmail}
              onChange={e => setAccountEmail(e.target.value)}
              placeholder="Seu e-mail"
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white"
            />
            <input
              type="password"
              value={accountPassword}
              onChange={e => setAccountPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAccountSubmit()}
              placeholder="Senha da conta"
              disabled={accountMode === 'forgot'}
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white"
            />
            {accountError && <p className="text-sm text-expense-500 font-medium">{accountError}</p>}
            {syncError && <p className="text-sm text-expense-500 font-medium">{syncError}</p>}
            {accountNotice && <p className="text-sm text-income-600 font-medium">{accountNotice}</p>}
            <button
              onClick={handleAccountSubmit}
              disabled={accountLoading || !accountEmail.trim() || (accountMode !== 'forgot' && accountPassword.length < 6)}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {accountLoading ? 'Aguarde...' : accountMode === 'forgot' ? 'Enviar link de redefinição' : accountMode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
            <button
              onClick={() => {
                setAccountMode(accountMode === 'forgot' ? 'login' : 'forgot')
                setAccountError(null)
                setAccountNotice(null)
              }}
              className="w-full text-center text-sm font-semibold text-slate-400 hover:text-primary-500"
            >
              {accountMode === 'forgot' ? 'Voltar para entrar' : 'Esqueci minha senha'}
            </button>
            <p className="text-xs text-slate-400 text-center">
              {accountMode === 'forgot' ? 'Use o mesmo e-mail da sua conta.' : 'A senha precisa ter pelo menos 6 caracteres.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (syncStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Carregando seus dados...</p>
      </div>
    )
  }

  // ── TELA: aguardando aprovação ───────────────────────────────────────────
  if (syncStatus === 'ready' && userStatus === 'pending') {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="w-16 h-16 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Cadastro recebido!</h2>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              Seu acesso está aguardando aprovação do administrador.<br />
              Você será liberado em breve.
            </p>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); clearCloudSession() }}
            className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl text-sm font-semibold hover:bg-slate-200 transition-colors">
            Sair e aguardar
          </button>
        </div>
      </div>
    )
  }

  // ── TELA: conta suspensa ─────────────────────────────────────────────────
  if (syncStatus === 'ready' && userStatus === 'suspended') {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="w-16 h-16 bg-expense-100 rounded-3xl flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-expense-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Acesso suspenso</h2>
            <p className="text-slate-500 text-sm mt-2">
              Sua conta foi suspensa. Entre em contato com o administrador.
            </p>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); clearCloudSession() }}
            className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl text-sm font-semibold hover:bg-slate-200 transition-colors">
            Sair
          </button>
        </div>
      </div>
    )
  }

  // ── TELA: conta sem registro (ex: deletada pelo admin) ──────────────────
  if (syncStatus === 'ready' && userStatus === null) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Acesso não encontrado</h2>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              Sua conta não foi encontrada no sistema.<br />
              Entre em contato com o administrador.
            </p>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); clearCloudSession() }}
            className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl text-sm font-semibold hover:bg-slate-200 transition-colors">
            Sair
          </button>
        </div>
      </div>
    )
  }

  // ── TELA: desbloqueio do sistema ─────────────────────────────────────────
  if (!systemUnlocked) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Assistente Financeiro</h2>
            <p className="text-slate-500 text-sm mt-1">Digite o PIN do sistema para continuar</p>
          </div>
          <div className="relative">
            <input
              autoFocus
              type={showSysPin ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={4}
              value={sysPin}
              onChange={e => { setSysPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setSysPinError(false) }}
              onKeyDown={e => e.key === 'Enter' && sysPin.length === 4 && handleSystemUnlock()}
              placeholder="• • • •"
              className={cn(
                'w-full text-center text-3xl font-bold tracking-[0.5em] px-4 py-5 rounded-2xl border-2 outline-none transition-all bg-white',
                sysPinError ? 'border-expense-400 text-expense-500' : 'border-slate-200 focus:border-primary-400 text-slate-800'
              )}
            />
            <button onClick={() => setShowSysPin(!showSysPin)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              {showSysPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {sysPinError && <p className="text-sm text-expense-500 font-medium">PIN incorreto</p>}
          <button onClick={handleSystemUnlock} disabled={sysPin.length !== 4}
            className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-40">
            <Check className="w-5 h-5" /> Entrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Hero desktop */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-500 to-indigo-400 flex-col justify-between p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">Assistente Financeiro</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-6">
            Controle financeiro<br />
            <span className="text-white/80">que funciona por voz</span>
          </h1>
          <p className="text-white/70 text-lg leading-relaxed max-w-sm">
            Registre receitas e despesas falando naturalmente.
            A IA interpreta e classifica automaticamente para o seu perfil.
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[
            { icon: '🎙️', label: 'Registro por voz' },
            { icon: '🤖', label: 'IA personalizada' },
            { icon: '📊', label: 'Dashboard visual' },
            { icon: '👥', label: 'Multi-perfis' },
          ].map(f => (
            <div key={f.label} className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <div className="text-2xl mb-1">{f.icon}</div>
              <div className="text-sm font-medium text-white/90">{f.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Painel direito */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-[#F8FAFF]">
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800">Assistente Financeiro</span>
          </div>

          {/* ── Seleção de perfil ── */}
          {step === 'profiles' && (() => {
            const hour = new Date().getHours()
            const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
            return (
              <div className="space-y-6">
                <div>
                  <p className="text-slate-400 text-sm font-medium mb-1">{greeting} 👋</p>
                  <h2 className="text-2xl font-bold text-slate-800">Quem está usando?</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {profiles.map(profile => (
                    <button key={profile.id} onClick={() => handleSelectProfile(profile)}
                      className="flex flex-col items-center gap-3 p-5 bg-white rounded-3xl shadow-sm border-2 border-transparent hover:border-primary-200 hover:shadow-md transition-all active:scale-[0.96]">
                      <div className={cn('w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-2xl', profile.color)}>
                        {profile.initials}
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-slate-800 text-sm leading-tight">{profile.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {profile.profileType
                            ? PROFILE_TYPES.find(t => t.value === profile.profileType)?.label
                            : profile.isOwner ? 'Principal' : 'Membro'}
                        </p>
                      </div>
                    </button>
                  ))}
                  <button onClick={() => setStep('add-1')}
                    className="flex flex-col items-center gap-3 p-5 bg-white rounded-3xl shadow-sm border-2 border-dashed border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-slate-400 hover:text-primary-500">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Plus className="w-7 h-7" />
                    </div>
                    <p className="text-xs font-semibold">Adicionar</p>
                  </button>
                </div>
              </div>
            )
          })()}

          {/* ── Add Step 1: dados básicos ── */}
          {step === 'add-1' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                {profiles.length > 0 && (
                  <button onClick={() => setStep('profiles')} className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                )}
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {profiles.length === 0 ? 'Bem-vindo! Crie seu perfil' : 'Novo perfil'}
                  </h2>
                  <p className="text-xs text-slate-400">Passo 1 de 3 · Dados básicos</p>
                </div>
              </div>

              <div className="flex justify-center">
                <div className={cn('w-20 h-20 rounded-3xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-2xl', newColor)}>
                  {newName ? getInitials(newName) : '?'}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Nome</label>
                <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Ex: Gabriel Lima"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 text-sm font-medium text-slate-800 outline-none focus:border-primary-400 transition-all bg-white" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {PROFILE_COLORS.map(color => (
                    <button key={color} onClick={() => setNewColor(color)}
                      className={cn('w-10 h-10 rounded-xl bg-gradient-to-br transition-all', color,
                        newColor === color ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : 'hover:scale-105')} />
                  ))}
                </div>
              </div>

              <button onClick={() => setStep('add-2')} disabled={!newName.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2 py-4 disabled:opacity-40">
                Próximo <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* ── Add Step 2: tipo de perfil + fontes de renda ── */}
          {step === 'add-2' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <button onClick={() => setStep('add-1')} className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200">
                  <ChevronLeft className="w-5 h-5 text-slate-500" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Perfil financeiro</h2>
                  <p className="text-xs text-slate-400">Passo 2 de 3 · Fontes de renda</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Como você ganha dinheiro?</label>
                <div className="space-y-2">
                  {PROFILE_TYPES.map(pt => (
                    <button key={pt.value} onClick={() => { setProfileType(pt.value); setSelectedIncome(new Set()) }}
                      className={cn('w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all text-left',
                        profileType === pt.value ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-slate-200 text-slate-700 hover:border-slate-300')}>
                      <span className={cn('shrink-0', profileType === pt.value ? 'text-primary-500' : 'text-slate-400')}>{pt.icon}</span>
                      <div>
                        <p className="font-semibold text-sm">{pt.label}</p>
                        <p className="text-xs opacity-70">{pt.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {profileType && (
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Principais fontes de renda (selecione todas)</label>
                  <div className="flex flex-wrap gap-2">
                    {INCOME_OPTIONS[profileType].map(src => (
                      <button key={src} onClick={() => toggleSet(selectedIncome, setSelectedIncome, src)}
                        className={cn('px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all',
                          selectedIncome.has(src) ? 'bg-income-500 border-income-500 text-white' : 'border-slate-200 text-slate-600 hover:border-income-300')}>
                        {src}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Usa mais qual conta?</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'business', label: '🏢 Empresa' },
                    { value: 'personal', label: '👤 Pessoal' },
                    { value: 'both',     label: '↕ Ambos' },
                  ] as const).map(opt => (
                    <button key={opt.value} onClick={() => setPreferredMode(opt.value)}
                      className={cn('py-2.5 rounded-xl border-2 text-xs font-semibold transition-all',
                        preferredMode === opt.value ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => setStep('add-3')} disabled={!profileType}
                className="btn-primary w-full flex items-center justify-center gap-2 py-4 disabled:opacity-40">
                Próximo <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => { if (!profileType) setProfileType('other'); setStep('add-3') }}
                className="w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors py-1"
              >
                Pular esta etapa
              </button>
            </div>
          )}

          {/* ── Add Step 3: despesas típicas ── */}
          {step === 'add-3' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <button onClick={() => setStep('add-2')} className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200">
                  <ChevronLeft className="w-5 h-5 text-slate-500" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Gastos frequentes</h2>
                  <p className="text-xs text-slate-400">Passo 3 de 3 · Despesas comuns</p>
                </div>
              </div>

              <p className="text-sm text-slate-500">Selecione as categorias em que você mais gasta. Isso ajuda a IA a classificar automaticamente.</p>

              <div className="flex flex-wrap gap-2">
                {EXPENSE_OPTIONS.map(exp => (
                  <button key={exp} onClick={() => toggleSet(selectedExpenses, setSelectedExpenses, exp)}
                    className={cn('px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all',
                      selectedExpenses.has(exp) ? 'bg-expense-500 border-expense-500 text-white' : 'border-slate-200 text-slate-600 hover:border-expense-300')}>
                    {exp}
                  </button>
                ))}
              </div>

              {/* Resumo */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className={cn('w-8 h-8 rounded-xl bg-gradient-to-br shrink-0', newColor)} />
                  <p className="font-bold text-slate-800">{newName}</p>
                </div>
                <p className="text-slate-500 text-xs">
                  {PROFILE_TYPES.find(t => t.value === profileType)?.label}
                  {selectedIncome.size > 0 && ` · ${Array.from(selectedIncome).slice(0, 2).join(', ')}${selectedIncome.size > 2 ? '…' : ''}`}
                </p>
              </div>

              <button onClick={handleCreateProfile}
                className="btn-primary w-full flex items-center justify-center gap-2 py-4">
                <Check className="w-5 h-5" /> Criar perfil
              </button>
              <button
                onClick={handleCreateProfile}
                className="w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors py-1"
              >
                Pular e criar sem categorias
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
