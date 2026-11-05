import { ChevronDown, ChevronUp, Edit2, Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFormat } from '../../../hooks/useFormat'
import { cn } from '../../../utils'

/**
 * بطاقة عرض وإعادة ترتيب التصنيف التعليمي المحدد
 */
export function CategoryItemCard({
  category,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onEdit,
  productsCount = 0,
}) {
  const { t, i18n } = useTranslation('admin-manage')
  const { formatNumber } = useFormat()
  const isEn = i18n.language === 'en'
  const displayName = isEn ? (category.nameEn || category.name) : (category.nameAr || category.name)
  const displayDesc = isEn ? (category.descriptionEn || category.description) : (category.descriptionAr || category.description)

  const isFirst = index === 0
  const isLast = index === total - 1

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-[20px] bg-surface border border-surface-border shadow-soft transition-all hover:border-brand-orange/40">
      {/* القسم الأيمن: أزرار الترتيب + مؤشر اللون + الأسماء */}
      <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
        {/* أزرار إعادة الترتيب للأعلى وللأسفل */}
        <div className="flex sm:flex-col items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label={`${t('categories.moveUp')}: ${displayName}`}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center bg-surface-subtle text-text-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange',
              isFirst
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-brand-orange hover:text-white'
            )}
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono font-bold text-text-muted px-1">
            {formatNumber(index + 1)}
          </span>

          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            aria-label={`${t('categories.moveDown')}: ${displayName}`}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center bg-surface-subtle text-text-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange',
              isLast
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-brand-orange hover:text-white'
            )}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* نقطة اللون الدلالي المميز للتصنيف */}
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
          style={{
            backgroundColor: category.bgColor || `${category.color || '#FF8A3D'}25`,
            color: category.textColor || category.color || '#FF8A3D',
          }}
        >
          <span
            className="w-4 h-4 rounded-full shadow-inner"
            style={{ backgroundColor: category.color || '#FF8A3D' }}
          />
        </div>

        {/* تفاصيل الاسم والوصف والمعرف */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-heading font-black text-base text-text-main">
              {displayName}
            </h3>
            <span
              dir="ltr"
              style={{ unicodeBidi: 'isolate' }}
              className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-subtle text-text-muted border border-surface-border/50"
            >
              {category.slug || category.id}
            </span>
          </div>

          {displayDesc && (
            <p className="text-xs text-text-muted mt-1 line-clamp-1">
              {displayDesc}
            </p>
          )}
        </div>
      </div>

      {/* القسم الأيسر: عدد الوسائل + زر التعديل */}
      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-surface-border/60 shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-text-muted bg-surface-subtle px-3 py-1.5 rounded-full border border-surface-border/50">
          <Layers className="w-3.5 h-3.5 text-brand-orange" />
          <span className="font-bold text-text-main font-mono">
            {formatNumber(productsCount)}
          </span>
          <span>{t('categories.table.productsCount')}</span>
        </div>

        <button
          type="button"
          onClick={onEdit}
          aria-label={`${t('categories.edit')}: ${category.name}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-brand-orange-text dark:text-brand-orange bg-brand-orange/10 hover:bg-brand-orange hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange whitespace-nowrap"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>{t('categories.edit')}</span>
        </button>
      </div>
    </div>
  )
}
