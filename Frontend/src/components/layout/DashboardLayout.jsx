import {
  Bell,
  CreditCard,
  FolderTree,
  Home,
  LayoutDashboard,
  LogOut,
  Moon,
  Package,
  Settings,
  ShoppingBag,
  Sun,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'
import { useNotifications } from '../../context/NotificationContext'
import { useTheme } from '../../context/ThemeContext'
import { NotificationsDropdown } from '../../features/notifications/NotificationsDropdown'
import { paymentService } from '../../services/paymentService'
import { cn, getDisplayName } from '../../utils'
import { Avatar } from '../ui/Avatar'
import { Logo } from '../ui/Logo'
import { MobileTopBar } from './MobileTopBar'

export function DashboardLayout({ role: propRole }) {
  const { t } = useTranslation(['nav', 'common'])
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, role: userRole, logout } = useAuth()
  const { totalCount } = useCart()
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const { unreadCount } = useNotifications()

  const currentRole = propRole || userRole || 'seller'
  const [notifOpen, setNotifOpen] = useState(false)
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0)
  const bellBtnRef = useRef(null)

  // جلب عدد مدفوعات فودافون كاش المعلقة للإدارة
  useEffect(() => {
    if (currentRole === 'admin') {
      paymentService
        .getPayments({ status: 'pending' })
        .then((res) => setPendingPaymentsCount(res.length))
        .catch(() => {})
    }
  }, [currentRole, pathname])

  // عناصر لوحة تحكم البائعة
  const sellerNav = [
    { href: '/seller', labelKey: 'nav:seller.dashboard', icon: <LayoutDashboard className="w-5 h-5" />, exact: true },
    { href: '/seller/products', labelKey: 'nav:seller.products', icon: <Package className="w-5 h-5" /> },
    { href: '/seller/orders', labelKey: 'nav:seller.orders', icon: <ShoppingBag className="w-5 h-5" /> },
    { href: '/seller/earnings', labelKey: 'nav:seller.earnings', icon: <Wallet className="w-5 h-5" /> },
    { href: '/seller/profile', labelKey: 'nav:seller.profile', icon: <User className="w-5 h-5" /> },
    { href: '/seller/notifications', labelKey: 'nav:seller.notifications', icon: <Bell className="w-5 h-5" /> },
  ]

  // عناصر لوحة تحكم الإدارة
  const adminNav = [
    { href: '/admin', labelKey: 'nav:admin.dashboard', icon: <LayoutDashboard className="w-5 h-5" />, exact: true },
    {
      href: '/admin/payments',
      labelKey: 'nav:admin.payments',
      icon: <CreditCard className="w-5 h-5" />,
      badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : null,
      badgeColor: 'bg-rose-600 text-white',
    },
    { href: '/admin/orders', labelKey: 'nav:admin.orders', icon: <ShoppingBag className="w-5 h-5" /> },
    { href: '/admin/products', labelKey: 'nav:admin.products', icon: <Package className="w-5 h-5" /> },
    { href: '/admin/sellers', labelKey: 'nav:admin.sellers', icon: <Wallet className="w-5 h-5" /> },
    { href: '/admin/customers', labelKey: 'nav:admin.customers', icon: <Users className="w-5 h-5" /> },
    { href: '/admin/categories', labelKey: 'nav:admin.categories', icon: <FolderTree className="w-5 h-5" /> },
    { href: '/admin/notifications', labelKey: 'nav:admin.notifications', icon: <Bell className="w-5 h-5" /> },
    { href: '/admin/settings', labelKey: 'nav:admin.settings', icon: <Settings className="w-5 h-5" /> },
  ]

  const navItems = currentRole === 'admin' ? adminNav : sellerNav

  const isItemActive = (item) => {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  const displayName = user ? getDisplayName(user, language) : ''

  // Drawer links for mobile shared bar
  const mobileDrawerLinks = [
    ...navItems.map((item) => ({
      href: item.href,
      label: t(item.labelKey),
      icon: item.icon,
      exact: item.exact,
      badge: item.badge,
      badgeColor: item.badgeColor,
    })),
    {
      href: '/',
      label: t('nav:backToStore', 'الرجوع إلى المتجر'),
      icon: <Home className="w-5 h-5" />,
      isReturnToStore: true,
    },
  ]

  const renderNavContent = () => (
    <div className="flex flex-col justify-between h-full py-4">
      <div>
        {/* ترويسة اللوحة والشعار - سطر واحد بدون نص فرعي مكدس */}
        <div className="px-6 pb-6 mb-6 border-b border-surface-border">
          <Logo asLink to="/" variant="full" size="md" />
        </div>

        {/* روابط التنقل */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const active = isItemActive(item)

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center justify-between px-4 py-3 rounded-[16px] text-sm font-bold transition-all duration-200 select-none',
                  active
                    ? 'bg-brand-orange text-white shadow-soft font-black'
                    : 'text-text-muted hover:text-text-main hover:bg-surface-subtle'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0">{item.icon}</span>
                  <span>{t(item.labelKey)}</span>
                </div>

                {item.badge !== undefined && item.badge !== null && (
                  <span
                    className={cn(
                      'text-xs font-bold px-2 py-0.5 rounded-full',
                      item.badgeColor || 'bg-white/20 text-white'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* أسفل الشريط الجانبي: معلومات الحساب والرجوع للمتجر */}
      <div className="px-4 pt-4 border-t border-surface-border space-y-2">
        <Link
          to="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>{t('nav:backToStore')}</span>
        </Link>

        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 rtl:rotate-180" />
          <span>{t('common:actions.logout', 'تسجيل الخروج')}</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-app text-text-main flex flex-col transition-colors">
      {/* 1. Mobile Shared Top Bar (lg:hidden) */}
      <MobileTopBar drawerContent={mobileDrawerLinks} user={user} />

      <div className="flex-1 flex min-w-0">
        {/* الشريط الجانبي الثابت للشاشات الكبيرة lg+ */}
        <aside className="hidden lg:flex w-72 flex-col bg-surface border-e border-surface-border shrink-0 fixed top-0 bottom-0 start-0 z-30">
          {renderNavContent()}
        </aside>

        {/* المحتوى الرئيسي وشريط الأدوات العلوي للشاشات الكبيرة */}
        <div className="flex-1 flex flex-col lg:ms-72 min-w-0">
          {/* شريط الأدوات العلوي للشاشات الكبيرة lg+: [AR|EN] [theme] [bell] [cart] [avatar] */}
          <header className="hidden lg:flex sticky top-0 z-20 h-18 bg-surface/90 backdrop-blur-md border-b border-surface-border px-6 sm:px-8 items-center justify-between gap-4">
            <div />

            {/* عناصر التحكم بالترتيب الإلزامي: [AR|EN] [theme] [bell] [cart] [avatar] */}
            <div className="flex items-center gap-3">
              {/* 1. تبديل اللغة المستقر AR | EN */}
              <button
                type="button"
                onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                className="px-3 py-1.5 rounded-full text-xs font-bold text-text-main hover:bg-surface-subtle border border-surface-border transition-colors select-none inline-flex items-center gap-1.5 cursor-pointer"
                aria-label={t('common:actions.switchLanguage', 'تبديل اللغة')}
                dir="ltr"
              >
                <span className={language === 'ar' ? 'text-brand-orange font-black' : 'text-text-muted'}>
                  AR
                </span>
                <span className="text-surface-border select-none">|</span>
                <span className={language === 'en' ? 'text-brand-orange font-black' : 'text-text-muted'}>
                  EN
                </span>
              </button>

              {/* 2. تبديل الوضع */}
              <button
                type="button"
                onClick={toggleTheme}
                className="w-10 h-10 rounded-full flex items-center justify-center text-text-main hover:bg-surface-subtle transition-colors cursor-pointer"
                aria-label={
                  theme === 'dark'
                    ? t('common:actions.lightMode', 'الوضع النهاري')
                    : t('common:actions.darkMode', 'الوضع الليلي')
                }
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-brand-yellow" />
                ) : (
                  <Moon className="w-5 h-5 text-text-muted hover:text-text-main" />
                )}
              </button>

              {/* 3. الإشعارات */}
              <div className="relative">
                <button
                  ref={bellBtnRef}
                  type="button"
                  onClick={() => setNotifOpen((prev) => !prev)}
                  className="relative w-10 h-10 rounded-full flex items-center justify-center text-text-main hover:bg-surface-subtle transition-colors cursor-pointer"
                  aria-label={t('nav:notifications', 'الإشعارات')}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 end-1.5 w-4 h-4 rounded-full bg-brand-orange text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                <NotificationsDropdown
                  open={notifOpen}
                  onClose={() => setNotifOpen(false)}
                  triggerRef={bellBtnRef}
                />
              </div>

              {/* 4. السلة */}
              <button
                type="button"
                onClick={() => navigate('/cart')}
                className="relative w-10 h-10 rounded-full bg-brand-orange/15 hover:bg-brand-orange/25 text-brand-orange-text dark:text-brand-orange flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                aria-label={t('nav:cartAria', 'سلة الوسائل التعليمية')}
              >
                <ShoppingBag className="w-5 h-5" />
                {totalCount > 0 && (
                  <span className="absolute -top-1 -end-1 w-5 h-5 rounded-full bg-brand-orange text-white text-xs font-black flex items-center justify-center shadow-xs">
                    {totalCount > 99 ? '99+' : totalCount}
                  </span>
                )}
              </button>

              {/* 5. صورة الحساب - النقر ينتقل مباشرة دون قوائم منبثقة */}
              <button
                type="button"
                onClick={() => {
                  if (currentRole === 'admin') navigate('/admin/account')
                  else navigate('/seller/profile')
                }}
                className="flex items-center gap-2.5 p-1 rounded-full hover:bg-surface-subtle transition-colors cursor-pointer"
                aria-label={displayName || (currentRole === 'admin' ? t('common:roles.admin') : t('common:roles.seller'))}
              >
                <Avatar
                  src={user?.avatar}
                  name={displayName || (currentRole === 'admin' ? t('common:roles.admin') : t('common:roles.seller'))}
                  role={currentRole}
                  size="sm"
                />
                <div className="hidden xl:flex flex-col text-start">
                  <span className="text-xs font-bold text-text-main" data-user-content="true">
                    {displayName || (currentRole === 'admin' ? t('common:roles.admin') : t('common:roles.seller'))}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {currentRole === 'admin' ? t('common:roles.admin') : t('common:roles.seller')}
                  </span>
                </div>
              </button>
            </div>
          </header>

          {/* متن الصفحة */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
