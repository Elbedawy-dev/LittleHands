import { Home, Layers, ShoppingBag, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { cn } from '../../utils'

export function MobileTabBar() {
  const { t } = useTranslation('common')
  const { pathname } = useLocation()
  const { totalCount } = useCart()
  const { isAuthenticated } = useAuth()

  const tabs = [
    { href: '/', label: t('tabBar.home', 'الرئيسية'), icon: <Home className="w-5 h-5" /> },
    { href: '/products', label: t('tabBar.products', 'المنتجات'), icon: <Layers className="w-5 h-5" /> },
    {
      href: '/cart',
      label: t('tabBar.cart', 'السلة'),
      icon: <ShoppingBag className="w-5 h-5" />,
      badge: totalCount > 0 ? totalCount : null,
    },
    {
      href: isAuthenticated ? '/account' : '/login',
      label: t('tabBar.account', 'حسابي'),
      icon: <User className="w-5 h-5" />,
    },
  ]

  const isTabActive = (href) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav
      aria-label={t('tabBar.ariaNav', 'شريط التنقل السفلي')}
      className="md:hidden fixed bottom-0 start-0 end-0 z-40 bg-surface/95 backdrop-blur-lg border-t border-surface-border px-3 py-2 shadow-float select-none transition-colors"
    >
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const active = isTabActive(tab.href)

          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                'relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200',
                active
                  ? 'text-brand-orange-text dark:text-brand-orange font-bold'
                  : 'text-text-muted hover:text-text-main font-medium'
              )}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge && (
                  <span className="absolute -top-1.5 -end-2 w-4 h-4 rounded-full bg-brand-orange text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className="text-[11px] mt-1">{tab.label}</span>

              {/* مؤشر الحالة النشطة المستدير */}
              {active && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-orange mt-0.5" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
