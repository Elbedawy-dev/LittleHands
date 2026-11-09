import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { ProductForm } from '../../features/products/ProductForm'
import { catalogService } from '../../services/catalogService'
import { productService } from '../../services/productService'
import { sellerService } from '../../services/sellerService'
import { getFriendlyError } from '../../utils'

/**
 * صفحة إضافة وتعديل وسيلة تعليمية من لوحة تحكم الإدارة
 */
export default function AdminProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation('admin-manage')
  const isEdit = Boolean(id)

  const [initialValues, setInitialValues] = useState(null)
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      try {
        setLoading(true)
        const [sellersList, productData] = await Promise.all([
          sellerService.getSellers(),
          isEdit ? catalogService.getProduct(id) : Promise.resolve(null),
        ])

        if (isMounted) {
          setSellers(sellersList)
          if (productData) {
            setInitialValues(productData)
          }
        }
      } catch (err) {
        toast.error(getFriendlyError(err, t))
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [id, isEdit, t])

  const handleSubmit = async (values) => {
    setIsSubmitting(true)
    try {
      if (isEdit) {
        await productService.updateProduct(id, values)
      } else {
        await productService.createProduct(values)
      }
      toast.success(t('productForm.saveSuccess'))
      navigate('/admin/products')
    } catch (err) {
      toast.error(getFriendlyError(err, t))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-36 rounded-full" />
        <Skeleton className="h-14 w-72 rounded-[16px]" />
        <Skeleton className="h-[480px] w-full rounded-[24px]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* رابط العودة */}
      <Link
        to="/admin/products"
        className="inline-flex items-center gap-2 text-xs font-bold text-text-muted hover:text-brand-orange-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange rounded-full px-2 py-1 -ms-2"
      >
        <ArrowRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
        <span>{t('productForm.backToList')}</span>
      </Link>

      <PageHeader
        title={isEdit ? t('productForm.editTitle') : t('productForm.addTitle')}
        description={t('productForm.description')}
      />

      <Card padding="lg" variant="default" className="shadow-soft">
        <ProductForm
          mode="admin"
          initialValues={initialValues || {}}
          sellers={sellers}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </Card>
    </div>
  )
}
