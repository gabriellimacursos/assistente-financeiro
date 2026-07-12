'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Mic, Clock, CreditCard, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useFinanceStore } from '@/lib/store/useFinanceStore'

const PRIMARY_NAV = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/timeline', label: 'Histórico', icon: Clock },
  { href: '/registrar', label: 'Registrar', icon: Mic, highlight: true },
  { href: '/cartoes', label: 'Cartões', icon: CreditCard },
  { href: '/_more', label: 'Mais', icon: MoreHorizontal, isMore: true },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [showMore, setShowMore] = useState(false)
  const { isAdmin, profiles, activeProfileId } = useFinanceStore()
  const activeProfile = profiles.find(p => p.id === activeProfileId)
  const canViewAdmin = isAdmin && (activeProfile?.isOwner ?? false)

  const moreItems = [
    { href: '/produtividade', label: '⚡ Produtividade' },
    { href: '/produtividade/hoje', label: '📅 Hoje (Prod.)' },
    { href: '/produtividade/tarefas', label: '✅ Tarefas' },
    { href: '/produtividade/projetos', label: '📁 Projetos' },
    { href: '/produtividade/revisao', label: '🔄 Revisão Semanal' },
    { href: '/recorrencias', label: '🔄 Recorrências' },
    { href: '/configuracoes', label: '⚙️ Configurações' },
    ...(canViewAdmin ? [{ href: '/admin', label: '🛡️ Admin' }] : []),
  ]

  return (
    <>
      {/* More overlay */}
      {showMore && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setShowMore(false)}>
          <div className="absolute bottom-16 right-2 bg-white rounded-2xl shadow-card-lg border border-slate-100 overflow-hidden min-w-[160px]" onClick={e => e.stopPropagation()}>
            {moreItems.map(item => (
              <button key={item.href} onClick={() => { router.push(item.href); setShowMore(false) }}
                className={cn('w-full px-5 py-3.5 text-left text-sm font-semibold transition-colors',
                  pathname === item.href ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50')}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100">
        <div className="flex items-center justify-around h-16 px-1">
          {PRIMARY_NAV.map(({ href, label, icon: Icon, highlight, isMore }) => {
            const active = pathname === href || (isMore && moreItems.some(i => i.href === pathname))

            if (highlight) {
              return (
                <Link key={href} href={href} className="flex flex-col items-center justify-center -mt-5">
                  <div className={cn(
                    'w-13 h-13 w-[52px] h-[52px] rounded-2xl flex items-center justify-center shadow-float transition-transform active:scale-95',
                    pathname === href
                      ? 'bg-primary-600 shadow-primary-500/40'
                      : 'bg-gradient-to-br from-primary-500 to-indigo-600 shadow-primary-400/40'
                  )}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] font-medium text-primary-600 mt-1">{label}</span>
                </Link>
              )
            }

            if (isMore) {
              return (
                <button key="more" onClick={() => setShowMore(!showMore)}
                  className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2">
                  <Icon className={cn('w-5 h-5 transition-colors', active || showMore ? 'text-primary-500' : 'text-slate-400')} />
                  <span className={cn('text-[10px] font-medium', active || showMore ? 'text-primary-500' : 'text-slate-400')}>{label}</span>
                </button>
              )
            }

            return (
              <Link key={href} href={href} className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2">
                <Icon className={cn('w-5 h-5 transition-colors', pathname === href ? 'text-primary-500' : 'text-slate-400')} />
                <span className={cn('text-[10px] font-medium', pathname === href ? 'text-primary-500' : 'text-slate-400')}>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
