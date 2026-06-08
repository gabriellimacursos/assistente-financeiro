'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import { supabase } from '@/lib/supabase/client'
import { useFinanceStore } from '@/lib/store/useFinanceStore'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const { initializeCloud, syncStatus, sidebarCollapsed } = useFinanceStore()

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      if (!data.session?.user) {
        router.replace('/login')
        return
      }
      await initializeCloud(data.session.user.id)
      if (mounted) setAuthChecked(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) router.replace('/login')
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [initializeCloud, router])

  if (!authChecked || syncStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Carregando seus dados...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF] overflow-x-hidden w-full">
      <Sidebar />
      <main className={`transition-all duration-300 pb-20 lg:pb-0 min-h-screen overflow-x-hidden w-full ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
