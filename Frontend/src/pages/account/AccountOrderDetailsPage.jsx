import {
  AlertCircle,
  ArrowRight,
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  MapPin,
  Upload,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { OrderTimeline, translateReason } from '../../components/order/OrderTimeline'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Lightbox } from '../../components/ui/Lightbox'
import { Modal } from '../../components/ui/Modal'
import { PriceTag } from '../../components/ui/PriceTag'
import { ProductImage } from '../../components/ui/ProductImage'
import { Skeleton } from '../../components/ui/Skeleton'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { getGovernorateName } from '../../config/constants'
import { useLanguage } from '../../context/LanguageContext'
import { useSettings } from '../../context/SettingsContext'
import { useFormat } from '../../hooks/useFormat'
import { usePrivateReceipt } from '../../hooks/usePrivateReceipt'
import { orderService } from '../../services/orderService'
import { getFriendlyError, pickLocale } from '../../utils'

export default function AccountOrderDetailsPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation(['profile', 'common', 'errors'])
  const isEn = i18n.language === 'en'
  const { language } = useLanguage()
  const { formatDate } = useFormat()
  const { settings } = useSettings()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lightboxOpen, setLightboxOpen] = useState(false)

  // إلغاء الطلب
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  // البث الموثق لإيصال الدفع الخاص
  const paymentTargetId = order?.payment?.id || order?.id || null
  const { imageUrl: privateReceiptUrl } = usePrivateReceipt(lightboxOpen ? paymentTargetId : null)

  // حالة نموذج إعادة رفع الإيصال في حالة الرفض (payment_rejected)
  const [reuploadData, setReuploadData] = useState({
    senderPhone: '',
    reference: '',
    transferredAmount: '',
    screenshotFile: null,
  })
  const [reuploadPreview, setReuploadPreview] = useState('')
  const [reuploading, setReuploading] = useState(false)
  const [reuploadError, setReuploadError] = useState('')
  const [reuploadSuccess, setReuploadSuccess] = useState(false)

  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true)
      const data = await orderService.getOrder(id)
      setOrder(data)
      if (data?.payment) {
        setReuploadData({
          senderPhone: data.payment.senderPhone || '',
          reference: '',
          transferredAmount: data.total || '',
          screenshotFile: null,
        })
      }
    } catch (err) {
      setError(getFriendlyError(err, t))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => {
    fetchOrderDetails()
  }, [fetchOrderDetails])

  // معالجة إلغاء الطلب من قِبل العميل
  const handleCancelOrder = async (e) => {
    e.preventDefault()
    setCancelling(true)
    try {
      await orderService.cancelOrder(order.id, { reason: cancelReason.trim() })
      toast.success(t('profile:orders.cancelOrderSuccess'))
      setCancelModalOpen(false)
      setCancelReason('')
      await fetchOrderDetails()
    } catch (err) {
      console.error('Failed to cancel order:', err)
      toast.error(getFriendlyError(err, t))
    } finally {
      setCancelling(false)
    }
  }

  // معالجة اختيار صورة الإيصال الجديدة
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setReuploadError(t('common:ui.imageFormatError'))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setReuploadError(t('common:ui.imageMaxSizeSimple', { max: 5 }))
      return
    }

    setReuploadData((prev) => ({ ...prev, screenshotFile: file }))
    setReuploadError('')

    const reader = new FileReader()
    reader.onload = (ev) => {
      setReuploadPreview(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  // إرسال الإيصال الجديد للمراجعة
  const handleReuploadSubmit = async (e) => {
    e.preventDefault()
    setReuploadError('')
    setReuploadSuccess(false)

    if (!reuploadData.senderPhone.trim()) {
      setReuploadError(t('profile:orders.reuploadPhoneRequired'))
      return
    }

    if (!reuploadData.screenshotFile && !reuploadPreview) {
      setReuploadError(t('profile:orders.reuploadScreenshotRequired'))
      return
    }

    setReuploading(true)
    try {
      await orderService.reuploadReceipt(id, {
        senderPhone: reuploadData.senderPhone.trim(),
        reference: reuploadData.reference.trim(),
        screenshotFile: reuploadData.screenshotFile,
      })

      setReuploadSuccess(true)
      await fetchOrderDetails()
    } catch (err) {
      setReuploadError(getFriendlyError(err, t))
    } finally {
      setReuploading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 rounded-full" />
        <Skeleton className="h-48 rounded-[24px]" />
        <Skeleton className="h-64 rounded-[24px]" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <Card padding="lg">
        <EmptyState
          title={t('profile:orders.notFoundTitle')}
          description={error || t('profile:orders.notFoundDesc')}
          action={
            <Link to="/account/orders">
              <Button size="sm">{t('profile:orders.backToList', 'العودة لسجل الطلبات')}</Button>
            </Link>
          }
        />
      </Card>
    )
  }

  const isRejected = order.status === 'payment_rejected'

  return (
    <div className="space-y-6">
      {/* زر العودة */}
      <Link
        to="/account/orders"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-brand-orange-text dark:hover:text-brand-orange transition-colors"
      >
        <ArrowRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
        <span>{t('profile:orders.backToList', 'العودة لسجل الطلبات')}</span>
      </Link>

      {/* تنبيه خاص في حالة رفض الإيصال */}
      {isRejected && (
        <div className="p-5 rounded-[24px] bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-3 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-black text-base text-rose-950 dark:text-rose-100">
                {t('profile:orders.rejectedNoticeTitle', 'تم رفض إيصال تحويل فودافون كاش من قِبل الإدارة')}
              </h3>
              <p className="text-xs text-rose-800 dark:text-rose-300 mt-1 leading-relaxed">
                {isEn
                  ? 'Please review the rejection reason and re-upload a clear screenshot below so your order can be verified.'
                  : 'يرجى مراجعة سبب الرفض وإعادة رفع لقطة شاشة واضحة لإيصال التحويل الصحيح أدناه ليتم اعتماد طلبك والبدء في تجهيز الوسائل.'}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/30 border border-rose-200 dark:border-rose-900/60 text-xs space-y-1">
            <div className="font-bold text-rose-900 dark:text-rose-200">
              {t('profile:orders.rejectedReason', 'سبب الرفض:')}{' '}
              <span className="font-semibold text-rose-700 dark:text-rose-300">
                {translateReason(order.payment?.rejectReasonCode, order.payment?.rejectReason || order.payment?.rejectionReason, isEn) || (isEn ? 'Screenshot unclear' : 'لقطة الشاشة غير واضحة ورقم العملية مقتطع')}
              </span>
            </div>
            {order.payment?.adminNotes && (
              <div className="text-text-muted">
                {t('profile:orders.rejectedAdminNotes', 'ملاحظات المدقق:')} {order.payment.adminNotes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* تنبيه خاص في حالة إلغاء الطلب */}
      {order.status === 'cancelled' && (
        <div className="p-4 rounded-[20px] bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 flex items-start gap-3 shadow-soft">
          <XCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-sm block mb-1">{isEn ? 'This order has been cancelled.' : 'تم إلغاء هذا الطلب.'}</span>
            {(order.cancelReason || order.cancelReasonCode) && (
              <p className="text-text-muted">
                {isEn ? 'Reason:' : 'سبب الإلغاء:'}{' '}
                <span className="font-semibold text-text-main">
                  {translateReason(order.cancelReasonCode, order.cancelReason, isEn)}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* بطاقة رأس الطلب والتتبع الزمني */}
      <Card padding="lg" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-surface-border">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-mono font-black text-xl sm:text-2xl text-text-main [unicode-bidi:isolate]" dir="ltr">
                {order.number}
              </h1>
              <StatusBadge status={order.status} size="md" />

              {/* زر إلغاء الطلب أو تنبيه عدم إمكانية الإلغاء */}
              {order.status === 'pending_payment' && (
                order.payment && order.payment.status && order.payment.status !== 'rejected' ? (
                  <span className="text-[11px] text-text-muted bg-surface-subtle px-2.5 py-1 rounded-full border border-surface-border">
                    {isEn ? 'Cannot cancel order after payment proof is submitted' : 'لا يمكن إلغاء الطلب بعد إرسال إيصال الدفع'}
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCancelModalOpen(true)}
                    className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1 rounded-full"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Cancel Order' : 'إلغاء الطلب'}</span>
                  </Button>
                )
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
              <span>{isEn ? 'Order Date:' : 'تاريخ الطلب:'} {formatDate(order.createdAt)}</span>
              <span>•</span>
              <span data-user-content="true">
                {isEn ? 'Recipient:' : 'المستلمة:'} {order.delivery?.name} ({order.delivery?.nurseryName || (isEn ? 'Nursery' : 'حضانة')})
              </span>
            </div>
          </div>

          <div className="text-start sm:text-end shrink-0">
            <span className="text-[11px] text-text-muted block">
              {t('profile:orders.total', 'الإجمالي')}:
            </span>
            <PriceTag amount={order.total} size="xl" />
          </div>
        </div>

        {/* خط التتبع الزمني لدورة حياة الطلب */}
        <div>
          <h4 className="text-xs font-bold text-text-muted mb-4 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-brand-orange" />
            <span>{t('profile:orders.timelineTitle', 'مسار ومراحل تجهيز الطلب:')}</span>
          </h4>
          <OrderTimeline timeline={order.timeline || []} />
        </div>
      </Card>

      {/* قائمة المنتجات المطلوبة والبيان المالي */}
      <Card padding="lg">
        <h3 className="font-heading font-black text-base text-text-main mb-4">
          {t('profile:orders.itemsTitle', 'الوسائل التعليمية المطلوبة')} ({order.items?.length || 0})
        </h3>

        <div className="divide-y divide-surface-border">
          {order.items?.map((item, idx) => (
            <div key={idx} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-surface-subtle border border-surface-border shrink-0 shadow-xs">
                  <ProductImage
                    src={item.image}
                    alt={pickLocale(item.name, language).text}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="overflow-hidden">
                  <h4
                    className="font-heading font-bold text-sm text-text-main truncate"
                    data-user-content="true"
                  >
                    {pickLocale(item.name, language).text}
                  </h4>
                  <div className="text-xs text-text-muted mt-0.5">
                    {t('profile:orders.itemsCount', 'الوسائل')}: {item.qty} • <PriceTag amount={item.unitPrice} size="sm" />
                  </div>
                  {item.sellerName && (
                    <div
                      className="text-[11px] text-brand-orange-text dark:text-brand-orange font-semibold mt-0.5"
                      data-user-content="true"
                    >
                      {item.sellerName}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-end shrink-0">
                <PriceTag amount={(item.unitPrice || 0) * (item.qty || 1)} size="md" />
              </div>
            </div>
          ))}
        </div>

        {/* التفصيل المالي للعميلة: المجموع + الشحن = الإجمالي */}
        <div className="mt-6 pt-5 border-t border-surface-border text-xs space-y-2.5 max-w-sm ms-auto">
          <div className="flex justify-between text-text-muted">
            <span>{t('profile:orders.subtotal', 'المجموع:')}</span>
            <PriceTag amount={order.subtotal} size="sm" />
          </div>
          <div className="flex justify-between text-text-muted">
            <span>{t('profile:orders.shipping', { gov: getGovernorateName(order.delivery?.governorate, language) || order.delivery?.governorate })}</span>
            <PriceTag amount={order.shipping} size="sm" />
          </div>
          <div className="flex justify-between font-black text-sm text-text-main pt-2.5 border-t border-surface-border">
            <span>{t('profile:orders.total', 'الإجمالي:')}</span>
            <PriceTag amount={order.total} size="lg" />
          </div>
        </div>
      </Card>

      {/* بيانات الاستلام والتوصيل للحضانة */}
      <Card padding="lg">
        <h3 className="font-heading font-black text-base text-text-main mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-brand-orange" />
          <span>{t('profile:orders.deliveryTitle', 'بيانات الاستلام والتوصيل للحضانة')}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-surface-subtle/70">
            <span className="text-text-muted block mb-1">{t('profile:orders.recipient', 'المستلمة:')}</span>
            <span className="font-bold text-text-main text-sm" data-user-content="true">
              {order.delivery?.name}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-subtle/70">
            <span className="text-text-muted block mb-1">{t('profile:orders.phoneLabel', 'الهاتف:')}</span>
            <span
              className="font-mono font-bold text-text-main text-sm"
              dir="ltr"
              data-user-content="true"
            >
              {order.delivery?.phone}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-subtle/70">
            <span className="text-text-muted block mb-1">{t('profile:orders.nursery', 'الحضانة:')}</span>
            <span className="font-bold text-text-main text-sm" data-user-content="true">
              {order.delivery?.nurseryName || ''}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-subtle/70 sm:col-span-2 md:col-span-3">
            <span className="text-text-muted block mb-1">{t('profile:orders.addressLabel', 'العنوان:')}</span>
            <span className="font-medium text-text-main" data-user-content="true">
              {getGovernorateName(order.delivery?.governorate, language)} — {order.delivery?.city ? `${order.delivery.city} — ` : ''}{order.delivery?.address}
            </span>
          </div>
        </div>
      </Card>

      {/* بيانات إيصال تحويل فودافون كاش */}
      <Card padding="lg">
        <h3 className="font-heading font-black text-base text-text-main mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-orange" />
          <span>{t('profile:orders.paymentDetailsTitle', 'بيانات تحويل فودافون كاش')}</span>
        </h3>

        {order.payment ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-surface-subtle/70">
                <span className="text-text-muted block mb-1">{t('profile:orders.senderPhone', 'رقم المحفظة المحول منها:')}</span>
                <span className="font-mono font-bold text-text-main" dir="ltr">
                  {order.payment.senderPhone || '—'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface-subtle/70">
                <span className="text-text-muted block mb-1">{t('profile:orders.referenceNum', 'الرقم المرجعي للتحويل:')}</span>
                <span className="font-mono font-bold text-text-main" dir="ltr">
                  {order.payment.reference || '—'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface-subtle/70">
                <span className="text-text-muted block mb-1">{t('profile:orders.receiptStatus', 'حالة الإيصال لدى الإدارة:')}</span>
                <span className={`font-bold ${
                  order.payment.status === 'confirmed'
                    ? 'text-emerald-600'
                    : order.payment.status === 'rejected'
                    ? 'text-rose-600'
                    : 'text-amber-600'
                }`}>
                  {order.payment.status === 'confirmed'
                    ? (isEn ? 'Confirmed ✓' : 'تم الاعتماد بنجاح ✓')
                    : order.payment.status === 'rejected'
                    ? (isEn ? 'Rejected ✗' : 'مرفوض ✗')
                    : (isEn ? 'Under Review ⏳' : 'قيد المراجعة والتدقيق ⏳')}
                </span>
              </div>
            </div>

            {order.payment.screenshotUrl && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-surface-border bg-surface text-xs font-bold text-brand-orange-text dark:text-brand-orange hover:bg-surface-subtle transition-colors shadow-xs cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>{t('profile:orders.viewScreenshot', 'معاينة صورة الإيصال المرفوع')}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
            {isEn
              ? `No transfer receipt uploaded yet. Please transfer to official wallet ${settings?.platformWallet ? `(${settings.platformWallet})` : ''} and upload receipt below.`
              : `لم يتم رفع إيصال تحويل فودافون كاش لهذا الطلب حتى الآن. يرجى التحويل إلى محفظة المنصة ${settings?.platformWallet ? `(${settings.platformWallet})` : 'الرسمية'} ورفع الإيصال أدناه.`}
          </div>
        )}
      </Card>

      {/* نموذج إعادة رفع إيصال التحويل (يظهر خصيصاً في حالة رفض الإيصال أو عدم وجود إيصال) */}
      {(isRejected || !order.payment) && (
        <Card padding="lg" className="border-2 border-brand-orange/30 shadow-card">
          <div className="mb-5 pb-4 border-b border-surface-border">
            <h3 className="font-heading font-black text-base text-text-main flex items-center gap-2">
              <Upload className="w-5 h-5 text-brand-orange" />
              <span>{t('profile:orders.reuploadTitle', 'إعادة رفع إيصال تحويل فودافون كاش')}</span>
            </h3>
            <p className="text-xs text-text-muted mt-1">
              {t('profile:orders.reuploadDesc', 'يرجى تحويل المبلغ الإجمالي إلى محفظة المنصة وإعادة رفع صورة واضحة للإيصال:')}
            </p>
          </div>

          {reuploadSuccess && (
            <div className="mb-6 p-4 rounded-[16px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{t('profile:orders.reuploadSuccess', 'تم إرسال إيصال التحويل بنجاح وبانتظار مراجعة الإدارة!')}</span>
            </div>
          )}

          {reuploadError && (
            <div className="mb-6 p-4 rounded-[16px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{reuploadError}</span>
            </div>
          )}

          <form onSubmit={handleReuploadSubmit} className="space-y-4 max-w-xl">
            <Input
              id="reupload-sender-phone"
              label={`${t('profile:orders.reuploadSenderPhone', 'رقم الهاتف المحول منه (فودافون كاش)')} *`}
              value={reuploadData.senderPhone}
              onChange={(e) =>
                setReuploadData({ ...reuploadData, senderPhone: e.target.value })
              }
              placeholder={t('common:ui.phonePlaceholder')}
              dir="ltr"
              className="[unicode-bidi:isolate] text-start"
              required
            />

            <Input
              id="reupload-reference"
              label={t('profile:orders.reuploadReference', 'الرقم المرجعي للعملية (اختياري)')}
              value={reuploadData.reference}
              onChange={(e) =>
                setReuploadData({ ...reuploadData, reference: e.target.value })
              }
              placeholder={t('profile:orders.reuploadReferencePlaceholder')}
              dir="ltr"
              className="[unicode-bidi:isolate] text-start"
            />

            <div>
              <label className="block text-xs font-bold text-text-main mb-2">
                {t('profile:orders.reuploadScreenshot', 'صورة الإيصال الجديد')} *
              </label>

              <div className="border-2 border-dashed border-surface-border hover:border-brand-orange/60 rounded-2xl p-5 text-center bg-surface-subtle/50 transition-colors">
                <input
                  type="file"
                  id="reupload-receipt-file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {reuploadPreview ? (
                  <div className="space-y-3">
                    <img
                      src={reuploadPreview}
                      alt={isEn ? 'Receipt preview' : 'معاينة الإيصال'}
                      className="max-h-48 mx-auto rounded-xl shadow-xs border border-surface-border object-contain"
                    />
                    <label
                      htmlFor="reupload-receipt-file"
                      className="inline-block px-4 py-1.5 rounded-full text-xs font-bold bg-surface border border-surface-border hover:bg-surface-subtle cursor-pointer"
                    >
                      {isEn ? 'Change Photo' : 'تغيير الصورة'}
                    </label>
                  </div>
                ) : (
                  <label
                    htmlFor="reupload-receipt-file"
                    className="flex flex-col items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-8 h-8 text-brand-orange" />
                    <span className="text-xs font-bold text-text-main">
                      {isEn ? 'Click here to choose receipt screenshot' : 'انقري هنا لاختيار لقطة شاشة الإيصال'}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {isEn ? 'JPG, PNG, or WebP up to 5 MB' : 'JPG أو PNG أو WebP بحد أقصى 5 ميجابايت'}
                    </span>
                  </label>
                )}
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                size="lg"
                className="w-full text-base font-bold shadow-soft"
                loading={reuploading}
                startIcon={<Upload className="w-4 h-4" />}
              >
                {t('profile:orders.reuploadSubmit', 'إرسال الإيصال الجديد للمراجعة')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* معاينة الصورة في Lightbox مع دعم البث الموثق */}
      {(order.payment?.screenshotUrl || paymentTargetId) && (
        <Lightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          src={privateReceiptUrl || order.payment?.screenshotUrl}
          alt={isEn ? `Order ${order.number} Receipt` : `إيصال تحويل الطلب ${order.number}`}
        />
      )}

      {/* نافذة تأكيد إلغاء الطلب من العميل */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title={t('profile:orders.cancelOrderConfirmTitle')}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCancelOrder} className="space-y-4 p-2">
          <p className="text-xs text-text-muted leading-relaxed">
            {t('profile:orders.cancelOrderConfirmMessage')}
          </p>

          <Input
            id="cancel-reason"
            label={t('profile:orders.cancelReasonLabel')}
            placeholder={t('profile:orders.cancelReasonPlaceholder')}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            disabled={cancelling}
          />

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCancelModalOpen(false)}
              disabled={cancelling}
            >
              {isEn ? 'Keep Order' : 'تراجع'}
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              loading={cancelling}
            >
              {isEn ? 'Yes, Cancel Order' : 'نعم، قم بإلغاء الطلب'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
