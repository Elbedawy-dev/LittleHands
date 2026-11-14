import {
  Heart,
  MapPin,
  Package,
  School,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogoutCard } from '../../components/ui/LogoutCard'
import { getGovernorateName } from '../../config/constants'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { ProfileHeaderCard } from '../../features/profile'
import { useFormat } from '../../hooks/useFormat'
import { earningsService } from '../../services/earningsService'
import { orderService } from '../../services/orderService'
import { productService } from '../../services/productService'
import { userService } from '../../services/userService'
import { cn, isInSection } from '../../utils'

/**
 * التخطيط العام لحساب المستخدم (/account)
 * - للعميل (customer): التخطيط الكامل بتبويبات الطلبات والمفضلة والعناوين والإعدادات وبيانات الدفع
 * - للبائعة (seller) والأدمن (admin): إخفاء عناصر العميل وعرض الهيدر والتبويبات المسموحة، وإحصائيات البائعة إن توفرت
 */
export default function AccountLayout() {
  const { i18n, t } = useTranslation(['profile', 'common', 'nav'])
  const isEn = i18n.language === 'en'
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { settings } = useSettings()
  const { formatMoney, formatNumber } = useFormat()

  const role = user?.role || 'customer'
  const isCustomer = role === 'customer'
  const isSeller = role === 'seller'
  const isAdmin = role === 'admin'

  const [ordersCount, setOrdersCount] = useState(0)
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [addressesCount, setAddressesCount] = useState(0)
  const [sellerStats, setSellerStats] = useState({
    publishedCount: null,
    ordersCount: null,
    netEarnings: null,
  })

  // جلب إحصائيات الحساب السريعة حسب الدور من الـ APIs الموجودة
  useEffect(() => {
    let active = true

    if (isCustomer) {
      orderService
        .getMyOrders()
        .then((orders) => {
          if (active) setOrdersCount(Array.isArray(orders) ? orders.length : 0)
        })
        .catch(() => {})

      userService
        .getFavorites()
        .then((favs) => {
          if (active) setFavoritesCount(Array.isArray(favs) ? favs.length : 0)
        })
        .catch(() => {})

      userService
        .getAddresses()
        .then((addrs) => {
          if (active) setAddressesCount(Array.isArray(addrs) ? addrs.length : 0)
        })
        .catch(() => {})
    } else if (isSeller && user?.id) {
      Promise.allSettled([
        productService.getManageableProducts(),
        orderService.getSellerOrders(),
        earningsService.getSellerOverview(user.id),
      ]).then(([productsRes, ordersRes, overviewRes]) => {
        if (!active) return
        const publishedCount =
          productsRes.status === 'fulfilled' && Array.isArray(productsRes.value)
            ? productsRes.value.filter((p) => p.published || p.isPublished).length
            : null
        const overviewData = overviewRes.status === 'fulfilled' ? overviewRes.value : null
        const ordersCountVal =
          overviewData?.ordersCount !== undefined
            ? overviewData.ordersCount
            : ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value)
              ? ordersRes.value.length
              : null
        const netEarningsVal =
          overviewData && (overviewData.net !== undefined || overviewData.netEarnings !== undefined)
            ? overviewData.net ?? overviewData.netEarnings
            : null

        setSellerStats({
          publishedCount,
          ordersCount: ordersCountVal,
          netEarnings: netEarningsVal,
        })
      })
    }

    return () => {
      active = false
    }
  }, [pathname, isCustomer, isSeller, user?.id])

  // منع البائعة والأدمن من دخول مسارات تبويبات العميل الفرعية عبر الرابط المباشر
  if (
    !isCustomer &&
    ['/account/orders', '/account/favorites', '/account/addresses'].some((p) =>
      isInSection(pathname, p)
    )
  ) {
    return <Navigate to="/account" replace />
  }

  // تبويبات الحساب المتشعبة
  const customerTabs = [
    { href: '/account', label: t('profile:nav.profile', 'بياناتي وملفي'), icon: <User className="w-4 h-4" />, exact: true },
    { href: '/account/orders', label: `${t('profile:nav.orders', 'طلباتي')} (${formatNumber(ordersCount)})`, icon: <Package className="w-4 h-4" /> },
    { href: '/account/favorites', label: `${t('profile:nav.favorites', 'المفضلة')} (${formatNumber(favoritesCount)})`, icon: <Heart className="w-4 h-4" /> },
    { href: '/account/addresses', label: `${t('profile:nav.addresses', 'عناوين التوصيل')} (${formatNumber(addressesCount)})`, icon: <MapPin className="w-4 h-4" /> },
    { href: '/account/settings', label: t('profile:nav.settings', 'إعدادات الحساب'), icon: <Settings className="w-4 h-4" /> },
  ]

  const staffTabs = [
    { href: '/account', label: t('profile:nav.profile', 'بياناتي وملفي'), icon: <User className="w-4 h-4" />, exact: true },
    { href: '/account/settings', label: t('profile:nav.settings', 'إعدادات الحساب'), icon: <Settings className="w-4 h-4" /> },
  ]

  const tabs = isCustomer ? customerTabs : staffTabs

  const isTabActive = (tab) => {
    if (tab.exact) return pathname === tab.href
    return isInSection(pathname, tab.href)
  }

  const roleBadge = isCustomer ? (
    <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-brand-mint/15 text-brand-mint-text dark:text-brand-mint text-[11px] font-bold">
      <Sparkles className="w-3 h-3" />
      <span>{t('profile:header.activeMembership')}</span>
    </span>
  ) : isSeller ? (
    <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-brand-orange/15 text-brand-orange-text dark:text-brand-orange text-[11px] font-bold">
      <ShieldCheck className="w-3.5 h-3.5" />
      <span>{t('profile:header.sellerBadge')}</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
      <ShieldCheck className="w-3.5 h-3.5" />
      <span>{t('profile:header.adminBadge')}</span>
    </span>
  )

  const customerMeta = isCustomer ? (
    <>
      {user?.nurseryName && (
        <span className="flex items-center gap-1.5 font-semibold text-text-main">
          <School className="w-3.5 h-3.5 text-brand-orange" />
          <span>{user.nurseryName}</span>
        </span>
      )}
      {user?.governorate && (
        <span>• {getGovernorateName(user.governorate, i18n.language) || user.governorate}</span>
      )}
    </>
  ) : null

  const customerEndContent = isCustomer ? (
    <div className="flex flex-wrap md:flex-col items-start md:items-end justify-between w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-surface-border text-xs gap-3">
      <div className="flex flex-col items-start md:items-end gap-1">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{t('profile:header.vodafonePaymentOnly', 'الدفع: فودافون كاش فقط')}</span>
        </span>
        <span className="text-[11px] text-text-muted">
          {t('profile:header.officialWallet', 'رقم المحفظة الرسمي')}:{' '}
          {settings?.platformWallet ? (
            <strong className="font-mono text-text-main" dir="ltr">{settings.platformWallet}</strong>
          ) : (
            <span className="text-amber-700 dark:text-amber-400 font-semibold">{t('profile:header.notConfigured', 'غير مُعدّ بعد')}</span>
          )}
        </span>
      </div>
    </div>
  ) : null

  const hasSellerStats =
    isSeller &&
    (sellerStats.publishedCount !== null ||
      sellerStats.ordersCount !== null ||
      sellerStats.netEarnings !== null)

  const statsContent = isCustomer ? (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-surface-border">
      <div className="p-3 sm:p-4 rounded-[18px] bg-surface-subtle/70">
        <span className="text-[11px] text-text-muted block font-semibold">
          {t('profile:header.totalOrders', 'إجمالي الطلبات')}
        </span>
        <span className="text-lg sm:text-xl font-heading font-black text-text-main">
          {formatNumber(ordersCount)} {t('profile:header.ordersUnit', 'طلبات')}
        </span>
      </div>

      <div className="p-3 sm:p-4 rounded-[18px] bg-surface-subtle/70">
        <span className="text-[11px] text-text-muted block font-semibold">
          {t('profile:header.favoriteAids', 'الوسائل المفضلة')}
        </span>
        <span className="text-lg sm:text-xl font-heading font-black text-brand-orange">
          {formatNumber(favoritesCount)} {t('profile:header.aidsUnit', 'وسائل')}
        </span>
      </div>

      <div className="p-3 sm:p-4 rounded-[18px] bg-surface-subtle/70">
        <span className="text-[11px] text-text-muted block font-semibold">
          {t('profile:header.deliveryAddresses', 'عناوين التوصيل')}
        </span>
        <span className="text-lg sm:text-xl font-heading font-black text-text-main">
          {formatNumber(addressesCount)} {t('profile:header.locationsUnit', 'مقار')}
        </span>
      </div>

      <div className="p-3 sm:p-4 rounded-[18px] bg-surface-subtle/70">
        <span className="text-[11px] text-text-muted block font-semibold">
          {t('profile:header.registeredGov', 'المحافظة المسجلة')}
        </span>
        <span className="text-lg sm:text-xl font-heading font-black text-text-main truncate">
          {getGovernorateName(user?.governorate, i18n.language) || (isEn ? 'Cairo' : 'القاهرة')}
        </span>
      </div>
    </div>
  ) : hasSellerStats ? (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 pt-6 border-t border-surface-border">
      {sellerStats.publishedCount !== null && (
        <div className="p-3 sm:p-4 rounded-[18px] bg-surface-subtle/70">
          <span className="text-[11px] text-text-muted block font-semibold">
            {t('profile:header.sellerPublishedAids')}
          </span>
          <span className="text-lg sm:text-xl font-heading font-black text-brand-orange">
            {formatNumber(sellerStats.publishedCount)} {t('profile:header.aidsUnit')}
          </span>
        </div>
      )}

      {sellerStats.ordersCount !== null && (
        <div className="p-3 sm:p-4 rounded-[18px] bg-surface-subtle/70">
          <span className="text-[11px] text-text-muted block font-semibold">
            {t('profile:header.sellerOrders')}
          </span>
          <span className="text-lg sm:text-xl font-heading font-black text-text-main">
            {formatNumber(sellerStats.ordersCount)} {t('profile:header.ordersUnit')}
          </span>
        </div>
      )}

      {sellerStats.netEarnings !== null && (
        <div className="p-3 sm:p-4 rounded-[18px] bg-surface-subtle/70">
          <span className="text-[11px] text-text-muted block font-semibold">
            {t('profile:header.sellerNetEarnings')}
          </span>
          <span className="text-lg sm:text-xl font-heading font-black text-emerald-600 dark:text-emerald-400">
            {formatMoney(sellerStats.netEarnings)}
          </span>
        </div>
      )}
    </div>
  ) : null

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 text-start">
      {/* بطاقة الهوية والبيانات العلوية المشتركة */}
      <ProfileHeaderCard
        displayName={
          user?.name ||
          (isAdmin
            ? t('common:roles.admin')
            : isSeller
              ? t('common:roles.seller')
              : t('profile:header.customerAccount'))
        }
        avatarRole={role}
        roleBadge={roleBadge}
        metaContent={customerMeta}
        showPhoneInMeta={true}
        endContent={customerEndContent}
        statsContent={statsContent}
      />

      {/* شريط التبويبات المتشعبة (Navigation Tabs Bar) */}
      <div className="border-b border-surface-border pb-1">
        <nav
          className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none"
          aria-label={t('profile:header.tabsAriaLabel', 'تبويبات حساب العميل')}
        >
          {tabs.map((tab) => {
            const active = isTabActive(tab)
            return (
              <Link
                key={tab.href}
                to={tab.href}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shadow-xs cursor-pointer select-none',
                  active
                    ? 'bg-brand-orange text-white shadow-soft font-black scale-102'
                    : 'bg-surface border border-surface-border text-text-muted hover:text-text-main hover:bg-surface-subtle'
                )}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* منفذ المحتوى للتبويب النشط */}
      <div className="pt-2">
        <Outlet />
      </div>

      {/* بطاقة تسجيل الخروج المشتركة (للعميل مخفية على الموبايل كالسابق، وللبائعة والأدمن ظاهرة دائماً) */}
      <LogoutCard
        onLogout={async () => {
          await logout()
          navigate('/login')
        }}
        className={isCustomer ? 'hidden md:flex mt-8' : 'mt-8'}
      />
    </div>
  )
}
