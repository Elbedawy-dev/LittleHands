import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useScrollLock } from '../../hooks/useScrollLock'
import { cn, getImageUrl } from '../../utils'

export function Lightbox({
  isOpen,
  onClose,
  src,
  images = [],
  index = 0,
  onIndexChange,
  alt = '',
}) {
  const { t, i18n } = useTranslation('common')
  const isRtl = i18n.dir() === 'rtl'

  const rawList = images && images.length > 0 ? images : (src ? [src] : [])
  const imageList = rawList.map(getImageUrl).filter(Boolean)
  const total = imageList.length

  const [currentIndex, setCurrentIndex] = useState(index || 0)
  const activeThumbRef = useRef(null)
  const dialogRef = useRef(null)
  const touchStartX = useRef(null)
  const touchEndX = useRef(null)

  useScrollLock(Boolean(isOpen && total > 0))

  useEffect(() => {
    if (typeof index === 'number' && index >= 0 && index < total) {
      setCurrentIndex(index)
    }
  }, [index, total, isOpen])

  const handleClose = useCallback(() => {
    if (onIndexChange) {
      onIndexChange(currentIndex)
    }
    onClose()
  }, [currentIndex, onIndexChange, onClose])

  const handlePrev = useCallback(() => {
    if (total <= 1) return
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : total - 1))
  }, [total])

  const handleNext = useCallback(() => {
    if (total <= 1) return
    setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : 0))
  }, [total])

  // Scroll active thumbnail into view
  useEffect(() => {
    if (activeThumbRef.current) {
      activeThumbRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }, [currentIndex])

  // Keyboard navigation & Focus management
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (isRtl) {
          handleNext()
        } else {
          handlePrev()
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (isRtl) {
          handlePrev()
        } else {
          handleNext()
        }
      } else if (e.key === 'Tab') {
        // Simple focus trap within dialog
        if (!dialogRef.current) return
        const focusable = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose, handleNext, handlePrev, isRtl])

  // Mobile swipe gestures
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Swiped left
        if (isRtl) {
          handleNext()
        } else {
          handlePrev()
        }
      } else {
        // Swiped right
        if (isRtl) {
          handlePrev()
        } else {
          handleNext()
        }
      }
    }
    touchStartX.current = null
    touchEndX.current = null
  }

  if (!isOpen || total === 0 || typeof document === 'undefined') return null

  const activeSrc = imageList[currentIndex] || imageList[0]

  return createPortal(
    <AnimatePresence>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={alt || t('ui.zoomIn')}
        tabIndex={-1}
        className="fixed inset-0 z-50 flex flex-col items-center justify-between p-3 sm:p-6 overscroll-contain select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/90 backdrop-blur-md cursor-zoom-out"
        />

        {/* Top bar: counter and close button */}
        <div className="relative z-10 w-full max-w-5xl flex items-center justify-between py-2">
          {total > 1 ? (
            <div className="px-3.5 py-1.5 rounded-full bg-white/10 text-white text-xs sm:text-sm font-bold tracking-wider backdrop-blur-md border border-white/10">
              <span dir="ltr">{currentIndex + 1} / {total}</span>
            </div>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleClose}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white hover:text-brand-orange transition-all cursor-pointer backdrop-blur-md border border-white/10"
            aria-label={t('ui.closePreview')}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main image container with side navigation arrows */}
        <div className="relative z-10 flex-1 w-full max-w-5xl flex items-center justify-center min-h-0 py-2">
          {/* Previous Arrow Button (Visual Start) */}
          {total > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="absolute start-2 sm:start-4 z-20 p-2.5 sm:p-3 rounded-full bg-black/50 hover:bg-black/75 text-white hover:text-brand-orange transition-all cursor-pointer backdrop-blur-sm border border-white/15"
              aria-label={t('ui.previousImage')}
            >
              <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 rtl:rotate-180" />
            </button>
          )}

          <motion.img
            key={activeSrc}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            src={activeSrc}
            alt={alt ? `${alt} (${currentIndex + 1}/${total})` : t('ui.zoomIn')}
            className="max-h-[65vh] sm:max-h-[72vh] w-auto max-w-full rounded-[16px] object-contain shadow-2xl"
          />

          {/* Next Arrow Button (Visual End) */}
          {total > 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="absolute end-2 sm:end-4 z-20 p-2.5 sm:p-3 rounded-full bg-black/50 hover:bg-black/75 text-white hover:text-brand-orange transition-all cursor-pointer backdrop-blur-sm border border-white/15"
              aria-label={t('ui.nextImage')}
            >
              <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 rtl:rotate-180" />
            </button>
          )}
        </div>

        {/* Bottom thumbnails track (if more than 1 image) */}
        {total > 1 && (
          <div className="relative z-10 w-full max-w-3xl flex justify-center py-2">
            <div className="flex items-center gap-2 overflow-x-auto modal-scrollbar snap-x snap-mandatory py-2 px-3 max-w-full">
              {imageList.map((imgUrl, idx) => {
                const isSelected = idx === currentIndex
                return (
                  <button
                    key={idx}
                    ref={isSelected ? activeThumbRef : null}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      'relative w-12 h-12 sm:w-16 sm:h-16 rounded-[12px] overflow-hidden shrink-0 snap-center border-2 transition-all p-0 cursor-pointer',
                      isSelected
                        ? 'border-brand-orange ring-2 ring-brand-orange/40 scale-105'
                        : 'border-white/20 opacity-60 hover:opacity-100 hover:border-white/50'
                    )}
                    aria-label={`${t('ui.imageAlt', { index: idx + 1 })}`}
                  >
                    <img
                      src={imgUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>,
    document.body
  )
}
