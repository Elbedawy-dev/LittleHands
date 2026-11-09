import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  CheckCheck,
  Clock,
  ExternalLink,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { useNotifications } from '../../context/NotificationContext'
import { useFormat } from '../../hooks/useFormat'
import { useScrollLock } from '../../hooks/useScrollLock'
import { cn } from '../../utils'
import { getNotificationBadge } from './NotificationsList'

/**
 * Notifications Component supporting:
 * - Desktop: Anchored dropdown portal under bell with click-outside close
 * - Mobile: Full-screen modal sheet (100dvh, opaque surface, portal to document.body)
 */
export function NotificationsDropdown({ open, onClose, triggerRef }) {
  const { t } = useTranslation(['notifications', 'common'])
  const { isRtl } = useLanguage()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotifications()
  const { formatRelativeTime } = useFormat()

  // Refetch notifications list when the dropdown opens
  useEffect(() => {
    if (open && fetchNotifications) {
      fetchNotifications()
    }
  }, [open, fetchNotifications])

  const currentRole = user ? user.role : 'customer'
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'unread'
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )
  const [dropdownCoords, setDropdownCoords] = useState({ top: 70, right: 20, left: 'auto' })

  useScrollLock(Boolean(open && isMobile))

  // Detect viewport size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      if (triggerRef?.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setDropdownCoords({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
          left: rect.left,
        })
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [triggerRef, open])

  // Handle ESC key and mobile browser Back button
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    const handlePopState = () => {
      onClose()
    }
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [open, onClose])

  // Full page URL by role
  const fullPageUrl = useMemo(() => {
    if (currentRole === 'seller') return '/seller/notifications'
    if (currentRole === 'admin') return '/admin/notifications'
    return '/notifications'
  }, [currentRole])

  // Filter notifications for current role
  const roleFiltered = useMemo(() => {
    return notifications.filter((n) => {
      if (n.role && n.role !== currentRole) return false
      if (n.userId && user && n.userId !== user.id) return false
      return true
    })
  }, [notifications, currentRole, user])

  // Tab filter
  const tabFiltered = useMemo(() => {
    if (activeTab === 'unread') {
      return roleFiltered.filter((n) => !n.read)
    }
    return roleFiltered
  }, [roleFiltered, activeTab])

  // Group notifications into Today and Earlier
  const { todayList, earlierList } = useMemo(() => {
    const today = []
    const earlier = []
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

    tabFiltered.forEach((n) => {
      const time = new Date(n.createdAt).getTime()
      if (time >= todayStart) {
        today.push(n)
      } else {
        earlier.push(n)
      }
    })

    return { todayList: today, earlierList: earlier }
  }, [tabFiltered])

  if (typeof document === 'undefined') return null
  if (!open) return null

  // Resolve dynamic notification title and message
  const resolveNotificationText = (item) => {
    let title = item.title
    let message = item.message

    if (item.type) {
      const i18nTitleKey = `types.${item.type}`
      const translatedTitle = t(i18nTitleKey, { defaultValue: '' })
      if (translatedTitle) title = translatedTitle

      const i18nDescKey = `descriptions.${item.type}`
      const translatedDesc = t(i18nDescKey, item.params || {}, { defaultValue: '' })
      if (translatedDesc) message = translatedDesc
    }

    return {
      title: title || t('types.generic', 'إشعار جديد'),
      message: message || '',
    }
  }

  // Render list items
  const renderList = (items) => (
    <div className="divide-y divide-surface-border/50">
      {items.map((item) => {
        const badge = getNotificationBadge(item)
        const isUnread = !item.read
        const text = resolveNotificationText(item)

        const handleClick = () => {
          markAsRead(item.id)
          onClose()
          if (item.link) {
            navigate(item.link)
          }
        }

        return (
          <div
            key={item.id}
            onClick={handleClick}
            className={cn(
              'p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-surface-subtle/80',
              isUnread && 'bg-brand-orange/5'
            )}
          >
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                badge.bg
              )}
            >
              {badge.icon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <h5
                  className={cn(
                    'text-xs font-bold text-text-main truncate',
                    isUnread && 'font-black text-brand-orange-text dark:text-brand-orange'
                  )}
                  data-user-content="true"
                >
                  {text.title}
                </h5>
                {isUnread && (
                  <span className="w-2 h-2 rounded-full bg-brand-orange shrink-0" />
                )}
              </div>

              <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed" data-user-content="true">
                {text.message}
              </p>

              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-text-muted">
                <Clock className="w-3 h-3" />
                <span>{formatRelativeTime(item.createdAt)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  // Empty state renderer
  const renderEmpty = () => (
    <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center mb-3 text-text-muted">
        <Bell className="w-8 h-8 opacity-40" />
      </div>
      <h4 className="text-sm font-bold text-text-main mb-1">
        {t('emptyTitle', 'لا توجد إشعارات حالياً')}
      </h4>
      <p className="text-xs text-text-muted max-w-xs leading-relaxed">
        {t('emptySubtitle', 'ستصلك التنبيهات والإشعارات فور حدوث أي نشاط جديد على حسابك.')}
      </p>
    </div>
  )

  // Common Header & Tabs component
  const renderHeaderAndTabs = () => (
    <div className="shrink-0 border-b border-surface-border bg-surface">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-black text-base text-text-main">
            {t('dropdownTitle', 'الإشعارات')}
          </h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-orange/15 text-brand-orange-text dark:text-brand-orange">
              {unreadCount} {t('tabUnread', 'غير مقروء')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllAsRead(currentRole)}
              className="text-[11px] font-bold text-brand-orange-text dark:text-brand-orange hover:underline px-2 py-1 rounded-lg hover:bg-brand-orange/10 transition-colors inline-flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{t('markAllAsRead', 'تحديد الكل كمقروء')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors"
            aria-label={t('common:actions.close', 'إغلاق')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-2 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={cn(
            'px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors select-none',
            activeTab === 'all'
              ? 'bg-brand-orange text-white shadow-soft font-black'
              : 'text-text-muted hover:text-text-main bg-surface-subtle'
          )}
        >
          {t('tabAll', 'الكل')} ({roleFiltered.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('unread')}
          className={cn(
            'px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors select-none',
            activeTab === 'unread'
              ? 'bg-brand-orange text-white shadow-soft font-black'
              : 'text-text-muted hover:text-text-main bg-surface-subtle'
          )}
        >
          {t('tabUnread', 'غير المقروءة')} ({unreadCount})
        </button>
      </div>
    </div>
  )

  // MOBILE FULL SCREEN SHEET (100dvh, completely opaque bg-surface, z-50 above everything)
  if (isMobile) {
    return createPortal(
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full h-[100dvh] bg-surface flex flex-col text-text-main shadow-float overflow-hidden pb-safe"
          >
            {renderHeaderAndTabs()}

            {/* Scrollable list region */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scrollbar">
              {tabFiltered.length === 0 ? (
                renderEmpty()
              ) : (
                <div className="p-2 space-y-4">
                  {todayList.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-[11px] font-bold text-text-muted bg-surface-subtle/50 rounded-lg mb-1">
                        {t('groupToday', 'اليوم')}
                      </div>
                      {renderList(todayList)}
                    </div>
                  )}

                  {earlierList.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-[11px] font-bold text-text-muted bg-surface-subtle/50 rounded-lg mb-1">
                        {t('groupEarlier', 'سابقاً')}
                      </div>
                      {renderList(earlierList)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom link to dedicated page */}
            <div className="p-3 bg-surface-subtle border-t border-surface-border text-center shrink-0">
              <Link
                to={fullPageUrl}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-orange-text dark:text-brand-orange hover:underline"
              >
                <span>{t('viewAllNotifications', 'عرض كافة الإشعارات في صفحة مخصصة')}</span>
                <ExternalLink className="w-3.5 h-3.5 rtl:rotate-180" />
              </Link>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>,
      document.body
    )
  }

  // DESKTOP DROPDOWN (via portal to document.body anchored under the bell icon)
  return createPortal(
    <>
      {/* Outside click backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        style={{
          top: dropdownCoords.top,
          ...(isRtl
            ? { left: dropdownCoords.left }
            : { right: dropdownCoords.right }),
        }}
        className="fixed w-96 rounded-[24px] bg-surface border border-surface-border shadow-float z-50 overflow-hidden text-text-main animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[550px]"
      >
        {renderHeaderAndTabs()}

        <div className="flex-1 min-h-0 max-h-[380px] overflow-y-auto overscroll-contain modal-scrollbar">
          {tabFiltered.length === 0 ? (
            renderEmpty()
          ) : (
            <div className="p-2 space-y-4">
              {todayList.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[11px] font-bold text-text-muted bg-surface-subtle/50 rounded-lg mb-1">
                    {t('groupToday', 'اليوم')}
                  </div>
                  {renderList(todayList)}
                </div>
              )}

              {earlierList.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[11px] font-bold text-text-muted bg-surface-subtle/50 rounded-lg mb-1">
                    {t('groupEarlier', 'سابقاً')}
                  </div>
                  {renderList(earlierList)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-3 bg-surface-subtle border-t border-surface-border text-center shrink-0">
          <Link
            to={fullPageUrl}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-orange-text dark:text-brand-orange hover:underline"
          >
            <span>{t('viewAllNotifications', 'عرض كافة الإشعارات في صفحة مخصصة')}</span>
            <ExternalLink className="w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </>,
    document.body
  )
}
