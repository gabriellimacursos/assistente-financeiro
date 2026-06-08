'use client'
import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export function usePushPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    setPermission(Notification.permission)
    checkSubscription()
  }, [])

  async function checkSubscription() {
    if (!('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return
    const sub = await reg.pushManager.getSubscription()
    setSubscribed(!!sub)
  }

  async function subscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const key = sub.getKey('p256dh')
      const auth = sub.getKey('auth')
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: key ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(key)))) : '',
          auth: auth ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(auth)))) : '',
        }),
      })
      setSubscribed(true)
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } finally {
      setLoading(false)
    }
  }

  return { permission, subscribed, loading, subscribe, unsubscribe }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function PushToggleButton() {
  const { permission, subscribed, loading, subscribe, unsubscribe } = usePushPermission()
  const supported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator

  if (!supported) return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
      <BellOff className="w-4 h-4 text-slate-400" />
      <span className="text-xs text-slate-400">Notificações não suportadas neste navegador</span>
    </div>
  )

  if (permission === 'denied') return (
    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl">
      <BellOff className="w-4 h-4 text-amber-500" />
      <span className="text-xs text-amber-700">Permissão bloqueada. Habilite nas configurações do navegador.</span>
    </div>
  )

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
        subscribed
          ? 'bg-primary-500 text-white hover:bg-primary-600'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      } disabled:opacity-50`}
    >
      {subscribed ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
      {loading ? 'Aguarde...' : subscribed ? 'Notificações ativas' : 'Ativar notificações'}
    </button>
  )
}
