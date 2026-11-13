import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Bell,
  LogOut,
  Menu,
  Moon,
  ShoppingBag,
  Sun,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'
import { useNotifications } from '../../context/NotificationContext'
import { useTheme } from '../../context/ThemeContext'
import { NotificationsDropdown } from '../../features/notifications/NotificationsDropdown'
import { useScrollLock } from '../../hooks/useScrollLock'
import { cn, getDisplayName, isInSection } from '../../utils'
import { Avatar } from '../ui/Avatar'
import { Logo } from '../ui/Logo'

/**
 * MobileTopBar
 * Unified top bar for ALL accounts (guest, customer, seller, admin; public pages AND dashboards).
 * Fixed physical layout in BOTH languages:
 *  - dir="ltr"
 *  - Physical LEFT: Hamburger button + Logo mark ONLY (no text)
 *  - Physical RIGHT: Outer right edge inward: Avatar -> Bell -> Cart (JSX order: Cart, Bell, Avatar in LTR)
 *  - No AR|EN, no theme toggle, no role chip inside the bar.
 *  - Drawer physically anchored to physical LEFT in both languages.
 *  - Height 56-64px (h-16 = 64px), tap targets >= 44px.
 */
export function MobileTopBar({ drawerContent, user: propUser }) {
  const { t } = useTranslation(['nav', 'common', 'auth'])
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user: authUser, isAuthenticated, logout } = useAuth()
  const user = propUser !== undefined ? propUser : authUser
  const { totalCount } = useCart()
  const { unreadCount } = useNotifications()
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const _isEn = language === 'en'
  const shouldReduceMotion = useReducedMotion()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const bellBtnRef = useRef(null)
  const drawerRef = useRef(null)

  useScrollLock(Boolean(drawerOpen))

  // Close drawer on pathname change
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Escape key listener
  useEffect(() => {
    if (!drawerOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [drawerOpen])

  // Avatar click handler - strictly NAVIGATES, no menus/dropdowns
  const handleAvatarClick = () => {
    if (!isAuthenticated || !user) {
      navigate('/login')
    } else if (user.role === 'admin') {
      navigate('/admin/account')
    } else if (user.role === 'seller') {
      navigate('/seller/profile')
    } else {
      navigate('/account')
    }
  }

  // Display name extraction
  const displayName = user ? getDisplayName(user, language) : ''

  // Build default drawer links based on role / route if drawerContent not passed
  const getDrawerLinks = () => {
    if (Array.isArray(drawerContent)) return drawerContent

    const currentRole = user?.role

    if (isInSection(pathname, '/admin') || currentRole === 'admin') {
      return [
        { href: '/admin', label: t('nav:admin.dashboard', 'لوحة التحكم'), exact: true },
        { href: '/admin/payments', label: t('nav:admin.payments', 'مدفوعات فودافون كاش') },
        { href: '/admin/orders', label: t('nav:admin.orders', 'الطلبات') },
        { href: '/admin/products', label: t('nav:admin.products', 'المنتجات') },
        { href: '/admin/sellers', label: t('nav:admin.sellers', 'البائعات والأرباح') },
        { href: '/admin/customers', label: t('nav:admin.customers', 'العملاء') },
        { href: '/admin/categories', label: t('nav:admin.categories', 'التصنيفات') },
        { href: '/admin/notifications', label: t('nav:admin.notifications', 'الإشعارات') },
        { href: '/admin/settings', label: t('nav:admin.settings', 'الإعدادات') },
        { href: '/', label: t('nav:backToStore', 'الرجوع إلى المتجر'), isReturnToStore: true },
      ]
    }

    if (isInSection(pathname, '/seller') || currentRole === 'seller') {
      return [
        { href: '/seller', label: t('nav:seller.dashboard', 'لوحة التحكم'), exact: true },
        { href: '/seller/products', label: t('nav:seller.products', 'منتجاتي') },
        { href: '/seller/orders', label: t('nav:seller.orders', 'طلباتي') },
        { href: '/seller/custom-requests', label: t('nav:seller.customRequests', 'الطلبات الخاصة') },
        { href: '/seller/earnings', label: t('nav:seller.earnings', 'أرباحي') },
        { href: '/seller/profile', label: t('nav:seller.profile', 'ملفي الشخصي') },
        { href: '/seller/notifications', label: t('nav:seller.notifications', 'الإشعارات') },
        { href: '/', label: t('nav:backToStore', 'الرجوع إلى المتجر'), isReturnToStore: true },
      ]
    }

    return [
      { href: '/', label: t('nav:links.home', 'الرئيسية'), exact: true },
      { href: '/products', label: t('nav:links.products', 'المنتجات') },
      { href: '/sellers', label: t('nav:links.sellers', 'البائعات') },
      { href: '/about', label: t('nav:links.about', 'عن المنصة') },
    ]
  }

  const links = getDrawerLinks()

  const isLinkActive = (href, exact) => {
    if (exact || href === '/') return pathname === href
    return isInSection(pathname, href)
  }

  // Animation strictly from physical LEFT (x: -100% to 0) in both languages
  const drawerVariants = {
    initial: { x: shouldReduceMotion ? 0 : '-100%' },
    animate: { x: 0 },
    exit: { x: shouldReduceMotion ? 0 : '-100%' },
  }

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. SHARED MOBILE TOP BAR CONTAINER (Fixed physical layout, dir="ltr")    */}
      {/* ========================================================================= */}
      <header
        className="lg:hidden sticky top-0 z-40 w-full h-16 max-w-full px-3 sm:px-4 flex items-center justify-between select-none bg-surface/95 backdrop-blur-md border-b border-surface-border transition-colors"
        dir="ltr"
        data-testid="shared-mobile-topbar"
      >
        {/* Physical LEFT: Hamburger button + Logo mark ONLY */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen((prev) => !prev)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-full text-text-main hover:bg-surface-subtle active:scale-95 transition-all cursor-pointer"
            aria-label={t('nav:openMenu', 'فتح القائمة الرئيسية')}
            aria-expanded={drawerOpen}
            data-testid="mobile-hamburger"
          >
            <Menu className="w-6 h-6" />
          </button>

          <Link
            to="/"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 transition-transform"
            aria-label={t('common:brand', 'أيدي صغيرة')}
            data-testid="mobile-logo-mark"
          >
            <Logo variant="mark" size="sm" />
          </Link>
        </div>

        {/* Physical RIGHT: Outer right edge inward: Avatar -> Bell -> Cart */}
        {/* In LTR flex row: Cart (left), Bell (center), Avatar (outer right edge) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Cart Icon (opens /cart for every role and guests) */}
          <button
            type="button"
            onClick={() => navigate('/cart')}
            className="min-w-[44px] min-h-[44px] relative flex items-center justify-center p-2 rounded-full text-text-main hover:bg-surface-subtle active:scale-95 transition-all cursor-pointer"
            aria-label={t('nav:cartAria', 'سلة الوسائل التعليمية')}
            data-testid="mobile-cart-btn"
          >
            <ShoppingBag className="w-5 h-5 text-brand-orange-text dark:text-brand-orange" />
            {totalCount > 0 && (
              <span className="absolute top-1.5 end-1.5 min-w-4 h-4 px-1 rounded-full bg-brand-orange text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                {totalCount > 99 ? '99+' : totalCount}
              </span>
            )}
          </button>

          {/* Notifications Bell */}
          <button
            ref={bellBtnRef}
            type="button"
            onClick={() => setNotifOpen((prev) => !prev)}
            className="min-w-[44px] min-h-[44px] relative flex items-center justify-center p-2 rounded-full text-text-main hover:bg-surface-subtle active:scale-95 transition-all cursor-pointer"
            aria-label={t('nav:notifications', 'الإشعارات')}
            data-testid="mobile-bell-btn"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 end-1.5 min-w-4 h-4 px-1 rounded-full bg-brand-orange text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Avatar Button (navigates on click) */}
          <button
            type="button"
            onClick={handleAvatarClick}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-1 rounded-full hover:bg-surface-subtle active:scale-95 transition-transform cursor-pointer"
            aria-label={displayName || t('common:tabBar.account')}
            data-testid="mobile-avatar-btn"
          >
            <Avatar
              src={user?.avatar}
              name={displayName}
              role={user?.role}
              size="sm"
            />
          </button>
        </div>

        {/* Notifications Modal / Dropdown */}
        <NotificationsDropdown
          open={notifOpen}
          onClose={() => setNotifOpen(false)}
          triggerRef={bellBtnRef}
        />
      </header>

      {/* ========================================================================= */}
      {/* 2. DRAWER OVERLAY VIA PORTAL (Physical LEFT anchor in BOTH languages)    */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {drawerOpen && (
              <div
                className="fixed inset-0 z-50 overflow-hidden flex"
                dir="ltr"
                data-testid="mobile-drawer-portal"
              >
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0.05 : 0.2 }}
                  onClick={() => setDrawerOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
                  aria-hidden="true"
                  data-testid="mobile-drawer-backdrop"
                />

                {/* Drawer Container (physically anchored to left-0) */}
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
                  aria-label={t('nav:openMenu', 'القائمة الرئيسية')}
                  className="relative z-10 w-[min(86vw,320px)] h-full bg-surface text-text-main shadow-float flex flex-col justify-between border-e border-surface-border overflow-hidden left-0"
                  dir={language === 'ar' ? 'rtl' : 'ltr'}
                  data-testid="mobile-drawer-panel"
                >
                  {/* Upper scrollable section */}
                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scrollbar">
                    {/* Header: Logo mark + brand name (single line) + Close X button */}
                    <div className="p-4 flex items-center justify-between border-b border-surface-border">
                      <Logo asLink to="/" variant="full" size="sm" onClick={() => setDrawerOpen(false)} />
                      <button
                        type="button"
                        onClick={() => setDrawerOpen(false)}
                        className="p-2 rounded-full text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors cursor-pointer"
                        aria-label={t('common:actions.close', 'إغلاق')}
                        data-testid="mobile-drawer-close"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Nav Links */}
                    <div className="p-3 space-y-1" data-testid="mobile-drawer-links">
                      {links.map((link) => {
                        const active = isLinkActive(link.href, link.exact)
                        return (
                          <Link
                            key={link.href}
                            to={link.href}
                            onClick={() => setDrawerOpen(false)}
                            className={cn(
                              'flex items-center justify-between px-4 py-2.5 rounded-2xl text-sm font-bold transition-colors select-none',
                              active
                                ? 'bg-brand-orange text-white shadow-soft font-black'
                                : 'text-text-main hover:bg-surface-subtle',
                              link.isReturnToStore && 'border border-surface-border text-text-muted hover:text-text-main'
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              {link.icon && <span className="shrink-0">{link.icon}</span>}
                              <span>{link.label}</span>
                            </div>
                            {link.badge !== undefined && link.badge !== null && (
                              <span
                                className={cn(
                                  'text-xs font-bold px-2 py-0.5 rounded-full',
                                  link.badgeColor || 'bg-brand-orange text-white'
                                )}
                              >
                                {link.badge}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-surface-border mx-3" />

                    {/* Appearance and Language row (DIRECTLY under the links, no empty gap) */}
                    <div className="p-3" data-testid="mobile-drawer-appearance-row">
                      <div className="p-2.5 rounded-2xl bg-surface-subtle border border-surface-border/60 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-text-muted">
                          {t('nav:appearanceAndLang', 'المظهر واللغة')}
                        </span>

                        <div className="flex items-center gap-1.5" dir="ltr">
                          {/* AR | EN Language Switch */}
                          <button
                            type="button"
                            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                            className="px-2.5 py-1 rounded-full text-xs font-bold border border-surface-border bg-surface text-text-main hover:bg-surface-subtle transition-colors inline-flex items-center gap-1 select-none cursor-pointer"
                            aria-label={t('common:actions.switchLanguage', 'تبديل اللغة')}
                            data-testid="drawer-lang-btn"
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
                            className="p-1.5 rounded-full border border-surface-border bg-surface text-text-main hover:bg-surface-subtle transition-colors cursor-pointer"
                            aria-label={
                              theme === 'dark'
                                ? t('common:actions.lightMode', 'الوضع النهاري')
                                : t('common:actions.darkMode', 'الوضع الليلي')
                            }
                            data-testid="drawer-theme-btn"
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
                  </div>

                  {/* Bottom section: login/register for guests, logout for signed-in users */}
                  <div className="p-4 border-t border-surface-border bg-surface shrink-0 pb-safe" data-testid="mobile-drawer-bottom">
                    {isAuthenticated && user ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDrawerOpen(false)
                          logout()
                          navigate('/login')
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                        data-testid="drawer-logout-btn"
                      >
                        <LogOut className="w-4 h-4 rtl:rotate-180" />
                        <span>{t('common:actions.logout', 'تسجيل الخروج')}</span>
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5">
                        <Link
                          to="/login"
                          onClick={() => setDrawerOpen(false)}
                          className="py-2.5 px-3 rounded-full text-center text-xs font-bold border border-surface-border bg-surface text-text-main hover:bg-surface-subtle transition-colors cursor-pointer"
                          data-testid="drawer-login-btn"
                        >
                          {t('auth:loginTitle', 'تسجيل الدخول')}
                        </Link>
                        <Link
                          to="/register"
                          onClick={() => setDrawerOpen(false)}
                          className="py-2.5 px-3 rounded-full text-center text-xs font-bold bg-brand-orange text-white hover:bg-[#e07528] shadow-soft transition-colors cursor-pointer"
                          data-testid="drawer-register-btn"
                        >
                          {t('auth:registerLink', 'إنشاء حساب')}
                        </Link>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}
