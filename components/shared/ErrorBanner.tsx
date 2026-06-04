'use client'
import { X, AlertTriangle, AlertCircle, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import type { ErrorCode } from '@/lib/errors'
import { cn } from '@/lib/utils'

interface ErrorBannerProps {
  title: string
  description?: string
  action?: string
  code?: ErrorCode
  severity?: 'error' | 'warning'
  onClose?: () => void
  className?: string
}

export default function ErrorBanner({
  title,
  description,
  action,
  code,
  severity = 'error',
  onClose,
  className,
}: ErrorBannerProps) {
  const [copied, setCopied] = useState(false)

  const isError = severity === 'error'

  function copyCode() {
    if (!code) return
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className={cn(
      'rounded-2xl border-2 p-4 space-y-2',
      isError
        ? 'bg-red-50 border-red-200'
        : 'bg-amber-50 border-amber-200',
      className
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
          isError ? 'bg-red-100' : 'bg-amber-100'
        )}>
          {isError
            ? <AlertCircle className="w-4 h-4 text-red-500" />
            : <AlertTriangle className="w-4 h-4 text-amber-500" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-bold leading-tight',
            isError ? 'text-red-800' : 'text-amber-800'
          )}>
            {title}
          </p>

          {description && (
            <p className={cn(
              'text-xs mt-1 leading-relaxed',
              isError ? 'text-red-600' : 'text-amber-700'
            )}>
              {description}
            </p>
          )}

          {action && (
            <p className={cn(
              'text-xs mt-1.5 font-semibold',
              isError ? 'text-red-700' : 'text-amber-700'
            )}>
              → {action}
            </p>
          )}

          {code && (
            <button
              onClick={copyCode}
              className={cn(
                'inline-flex items-center gap-1 mt-1.5 px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-colors',
                isError
                  ? 'bg-red-100 text-red-500 hover:bg-red-200'
                  : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
              )}
              title="Copiar código do erro"
            >
              {copied
                ? <><Check className="w-3 h-3" /> Copiado!</>
                : <><Copy className="w-3 h-3" /> Código: {code}</>
              }
            </button>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className={cn(
              'w-6 h-6 flex items-center justify-center rounded-lg shrink-0 transition-colors',
              isError
                ? 'text-red-400 hover:text-red-600 hover:bg-red-100'
                : 'text-amber-400 hover:text-amber-600 hover:bg-amber-100'
            )}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
