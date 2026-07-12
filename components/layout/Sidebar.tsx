'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  TrendingUp, LayoutDashboard, Mic, Clock, RefreshCw,
  Settings, LogOut, ChevronLeft, ChevronRight, CreditCard, Shield,
  Zap, CheckSquare, FolderKanban, CalendarDays, RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFinanceStore } from '@/lib/store/useFinanceStore'
import { supabase } from '@/lib/supabase/client'

const FINANCE_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/registrar', label: 'Registrar', icon: Mic, highlight: true },
  { href: '/timeline', label: 'Histórico', icon: Clock },
  { href: '/cartoes', label: 'Cartões', icon: CreditCard },
  { href: '/recorrencias', label: 'Recorrências', icon: RefreshCw },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

const PROD_ITEMS = [
  { href: '/produtividade', label: 'Visão geral', icon: Zap },
  { href: '/produtividade/hoje', label: 'Hoje', icon: CalendarDays },
  { href: '/produtividade/tarefas', label: 'Tarefas', icon: CheckSquare },
  { href: '/produtividade/projetos', label: 'Projetos', icon: FolderKanban },
  { href: '/produtividade/revisao', label: 'Revisão Semanal', icon: RotateCcw },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarCollapsed: collapsed, setSidebarCollapsed, isAdmin, clearCloudSession, profiles, activeProfileId } = useFinanceStore()
  const activeProfile = profiles.find(p => p.id === activeProfileId)
  const canViewAdmin = isAdmin && (activeProfile?.isOwner ?? false)

  function toggleCollapsed() {
    setSidebarCollapsed(!collapsed)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    clearCloudSession()
    router.push('/login')
  }

  return (
    <aside className={cn(
      'hidden lg:flex flex-col min-h-screen bg-white border-r border-slate-100 fixed left-0 top-0 transition-all duration-300 z-40',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className={cn('flex items-center border-b border-slate-100 h-16 shrink-0', collapsed ? 'justify-center px-0' : 'px-5 gap-3')}>
        <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-slate-800 text-sm leading-none whitespace-nowrap">Assistente</p>
            <p className="text-xs text-slate-500 mt-0.5 whitespace-nowrap">Financeiro</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {/* Financeiro */}
        {FINANCE_ITEMS.map(({ href, label, icon: Icon, highlight }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center rounded-xl transition-all relative group',
                collapsed ? 'justify-center h-11 w-11 mx-auto' : 'gap-3 px-3 py-2.5',
                active
                  ? highlight ? 'bg-primary-500 text-white' : 'bg-primary-50 text-primary-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              )}
            >
              <Icon className={cn('shrink-0 w-5 h-5',
                active ? highlight ? 'text-white' : 'text-primary-500' : 'text-slate-400'
              )} />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
              {!collapsed && highlight && <span className="ml-auto w-2 h-2 rounded-full bg-white/60 animate-pulse" />}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">{label}</div>
              )}
            </Link>
          )
        })}

        {/* Separador Produtividade */}
        <div className="pt-3 pb-1">
          {!collapsed
            ? <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3">Produtividade</p>
            : <div className="h-px bg-slate-100 mx-2" />
          }
        </div>

        {/* Produtividade */}
        {PROD_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/produtividade' && pathname.startsWith(href))
          const isMain = href === '/produtividade'
          const mainActive = isMain && pathname === '/produtividade'
          const isActive = isMain ? mainActive : active
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center rounded-xl transition-all relative group',
                collapsed ? 'justify-center h-11 w-11 mx-auto' : 'gap-3 px-3 py-2.5',
                isActive ? 'bg-primary-50 text-primary-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              )}
            >
              <Icon className={cn('shrink-0 w-5 h-5', isActive ? 'text-primary-500' : 'text-slate-400')} />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">{label}</div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className={cn('border-t border-slate-100 p-2 space-y-1')}>
        {canViewAdmin && (
          <Link href="/admin" title={collapsed ? 'Admin' : undefined}
            className={cn(
              'flex items-center rounded-xl transition-all text-slate-500 hover:bg-primary-50 hover:text-primary-600 group relative',
              pathname === '/admin' ? 'bg-primary-50 text-primary-600' : '',
              collapsed ? 'justify-center h-11 w-11 mx-auto' : 'gap-3 px-3 py-2.5 w-full'
            )}>
            <Shield className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Admin</span>}
            {collapsed && (
              <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Admin</div>
            )}
          </Link>
        )}
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sair' : undefined}
          className={cn(
            'flex items-center rounded-xl transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-700 group relative',
            collapsed ? 'justify-center h-11 w-11 mx-auto' : 'gap-3 px-3 py-2.5 w-full'
          )}
        >
          <LogOut className="w-5 h-5 text-slate-400 shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Sair</span>}
          {collapsed && (
            <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
              Sair
            </div>
          )}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className={cn(
            'flex items-center rounded-xl transition-all text-slate-400 hover:bg-slate-50 hover:text-slate-600',
            collapsed ? 'justify-center h-11 w-11 mx-auto' : 'gap-3 px-3 py-2.5 w-full'
          )}
        >
          {collapsed
            ? <ChevronRight className="w-5 h-5" />
            : (
              <>
                <ChevronLeft className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">Recolher</span>
              </>
            )
          }
        </button>
      </div>
    </aside>
  )
}
