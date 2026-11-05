import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ProductCard } from '../../components/product/ProductCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'

/**
 * قسم الوسائل التعليمية المميزة (8 بطاقات وسائل)
 */
export function FeaturedProductsSection({ products = [], loading = false }) {
  const { t } = useTranslation(['storefront', 'common'])

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-heading text-text-main">
            {t('storefront:home.featuredTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            {t('storefront:home.featuredSubtitle')}
          </p>
        </div>

        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-brand-orange-text dark:text-brand-orange hover:underline self-start sm:self-auto group"
        >
          <span>{t('storefront:home.viewAllAids')}</span>
          <ArrowLeft className="w-4 h-4 rtl:rotate-0 rotate-180 group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="p-3 bg-surface rounded-[24px] border border-surface-border shadow-soft space-y-3"
            >
              <Skeleton className="aspect-[4/3] w-full rounded-[20px]" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="h-4 w-1/2 rounded-md" />
              <div className="pt-3 border-t border-surface-border flex items-center justify-between">
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="h-9 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title={t('storefront:products.noProductsFound')}
          description={t('storefront:products.noProductsFoundDesc')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}
