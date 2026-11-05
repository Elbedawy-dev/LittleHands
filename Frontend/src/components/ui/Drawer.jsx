import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '../../context/LanguageContext'
import { useScrollLock } from '../../hooks/useScrollLock'
import { cn } from '../../utils'

export function Drawer({
  isOpen,
  onClose,
  title,
  side = 'start', // 'start' | 'end' | 'bottom'
  size = 'md', // 'sm' | 'md' | 'lg' | 'full'
  children,
  className,
}) {
  const { isRtl } = useLanguage()
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

  // تحديد اتجاه الحركة بناء على اللغة والموقع
  const getVariants = () => {
    if (side === 'bottom') {
      return {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
      }
    }

    // start في العربي يمين (100%)، وفي الإنجليزي يسار (-100%)
    if (side === 'start') {
      const offset = isRtl ? '100%' : '-100%'
      return {
        initial: { x: offset },
        animate: { x: 0 },
        exit: { x: offset },
      }
    }

    // end في العربي يسار (-100%)، وفي الإنجليزي يمين (100%)
    const offset = isRtl ? '-100%' : '100%'
    return {
      initial: { x: offset },
      animate: { x: 0 },
      exit: { x: offset },
    }
  }

  const sizes = {
    sm: 'max-w-xs',
    md: 'max-w-md',
    lg: 'max-w-xl',
    full: 'max-w-full',
  }

  const motionVariants = getVariants()

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* خلفية معتمة */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          <div
            className={cn(
              'fixed inset-0 flex',
              side === 'bottom'
                ? 'items-end'
                : side === 'start'
                ? 'justify-start'
                : 'justify-end'
            )}
          >
            <motion.div
              variants={motionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              role="dialog"
              aria-modal="true"
              className={cn(
                'relative w-full bg-surface border-surface-border text-text-main shadow-float flex flex-col z-10',
                side === 'bottom'
                  ? 'max-h-[85vh] rounded-t-[28px] border-t'
                  : cn(
                      'h-full border-s border-e',
                      side === 'start' ? 'rounded-e-[28px]' : 'rounded-s-[28px]',
                      sizes[size] || sizes.md
                    ),
                className
              )}
            >
              {/* شريط الإمساك في حالة Bottom Sheet */}
              {side === 'bottom' && (
                <div className="w-12 h-1.5 bg-surface-subtle rounded-full mx-auto mt-3 mb-1" />
              )}

              {/* رأس الدرج */}
              <div className="flex items-center justify-between p-5 border-b border-surface-border shrink-0">
                <h3 className="text-lg font-bold font-heading text-text-main">
                  {title}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-full text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors"
                  aria-label="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* المحتوى */}
              <div className="p-5 overflow-y-auto overscroll-contain flex-1">{children}</div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

