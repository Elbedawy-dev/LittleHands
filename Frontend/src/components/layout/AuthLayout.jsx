import { Moon, Sparkles, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'
import { Logo } from '../ui/Logo'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'

export function AuthLayout() {
  const { t } = useTranslation(['auth', 'common'])
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage } = useLanguage()

  return (
    <div className="min-h-screen bg-app text-text-main flex flex-col md:flex-row transition-colors">
      {/* الجانب الأول: نموذج التوثيق */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-14 max-w-xl mx-auto w-full">
        {/* شريط علوي صغير للتحكم بالشعار والمظهر */}
        <div className="flex items-center justify-between mb-8">
          <Logo asLink to="/" variant="full" size="md" />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="px-3 py-1.5 rounded-full text-xs font-bold text-text-main border border-surface-border bg-surface hover:bg-surface-subtle transition-colors inline-flex items-center gap-1.5 select-none"
              aria-label={t('common:actions.switchLanguage', 'تبديل اللغة / Switch Language')}
              dir="ltr"
            >
              <span className={language === 'ar' ? 'text-brand-orange font-black' : 'text-text-muted'}>
                AR
              </span>
              <span className="text-surface-border select-none">|</span>
              <span className={language === 'en' ? 'text-brand-orange font-black' : 'text-text-muted'}>
                EN
              </span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-full text-text-main hover:bg-surface-subtle transition-colors"
              aria-label={theme === 'dark' ? t('common:actions.lightMode', 'تفعيل الوضع النهاري') : t('common:actions.darkMode', 'تفعيل الوضع الليلي')}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-brand-yellow" />
              ) : (
                <Moon className="w-4 h-4 text-text-muted" />
              )}
            </button>
          </div>
        </div>

        {/* الحاوية المركزية للنموذج عبر المنفذ Outlet */}
        <div className="my-auto py-6">
          <Outlet />
        </div>

        {/* تذييل جانبي مصغر */}
        <div className="pt-6 border-t border-surface-border text-center sm:text-start">
          <p className="text-xs text-text-muted">
            {t('common:footerCopyright')}
          </p>
        </div>
      </div>

      {/* الجانب الثاني: مساحة الهوية البصرية والرسائل الترحيبية (تظهر للشاشات الكبيرة) */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-brand-orange/15 via-brand-yellow/10 to-brand-sky/15 border-s border-surface-border p-12 flex-col justify-between overflow-hidden">
        {/* خلفيات هلامية ملونة ناعمة */}
        <div className="blob-decor w-72 h-72 bg-brand-orange/20 -top-10 -start-10" />
        <div className="blob-decor w-80 h-80 bg-brand-sky/20 -bottom-10 -end-10" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/80 backdrop-blur-xs border border-surface-border text-brand-orange-text dark:text-brand-orange text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('auth:sidePanel.badge')}</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md my-auto">
          <h2 className="text-3xl xl:text-4xl font-black font-heading text-text-main leading-tight mb-4">
            {t('auth:sidePanel.heading')}
          </h2>
          <p className="text-sm text-text-muted leading-relaxed">
            {t('auth:sidePanel.description')}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-[20px] bg-surface/80 backdrop-blur-xs border border-surface-border">
              <span className="font-heading font-black text-xl text-brand-orange">
                {t('auth:sidePanel.categoriesCount')}
              </span>
              <p className="text-xs text-text-muted mt-1 font-semibold">
                {t('auth:sidePanel.categoriesDesc')}
              </p>
            </div>

            <div className="p-4 rounded-[20px] bg-surface/80 backdrop-blur-xs border border-surface-border">
              <span className="font-heading font-black text-xl text-brand-mint-text dark:text-brand-mint">
                {t('auth:sidePanel.handmadeBadge')}
              </span>
              <p className="text-xs text-text-muted mt-1 font-semibold">
                {t('auth:sidePanel.handmadeDesc')}
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-text-muted font-medium">
          {t('auth:sidePanel.paymentNote')}
        </div>
      </div>
    </div>
  )
}
