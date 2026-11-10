import {
  Edit,
  Package,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { PriceTag } from '../../components/ui/PriceTag'
import { ProductImage } from '../../components/ui/ProductImage'
import { Select } from '../../components/ui/Select'
import { Skeleton } from '../../components/ui/Skeleton'
import { Switch } from '../../components/ui/Switch'
import { CATEGORIES } from '../../config/constants'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { ProductCardSeller } from '../../features/seller'
import { useFormat } from '../../hooks/useFormat'
import { productService } from '../../services/productService'
import { getFriendlyError, pickLocale } from '../../utils'

/**
 * صفحة إدارة الوسائل التعليمية للبائعة
 * Displays teaching aids list with search, status filter, desktop table,
 * mobile card layout, publish Switch, edit, and delete dialog.
 */
export default function SellerProductsPage() {
  const { t } = useTranslation('seller')
  const { user } = useAuth()
  const sellerId = user?.id || ''
  const { isRtl } = useLanguage()
  const { formatNumber } = useFormat()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // عوامل التصفية
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'published' | 'draft' | 'out_of_stock'

  // حالة حوار الحذف
  const [productToDelete, setProductToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await productService.getManageableProducts({
        sellerId,
        q: searchQuery,
        status: statusFilter,
      })
      setProducts(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(getFriendlyError(err, t))
    } finally {
      setLoading(false)
    }
  }, [sellerId, searchQuery, statusFilter, t])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // التصفية المحلية عند البحث السريع
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products
    const q = searchQuery.toLowerCase().trim()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.nameEn && p.nameEn.toLowerCase().includes(q))
    )
  }, [products, searchQuery])

  // تبديل حالة النشر فورياً
  const handleTogglePublish = async (productId, newPublishedState) => {
    try {
      await productService.setPublished(productId, newPublishedState)
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isPublished: newPublishedState } : p))
      )
    } catch (err) {
      toast.error(getFriendlyError(err, t))
    }
  }

  // تنفيذ حذف الوسيلة
  const handleConfirmDelete = async () => {
    if (!productToDelete) return
    setIsDeleting(true)
    try {
      await productService.deleteProduct(productToDelete.id)
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id))
      setProductToDelete(null)
    } catch (err) {
      toast.error(getFriendlyError(err, t))
    } finally {
      setIsDeleting(false)
    }
  }

  // حالة التحميل الهيكلي (Skeleton)
  if (loading && products.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64 rounded-2xl" />
          <Skeleton className="h-12 w-40 rounded-full" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-12 flex-1 rounded-2xl" />
          <Skeleton className="h-12 w-48 rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ترويسة الصفحة وزر الإضافة */}
      <PageHeader
        title={t('products.title')}
        description={t('products.subtitle')}
        actions={
          <Link to="/seller/products/new">
            <Button
              variant="primary"
              className="whitespace-nowrap px-6 h-12 rounded-full shadow-soft"
              startIcon={<Plus className="w-4 h-4" />}
            >
              {t('products.add_aid')}
            </Button>
          </Link>
        }
      />

      {/* شريط البحث والتصفية */}
      <Card padding="md" className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {/* حقل البحث */}
          <div className="flex-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('products.search_placeholder')}
              startIcon={<Search className="w-4 h-4" />}
              containerClassName="mb-0"
            />
          </div>

          {/* قائمة تصفية الحالة */}
          <div className="w-full sm:w-56 shrink-0">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              containerClassName="mb-0"
            >
              <option value="all">{t('products.filter_all')}</option>
              <option value="published">{t('products.filter_published')}</option>
              <option value="draft">{t('products.filter_draft')}</option>
              <option value="out_of_stock">{t('products.filter_out_of_stock')}</option>
            </Select>
          </div>
        </div>

        {/* إحصائية سريعة لعدد الوسائل */}
        <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-surface-border">
          <span className="font-bold">
            {t('products.total_count', { count: formatNumber(filteredProducts.length) })}
          </span>
        </div>
      </Card>

      {/* عرض الخطأ إن وجد */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadProducts}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* في حال عدم وجود نتائج */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          title={t('products.empty_title')}
          description={t('products.empty_desc')}
          icon={<Package className="w-10 h-10 text-brand-orange" />}
          action={
            <Link to="/seller/products/new">
              <Button variant="primary" startIcon={<Plus className="w-4 h-4" />}>
                {t('products.add_aid')}
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* العرض في الشاشات الكبيرة (Desktop Table) */}
          <div className="hidden md:block">
            <Card padding="none" className="overflow-hidden">
              <div className="overflow-x-auto overscroll-contain modal-scrollbar">
                <table className="w-full text-start align-middle text-xs">
                  <thead>
                    <tr className="bg-surface-subtle text-text-muted font-bold border-b border-surface-border">
                      <th className="py-3.5 px-4 text-start">{t('products.col_aid')}</th>
                      <th className="py-3.5 px-4 text-start">{t('products.col_category')}</th>
                      <th className="py-3.5 px-4 text-start">{t('products.col_price')}</th>
                      <th className="py-3.5 px-4 text-start">{t('products.col_stock')}</th>
                      <th className="py-3.5 px-4 text-start">{t('products.col_status')}</th>
                      <th className="py-3.5 px-4 text-end">{t('products.col_actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {filteredProducts.map((p) => {
                      const category = CATEGORIES.find((c) => c.id === p.categoryId)
                      const categoryName = category
                        ? (isRtl ? category.name : category.nameEn)
                        : p.categoryId

                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-surface-subtle/50 transition-colors"
                        >
                          {/* صورة واسم الوسيلة */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3.5">
                              <div className="w-12 h-12 shrink-0">
                                <ProductImage
                                  src={p.images && p.images[0]}
                                  alt={p.name}
                                  aspectRatio="1/1"
                                  className="rounded-xl"
                                />
                              </div>
                              <div className="max-w-[240px]">
                                <span
                                  className="font-heading font-black text-xs text-text-main block truncate"
                                  data-user-content="true"
                                >
                                  {pickLocale(p.name, isRtl ? 'ar' : 'en').text}
                                </span>
                                {!p.name?.en && !p.nameEn ? (
                                  <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                    {t('products.missing_en')}
                                  </span>
                                ) : (
                                  <span
                                    className="text-[11px] text-text-muted block truncate mt-0.5"
                                    data-user-content="true"
                                  >
                                    {typeof p.name === 'object' ? p.name.en : p.nameEn}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* التصنيف */}
                          <td className="py-4 px-4">
                            <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand-orange/10 text-brand-orange">
                              {categoryName}
                            </span>
                          </td>

                          {/* السعر */}
                          <td className="py-4 px-4 font-mono font-bold text-text-main">
                            <PriceTag amount={p.price} size="sm" />
                          </td>

                          {/* المخزون بالورشة */}
                          <td className="py-4 px-4">
                            {p.stockCount > 0 ? (
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {t('products.in_stock', { count: p.stockCount })}
                              </span>
                            ) : (
                              <span className="font-bold text-rose-600 dark:text-rose-400">
                                {t('products.out_of_stock')}
                              </span>
                            )}
                          </td>

                          {/* مفتاح النشر الفوري */}
                          <td className="py-4 px-4">
                            <Switch
                              id={`pub_desk_${p.id}`}
                              checked={Boolean(p.isPublished)}
                              onChange={(e) => handleTogglePublish(p.id, e.target.checked)}
                              label={p.isPublished ? t('products.published') : t('products.draft')}
                              containerClassName="gap-2"
                            />
                          </td>

                          {/* أزرار الإجراءات: تعديل وحذف */}
                          <td className="py-4 px-4 text-end">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <Link
                                to={`/seller/products/${p.id}/edit`}
                                className="p-2 rounded-full text-text-muted hover:text-brand-orange hover:bg-surface-subtle transition-colors"
                                aria-label={t('products.edit')}
                              >
                                <Edit className="w-4 h-4" />
                              </Link>

                              <button
                                type="button"
                                onClick={() => setProductToDelete(p)}
                                className="p-2 rounded-full text-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                aria-label={t('products.delete')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* العرض في الشاشات الصغيرة (Mobile Cards) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredProducts.map((p) => (
              <ProductCardSeller
                key={p.id}
                product={p}
                onTogglePublish={handleTogglePublish}
                onDeleteClick={(prod) => setProductToDelete(prod)}
              />
            ))}
          </div>
        </>
      )}

      {/* حوار تأكيد الحذف */}
      <ConfirmDialog
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        title={t('products.delete_dialog.title')}
        message={t('products.delete_dialog.message')}
        confirmText={t('products.delete_dialog.confirm')}
        cancelText={t('products.delete_dialog.cancel')}
        variant="danger"
      />
    </div>
  )
}
