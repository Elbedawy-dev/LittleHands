import { Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { Textarea } from '../../../components/ui/Textarea'

/**
 * قسم بيانات التواصل ومواعيد تحويل الأرباح (Admin Settings)
 */
export function ContactSettingsSection({
  supportPhone,
  onChangeSupportPhone,
  supportPhoneError,
  supportEmail,
  onChangeSupportEmail,
  supportEmailError,
  whatsappNumber,
  onChangeWhatsappNumber,
  whatsappNumberError,
  payoutScheduleText,
  onChangePayoutScheduleText,
}) {
  const { t } = useTranslation('admin-manage')

  return (
    <Card variant="default" padding="lg" className="shadow-soft space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-surface-border">
        <div className="w-10 h-10 rounded-2xl bg-brand-sky/15 text-brand-sky flex items-center justify-center shrink-0">
          <Phone className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-heading font-black text-base text-text-main">
            {t('settings.contactSection.title', 'بيانات التواصل ومواعيد التحويل')}
          </h3>
          <p className="text-xs text-text-muted">
            {t('settings.contactSection.description', 'قنوات خدمة العملاء وجدول تحويل أرباح البائعات الحرفيات (تظهر فقط عند تحديدها).')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Input
          id="admin-support-phone"
          label={t('settings.contactSection.supportPhoneLabel', 'هاتف الدعم الفني')}
          type="text"
          value={supportPhone}
          onChange={(e) => onChangeSupportPhone(e.target.value)}
          helperText={t('settings.contactSection.supportPhoneHelper', 'يظهر في صفحة عن المنصة وذيل الصفحة')}
          error={supportPhoneError}
          placeholder="01XXXXXXXXX"
          dir="ltr"
        />

        <Input
          id="admin-support-email"
          label={t('settings.contactSection.supportEmailLabel', 'البريد الإلكتروني للدعم')}
          type="email"
          value={supportEmail}
          onChange={(e) => onChangeSupportEmail(e.target.value)}
          helperText={t('settings.contactSection.supportEmailHelper', 'البريد الرسمي للتواصل')}
          error={supportEmailError}
          placeholder="info@..."
          dir="ltr"
        />

        <Input
          id="admin-whatsapp-number"
          label={t('settings.contactSection.whatsappLabel', 'رقم واتساب')}
          type="text"
          value={whatsappNumber}
          onChange={(e) => onChangeWhatsappNumber(e.target.value)}
          helperText={t('settings.contactSection.whatsappHelper', 'للتواصل السريع')}
          error={whatsappNumberError}
          placeholder="01XXXXXXXXX"
          dir="ltr"
        />
      </div>

      <div className="pt-2 border-t border-surface-border/60">
        <Textarea
          id="admin-payout-schedule"
          label={t('settings.contactSection.payoutScheduleLabel', 'جدول مواعيد تحويل أرباح البائعات')}
          value={payoutScheduleText}
          onChange={(e) => onChangePayoutScheduleText(e.target.value)}
          helperText={t('settings.contactSection.payoutScheduleHelper', 'يظهر هذا النص للبائعات فقط في صفحة الأرباح والملف الشخصي عند ضبطه')}
          placeholder={t('settings.contactSection.payoutSchedulePlaceholder', 'مثال: يتم تحويل الأرباح المستحقة دورياً إلى محفظة فودافون كاش المسجلة...')}
          rows={3}
        />
      </div>
    </Card>
  )
}

