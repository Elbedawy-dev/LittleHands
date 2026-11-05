import { ShoppingBag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { PriceTag } from '../../components/ui/PriceTag'

/**
 * شريط الشراء العائم للموبايل (Sticky Mobile Purchase Bar)
 * يستقر فوق شريط التبويب السفلي مباشرة (bottom-16) دون حجب محتوى الصفحة
 */
export function StickyMobileBar({ product, onAddToCart }) {
  const { t } = useTranslation('storefront')

  if (!product) return null

  return (
    <div className="md:hidden fixed bottom-16 inset-x-0 z-30 bg-surface/95 backdrop-blur-md border-t border-surface-border px-4 py-2.5 shadow-soft-lg flex items-center justify-between gap-3">
      <div className="flex flex-col text-start overflow-hidden pe-2">
        <span className="text-[11px] font-semibold text-text-muted truncate max-w-[150px]">
          {typeof product.name === 'object' ? (product.name?.ar || product.name?.en || '') : product.name}
        </span>
        <PriceTag amount={product.price} size="sm" />
      </div>

      <Button
        onClick={onAddToCart}
        size="md"
        className="font-bold whitespace-nowrap px-5"
        startIcon={<ShoppingBag className="w-4 h-4" />}
      >
        {t('productDetails.stickyBar.addToCart')}
      </Button>
    </div>
  )
}
