'use client'
import { useEffect, useState } from 'react'
import { Bell, X, BellRing } from 'lucide-react'
import { usePushPermission } from './PushManager'

const DISMISSED_KEY = 'notif-prompt-dismissed-v1'

export default function NotificationPrompt() {
  const { permission, subscribed, loading, subscribe } = usePushPermission()
  const [dismissed, setDismissed] = useState(true) // começa true para evitar flash
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDismissed(localStorage.getItem(DISMISSED_KEY) === '1')
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  async function handleActivate() {
    await subscribe()
    // Se aceitou, some automaticamente
    if (Notification.permission === 'granted') {
      localStorage.setItem(DISMISSED_KEY, '1')
      setDismissed(true)
    }
  }

  const supported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator

  if (!mounted || !supported || dismissed || subscribed || permission === 'denied') return null

  return (
    <div className="relative bg-gradient-to-r from-primary-500 to-indigo-600 rounded-2xl p-4 text-white shadow-lg">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
        aria-label="Fechar"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
          <BellRing className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm leading-snug">Ative os alertas financeiros</p>
          <p className="text-xs text-white/80 mt-0.5 leading-relaxed">
            Receba avisos de fatura vencendo e débitos recorrentes direto no celular.
          </p>
          <button
            onClick={handleActivate}
            disabled={loading}
            className="mt-3 px-4 py-1.5 bg-white text-primary-600 rounded-xl text-xs font-bold hover:bg-white/90 active:scale-95 transition-all disabled:opacity-60"
          >
            {loading ? 'Aguarde...' : 'Ativar notificações'}
          </button>
        </div>
      </div>
    </div>
  )
}
