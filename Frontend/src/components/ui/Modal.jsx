import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useScrollLock } from '../../hooks/useScrollLock'
import { cn } from '../../utils'

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
  showClose = true,
  className,
}) {
  const { t } = useTranslation('common')
  useScrollLock(Boolean(isOpen))

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* خلفية معتمة */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* محتوى النافذة المنبثقة */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative w-full bg-surface border border-surface-border rounded-[24px] shadow-float text-text-main z-10 max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden',
              maxWidth,
              className
            )}
          >
            {(title || showClose) && (
              <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-surface-border shrink-0">
                <div className="pe-3">
                  {title && (
                    <h3 className="text-xl font-bold font-heading text-text-main">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>

                {showClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-full text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors shrink-0 cursor-pointer"
                    aria-label={t('ui.closeModal')}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            <div
              className={cn(
                'flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scrollbar px-6 py-4 pe-5',
                !(title || showClose) && 'pt-6'
              )}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

