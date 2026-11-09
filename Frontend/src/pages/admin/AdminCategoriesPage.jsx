import { Info } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { CategoryEditModal, CategoryItemCard } from '../../features/admin/categories'
import { adminService } from '../../services/adminService'
import { catalogService } from '../../services/catalogService'
import { productService } from '../../services/productService'
import { getFriendlyError } from '../../utils'

/**
 * صفحة إدارة التصنيفات التعليمية الستة الثابتة
 * لا تحتوي على زر إضافة ولا حذف لأن التصنيفات ثابتة ومحمية وفق معجم المحتوى
 */
export default function AdminCategoriesPage() {
  const { t } = useTranslation('admin-manage')

  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // حالة النافذة المنبثقة للتعديل
  const [editingCategory, setEditingCategory] = useState(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // جلب التصنيفات والوسائل التعليمية
  const loadCategoriesData = useCallback(async () => {
    try {
      setLoading(true)
      const [cats, prods] = await Promise.all([
        catalogService.getCategories(),
        productService.getManageableProducts().catch(() => []),
      ])
      setCategories(cats)
      setProducts(prods)
    } catch (err) {
      toast.error(getFriendlyError(err, t))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadCategoriesData()
  }, [loadCategoriesData])

  // حساب عدد الوسائل لكل تصنيف
  const categoryCounts = useMemo(() => {
    const counts = {}
    products.forEach((p) => {
      counts[p.categoryId] = (counts[p.categoryId] || 0) + 1
    })
    return counts
  }, [products])

  // إعادة ترتيب التصنيفات للأعلى
  const handleMoveUp = async (index) => {
    if (index <= 0) return
    const nextCategories = [...categories]
    const temp = nextCategories[index - 1]
    nextCategories[index - 1] = nextCategories[index]
    nextCategories[index] = temp
    setCategories(nextCategories)

    try {
      const ids = nextCategories.map((c) => c.id || c.slug)
      await adminService.reorderCategories(ids)
      toast.success(t('categories.reorderSuccess'))
    } catch (err) {
      toast.error(getFriendlyError(err, t))
      // إعادة تحميل الترتيب السابق في حال الفشل
      loadCategoriesData()
    }
  }

  // إعادة ترتيب التصنيفات للأسفل
  const handleMoveDown = async (index) => {
    if (index >= categories.length - 1) return
    const nextCategories = [...categories]
    const temp = nextCategories[index + 1]
    nextCategories[index + 1] = nextCategories[index]
    nextCategories[index] = temp
    setCategories(nextCategories)

    try {
      const ids = nextCategories.map((c) => c.id || c.slug)
      await adminService.reorderCategories(ids)
      toast.success(t('categories.reorderSuccess'))
    } catch (err) {
      toast.error(getFriendlyError(err, t))
      loadCategoriesData()
    }
  }

  // حفظ تعديلات التصنيف
  const handleSaveCategory = async (values) => {
    if (!editingCategory) return
    setIsSavingEdit(true)
    try {
      const targetId = editingCategory.id || editingCategory.slug
      const updated = await adminService.updateCategory(targetId, values)
      setCategories((prev) =>
        prev.map((c) => ((c.id || c.slug) === targetId ? { ...c, ...updated } : c))
      )
      toast.success(t('categories.saveSuccess'))
      setEditingCategory(null)
    } catch (err) {
      toast.error(getFriendlyError(err, t))
    } finally {
      setIsSavingEdit(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('categories.title')}
        description={t('categories.description')}
      />

      {/* تنبيه توضيحي ثابت: التصنيفات الستة محمية وثابتة ولا يمكن إضافتها أو حذفها */}
      <Card
        variant="subtle"
        padding="md"
        className="border-s-4 border-s-brand-orange bg-brand-orange/5 flex items-start gap-3.5"
      >
        <div className="w-8 h-8 rounded-full bg-brand-orange/15 text-brand-orange flex items-center justify-center shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="text-xs leading-relaxed">
          <span className="font-bold text-text-main block mb-1">
            {t('categories.fixedNoticeTitle')}
          </span>
          <p className="text-text-muted">
            {t('categories.fixedNotice')}
          </p>
          <p className="text-text-muted mt-1 font-medium">
            {t('categories.reorderHelp')}
          </p>
        </div>
      </Card>

      {/* قائمة بطاقات التصنيفات الستة الأساسية */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-[20px]" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat, idx) => (
            <CategoryItemCard
              key={cat.id || cat.slug}
              category={cat}
              index={idx}
              total={categories.length}
              onMoveUp={() => handleMoveUp(idx)}
              onMoveDown={() => handleMoveDown(idx)}
              onEdit={() => setEditingCategory(cat)}
              productsCount={categoryCounts[cat.id] || 0}
            />
          ))}
        </div>
      )}

      {/* نافذة تعديل بيانات التصنيف */}
      <CategoryEditModal
        isOpen={Boolean(editingCategory)}
        onClose={() => setEditingCategory(null)}
        category={editingCategory}
        onSave={handleSaveCategory}
        isSaving={isSavingEdit}
      />
    </div>
  )
}
