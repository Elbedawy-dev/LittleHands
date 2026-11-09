import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Heart,
  LayoutDashboard,
  LogOut,
  Moon,
  ShoppingBag,
  Sun,
  User,
  X,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import { useScrollLock } from '../../hooks/useScrollLock'
import { cn } from '../../utils'
import { Logo } from '../ui/Logo'

export function MobileDrawer({ isOpen, onClose }) {
  const { t } = useTranslation(['nav', 'common', 'auth'])
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const { user, isAuthenticated, logout } = useAuth()
  const location = useLocation()
  const drawerRef = useRef(null)
  const shouldReduceMotion = useReducedMotion()

  useScrollLock(Boolean(isOpen))

  // Close on route changes
  useEffect(() => {
    if (isOpen) onClose()
  }, [location.pathname, isOpen, onClose])

  // ESC listener & focus trap
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Simple focus trap
      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length > 0) {
          const first = focusable[0]
          const last = focusable[focusable.length - 1]
          if (e.shiftKey && document.activeElement === first) {
            last.focus()
            e.preventDefault()
          } else if (!e.shiftKey && document.activeElement === last) {
            first.focus()
            e.preventDefault()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (typeof document === 'undefined') return null
  if (!isOpen) return null

  const navLinks = [
    { href: '/', label: t('nav:links.home', 'الرئيسية') },
    { href: '/products', label: t('nav:links.products', 'المنتجات') },
    { href: '/sellers', label: t('nav:links.sellers', 'البائعات') },
    { href: '/about', label: t('nav:links.about', 'عن المنصة') },
  ]

  const isLinkActive = (href) => {
    if (href === '/') return location.pathname === '/'
    return location.pathname.startsWith(href)
  }

  // Animation strictly from the physical LEFT in both languages
  const drawerVariants = {
    initial: { x: shouldReduceMotion ? 0 : '-100%' },
    animate: { x: 0 },
    exit: { x: shouldReduceMotion ? 0 : '-100%' },
  }

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex" dir="ltr">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.05 : 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          aria-hidden="true"
        />

        {/* Drawer Container (physical left) */}
        <motion.div
          ref={drawerRef}
          variants={drawerVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={
            shouldReduceMotion
              ? { duration: 0.05 }
              : { type: 'spring', damping: 28, stiffness: 260 }
          }
          role="dialog"
          aria-modal="true"
          className="relative z-10 w-[min(86vw,320px)] h-full bg-surface text-text-main shadow-float flex flex-col justify-between border-e border-surface-border overflow-hidden"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          {/* Scrollable Upper Section */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scrollbar">
            {/* 1. Header: Logo mark + one-line brand name + close button */}
            <div className="p-4 flex items-center justify-between border-b border-surface-border">
              <Logo asLink to="/" variant="full" size="sm" onClick={onClose} />
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors"
                aria-label={t('common:actions.close', 'إغلاق')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2. Main Navigation Links */}
            <div className="p-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center justify-between px-4 py-2.5 rounded-2xl text-sm font-bold transition-colors select-none',
                    isLinkActive(link.href)
                      ? 'bg-brand-orange text-white shadow-soft font-black'
                      : 'text-text-main hover:bg-surface-subtle'
                  )}
                >
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-surface-border mx-3" />

            {/* 3. Appearance and Language Row (DIRECTLY under the links, no spacer) */}
            <div className="p-3">
              <div className="p-2.5 rounded-2xl bg-surface-subtle border border-surface-border/60 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-text-muted">
                  {t('nav:appearanceAndLang', 'المظهر واللغة')}
                </span>

                <div className="flex items-center gap-1.5" dir="ltr">
                  {/* Stable AR | EN Toggle */}
                  <button
                    type="button"
                    onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                    className="px-2.5 py-1 rounded-full text-xs font-bold border border-surface-border bg-surface text-text-main hover:bg-surface-subtle transition-colors inline-flex items-center gap-1 select-none"
                    aria-label={t('common:actions.switchLanguage', 'تبديل اللغة')}
                  >
                    <span className={language === 'ar' ? 'text-brand-orange font-black' : 'text-text-muted'}>
                      AR
                    </span>
                    <span className="text-surface-border select-none">|</span>
                    <span className={language === 'en' ? 'text-brand-orange font-black' : 'text-text-muted'}>
                      EN
                    </span>
                  </button>

                  {/* Theme Toggle */}
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="p-1.5 rounded-full border border-surface-border bg-surface text-text-main hover:bg-surface-subtle transition-colors"
                    aria-label={theme === 'dark' ? t('common:actions.lightMode', 'الوضع النهاري') : t('common:actions.darkMode', 'الوضع الليلي')}
                  >
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4 text-brand-yellow" />
                    ) : (
                      <Moon className="w-4 h-4 text-text-muted" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 4. For Logged-in Users: Short List of Account Links */}
            {isAuthenticated && user && (
              <div className="p-3 pt-0 space-y-1">
                <div className="border-t border-surface-border mb-2" />
                <span className="text-[11px] font-bold text-text-muted px-3 block mb-1">
                  {t('nav:accountSection', 'الحساب والطلبيات')}
                </span>

                {user.role === 'seller' && (
                  <Link
                    to="/seller"
                    onClick={onClose}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-brand-orange-text dark:text-brand-orange bg-brand-orange/10 hover:bg-brand-orange/20 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    <span>{t('nav:dashboard.seller', 'لوحة تحكم البائعة')}</span>
                  </Link>
                )}

                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={onClose}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    <span>{t('nav:dashboard.admin', 'لوحة تحكم إدارة المنصة')}</span>
                  </Link>
                )}

                <Link
                  to="/account"
                  onClick={onClose}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-surface-subtle transition-colors"
                >
                  <User className="w-4 h-4 text-text-muted shrink-0" />
                  <span>{t('nav:account.profile', 'حسابي')}</span>
                </Link>

                <Link
                  to="/account/orders"
                  onClick={onClose}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-surface-subtle transition-colors"
                >
                  <ShoppingBag className="w-4 h-4 text-text-muted shrink-0" />
                  <span>{t('nav:account.orders', 'طلباتي')}</span>
                </Link>

                <Link
                  to="/account/favorites"
                  onClick={onClose}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-surface-subtle transition-colors"
                >
                  <Heart className="w-4 h-4 text-text-muted shrink-0" />
                  <span>{t('nav:account.favorites', 'المفضلة')}</span>
                </Link>
              </div>
            )}
          </div>

          {/* 5. Bottom Pinned Section with Safe-Area Padding */}
          <div className="p-4 border-t border-surface-border bg-surface shrink-0 pb-safe">
            {isAuthenticated && user ? (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  logout()
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 transition-colors"
              >
                <LogOut className="w-4 h-4 rtl:rotate-180" />
                <span>{t('common:actions.logout', 'تسجيل الخروج')}</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  to="/login"
                  onClick={onClose}
                  className="py-2.5 px-3 rounded-full text-center text-xs font-bold border border-surface-border bg-surface text-text-main hover:bg-surface-subtle transition-colors"
                >
                  {t('auth:loginTitle', 'تسجيل الدخول')}
                </Link>
                <Link
                  to="/register"
                  onClick={onClose}
                  className="py-2.5 px-3 rounded-full text-center text-xs font-bold bg-brand-orange text-white hover:bg-[#e07528] shadow-soft transition-colors"
                >
                  {t('auth:registerLink', 'إنشاء حساب')}
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}

