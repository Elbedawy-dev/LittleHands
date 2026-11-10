import {
  Bell,
  Moon,
  Search,
  ShoppingBag,
  Sun,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'
import { useNotifications } from '../../context/NotificationContext'
import { useTheme } from '../../context/ThemeContext'
import { MiniCartDrawer } from '../../features/cart/MiniCartDrawer'
import { NotificationsDropdown } from '../../features/notifications/NotificationsDropdown'
import { cn, getDisplayName } from '../../utils'
import { Avatar } from '../ui/Avatar'
import { Logo } from '../ui/Logo'

/**
 * Desktop Navbar (lg+ Screens)
 * Public desktop navbar order after the nav links:
 * [AR|EN] [search] [theme] [bell] [cart] [avatar or Sign in + Create account].
 * Language switch sits nearest to nav links, search icon sits next.
 * Avatar click navigates directly without dropdown menu.
 */
export function Navbar() {
  const { t } = useTranslation(['nav', 'common', 'auth', 'notifications'])
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { totalCount } = useCart()
  const { unreadCount } = useNotifications()
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const _isEn = language === 'en'

  const [cartOpen, setCartOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const bellBtnRef = useRef(null)

  const navLinks = [
    { href: '/', label: t('nav:links.home', 'الرئيسية') },
    { href: '/products', label: t('nav:links.products', 'المنتجات') },
    { href: '/sellers', label: t('nav:links.sellers', 'البائعات') },
    { href: '/about', label: t('nav:links.about', 'عن المنصة') },
  ]

  const isLinkActive = (href) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const displayName = user ? getDisplayName(user, language) : ''

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

  return (
    <>
      <header className="hidden lg:block sticky top-0 z-40 w-full bg-surface/95 backdrop-blur-md border-b border-surface-border transition-colors">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-6">
          {/* Start: Logo Mark + One-line Name */}
          <div className="shrink-0">
            <Logo asLink to="/" variant="full" size="md" />
          </div>

          {/* Center: Navigation Links */}
          <nav className="flex items-center gap-1.5" data-testid="desktop-nav-links">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href)
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 select-none',
                    active
                      ? 'bg-brand-orange/15 text-brand-orange-text dark:text-brand-orange shadow-xs font-black'
                      : 'text-text-main hover:text-brand-orange-text hover:bg-surface-subtle'
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* End: Desktop Controls */}
          {/* Exact DOM order: [AR|EN] [search] [theme] [bell] [cart] [avatar or Sign in + Create account] */}
          <div className="flex items-center gap-3" data-testid="desktop-nav-controls">
            {/* 1. Language Switch [AR|EN] (nearest to nav links) */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="px-3 py-1.5 rounded-full text-xs font-bold text-text-main hover:bg-surface-subtle border border-surface-border transition-colors select-none inline-flex items-center gap-1.5 cursor-pointer"
              aria-label={t('common:actions.switchLanguage', 'تبديل اللغة')}
              dir="ltr"
              data-testid="desktop-lang-btn"
            >
              <span className={language === 'ar' ? 'text-brand-orange font-black' : 'text-text-muted'}>
                AR
              </span>
              <span className="text-surface-border select-none">|</span>
              <span className={language === 'en' ? 'text-brand-orange font-black' : 'text-text-muted'}>
                EN
              </span>
            </button>

            {/* 2. Search Icon (sits next after AR|EN) */}
            <Link
              to="/products"
              className="flex items-center justify-center w-10 h-10 rounded-full text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors cursor-pointer"
              aria-label={t('common:actions.search', 'بحث')}
              data-testid="desktop-search-btn"
            >
              <Search className="w-5 h-5" />
            </Link>

            {/* 3. Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full flex items-center justify-center text-text-main hover:bg-surface-subtle transition-colors cursor-pointer"
              aria-label={
                theme === 'dark'
                  ? t('common:actions.lightMode', 'الوضع النهاري')
                  : t('common:actions.darkMode', 'الوضع الليلي')
              }
              data-testid="desktop-theme-btn"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-brand-yellow" />
              ) : (
                <Moon className="w-5 h-5 text-text-muted hover:text-text-main" />
              )}
            </button>

            {/* 4. Notifications Bell */}
            <button
              ref={bellBtnRef}
              type="button"
              onClick={() => setNotifOpen((prev) => !prev)}
              className="relative w-10 h-10 rounded-full flex items-center justify-center text-text-main hover:bg-surface-subtle transition-colors cursor-pointer"
              aria-label={t('notifications:dropdownTitle', 'الإشعارات')}
              data-testid="desktop-bell-btn"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 end-1.5 w-4 h-4 rounded-full bg-brand-orange text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* 5. Mini Cart Button */}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative w-10 h-10 rounded-full bg-brand-orange/15 hover:bg-brand-orange/25 text-brand-orange-text dark:text-brand-orange flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              aria-label={t('nav:cartAria', 'سلة الوسائل التعليمية')}
              data-testid="desktop-cart-btn"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalCount > 0 && (
                <span className="absolute -top-1 -end-1 w-5 h-5 rounded-full bg-brand-orange text-white text-xs font-black flex items-center justify-center shadow-xs">
                  {totalCount > 99 ? '99+' : totalCount}
                </span>
              )}
            </button>

            {/* 6. User Avatar Button or Sign in + Create account */}
            {isAuthenticated && user ? (
              <button
                type="button"
                onClick={handleAvatarClick}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-surface-subtle transition-colors cursor-pointer"
                aria-label={displayName || t('common:tabBar.account')}
                data-testid="desktop-avatar-btn"
              >
                <Avatar
                  src={user.avatar}
                  name={displayName}
                  role={user.role}
                  size="sm"
                />
              </button>
            ) : (
              <div className="flex items-center gap-2" data-testid="desktop-auth-links">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-full text-xs font-bold text-text-main hover:bg-surface-subtle transition-colors cursor-pointer"
                  data-testid="desktop-login-link"
                >
                  {t('auth:loginTitle', 'تسجيل الدخول')}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-full text-xs font-bold bg-brand-orange text-white shadow-soft hover:bg-[#e07528] transition-colors cursor-pointer"
                  data-testid="desktop-register-link"
                >
                  {t('auth:registerLink', 'إنشاء حساب')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Notifications Dropdown for Desktop */}
      <NotificationsDropdown
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        triggerRef={bellBtnRef}
      />

      {/* Mini Cart Drawer */}
      <MiniCartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
      />
    </>
  )
}
