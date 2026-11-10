import {
  AlertCircle,
  Bell,
  CheckCheck,
  Clock,
  ExternalLink,
  MessageSquare,
  Package,
  Receipt,
  Truck,
  Wallet,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import { useFormat } from '../../hooks/useFormat'
import { notificationService } from '../../services/notificationService'
import { cn, pickLocaleText } from '../../utils'

/**
 * دالة مساعدة لتحديد أيقونة ولون الإشعار حسب نوعه ومحتواه
 */
export function getNotificationBadge(notif, isEn = false) {
  const type = notif.type || 'order'
  const title = typeof notif.title === 'string' ? notif.title : notif.title?.ar || ''
  const isRejected = title.includes('رفض') || title.includes('مرفوض') || title.toLowerCase().includes('reject')

  if (isRejected) {
    return {
      icon: <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
      bg: 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900',
      badgeColor: 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300',
      label: isEn ? 'Action Required' : 'إجراء مطلوب',
    }
  }

  if (type === 'payment') {
    return {
      icon: <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
      label: 'Vodafone Cash',
    }
  }

  if (type === 'payout') {
    return {
      icon: <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
      label: isEn ? 'Payout Transfer' : 'تحويل أرباح',
    }
  }

  if (type === 'shipping' || type === 'delivery' || title.includes('شحن') || title.includes('تسليم')) {
    return {
      icon: <Truck className="w-5 h-5 text-sky-600 dark:text-sky-400" />,
      bg: 'bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900',
      badgeColor: 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300',
      label: isEn ? 'Shipping & Delivery' : 'الشحن والتسليم',
    }
  }

  if (type === 'custom_request') {
    return {
      icon: <MessageSquare className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      bg: 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900',
      badgeColor: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
      label: isEn ? 'Custom Request' : 'طلب تفصيل',
    }
  }

  // افتراضي: طلب
  return {
    icon: <Package className="w-5 h-5 text-brand-orange" />,
    bg: 'bg-brand-orange/10 border border-brand-orange/20',
    badgeColor: 'bg-brand-orange/15 text-brand-orange-text dark:text-brand-orange',
    label: isEn ? 'New Order' : 'طلب جديد',
  }
}

/**
 * مكون قائمة الإشعارات المتكامل والمتوافق مع كل الأدوار (عميلة، بائعة، إدارة)
 */
export function NotificationsList({ role: propRole, showFilters = true }) {
  const { t, i18n } = useTranslation('notifications')
  const isEn = i18n.language === 'en'
  const { user } = useAuth()
  const { notifications, markAsRead, markAllAsRead } = useNotifications()
  const { formatRelativeTime, formatDateTime } = useFormat()

  const currentRole = propRole || (user ? user.role : 'customer')
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'unread'
  const [categoryFilter, setCategoryFilter] = useState('all') // 'all' | 'orders' | 'payments' | 'shipping' | 'payouts'
  const [localNotifications, setLocalNotifications] = useState([])

  // جلب الإشعارات الخاصة بالدور المحدد لتحقيق الموثوقية
  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const data = await notificationService.getNotifications(currentRole)
        if (mounted) setLocalNotifications(Array.isArray(data) ? data : [])
      } catch (err) {
        console.warn('Failed to load notifications:', err)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [currentRole, user])

  // استخدام القائمة المحلية مع دمج الإشعارات العامة
  const safeLocal = Array.isArray(localNotifications) ? localNotifications : []
  const safeGlobal = Array.isArray(notifications) ? notifications : []
  const sourceList = safeLocal.length > 0 ? safeLocal : safeGlobal

  // تصفية الإشعارات الخاصة بالدور الحالي
  const roleFiltered = useMemo(() => {
    return sourceList.filter((n) => {
      // إشعارات الدور
      if (n.role && n.role !== currentRole) return false
      // إذا كان إشعاراً خاصاً بعميلة محددة
      if (n.userId && user && n.userId !== user.id) return false
      return true
    })
  }, [sourceList, currentRole, user])

  const currentUnreadCount = useMemo(() => {
    return roleFiltered.filter((n) => !n.read).length
  }, [roleFiltered])

  const handleMarkItemRead = (id) => {
    markAsRead(id)
    setLocalNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const handleMarkAll = () => {
    markAllAsRead(currentRole)
    setLocalNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  // التصفية حسب التبويب والتصنيف
  const displayedNotifications = useMemo(() => {
    return roleFiltered.filter((n) => {
      if (activeTab === 'unread' && n.read) return false

      if (categoryFilter !== 'all') {
        if (categoryFilter === 'orders' && n.type !== 'order') return false
        if (categoryFilter === 'payments' && n.type !== 'payment') return false
        const title = typeof n.title === 'string' ? n.title : n.title?.ar || ''
        if (categoryFilter === 'shipping' && n.type !== 'shipping' && !title.includes('شحن') && !title.includes('تسليم')) return false
        if (categoryFilter === 'payouts' && n.type !== 'payout') return false
      }

      return true
    })
  }, [roleFiltered, activeTab, categoryFilter])

  // تقسيم الإشعارات لمجموعتي: اليوم وسابقاً
  const { todayNotifications, earlierNotifications } = useMemo(() => {
    const today = []
    const earlier = []
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

    displayedNotifications.forEach((n) => {
      const time = new Date(n.createdAt).getTime()
      if (time >= todayStart) {
        today.push(n)
      } else {
        earlier.push(n)
      }
    })

    return { todayNotifications: today, earlierNotifications: earlier }
  }, [displayedNotifications])

  // تصنيفات الفلترة المتاحة حسب الدور
  const filterOptions = useMemo(() => {
    const base = [
      { id: 'all', label: isEn ? 'All' : 'الكل' },
      { id: 'orders', label: isEn ? 'Orders' : 'الطلبات' },
      { id: 'payments', label: isEn ? 'Vodafone Cash Receipts' : 'إيصالات فودافون كاش' },
      { id: 'shipping', label: isEn ? 'Shipping & Delivery' : 'الشحن والتسليم' },
    ]
    if (currentRole === 'seller' || currentRole === 'admin') {
      base.push({ id: 'payouts', label: isEn ? 'Payouts' : 'تحويل الأرباح' })
    }
    return base
  }, [currentRole, isEn])

  return (
    <div className="space-y-6">
      {/* شريط التحكم والأدوات */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* تبويبات: الكل / غير المقروءة */}
        <div className="inline-flex p-1 rounded-full bg-surface-subtle border border-surface-border self-start">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer',
              activeTab === 'all'
                ? 'bg-surface text-text-main shadow-xs font-black'
                : 'text-text-muted hover:text-text-main'
            )}
          >
            {isEn ? `All (${roleFiltered.length})` : `الكل (${roleFiltered.length})`}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('unread')}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'unread'
                ? 'bg-surface text-text-main shadow-xs font-black'
                : 'text-text-muted hover:text-text-main'
            )}
          >
            <span>{isEn ? 'Unread' : 'غير المقروءة'}</span>
            {currentUnreadCount > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-brand-orange text-white text-[10px] font-bold flex items-center justify-center">
                {currentUnreadCount}
              </span>
            )}
          </button>
        </div>

        {/* زر تحديد الكل كمقروء */}
        {currentUnreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAll}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-orange-text dark:text-brand-orange hover:underline cursor-pointer self-end sm:self-center"
          >
            <CheckCheck className="w-4 h-4" />
            <span>{isEn ? 'Mark all as read' : 'تحديد الكل كمقروء'}</span>
          </button>
        )}
      </div>

      {/* تصنيفات الفلترة السريعة */}
      {showFilters && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {filterOptions.map((opt) => {
            const active = categoryFilter === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCategoryFilter(opt.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-xs',
                  active
                    ? 'bg-brand-orange text-white shadow-soft font-black'
                    : 'bg-surface border border-surface-border text-text-muted hover:text-text-main hover:bg-surface-subtle'
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}

      {/* محتوى الإشعارات */}
      {displayedNotifications.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            title={t('emptyFilteredTitle')}
            description={t('emptyFilteredSubtitle')}
            icon={<Bell className="w-10 h-10 text-text-muted/40" />}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {/* مجموعة اليوم */}
          {todayNotifications.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-orange" />
                <h3 className="font-heading font-black text-sm text-text-main">
                  {t('groupToday')}
                </h3>
              </div>
              <div className="space-y-2.5">
                {todayNotifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkRead={handleMarkItemRead}
                    formatRelativeTime={formatRelativeTime}
                    formatDateTime={formatDateTime}
                    isEn={isEn}
                    lang={i18n.language}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}

          {/* مجموعة سابقاً */}
          {earlierNotifications.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2.5 h-2.5 rounded-full bg-text-muted/40" />
                <h3 className="font-heading font-black text-sm text-text-muted">
                  {t('groupEarlier')}
                </h3>
              </div>
              <div className="space-y-2.5">
                {earlierNotifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkRead={handleMarkItemRead}
                    formatRelativeTime={formatRelativeTime}
                    formatDateTime={formatDateTime}
                    isEn={isEn}
                    lang={i18n.language}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * بطاقة الإشعار الفردية
 */
function NotificationItem({
  notification,
  onMarkRead,
  formatRelativeTime,
  formatDateTime,
  isEn,
  lang,
  t,
}) {
  const badge = getNotificationBadge(notification, isEn)
  const isUnread = !notification.read

  const titleText = typeof notification.title === 'object'
    ? pickLocaleText(notification.title, lang)
    : notification.title

  const messageText = typeof notification.message === 'object'
    ? pickLocaleText(notification.message, lang)
    : notification.message

  return (
    <div
      onClick={() => onMarkRead(notification.id)}
      className={cn(
        'group relative p-4 sm:p-5 rounded-[20px] border transition-all duration-200 flex flex-col sm:flex-row items-start justify-between gap-4 cursor-pointer',
        isUnread
          ? 'bg-surface border-brand-orange/30 shadow-soft'
          : 'bg-surface/70 border-surface-border hover:bg-surface hover:border-surface-border/80'
      )}
    >
      <div className="flex items-start gap-3.5 flex-1 min-w-0">
        {/* الأيقونة الملونة */}
        <div
          className={cn(
            'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs mt-0.5',
            badge.bg
          )}
        >
          {badge.icon}
        </div>

        {/* النصوص */}
        <div className="flex-1 min-w-0" data-user-content="true">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4
              className={cn(
                'text-sm font-heading font-bold text-text-main leading-tight',
                isUnread && 'font-black text-brand-orange-text dark:text-brand-orange'
              )}
            >
              {titleText}
            </h4>
            <span
              className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full',
                badge.badgeColor
              )}
            >
              {badge.label}
            </span>
          </div>

          <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
            {messageText}
          </p>

          <div className="flex items-center gap-3 mt-2 text-[11px] text-text-muted">
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatRelativeTime(notification.createdAt)}</span>
            </span>
            <span className="text-text-muted/40">•</span>
            <span className="font-mono text-[10px]" dir="ltr">
              {formatDateTime(notification.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* الطرف الأيسر: نقطة غير مقروء + رابط الانتقال إن وجد */}
      <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
        {isUnread && (
          <span
            className="w-2.5 h-2.5 rounded-full bg-brand-orange shadow-xs animate-pulse"
            title={t('unreadTitle')}
            aria-label={t('unreadAria')}
          />
        )}

        {notification.link && (
          <Link
            to={notification.link}
            onClick={(e) => {
              e.stopPropagation()
              onMarkRead(notification.id)
            }}
            className="p-2 rounded-full border border-surface-border text-text-muted hover:text-brand-orange hover:bg-surface-subtle transition-colors"
            title={t('viewDetails')}
            aria-label={t('viewDetails')}
          >
            <ExternalLink className="w-4 h-4 rtl:rotate-180" />
          </Link>
        )}
      </div>
    </div>
  )
}
