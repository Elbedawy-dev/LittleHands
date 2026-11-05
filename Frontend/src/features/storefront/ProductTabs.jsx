import { FileText, Info } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { STAGES } from '../../config/constants'
import { useLanguage } from '../../context/LanguageContext'
import { pickLocale } from '../../utils'

/**
 * تبويبات تفاصيل الوسيلة التعليمية (الوصف والتفاصيل والمواصفات)
 */
export function ProductTabs({ product }) {
  const { t } = useTranslation('storefront')
  const { language } = useLanguage()
  const [activeTab, setActiveTab] = useState('description')

  // خامات الوسيلة المترجمة
  const materialsList =
    product.materials && product.materials.length > 0
      ? product.materials
          .map((m) => {
            if (m === 'felt') return language === 'ar' ? 'جوخ ملون' : 'Craft Felt'
            if (m === 'cardstock')
              return language === 'ar' ? 'ورق مقوى ومغلف حرارياً' : 'Laminated Cardstock'
            if (m === 'fabric') return language === 'ar' ? 'قماش' : 'Fabric'
            return m
          })
          .join(language === 'ar' ? '، ' : ', ')
      : language === 'ar'
      ? 'جوخ ملون، قماش، ورق مقوى'
      : 'Craft Felt, Fabric, Laminated Cardstock'

  // المراحل المستهدفة المترجمة
  const stagesList =
    product.stages && product.stages.length > 0
      ? product.stages
          .map((s) => {
            const match = STAGES.find((st) => st.id === s)
            return match ? (language === 'ar' ? match.label : match.labelEn) : s
          })
          .join(' • ')
      : language === 'ar'
      ? 'حضانة • KG1 • KG2'
      : 'Nursery • KG1 • KG2'

  const description =
    pickLocale(product.description, language).text ||
    (language === 'ar'
      ? 'وسيلة تعليمية يدوية الصنع مصممة خصيصاً لدعم المناهج المبكرة في رياض الأطفال والحضانات.'
      : 'Handmade educational aid designed specifically to support early childhood curricula in nurseries.')

  const dimensions =
    pickLocale(product.details?.size, language).text ||
    (typeof product.size === 'string' ? product.size : '-')

  const usage =
    pickLocale(product.details?.usage, language).text ||
    (language === 'ar'
      ? 'ركن اللغة، حلقة الصباح، والأنشطة الجماعية'
      : 'Language corner, morning circle, and classroom group activities')

  const care =
    pickLocale(product.details?.care, language).text || t('productDetails.careText')

  return (
    <div className="bg-surface rounded-[28px] border border-surface-border p-6 sm:p-8 shadow-soft text-start space-y-6">
      {/* شريط اختيار التبويب */}
      <div className="flex items-center gap-3 border-b border-surface-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('description')}
          className={`inline-flex items-center gap-2 pb-2 px-2 text-sm sm:text-base font-bold transition-all relative cursor-pointer ${
            activeTab === 'description'
              ? 'text-brand-orange'
              : 'text-text-muted hover:text-text-main'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{t('productDetails.tabDescription')}</span>
          {activeTab === 'description' && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-brand-orange rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`inline-flex items-center gap-2 pb-2 px-2 text-sm sm:text-base font-bold transition-all relative cursor-pointer ${
            activeTab === 'details'
              ? 'text-brand-orange'
              : 'text-text-muted hover:text-text-main'
          }`}
        >
          <Info className="w-4 h-4" />
          <span>{t('productDetails.tabDetails')}</span>
          {activeTab === 'details' && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-brand-orange rounded-full" />
          )}
        </button>
      </div>

      {/* محتوى تبويب الوصف */}
      {activeTab === 'description' && (
        <div className="space-y-4">
          <p
            className="text-sm sm:text-base text-text-main leading-relaxed whitespace-pre-line"
            data-user-content="true"
          >
            {description}
          </p>
        </div>
      )}

      {/* محتوى تبويب المواصفات والتفاصيل */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-3.5 rounded-[16px] bg-surface-subtle border border-surface-border/50">
            <span className="text-text-muted font-bold block mb-1">
              {t('productDetails.materialsLabel')}
            </span>
            <span className="font-semibold text-text-main">{materialsList}</span>
          </div>

          <div className="p-3.5 rounded-[16px] bg-surface-subtle border border-surface-border/50">
            <span className="text-text-muted font-bold block mb-1">
              {t('productDetails.dimensionsLabel')}
            </span>
            <span className="font-semibold text-text-main" data-user-content="true">
              {dimensions}
            </span>
          </div>

          <div className="p-3.5 rounded-[16px] bg-surface-subtle border border-surface-border/50">
            <span className="text-text-muted font-bold block mb-1">
              {t('productDetails.targetStage')}
            </span>
            <span className="font-semibold text-text-main">{stagesList}</span>
          </div>

          <div className="p-3.5 rounded-[16px] bg-surface-subtle border border-surface-border/50">
            <span className="text-text-muted font-bold block mb-1">
              {t('productDetails.usageLabel')}
            </span>
            <span className="font-semibold text-text-main" data-user-content="true">
              {usage}
            </span>
          </div>

          <div className="sm:col-span-2 p-3.5 rounded-[16px] bg-surface-subtle border border-surface-border/50">
            <span className="text-text-muted font-bold block mb-1">
              {t('productDetails.careLabel')}
            </span>
            <span className="text-text-muted leading-relaxed" data-user-content="true">
              {care}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
