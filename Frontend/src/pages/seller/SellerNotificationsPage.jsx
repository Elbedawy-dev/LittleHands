import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/ui/PageHeader'
import { NotificationsList } from '../../features/notifications/NotificationsList'

/**
 * صفحة إشعارات البائعة الحرفية (داخل لوحة تحكم البائعة DashboardLayout)
 * يُسمح بظهور تفاصيل الأرباح والعمولة (20٪)
 */
export default function SellerNotificationsPage() {
  const { t } = useTranslation('notifications')

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('sellerPageTitle')}
        description={t('sellerPageSubtitle')}
      />

      <NotificationsList role="seller" />
    </div>
  )
}
