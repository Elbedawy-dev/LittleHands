import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { SellerCard } from '../../features/storefront/SellerCard'
import { sellerService } from '../../services/sellerService'

/**
 * صفحة استعراض البائعات الحرفيات (SellersPage)
 * تعرض ملفات البائعات وقصصهن وأعمالهن اليدوية
 */
export default function SellersPage() {
  const { t } = useTranslation('storefront')
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    sellerService
      .getSellers()
      .then((data) => setSellers(data))
      .catch(() => setSellers([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      <PageHeader
        title={t('sellers.pageTitle')}
        description={t('sellers.pageSubtitle')}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-[28px]" />
          <Skeleton className="h-64 rounded-[28px]" />
        </div>
      ) : sellers.length === 0 ? (
        <EmptyState title="لا توجد بائعات مسجلات حالياً" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sellers.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      )}
    </div>
  )
}
