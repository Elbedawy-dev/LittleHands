import { AnimatePresence, motion } from 'framer-motion'
import {
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Settings,
  ShoppingBag,
  User,
  X,
} from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { Avatar } from '../../components/ui/Avatar'
import { useAuth } from '../../context/AuthContext'
import { useScrollLock } from '../../hooks/useScrollLock'

export function AccountBottomSheet({ isOpen, onClose }) {
  const { t } = useTranslation(['nav', 'common', 'auth'])
  const { user, logout } = useAuth()
  const location = useLocation()

  useScrollLock(Boolean(isOpen && user))

  // Close on route change
  useEffect(() => {
    if (isOpen) onClose()
  }, [location.pathname, isOpen, onClose])

  // ESC key listener
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

  if (typeof document === 'undefined') return null
  if (!isOpen || !user) return null

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />

        {/* Bottom Sheet Container */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 240 }}
          role="dialog"
          aria-modal="true"
          className="relative z-10 w-full max-h-[85vh] bg-surface rounded-t-[32px] border-t border-surface-border shadow-float flex flex-col overflow-hidden text-text-main pb-safe"
        >
          {/* Grab handle */}
          <div className="w-12 h-1.5 rounded-full bg-surface-border mx-auto mt-3 mb-2 shrink-0" />

          {/* User Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-surface-border">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                src={user.avatar}
                name={user.name}
                role={user.role}
                size="md"
                className="shrink-0"
              />
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-text-main truncate" data-user-content="true">
                  {user.name}
                </h4>
                <p className="text-xs text-text-muted truncate font-mono" dir="ltr" data-user-content="true">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors shrink-0"
              aria-label={t('common:actions.close', 'إغلاق')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Links */}
          <div className="p-4 space-y-1.5 overflow-y-auto overscroll-contain">
            {/* Dashboard Link for Seller or Admin */}
            {user.role === 'seller' && (
              <Link
                to="/seller"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold bg-brand-orange/15 text-brand-orange-text dark:text-brand-orange hover:bg-brand-orange/25 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>{t('nav:dashboard.seller', 'لوحة تحكم البائعة')}</span>
              </Link>
            )}

            {user.role === 'admin' && (
              <Link
                to="/admin"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/25 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>{t('nav:dashboard.admin', 'لوحة تحكم إدارة المنصة')}</span>
              </Link>
            )}

            <Link
              to="/account"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold hover:bg-surface-subtle transition-colors"
            >
              <User className="w-4 h-4 text-text-muted shrink-0" />
              <span>{t('nav:account.profile', 'حسابي')}</span>
            </Link>

            <Link
              to="/account/orders"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold hover:bg-surface-subtle transition-colors"
            >
              <ShoppingBag className="w-4 h-4 text-text-muted shrink-0" />
              <span>{t('nav:account.orders', 'طلباتي')}</span>
            </Link>

            <Link
              to="/account/favorites"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold hover:bg-surface-subtle transition-colors"
            >
              <Heart className="w-4 h-4 text-text-muted shrink-0" />
              <span>{t('nav:account.favorites', 'المفضلة')}</span>
            </Link>

            <Link
              to="/account/addresses"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold hover:bg-surface-subtle transition-colors"
            >
              <MapPin className="w-4 h-4 text-text-muted shrink-0" />
              <span>{t('nav:account.addresses', 'عناويني')}</span>
            </Link>

            <Link
              to="/account/settings"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold hover:bg-surface-subtle transition-colors"
            >
              <Settings className="w-4 h-4 text-text-muted shrink-0" />
              <span>{t('nav:account.settings', 'الإعدادات')}</span>
            </Link>
          </div>

          {/* Logout Button */}
          <div className="p-4 pt-2 border-t border-surface-border">
            <button
              type="button"
              onClick={() => {
                onClose()
                logout()
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 transition-colors"
            >
              <LogOut className="w-4 h-4 rtl:rotate-180" />
              <span>{t('common:actions.logout', 'تسجيل الخروج')}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}

