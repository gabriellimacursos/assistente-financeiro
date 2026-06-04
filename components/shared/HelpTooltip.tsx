'use client'
import { useState } from 'react'
import { Info, X, Lightbulb } from 'lucide-react'
import { HELP_CONTENT } from '@/lib/help-content'
import { cn } from '@/lib/utils'

interface HelpTooltipProps {
  id: string
  size?: 'sm' | 'md'
  className?: string
}

export default function HelpTooltip({ id, size = 'sm', className }: HelpTooltipProps) {
  const [open, setOpen] = useState(false)
  const content = HELP_CONTENT[id]
  if (!content) return null

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(true) }}
        className={cn(
          'inline-flex items-center justify-center rounded-full text-slate-400 hover:text-primary-500 hover:bg-primary-50 transition-colors shrink-0',
          size === 'sm' ? 'w-5 h-5' : 'w-6 h-6',
          className
        )}
        aria-label={`Ajuda: ${content.title}`}
      >
        <Info className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-[80] flex items-end lg:items-center lg:justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg mx-auto bg-white rounded-t-3xl lg:rounded-3xl max-h-[85vh] overflow-y-auto animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 lg:hidden">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>

            <div className="p-6 pb-10 lg:pb-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-primary-50 rounded-2xl flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5 text-primary-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 leading-tight">{content.title}</h3>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {/* Descrição */}
              <p className="text-slate-600 text-sm leading-relaxed">{content.description}</p>

              {/* Dicas */}
              {content.tips && content.tips.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dicas</p>
                  </div>
                  <div className="space-y-2">
                    {content.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2.5 bg-slate-50 rounded-xl px-3 py-2.5">
                        <span className="w-5 h-5 bg-primary-100 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-primary-600">
                          {i + 1}
                        </span>
                        <p className="text-sm text-slate-600 leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exemplo */}
              {content.example && (
                <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4">
                  <p className="text-xs font-bold text-primary-500 uppercase tracking-wider mb-1.5">Exemplo</p>
                  <p className="text-sm text-primary-800 italic leading-relaxed">"{content.example}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
