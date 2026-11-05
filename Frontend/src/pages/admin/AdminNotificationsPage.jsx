import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/ui/PageHeader'
import { NotificationsList } from '../../features/notifications/NotificationsList'

/**
 * صفحة إشعارات إدارة المنصة
 * تتابع إيصالات فودافون كاش المعلقة والطلبات والمدفوعات
 */
export default function AdminNotificationsPage() {
  const { i18n } = useTranslation()
  const isEn = i18n.language === 'en'

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEn ? 'Admin Notifications & Audit Center' : 'مركز إشعارات وتدقيق الإدارة'}
        description={
          isEn
            ? 'Real-time alerts to audit uploaded Vodafone Cash receipts, registered orders, and artisan payout transfers.'
            : 'تنبيهات فورية لتدقيق إيصالات فودافون كاش المرفوعة، الطلبات المسجلة، وتحويلات أرباح البائعات.'
        }
      />

      <NotificationsList role="admin" />
    </div>
  )
}
