import {
  Camera,
  Heart,
  LogOut,
  MapPin,
  Package,
  Phone,
  School,
  Settings,
  Sparkles,
  User,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/ui/Avatar'
import { getGovernorateName } from '../../config/constants'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { useFormat } from '../../hooks/useFormat'
import { orderService } from '../../services/orderService'
import { userService } from '../../services/userService'
import { cn } from '../../utils'
import { processAvatarImage } from '../../utils/avatar'

/**
 * التخطيط العام لحساب العميلة (معلمة / مشرفة روضة / ولي أمر)
 * يضم بطاقة الهوية العلوية (Bento Header) وشريط التبويبات المتشعبة
 */
export default function AccountLayout() {
  const { i18n, t } = useTranslation(['profile', 'common', 'nav'])
  const isEn = i18n.language === 'en'
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, updateProfile, logout } = useAuth()
  const { settings } = useSettings()
  const { formatNumber } = useFormat()
  const fileInputRef = useRef(null)

  const [ordersCount, setOrdersCount] = useState(0)
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [addressesCount, setAddressesCount] = useState(0)
  const [updatingAvatar, setUpdatingAvatar] = useState(false)

  // جلب إحصائيات الحساب السريعة للترويسة
  useEffect(() => {
    orderService
      .getMyOrders()
      .then((orders) => setOrdersCount(orders.length))
      .catch(() => {})

    userService
      .getFavorites()
      .then((favs) => setFavoritesCount(favs.length))
      .catch(() => {})

    userService
      .getAddresses()
      .then((addrs) => setAddressesCount(addrs.length))
      .catch(() => {})
  }, [pathname])

  // معالجة رفع وتحديث صورة الحساب
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUpdatingAvatar(true)
    try {
      const dataUrl = await processAvatarImage(file)
      const blob = await (await fetch(dataUrl)).blob()
      await userService.uploadAvatar(new File([blob], 'avatar.jpg', { type: blob.type || 'image/jpeg' }))
      await refreshUser()
    } catch (err) {
      console.error('Failed to update avatar:', err)
    } finally {
      setUpdatingAvatar(false)
    }
  }

  // تبويبات الحساب المتشعبة
  const tabs = [
    { href: '/account', label: t('profile:nav.profile', 'بياناتي وملفي'), icon: <User className="w-4 h-4" />, exact: true },
    { href: '/account/orders', label: `${t('profile:nav.orders', 'طلباتي')} (${formatNumber(ordersCount)})`, icon: <Package className="w-4 h-4" /> },
    { href: '/account/favorites', label: `${t('profile:nav.favorites', 'المفضلة')} (${formatNumber(favoritesCount)})`, icon: <Heart className="w-4 h-4" /> },
    { href: '/account/addresses', label: `${t('profile:nav.addresses', 'عناوين التوصيل')} (${formatNumber(addressesCount)})`, icon: <MapPin className="w-4 h-4" /> },
    { href: '/account/settings', label: t('profile:nav.settings', 'إعدادات الحساب'), icon: <Settings className="w-4 h-4" /> },
  ]

  const isTabActive = (tab) => {
    if (tab.exact) return pathname === tab.href
    return pathname.startsWith(tab.href)
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 text-start">
      {/* بطاقة الهوية والبيانات العلوية (Header Bento Card) */}
      <div className="relative overflow-hidden rounded-[28px] bg-surface border border-surface-border p-6 sm:p-8 shadow-card">
        {/* خلفيات هلامية ملونة ناعمة */}
        <div className="absolute -top-24 -start-24 w-72 h-72 rounded-full bg-brand-orange/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -end-24 w-72 h-72 rounded-full bg-brand-mint/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* الصورة والبيانات الشخصية */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* الصورة مع زر الكاميرا للرفع */}
            <div className="relative group shrink-0">
              <Avatar
                name={user?.name || (isEn ? 'Customer Account' : 'حساب العميلة')}
                src={user?.avatar}
                role="customer"
                size="xl"
                className="w-20 h-20 sm:w-24 sm:h-24 shadow-md text-2xl"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={updatingAvatar}
                className="absolute bottom-0 end-0 w-8 h-8 rounded-full bg-brand-orange text-white flex items-center justify-center shadow-soft hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                title={t('profile:header.updateAvatar', 'تحديث الصورة الشخصية')}
                aria-label={t('profile:header.updateAvatar', 'تحديث الصورة الشخصية')}
              >
                <Camera className="w-4 h-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            {/* تفاصيل الاسم والروضة والتواصل */}
            <div className="space-y-1.5" data-user-content="true">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading font-black text-xl sm:text-2xl text-text-main">
                  {user?.name || (isEn ? 'Customer Account' : 'حساب العميلة')}
                </h1>
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-brand-mint/15 text-brand-mint-text dark:text-brand-mint text-[11px] font-bold">
                  <Sparkles className="w-3 h-3" />
                  <span>{t('profile:header.activeMembership', 'عضوية نشطة — حضانات مصر')}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                {user?.nurseryName && (
                  <span className="flex items-center gap-1.5 font-semibold text-text-main">
                    <School className="w-3.5 h-3.5 text-brand-orange" />
                    <span>{user.nurseryName}</span>
                  </span>
                )}

                {user?.email && (
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono" dir="ltr">{user.email}</span>
                  </span>
                )}

                {user?.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-text-muted" />
                    <span className="font-mono" dir="ltr">{user.phone}</span>
                  </span>
                )}

                {user?.governorate && (
                  <span>• {getGovernorateName(user.governorate, i18n.language) || user.governorate}</span>
                )}
              </div>
            </div>
          </div>

          {/* وسيلة الدفع الحصرية وزر تسجيل الخروج */}
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

            <button
              type="button"
              onClick={async () => {
                await logout()
                navigate('/login')
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
              data-testid="account-header-logout-btn"
            >
              <LogOut className="w-3.5 h-3.5 rtl:rotate-180" />
              <span>{t('common:actions.logout', 'تسجيل الخروج')}</span>
            </button>
          </div>
        </div>

        {/* شريط الإحصائيات السريعة */}
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
      </div>

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
    </div>
  )
}
