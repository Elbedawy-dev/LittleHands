import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../utils'

export function CopyButton({
  text,
  label = 'نسخ',
  copiedLabel = 'تم النسخ!',
  size = 'sm',
  className,
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.warn('Clipboard copy failed:', e)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-bold rounded-full transition-all duration-200 cursor-pointer select-none',
        copied
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
          : 'bg-surface-subtle hover:bg-brand-orange/10 text-text-main hover:text-brand-orange-text border border-surface-border',
        size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm',
        className
      )}
      aria-label={copied ? copiedLabel : label}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
          <span>{copiedLabel}</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>{label}</span>
        </>
      )}
    </button>
  )
}

