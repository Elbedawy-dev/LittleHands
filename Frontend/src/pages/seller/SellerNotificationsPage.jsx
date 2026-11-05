import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/ui/PageHeader'
import { NotificationsList } from '../../features/notifications/NotificationsList'

/**
 * صفحة إشعارات البائعة الحرفية (داخل لوحة تحكم البائعة DashboardLayout)
 * يُسمح بظهور تفاصيل الأرباح والعمولة (20٪)
 */
export default function SellerNotificationsPage() {
  const { i18n } = useTranslation()
  const isEn = i18n.language === 'en'

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEn ? 'Artisan Workshop Notifications Center' : 'مركز إشعارات الورشة والحرفية'}
        description={
          isEn
            ? 'Real-time alerts on customer payment confirmation, new preschool orders, and payout notifications to your wallet.'
            : 'تنبيهات فورية عند تأكيد دفع العملاء للوسائل، تسجيل طلبيات حضانات جديدة، وإشعارات تحويل الأرباح لمحفظتك.'
        }
      />

      <NotificationsList role="seller" />
    </div>
  )
}
