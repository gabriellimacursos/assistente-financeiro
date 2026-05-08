'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('Confirmando sua conta...')

  useEffect(() => {
    async function confirm() {
      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setMessage('Não foi possível confirmar sua conta. Tente entrar novamente.')
          return
        }
      }
      router.replace('/login')
    }
    confirm()
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      <p className="text-sm text-slate-500 font-medium">{message}</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8FAFF] flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Confirmando sua conta...</p>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
