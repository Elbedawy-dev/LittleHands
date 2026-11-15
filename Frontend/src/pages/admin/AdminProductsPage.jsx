import { Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PageHeader } from '../../components/ui/PageHeader'
import { useSettings } from '../../context/SettingsContext'
import { ProductFilters, ProductListTable, ProductStats } from '../../features/admin/products'
import { orderService } from '../../services/orderService'
import { productService } from '../../services/productService'
import { adminService } from '../../services/adminService'
import { countProductsBySeller, getFriendlyError, getProductSellerId, pickLocaleText } from '../../utils'

/**
 * صفحة إدارة كتالوج الوسائل التعليمية لكلا البائعتين الحرفيتين
 */
export default function AdminProductsPage() {
  const { t, i18n } = useTranslation('admin-manage')
  const { settings } = useSettings()
  const commissionRate = settings?.commissionRate ?? 0.2

  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)

  // حالات الفلاتر والبحث
  const [selectedSeller, setSelectedSeller] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all') // 'all' | 'published' | 'draft'

  // حالة مربع حوار الحذف
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // جلب البيانات الأولية
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [allProducts, allOrders, sellerAccounts] = await Promise.all([
        productService.getManageableProducts(),
        orderService.getAllOrders().catch(() => []),
        adminService.getSellerAccounts().catch(() => []),
      ])
      setProducts(Array.isArray(allProducts) ? allProducts : [])
      setOrders(Array.isArray(allOrders) ? allOrders : [])
      setSellers(
        Array.isArray(sellerAccounts)
          ? sellerAccounts
          : Array.isArray(sellerAccounts?.items)
          ? sellerAccounts.items
          : []
      )
    } catch (err) {
      toast.error(getFriendlyError(err, t))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadData()
  }, [loadData])

  // حساب أعداد الوسائل لكل بائعة لألسنة التصفية
  const sellerCounts = useMemo(() => countProductsBySeller(products), [products])

  // تصفية الوسائل حسب الشروط المحددة
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // تصفية البائعة
      if (selectedSeller !== 'all' && getProductSellerId(p) !== String(selectedSeller)) {
        return false
      }

      // تصفية التصنيف
      if (selectedCategory && p.categoryId !== selectedCategory) {
        return false
      }

      // تصفية حالة النشر
      if (selectedStatus === 'published' && !p.isPublished) {
        return false
      }
      if (selectedStatus === 'draft' && p.isPublished) {
        return false
      }

      // تصفية البحث النصي
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase()
        const nameAr = pickLocaleText(p.name, 'ar').toLowerCase()
        const nameEn = (p.nameEn || pickLocaleText(p.name, 'en')).toLowerCase()
        const descText = pickLocaleText(p.description, 'ar').toLowerCase()
        const descEn = pickLocaleText(p.description, 'en').toLowerCase()
        const sellerText = (
          p.sellerName ||
          p.seller?.displayName?.ar ||
          p.seller?.displayName?.en ||
          ''
        ).toLowerCase()
        if (
          !nameAr.includes(query) &&
          !nameEn.includes(query) &&
          !descText.includes(query) &&
          !descEn.includes(query) &&
          !sellerText.includes(query)
        ) {
          return false
        }
      }

      return true
    })
  }, [products, selectedSeller, selectedCategory, selectedStatus, searchQuery])

  // تبديل حالة النشر
  const handleTogglePublish = async (product) => {
    const nextState = !product.isPublished
    try {
      await productService.setPublished(product.id, nextState)
      setProducts((prev) =>
        prev.map((item) => (item.id === product.id ? { ...item, isPublished: nextState } : item))
      )
    } catch (err) {
      toast.error(getFriendlyError(err, t))
    }
  }

  // تنفيذ حذف الوسيلة
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await productService.deleteProduct(deleteTarget.id)
      setProducts((prev) => prev.filter((item) => item.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      toast.error(getFriendlyError(err, t))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ترويسة الصفحة مع زر إضافة وسيلة */}
      <PageHeader
        title={t('products.title')}
        description={t('products.description')}
        actions={
          <Link to="/admin/products/new">
            <Button
              startIcon={<Plus className="w-4 h-4 rtl:rotate-0" />}
              className="whitespace-nowrap"
            >
              {t('products.addAid')}
            </Button>
          </Link>
        }
      />

      {/* بطاقات المؤشرات السريعة */}
      <ProductStats
        products={products}
        orders={orders}
        commissionRate={commissionRate}
      />

      {/* شريط الفلاتر والبحث وألسنة البائعات */}
      <ProductFilters
        sellers={sellers}
        selectedSeller={selectedSeller}
        onSelectSeller={setSelectedSeller}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
        counts={sellerCounts}
      />

      {/* جدول وبطاقات عرض الوسائل التعليمية */}
      <ProductListTable
        products={filteredProducts}
        loading={loading}
        onTogglePublish={handleTogglePublish}
        onDelete={(p) => setDeleteTarget(p)}
        commissionRate={commissionRate}
      />

      {/* مربع حوار تأكيد الحذف */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={t('products.deleteConfirmTitle')}
        message={
          deleteTarget
            ? `${t('products.deleteConfirmMessage')} (${pickLocaleText(deleteTarget.name, i18n.language)})`
            : t('products.deleteConfirmMessage')
        }
        confirmText={t('products.deleteConfirmBtn')}
        cancelText={t('products.cancel')}
        variant="danger"
        loading={isDeleting}
      />
    </div>
  )
}
