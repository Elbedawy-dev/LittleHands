import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/ui/PageHeader'
import { NotificationsList } from '../../features/notifications/NotificationsList'

/**
 * صفحة إشعارات إدارة المنصة
 * تتابع إيصالات فودافون كاش المعلقة والطلبات والمدفوعات
 */
export default function AdminNotificationsPage() {
  const { t } = useTranslation('notifications')

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('adminPageTitle')}
        description={t('adminPageSubtitle')}
      />

      <NotificationsList role="admin" />
    </div>
  )
}
