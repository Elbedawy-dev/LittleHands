import { ShoppingBag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { PriceTag } from '../../components/ui/PriceTag'
import { useLanguage } from '../../context/LanguageContext'
import { pickLocale } from '../../utils'
import { getProductStockMeta } from '../../utils/productStock'

/**
 * شريط الشراء العائم للموبايل (Sticky Mobile Purchase Bar)
 * يستقر فوق شريط التبويب السفلي مباشرة مع مسافة واضحة ودعم safe-area دون حجب المحتوى
 */
export function StickyMobileBar({ product, onAddToCart }) {
  const { t } = useTranslation(['storefront', 'common'])
  const { language } = useLanguage()

  if (!product) return null

  const { isOutOfStock } = getProductStockMeta(product)
  const productName = pickLocale(product.name, language).text

  return (
    <div
      data-testid="sticky-mobile-bar"
      className="md:hidden fixed bottom-[calc(var(--mobile-tabbar-h)+env(safe-area-inset-bottom))] inset-x-0 z-30 bg-surface/95 backdrop-blur-md border-t border-surface-border px-4 py-3 shadow-soft-lg flex items-center justify-between gap-3"
    >
      <div className="flex flex-col text-start overflow-hidden min-w-0 pe-2">
        <span className="text-[11px] font-semibold text-text-muted truncate max-w-[165px]" data-user-content="true">
          {productName}
        </span>
        <PriceTag amount={product.price} size="sm" />
      </div>

      <Button
        onClick={() => {
          if (!isOutOfStock && onAddToCart) onAddToCart()
        }}
        disabled={isOutOfStock}
        size="md"
        className="font-bold whitespace-nowrap px-5 shrink-0"
        startIcon={<ShoppingBag className="w-4 h-4" />}
      >
        {isOutOfStock
          ? t('common:status.outOfStock')
          : t('storefront:productDetails.stickyBar.addToCart')}
      </Button>
    </div>
  )
}
