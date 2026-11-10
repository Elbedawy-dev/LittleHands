import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/ui/PageHeader'
import { NotificationsList } from '../../features/notifications/NotificationsList'

/**
 * صفحة إشعارات العميلة (مشرفة الحضانة / المعلمة / ولي الأمر)
 * لا تتضمن أي ذكر لعمولة المنصة
 */
export default function NotificationsPage() {
  const { t } = useTranslation('notifications')

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      <PageHeader
        title={t('customerPageTitle')}
        description={t('customerPageSubtitle')}
      />

      <NotificationsList role="customer" />
    </div>
  )
}
