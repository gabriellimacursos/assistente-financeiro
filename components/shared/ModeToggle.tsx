'use client'
import { Building2, User, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ViewMode } from '@/types'

interface ModeToggleProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
  size?: 'sm' | 'md'
  className?: string
}

const OPTIONS: { value: ViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'business', label: 'Empresa', icon: Building2 },
  { value: 'all', label: 'Geral', icon: BarChart3 },
  { value: 'personal', label: 'Pessoal', icon: User },
]

export default function ModeToggle({ value, onChange, size = 'md', className }: ModeToggleProps) {
  return (
    <div className={cn(
      'flex bg-slate-100 rounded-2xl p-1',
      size === 'sm' ? 'gap-0.5' : 'gap-1',
      className
    )}>
      {OPTIONS.map(({ value: v, label, icon: Icon }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all duration-200',
            size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm',
            value === v
              ? v === 'business'
                ? 'bg-primary-500 text-white shadow-sm'
                : v === 'personal'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
          {label}
        </button>
      ))}
    </div>
  )
}
