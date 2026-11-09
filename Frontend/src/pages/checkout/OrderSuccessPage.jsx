import { motion, useReducedMotion } from 'framer-motion'
import {
  CheckCircle2,
  Clock,
  ShoppingBag,
  Sparkles,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PriceTag } from '../../components/ui/PriceTag'
import { ProductImage } from '../../components/ui/ProductImage'
import { Skeleton } from '../../components/ui/Skeleton'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useFormat } from '../../hooks/useFormat'
import { orderService } from '../../services/orderService'

/**
 * صفحة نجاح تسجيل الطلب ورفع إيصال فودافون كاش
 * تتضمن رسماً احتفالياً متحركاً يحترم تفضيلات تقليل الحركة
 */
export default function OrderSuccessPage() {
  const { number } = useParams()
  const { t } = useTranslation(['checkout', 'common'])
  const { formatDate } = useFormat()
  const shouldReduceMotion = useReducedMotion()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  // جلب تفاصيل الطلب المسجل من طبقة الخدمات
  useEffect(() => {
    let isMounted = true
    async function fetchOrderDetails() {
      try {
        setLoading(true)
        if (number) {
          const res = await orderService.getOrder(number)
          if (isMounted && res) {
            setOrder(res)
          }
        }
      } catch (err) {
        console.warn('Failed to load order for success page:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchOrderDetails()
    return () => {
      isMounted = false
    }
  }, [number])

  // متغيرات حركة أيقونة الاحتفال
  const iconVariants = {
    hidden: { scale: 0, rotate: -45, opacity: 0 },
    visible: {
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: shouldReduceMotion
        ? { duration: 0.2 }
        : { type: 'spring', damping: 12, stiffness: 200, delay: 0.1 },
    },
  }

  const containerVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <Card padding="lg" className="border-emerald-500/30 shadow-soft relative overflow-hidden">
          {/* دائرة توهج خلفية */}
          <div className="absolute top-0 start-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* أيقونة النجاح والاحتفال المتحركة */}
          <motion.div
            variants={iconVariants}
            initial="hidden"
            animate="visible"
            className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-sm"
          >
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </motion.div>

          {/* شارة حالة الطلب الرسمية */}
          <div className="mb-3">
            <StatusBadge status="pending_payment" size="md" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black font-heading text-text-main mb-2">
            {t('checkout:success.title')}
          </h1>

          <p className="text-sm text-text-muted leading-relaxed max-w-md mx-auto mb-5">
            {t('checkout:success.thankYou')}
          </p>

          {/* رقم الطلب المعزول اتجاهياً */}
          <div className="mb-6">
            <span
              className="inline-block px-5 py-2.5 rounded-full bg-brand-orange/15 text-brand-orange-text dark:text-brand-orange font-mono font-black text-lg sm:text-xl shadow-xs select-all"
              dir="ltr"
              style={{ unicodeBidi: 'isolate' }}
            >
              {number ? `#${number}` : ''}
            </span>
          </div>

          {/* قسم ماذا بعد؟ */}
          <div className="p-4 sm:p-5 rounded-[20px] bg-surface-subtle border border-surface-border text-start space-y-2.5 mb-6">
            <div className="flex items-center gap-2 font-bold text-text-main text-xs sm:text-sm">
              <Clock className="w-4 h-4 text-brand-orange shrink-0" />
              <span>{t('checkout:success.nextStepsTitle')}</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {t('checkout:success.nextStepsDesc')}
            </p>
          </div>

          {/* ملخص عناصر الطلب إن وجدت */}
          {loading ? (
            <div className="space-y-3 p-4 rounded-[20px] border border-surface-border mb-6">
              <Skeleton className="h-4 w-1/3 mx-auto" />
              <Skeleton className="h-12 w-full rounded-[14px]" />
              <Skeleton className="h-12 w-full rounded-[14px]" />
            </div>
          ) : order?.items?.length ? (
            <div className="rounded-[20px] border border-surface-border p-4 bg-surface text-start space-y-3 mb-6">
              <div className="flex items-center justify-between pb-2 border-b border-surface-border text-xs">
                <span className="font-bold text-text-main">
                  {t('checkout:success.orderDetails')} ({order.items.length})
                </span>
                {order.createdAt && (
                  <span className="text-text-muted">
                    {formatDate(order.createdAt)}
                  </span>
                )}
              </div>

              <div className="divide-y divide-surface-border max-h-[200px] overflow-y-auto overscroll-contain modal-scrollbar">
                {order.items.map((it, idx) => (
                  <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-[10px] overflow-hidden shrink-0 border border-surface-border">
                        <ProductImage src={it.image} alt={it.name} aspectRatio="1/1" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-text-main truncate">{it.name}</p>
                        <span className="text-[11px] text-text-muted">× {it.qty}</span>
                      </div>
                    </div>
                    <PriceTag amount={it.unitPrice * it.qty} size="sm" />
                  </div>
                ))}
              </div>

              {/* ملخص الإجمالي */}
              <div className="pt-3 border-t border-surface-border flex items-center justify-between text-xs sm:text-sm">
                <span className="font-bold text-text-main">الإجمالي المدفوع:</span>
                <PriceTag amount={order.total} size="md" />
              </div>
            </div>
          ) : null}

          {/* أزرار التوجيه */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link to="/account/orders" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto font-bold whitespace-nowrap"
                startIcon={<ShoppingBag className="w-4 h-4" />}
              >
                {t('checkout:success.viewOrders')}
              </Button>
            </Link>

            <Link to="/products" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto font-bold whitespace-nowrap shadow-soft"
                startIcon={<Sparkles className="w-4 h-4" />}
              >
                {t('checkout:success.continueShopping')}
              </Button>
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
