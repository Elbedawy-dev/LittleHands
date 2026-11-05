import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useScrollLock } from '../../hooks/useScrollLock'

export function Lightbox({ isOpen, onClose, src, alt = 'صورة مكبرة' }) {
  useScrollLock(Boolean(isOpen && src))

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !src || typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 overscroll-contain"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm cursor-zoom-out"
        />

        <div className="relative z-10 max-w-4xl max-h-[90vh] flex flex-col items-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute -top-12 end-0 p-2 text-white hover:text-brand-orange transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-7 h-7" />
          </button>

          <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            src={src}
            alt={alt}
            className="max-h-[85vh] w-auto max-w-full rounded-[16px] object-contain shadow-2xl"
          />
        </div>
      </div>
    </AnimatePresence>,
    document.body
  )
}

