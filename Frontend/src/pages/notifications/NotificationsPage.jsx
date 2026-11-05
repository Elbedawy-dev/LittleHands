import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/ui/PageHeader'
import { NotificationsList } from '../../features/notifications/NotificationsList'

/**
 * صفحة إشعارات العميلة (مشرفة الحضانة / المعلمة / ولي الأمر)
 * لا تتضمن أي ذكر لعمولة المنصة
 */
export default function NotificationsPage() {
  const { i18n } = useTranslation()
  const isEn = i18n.language === 'en'

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      <PageHeader
        title={isEn ? 'Notifications & Alerts Center' : 'مركز الإشعارات والتنبيهات'}
        description={
          isEn
            ? 'Track your teaching aids orders, Vodafone Cash receipt verification updates, and delivery dispatch notices.'
            : 'تابعي حالات وسائل فصلكِ التعليمية، تحديثات اعتماد إيصالات فودافون كاش، ومواعيد وصول المندوب.'
        }
      />

      <NotificationsList role="customer" />
    </div>
  )
}
