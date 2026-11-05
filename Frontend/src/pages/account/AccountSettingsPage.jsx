import {
  Bell,
  CheckCircle2,
  Globe,
  Moon,
  Sun,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../components/ui/Card'
import { Switch } from '../../components/ui/Switch'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import { cn } from '../../utils'

export default function AccountSettingsPage() {
  const { t, i18n } = useTranslation('profile')
  const isEn = i18n.language === 'en'
  const { language, setLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()

  // تفضيلات التنبيهات
  const [inSiteNotifs, setInSiteNotifs] = useState(true)
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [smsNotifs, setSmsNotifs] = useState(true)
  const [savedFeedback, setSavedFeedback] = useState('')

  const triggerFeedback = (message) => {
    setSavedFeedback(message)
    setTimeout(() => setSavedFeedback(''), 3000)
  }

  const handleLanguageChange = (lang) => {
    setLanguage(lang)
    triggerFeedback(lang === 'ar' ? 'تم تحويل الواجهة إلى اللغة العربية' : 'Language switched to English')
  }

  const handleThemeChange = (newTheme) => {
    if (theme !== newTheme) {
      toggleTheme()
      triggerFeedback(newTheme === 'dark' ? (isEn ? 'Dark mode enabled' : 'تم تفعيل الوضع الليلي') : (isEn ? 'Light mode enabled' : 'تم تفعيل الوضع النهاري'))
    }
  }

  return (
    <div className="space-y-6">
      {/* رسالة تأكيد الحفظ */}
      {savedFeedback && (
        <div className="p-4 rounded-[18px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedFeedback}</span>
        </div>
      )}

      {/* قسم المظهر واللغة */}
      <Card padding="lg" className="space-y-6">
        <div className="pb-4 border-b border-surface-border">
          <h2 className="text-lg font-heading font-black text-text-main flex items-center gap-2">
            <Globe className="w-5 h-5 text-brand-orange" />
            <span>{t('settings.generalSection', 'المظهر واللغة')}</span>
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            {t('settings.subtitle', 'تخصيص لغة المنصة، مظهر العرض، وتفضيلات الإشعارات')}
          </p>
        </div>

        {/* اختيار اللغة */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-text-main">
            {t('settings.languageLabel', 'لغة واجهة المنصة')}:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => handleLanguageChange('ar')}
              className={cn(
                'p-4 rounded-2xl border text-start flex items-center justify-between transition-all cursor-pointer',
                language === 'ar'
                  ? 'bg-brand-orange/10 border-brand-orange text-brand-orange-text dark:text-brand-orange shadow-xs font-bold'
                  : 'bg-surface border-surface-border text-text-main hover:bg-surface-subtle'
              )}
            >
              <div>
                <div className="text-sm font-bold">{t('settings.langAr', 'العربية (RTL)')}</div>
                <div className="text-[11px] text-text-muted mt-0.5">{isEn ? 'Native platform direction' : 'الاتجاه الأصلي للمنصة'}</div>
              </div>
              {language === 'ar' && <CheckCircle2 className="w-4 h-4 text-brand-orange" />}
            </button>

            <button
              type="button"
              onClick={() => handleLanguageChange('en')}
              className={cn(
                'p-4 rounded-2xl border text-start flex items-center justify-between transition-all cursor-pointer',
                language === 'en'
                  ? 'bg-brand-orange/10 border-brand-orange text-brand-orange-text dark:text-brand-orange shadow-xs font-bold'
                  : 'bg-surface border-surface-border text-text-main hover:bg-surface-subtle'
              )}
            >
              <div>
                <div className="text-sm font-bold">{t('settings.langEn', 'English (LTR)')}</div>
                <div className="text-[11px] text-text-muted mt-0.5">{isEn ? 'Left to right interface' : 'واجهة من اليسار إلى اليمين'}</div>
              </div>
              {language === 'en' && <CheckCircle2 className="w-4 h-4 text-brand-orange" />}
            </button>
          </div>
        </div>

        {/* اختيار المظهر (نهاري / ليلي) */}
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <label className="block text-xs font-bold text-text-main">
            {t('settings.themeLabel', 'نمط المظهر')}:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={cn(
                'p-4 rounded-2xl border text-start flex items-center justify-between transition-all cursor-pointer',
                theme === 'light'
                  ? 'bg-brand-orange/10 border-brand-orange text-brand-orange-text dark:text-brand-orange shadow-xs font-bold'
                  : 'bg-surface border-surface-border text-text-main hover:bg-surface-subtle'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">{t('settings.themeLight', 'الوضع النهاري (فاتح)')}</div>
                  <div className="text-[11px] text-text-muted mt-0.5">{isEn ? 'Comfortable balanced colors' : 'ألوان مريحة متناسقة'}</div>
                </div>
              </div>
              {theme === 'light' && <CheckCircle2 className="w-4 h-4 text-brand-orange" />}
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={cn(
                'p-4 rounded-2xl border text-start flex items-center justify-between transition-all cursor-pointer',
                theme === 'dark'
                  ? 'bg-brand-orange/10 border-brand-orange text-brand-orange-text dark:text-brand-orange shadow-xs font-bold'
                  : 'bg-surface border-surface-border text-text-main hover:bg-surface-subtle'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">{t('settings.themeDark', 'الوضع الليلي (داكن)')}</div>
                  <div className="text-[11px] text-text-muted mt-0.5">{isEn ? 'Reduces eye strain' : 'تقليل إجهاد العين'}</div>
                </div>
              </div>
              {theme === 'dark' && <CheckCircle2 className="w-4 h-4 text-brand-orange" />}
            </button>
          </div>
        </div>
      </Card>

      {/* قسم تفضيلات التنبيهات والإشعارات */}
      <Card padding="lg" className="space-y-6">
        <div className="pb-4 border-b border-surface-border">
          <h2 className="text-lg font-heading font-black text-text-main flex items-center gap-2">
            <Bell className="w-5 h-5 text-brand-orange" />
            <span>{t('settings.notificationsSection', 'تفضيلات وصول التنبيهات')}</span>
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            {isEn ? 'Choose which channels you prefer to receive order updates and notifications.' : 'اختاري القنوات التي تفضلين استقبال تحديثات الطلبات واعتماد الإيصالات عبرها'}
          </p>
        </div>

        <div className="space-y-5 max-w-xl">
          <Switch
            label={t('settings.inSiteNotifs', 'التنبيهات الفورية داخل المنصة')}
            description={t('settings.inSiteNotifsDesc', 'إظهار جرس الإشعارات والتنبيهات المباشرة عند تحديث حالة الطلبات')}
            checked={inSiteNotifs}
            onChange={(e) => {
              setInSiteNotifs(e.target.checked)
              triggerFeedback(isEn ? 'In-site notification preferences saved' : 'تم حفظ تفضيل التنبيهات داخل الموقع')
            }}
          />

          <Switch
            label={t('settings.emailNotifs', 'تنبيهات البريد الإلكتروني')}
            description={t('settings.emailNotifsDesc', 'استلام رسائل تفصيلية عند تأكيد استلام الطلب وشحن الوسائل للحضانة')}
            checked={emailNotifs}
            onChange={(e) => {
              setEmailNotifs(e.target.checked)
              triggerFeedback(isEn ? 'Email notification preferences saved' : 'تم حفظ تفضيل إشعارات البريد الإلكتروني')
            }}
          />

          <Switch
            label={t('settings.smsNotifs', 'رسائل الجوال القصيرة (SMS)')}
            description={t('settings.smsNotifsDesc', 'إشعاركِ برقم الشحنة وتوقيت وصول المندوب لمقر الحضانة')}
            checked={smsNotifs}
            onChange={(e) => {
              setSmsNotifs(e.target.checked)
              triggerFeedback(isEn ? 'SMS notification preferences saved' : 'تم حفظ تفضيل رسائل الجوال القصيرة')
            }}
          />
        </div>
      </Card>
    </div>
  )
}
