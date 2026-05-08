'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, Eye, EyeOff, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

function RedefinirSenhaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function prepareSession() {
      const code = searchParams.get('code')
      if (!code) return
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) setError(error.message)
    }
    prepareSession()
  }, [searchParams])

  async function handleUpdatePassword() {
    if (password.length < 6) return
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setSuccess(true)
    setTimeout(() => router.replace('/login'), 1200)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Redefinir senha</h1>
          <p className="text-sm text-slate-500">Crie uma nova senha para acessar sua conta.</p>
        </div>

        <div className="card p-5 space-y-3">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUpdatePassword()}
              placeholder="Nova senha"
              className="w-full px-4 py-3 pr-11 rounded-2xl border-2 border-slate-200 text-sm outline-none focus:border-primary-400 bg-white"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {error && <p className="text-sm text-expense-500 font-medium">{error}</p>}
          {success && <p className="text-sm text-income-600 font-medium">Senha atualizada com sucesso.</p>}

          <button
            onClick={handleUpdatePassword}
            disabled={loading || password.length < 6}
            className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Check className="w-5 h-5" />
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
          <p className="text-xs text-slate-400 text-center">A senha precisa ter pelo menos 6 caracteres.</p>
        </div>
      </div>
    </div>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8FAFF] flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Preparando redefinição...</p>
      </div>
    }>
      <RedefinirSenhaContent />
    </Suspense>
  )
}
