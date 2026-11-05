import { AlertTriangle } from 'lucide-react'
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
}) {
  useScrollLock(Boolean(isOpen))

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
          <p className="text-sm text-text-muted leading-relaxed mb-6">
            {message}
          </p>
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
            onClick={onConfirm}
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

