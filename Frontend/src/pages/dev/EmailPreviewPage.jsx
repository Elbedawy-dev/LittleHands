import {
  Check,
  Copy,
  Info,
  Laptop,
  Mail,
  RotateCcw,
  Smartphone,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { calcCommission } from '../../utils'

// استيراد القوالب الخام كنصوص مباشرة عبر Vite ?raw
import adminNewPaymentRaw from '../../emails/admin-new-payment.html?raw'
import customerOrderReceivedRaw from '../../emails/customer-order-received.html?raw'
import customerPaymentConfirmedRaw from '../../emails/customer-payment-confirmed.html?raw'
import customerPaymentRejectedRaw from '../../emails/customer-payment-rejected.html?raw'
import customerShippedRaw from '../../emails/customer-shipped.html?raw'
import sellerNewOrderRaw from '../../emails/seller-new-order.html?raw'

const TEMPLATES = [
  {
    id: 'customer-order-received',
    labelAr: 'تأكيد استلام الطلب للعميلة',
    labelEn: 'Customer Order Received',
    audience: 'customer',
    raw: customerOrderReceivedRaw,
    descAr: 'يُرسل فور إنشاء الطلب ويتضمن تفاصيل الدفع بفودافون كاش دون كشف عمولات المنصة.',
    descEn: 'Sent immediately after order creation with Vodafone Cash instructions, hiding commission.',
  },
  {
    id: 'customer-payment-confirmed',
    labelAr: 'اعتماد تحويل فودافون كاش',
    labelEn: 'Customer Payment Confirmed',
    audience: 'customer',
    raw: customerPaymentConfirmedRaw,
    descAr: 'يُرسل بعد تدقيق الإدارة للإيصال وبدء الحرفيات في حياكة الوسائل اليدوية.',
    descEn: 'Sent after admin verifies receipt and artisans begin handcrafting.',
  },
  {
    id: 'customer-payment-rejected',
    labelAr: 'رفض إيصال التحويل (مع السبب)',
    labelEn: 'Customer Payment Rejected',
    audience: 'customer',
    raw: customerPaymentRejectedRaw,
    descAr: 'يُرسل إذا كان التحويل غير مطابق أو الصورة غير واضحة مع رابط لإعادة الرفع.',
    descEn: 'Sent if screenshot is unclear or amount mismatches with a re-upload link.',
  },
  {
    id: 'customer-shipped',
    labelAr: 'تم شحن الوسائل للحضانة',
    labelEn: 'Customer Order Shipped',
    audience: 'customer',
    raw: customerShippedRaw,
    descAr: 'يُرسل عند تسليم الشحنة لمندوب التوصيل مع رقم التتبع وموعد الوصول المتوقع.',
    descEn: 'Sent when the order is handed to the courier with tracking code.',
  },
  {
    id: 'seller-new-order',
    labelAr: 'طلب جديد للبائعة (مع العمولة 20٪)',
    labelEn: 'Seller New Order (20% Commission)',
    audience: 'seller',
    raw: sellerNewOrderRaw,
    descAr: 'يُرسل للبائعة الحرفية ويوضح سعر البيع، عمولة المنصة 20٪ وصافي الأرباح المستحقة.',
    descEn: 'Sent to artisan showing sale price, 20% platform commission, and net profit.',
  },
  {
    id: 'admin-new-payment',
    labelAr: 'إيصال دفع جديد للمراجعة (إدارة)',
    labelEn: 'Admin New Payment Review',
    audience: 'admin',
    raw: adminNewPaymentRaw,
    descAr: 'تنبيه للإدارة لتدقيق إيصال فودافون كاش ومطابقته بمحفظة المنصة.',
    descEn: 'Alert for admin to verify receipt against platform wallet.',
  },
]

const DEFAULT_SAMPLE_DATA = {
  customerName: 'مثال: مديرة الحضانة',
  customerPhone: '01XXXXXXXXX',
  nurseryName: 'حضانة الأمل التجريبية',
  deliveryAddress: 'شارع نموذج - عمارة تجريبية - القاهرة',
  governorate: 'القاهرة',
  orderNumber: 'LH-SAMPLE-001',
  orderId: 'ord_sample',
  orderUrl: 'http://localhost:5173/account/orders/ord_sample',
  reviewUrl: 'http://localhost:5173/admin/payments',
  totalAmount: '580 ج.م',
  subtotalAmount: '540 ج.م',
  shippingAmount: '40 ج.م',
  senderPhone: '01XXXXXXXXX',
  referenceNumber: 'VF-TX-SAMPLE',
  trackingNumber: 'EGY-EXP-SAMPLE',
  rejectionReason: 'صورة الإيصال غير واضحة ورقم العملية مقتطع',
  adminNotes: 'يرجى إعادة التقاط لقطة شاشة كاملة تظهر رقم العملية والمبلغ وتاريخ التحويل بوضوح.',
  sellerName: 'البائعة الأولى',
  productName: 'لوحة الحروف الأبجدية بالجوخ التفاعلي',
  quantity: '1',
  salePrice: '320 ج.م',
  walletNumber: '01XXXXXXXXX',
  platformWallet: '01XXXXXXXXX',
  supportPhone: '01XXXXXXXXX',
}

export default function EmailPreviewPage() {
  const { i18n } = useTranslation()
  const isEn = i18n.language === 'en'

  const [activeTemplateId, setActiveTemplateId] = useState('customer-order-received')
  const [deviceWidth, setDeviceWidth] = useState('desktop') // 'desktop' (600px) | 'mobile' (390px)
  const [copied, setCopied] = useState(false)
  const [sampleData, setSampleData] = useState(DEFAULT_SAMPLE_DATA)

  const activeTemplate = useMemo(() => {
    return TEMPLATES.find((t) => t.id === activeTemplateId) || TEMPLATES[0]
  }, [activeTemplateId])

  // حساب عمولة المنصة وصافي البائعة بشكل ديناميكي (100 = 20 + 80)
  const financialData = useMemo(() => {
    const rawPrice = 320
    const { commission, sellerNet } = calcCommission(rawPrice, 0.2)
    return {
      salePrice: `${rawPrice} ج.م`,
      commissionAmount: `${commission} ج.م`,
      netSellerAmount: `${sellerNet} ج.م`,
    }
  }, [])

  // تعويض المتغيرات داخل القالب
  const renderedHtml = useMemo(() => {
    let html = activeTemplate.raw || ''

    const sampleItemsHtml = `
      <tr style="border-bottom: 1px solid #E8E1DA;">
        <td style="padding: 12px 16px; font-size: 13px; color: #2D2522;">
          <strong>لوحة الحروف الأبجدية بالجوخ</strong>
          <div style="font-size: 11px; color: #6E5C53; margin-top: 2px;">جوخ ملون • حروف قابلة للفك</div>
        </td>
        <td align="center" style="padding: 12px 8px; font-size: 13px; color: #2D2522;">1</td>
        <td align="left" style="padding: 12px 16px; font-size: 13px; font-weight: bold; color: #2D2522;">320 ج.م</td>
      </tr>
      <tr style="border-bottom: 1px solid #E8E1DA;">
        <td style="padding: 12px 16px; font-size: 13px; color: #2D2522;">
          <strong>بطاقات الأرقام التعليمية المقواة</strong>
          <div style="font-size: 11px; color: #6E5C53; margin-top: 2px;">ورق مقوى مغلف حرارياً</div>
        </td>
        <td align="center" style="padding: 12px 8px; font-size: 13px; color: #2D2522;">1</td>
        <td align="left" style="padding: 12px 16px; font-size: 13px; font-weight: bold; color: #2D2522;">220 ج.م</td>
      </tr>
    `

    const mergedData = {
      ...sampleData,
      ...financialData,
      itemsHtml: sampleItemsHtml,
    }

    Object.keys(mergedData).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      html = html.replace(regex, mergedData[key])
    })

    return html
  }, [activeTemplate, sampleData, financialData])

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(renderedHtml)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback
    }
  }

  const handleResetData = () => {
    setSampleData(DEFAULT_SAMPLE_DATA)
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* رأس الصفحة */}
      <PageHeader
        title={isEn ? 'Standard Email Templates Preview' : 'معاينة قوالب البريد الإلكتروني القياسية'}
        description={
          isEn
            ? '600px table-based HTML email templates with strict commission visibility rules (Sellers and Admin only; forbidden from customers).'
            : 'قوالب بريدية بنظام الجداول الصريحة (600px HTML) مع التقيد الصارم بظهور العمولة 20٪ للبائعات والإدارة فقط وحظرها عن العميلات.'
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyHtml}
              className="px-4 py-2 rounded-full border border-surface-border bg-surface text-text-main text-xs font-bold hover:bg-surface-subtle flex items-center gap-1.5 transition-colors shadow-xs"
              aria-label="نسخ كود HTML"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600">{isEn ? 'Copied!' : 'تم النسخ!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-text-muted" />
                  <span>{isEn ? 'Copy HTML' : 'نسخ كود القالب'}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleResetData}
              className="p-2 rounded-full border border-surface-border bg-surface text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors"
              title={isEn ? 'Reset Sample Data' : 'إعادة ضبط البيانات التجريبية'}
              aria-label="إعادة ضبط البيانات"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* تنبيه قاعدة العمولة */}
      <div className="p-4 rounded-[20px] bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3 leading-relaxed">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">قاعدة الشفافية والعمولة:</strong>{' '}
          عمولة المنصة 20٪ تظهر حصراً في قوالب البائعة (seller-new-order) والإدارة (admin-new-payment).
          ويُحظر تماماً ذكر كلمة «عمولة» أو نسبتها في كافة قوالب العميلات ومستخدمات رياض الأطفال.
        </div>
      </div>

      {/* شريط اختيار القالب وأدوات العرض */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* أزرار القوالب الستة */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {TEMPLATES.map((tpl) => {
            const isActive = tpl.id === activeTemplateId
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setActiveTemplateId(tpl.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-xs cursor-pointer ${
                  isActive
                    ? 'bg-brand-orange text-white shadow-soft font-black scale-102'
                    : 'bg-surface text-text-muted border border-surface-border hover:text-text-main hover:bg-surface-subtle'
                }`}
              >
                {isEn ? tpl.labelEn : tpl.labelAr}
              </button>
            )
          })}
        </div>

        {/* مبدل حجم العرض (Desktop 600px / Mobile 390px) */}
        <div className="inline-flex items-center p-1 rounded-full bg-surface-subtle border border-surface-border shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setDeviceWidth('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
              deviceWidth === 'desktop'
                ? 'bg-surface text-text-main shadow-xs'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>{isEn ? 'Desktop (600px)' : 'كمبيوتر (600px)'}</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceWidth('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
              deviceWidth === 'mobile'
                ? 'bg-surface text-text-main shadow-xs'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{isEn ? 'Mobile (390px)' : 'موبايل (390px)'}</span>
          </button>
        </div>
      </div>

      {/* تفاصيل القالب النشط */}
      <Card padding="md" className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-orange/15 text-brand-orange flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-black text-sm text-text-main">
                {isEn ? activeTemplate.labelEn : activeTemplate.labelAr}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-subtle text-text-muted border border-surface-border font-mono" dir="ltr">
                {activeTemplate.id}.html
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {isEn ? activeTemplate.descEn : activeTemplate.descAr}
            </p>
          </div>
        </div>

        <span
          className={`text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap ${
            activeTemplate.audience === 'customer'
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
              : activeTemplate.audience === 'seller'
              ? 'bg-brand-orange/15 text-brand-orange-text dark:text-brand-orange'
              : 'bg-purple-500/15 text-purple-700 dark:text-purple-400'
          }`}
        >
          {activeTemplate.audience === 'customer'
            ? 'بريد العميلة (بدون عمولة)'
            : activeTemplate.audience === 'seller'
            ? 'بريد البائعة (عمولة 20٪)'
            : 'بريد الإدارة (تدقيق)'}
        </span>
      </Card>

      {/* حاوية المعاينة بالإطار المستقل iframe */}
      <div className="w-full flex justify-center py-6 bg-surface-subtle/50 rounded-[28px] border border-surface-border/60 overflow-hidden min-h-[700px]">
        <div
          className="transition-all duration-300 shadow-float rounded-[24px] overflow-hidden bg-white"
          style={{
            width: deviceWidth === 'desktop' ? '600px' : '390px',
            maxWidth: '100%',
          }}
        >
          <iframe
            title={`Preview of ${activeTemplate.id}`}
            srcDoc={renderedHtml}
            className="w-full h-[850px] border-0 block"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  )
}
