'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    setCollapsed(saved === 'true')

    // Listen for storage changes (sidebar toggle)
    const handler = () => setCollapsed(localStorage.getItem('sidebar-collapsed') === 'true')
    window.addEventListener('storage', handler)

    // Also poll since same-tab storage doesn't fire storage event
    const interval = setInterval(handler, 200)
    return () => { window.removeEventListener('storage', handler); clearInterval(interval) }
  }, [])

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <Sidebar />
      <main className={`transition-all duration-300 pb-20 lg:pb-0 min-h-screen ${collapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
