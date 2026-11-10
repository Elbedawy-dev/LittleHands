import { Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ProductCard } from '../../components/product/ProductCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'
import { useFormat } from '../../hooks/useFormat'
import { userService } from '../../services/userService'
import { getFriendlyError } from '../../utils'

export default function AccountFavoritesPage() {
  const { t, i18n } = useTranslation('profile')
  const isEn = i18n.language === 'en'
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { formatNumber } = useFormat()

  useEffect(() => {
    let mounted = true
    userService
      .getFavorites()
      .then((data) => {
        if (mounted) setFavorites(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (mounted) setError(getFriendlyError(err, t))
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [t])

  // إزالة الوسيلة التعليمية من القائمة عند النقر على القلب مجدداً
  const handleFavoriteToggle = (productId) => {
    setFavorites((prev) => prev.filter((p) => p.id !== productId))
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-[24px]" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        title={t('favorites.loadErrorTitle')}
        description={error}
        icon={<Heart className="w-10 h-10 text-rose-500/40" />}
      />
    )
  }

  if (favorites.length === 0) {
    return (
      <div className="p-8 sm:p-12 rounded-[28px] bg-surface border border-surface-border text-center">
        <EmptyState
          title={t('favorites.emptyTitle', 'قائمة المفضلة فارغة')}
          description={t('favorites.emptyDesc', 'انقري على رمز القلب على أي وسيلة تعليمية لإضافتها هنا والرجوع إليها لاحقاً.')}
          icon={<Heart className="w-12 h-12 text-rose-400/40" />}
          action={
            <Link to="/products">
              <button
                type="button"
                className="px-6 py-3 rounded-full bg-brand-orange text-white text-xs font-bold shadow-soft hover:bg-[#e07528] transition-colors cursor-pointer"
              >
                {isEn ? 'Browse Teaching Aids' : 'تصفح وسائل رياض الأطفال'}
              </button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-black text-text-main">
            {t('favorites.title', 'الوسائل المفضلة')} ({formatNumber(favorites.length)})
          </h2>
          <p className="text-xs text-text-muted mt-1">
            {t('favorites.subtitle', 'قائمتكِ الخاصة بالوسائل اليدوية المختارة لتجهيز الحضانة')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {favorites.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isFavorite
            onFavoriteToggle={handleFavoriteToggle}
          />
        ))}
      </div>
    </div>
  )
}
