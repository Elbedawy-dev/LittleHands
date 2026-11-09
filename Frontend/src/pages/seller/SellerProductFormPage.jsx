import { AlertCircle, ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { useAuth } from '../../context/AuthContext'
import { ProductForm } from '../../features/products/ProductForm'
import { catalogService } from '../../services/catalogService'
import { productService } from '../../services/productService'
import { getFriendlyError } from '../../utils'

/**
 * صفحة إنشاء أو تعديل الوسيلة التعليمية للبائعة
 * Provides form container, data fetching for edit mode, and submission handling via productService.
 */
export default function SellerProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTranslation('seller')
  const isEdit = Boolean(id)

  const [initialValues, setInitialValues] = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isEdit) {
      setLoading(true)
      setError(null)
      catalogService
        .getProduct(id)
        .then((data) => {
          if (!data) throw new Error('PRODUCT_NOT_FOUND')
          setInitialValues(data)
        })
        .catch((err) => {
          setError(getFriendlyError(err, t))
        })
        .finally(() => setLoading(false))
    }
  }, [id, isEdit, t])

  const handleSubmit = async (values) => {
    setIsSubmitting(true)
    setError(null)
    try {
      if (isEdit) {
        await productService.updateProduct(id, values)
      } else {
        await productService.createProduct({
          ...values,
          sellerId: user?.id || '',
        })
      }
      navigate('/seller/products')
    } catch (err) {
      setError(getFriendlyError(err, t))
    } finally {
      setIsSubmitting(false)
    }
  }

  // حالة التحميل الهيكلي (Skeleton)
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-36 rounded-xl" />
        <Skeleton className="h-10 w-72 rounded-2xl" />
        <Skeleton className="h-[600px] w-full rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* رابط العودة لقائمة المنتجات */}
      <div>
        <Link
          to="/seller/products"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-brand-orange transition-colors select-none"
        >
          <ArrowRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
          <span>{t('form.back_to_products')}</span>
        </Link>
      </div>

      {/* ترويسة النموذج */}
      <PageHeader
        title={isEdit ? t('form.title_edit') : t('form.title_new')}
        description={t('form.subtitle')}
      />

      {/* رسالة الخطأ العامة إن وجدت */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* لوحة النموذج الموحد */}
      <Card padding="lg">
        <ProductForm
          mode="seller"
          initialValues={initialValues || {}}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </Card>
    </div>
  )
}
