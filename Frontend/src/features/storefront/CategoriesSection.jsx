import { BookOpen, Calendar, FileText, Hash, LayoutGrid, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CATEGORIES } from '../../config/constants'

// خريطة أيقونات التصنيفات الرسمية للمنصة
const CATEGORY_ICONS = {
  'alphabet-boards': Sparkles,
  'number-boards': Hash,
  'flash-cards': FileText,
  'wall-charts': Calendar,
  'classroom-decor': BookOpen,
  'activity-kits': LayoutGrid,
}

/**
 * قسم التصنيفات الستة لمنصة أيدي صغيرة (بدون أعداد أو إحصائيات)
 */
export function CategoriesSection() {
  const { t, i18n } = useTranslation(['storefront', 'common'])
  const isEn = i18n.language === 'en'

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-heading text-text-main">
            {t('storefront:home.categoriesTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            {t('storefront:home.categoriesSubtitle')}
          </p>
        </div>

        <Link
          to="/products"
          className="text-xs sm:text-sm font-bold text-brand-orange-text dark:text-brand-orange hover:underline self-start sm:self-auto"
        >
          {t('common:actions.seeAll')}
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {CATEGORIES.map((cat) => {
          const IconComponent = CATEGORY_ICONS[cat.slug] || Sparkles
          const categoryName = isEn ? cat.nameEn : cat.name

          return (
            <Link
              key={cat.id}
              to={`/products?category=${cat.slug}`}
              className="group p-4 sm:p-5 rounded-[24px] bg-surface border border-surface-border shadow-soft hover-lift flex flex-col items-center text-center transition-all"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 shadow-xs"
                style={{ backgroundColor: cat.bgColor, color: cat.textColor }}
              >
                <IconComponent className="w-7 h-7" />
              </div>
              <h3 className="font-heading font-bold text-xs sm:text-sm text-text-main group-hover:text-brand-orange-text dark:group-hover:text-brand-orange transition-colors">
                {categoryName}
              </h3>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
