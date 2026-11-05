import { CreditCard, Heart, Mail, MessageCircle, Phone, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CATEGORIES } from '../../config/constants'
import { useLanguage } from '../../context/LanguageContext'
import { useSettings } from '../../context/SettingsContext'
import { Logo } from '../ui/Logo'

export function Footer() {
  const { t } = useTranslation('common')
  const { language } = useLanguage()
  const { settings } = useSettings()

  const hasSupport = Boolean(
    settings?.supportPhone || settings?.supportEmail || settings?.whatsappNumber
  )

  return (
    <footer className="bg-surface border-t border-surface-border mt-auto transition-colors">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* العمود الأول: عن المنصة والهوية */}
          <div className="space-y-4">
            <Logo asLink to="/" variant="full" size="md" />

            <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
              {t('footer.desc')}
            </p>

            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-text-muted">
              <Sparkles className="w-4 h-4 text-brand-orange shrink-0" />
              <span>{t('footer.handmadeBadge')}</span>
            </div>
          </div>

          {/* العمود الثاني: التصنيفات الستة الأساسية */}
          <div>
            <h4 className="font-heading font-bold text-base text-text-main mb-4">
              {t('footer.categoriesTitle')}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              {CATEGORIES.map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/products?category=${cat.slug}`}
                    className="text-text-muted hover:text-brand-orange-text transition-colors flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-orange/60" />
                    <span>{language === 'en' ? cat.nameEn : cat.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* العمود الثالث: روابط سريعة */}
          <div>
            <h4 className="font-heading font-bold text-base text-text-main mb-4">
              {t('footer.linksTitle')}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link
                  to="/products"
                  className="text-text-muted hover:text-brand-orange-text transition-colors"
                >
                  {t('footer.allProducts')}
                </Link>
              </li>
              <li>
                <Link
                  to="/sellers"
                  className="text-text-muted hover:text-brand-orange-text transition-colors"
                >
                  {t('footer.sellers')}
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-text-muted hover:text-brand-orange-text transition-colors"
                >
                  {t('footer.about')}
                </Link>
              </li>
            </ul>
          </div>

          {/* العمود الرابع: وسائل الدفع والتواصل */}
          <div className="space-y-4">
            <h4 className="font-heading font-bold text-base text-text-main">
              {t('footer.paymentsTitle')}
            </h4>

            {/* بطاقة فودافون كاش الرسمية */}
            <div className="p-3.5 rounded-[18px] bg-surface-subtle border border-surface-border">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                <span className="text-xs font-bold text-text-main">{t('footer.vodafoneCash')}</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                {t('footer.vodafoneCashDesc')}
              </p>
            </div>

            {/* البطاقة المعطلة لبوابة الدفع الإلكتروني القادمة - بدون ذكر بنوك أو بطاقات */}
            <div className="p-3.5 rounded-[18px] bg-surface-subtle/40 border border-dashed border-surface-border opacity-70">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-text-muted" />
                <span className="text-xs font-bold text-text-muted">
                  {t('footer.disabledGateway')}
                </span>
              </div>
            </div>

            {/* بيانات التواصل - تظهر فقط عند ضبطها في إعدادات المنصة */}
            {hasSupport && (
              <div className="p-3.5 rounded-[18px] bg-surface-subtle border border-surface-border text-xs space-y-1.5">
                <span className="text-[11px] font-bold text-text-muted block">
                  {t('footer.contactTitle')}
                </span>
                {settings.supportPhone && (
                  <div className="flex items-center gap-2 font-mono text-text-main" dir="ltr" data-user-content="true">
                    <Phone className="w-3.5 h-3.5 text-brand-orange" />
                    <span>{settings.supportPhone}</span>
                  </div>
                )}
                {settings.supportEmail && (
                  <div className="flex items-center gap-2 font-mono text-text-main" dir="ltr" data-user-content="true">
                    <Mail className="w-3.5 h-3.5 text-brand-sky" />
                    <span>{settings.supportEmail}</span>
                  </div>
                )}
                {settings.whatsappNumber && (
                  <div className="flex items-center gap-2 font-mono text-text-main" dir="ltr" data-user-content="true">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{settings.whatsappNumber}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* السطر السفلي وحقوق الملكية المنصوص عليها */}
        <div className="mt-12 pt-6 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start">
          <p className="text-xs text-text-muted font-medium">
            {t('common:footerCopyright')}
          </p>

          <p className="text-xs text-text-muted flex items-center gap-1 justify-center">
            <span>{t('footer.madeWithLove')}</span>
            <Heart className="w-3.5 h-3.5 text-brand-orange fill-brand-orange" />
          </p>
        </div>
      </div>
    </footer>
  )
}
