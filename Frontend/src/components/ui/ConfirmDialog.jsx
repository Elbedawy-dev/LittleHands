import { AlertTriangle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useScrollLock } from '../../hooks/useScrollLock'
import { Button } from './Button'
import { Modal } from './Modal'

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'هل أنت متأكد؟',
  message,
  confirmText = 'نعم، تأكيد',
  cancelText = 'إلغاء',
  variant = 'danger',
  loading = false,
  requireWord,
  requireWordPrompt,
}) {
  useScrollLock(Boolean(isOpen))
  const [typedWord, setTypedWord] = useState('')

  useEffect(() => {
    if (isOpen) {
      setTypedWord('')
    }
  }, [isOpen])

  const isConfirmDisabled = loading || (Boolean(requireWord) && typedWord.trim() !== requireWord)

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md" showClose={!loading}>
      <div className="flex flex-col items-center text-center py-2">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
            variant === 'danger'
              ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
              : 'bg-brand-orange/15 text-brand-orange'
          }`}
        >
          <AlertTriangle className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-bold font-heading text-text-main mb-2">
          {title}
        </h3>

        {message && (
          <p className="text-sm text-text-muted leading-relaxed mb-4">
            {message}
          </p>
        )}

        {requireWord && (
          <div className="w-full mb-5 text-start space-y-1.5">
            <label className="text-xs font-bold text-text-muted block text-center">
              {requireWordPrompt || (
                <span>
                  لتأكيد العملية، يرجى كتابة <strong className="text-rose-600 font-mono select-all">"{requireWord}"</strong> أدناه:
                </span>
              )}
            </label>
            <input
              type="text"
              value={typedWord}
              onChange={(e) => setTypedWord(e.target.value)}
              placeholder={requireWord}
              disabled={loading}
              className="w-full px-3.5 py-2 text-center font-bold text-sm rounded-xl border border-surface-border bg-surface text-text-main focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              autoFocus
            />
          </div>
        )}

        <div className="flex items-center justify-center gap-3 w-full">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            {cancelText}
          </Button>

          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={() => onConfirm(typedWord)}
            disabled={isConfirmDisabled}
            loading={loading}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

