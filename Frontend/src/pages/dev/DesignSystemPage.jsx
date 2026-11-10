import {
  Building2,
  Clock,
  Lock,
  MessageCircle,
  Moon,
  Phone,
  PhoneCall,
  Send,
  ShoppingBag,
  Sparkles,
  Sun,
  User,
} from 'lucide-react'
import { useState } from 'react'
import { OrderItemsList } from '../../components/order/OrderItemsList'
import { OrderTimeline } from '../../components/order/OrderTimeline'
import { ProductCard } from '../../components/product/ProductCard'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  CopyButton,
  DataTable,
  Drawer,
  ImageUploader,
  Input,
  Lightbox,
  Modal,
  OTPInput,
  Pagination,
  PasswordInput,
  PriceTag,
  ProductImage,
  QuantityStepper,
  RadioCard,
  SectionTitle,
  Select,
  Skeleton,
  Spinner,
  StatusBadge,
  Switch,
  Tabs,
  Textarea,
} from '../../components/ui'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'

export default function DesignSystemPage() {
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage } = useLanguage()

  // حالات اختبار المكونات التفاعلية
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [qty, setQty] = useState(2)
  const [otp, setOtp] = useState('1234')
  const [pwd, setPwd] = useState('Secret123')
  const [activeTab, setActiveTab] = useState('tab1')
  const [radioVal, setRadioVal] = useState('opt1')
  const [checked, setChecked] = useState(true)
  const [switched, setSwitched] = useState(false)
  const [images, setImages] = useState([])
  const [page, setPage] = useState(2)
  const [claimModalOpen, setClaimModalOpen] = useState(false)

  const sampleProduct = {
    id: 'prod_sample_1',
    name: 'لوحة الحروف الأبجدية بالجوخ',
    nameEn: 'Arabic Alphabet Felt Board',
    categoryId: 'alphabet-boards',
    sellerId: 'sample_seller',
    sellerName: 'ورشة الوسائل التعليمية',
    price: 320,
    inStock: true,
    images: [],
  }

  const sampleTimeline = [
    { status: 'pending_payment', title: 'تم إنشاء الطلب', timestamp: '2026-10-28T10:00:00Z' },
    { status: 'payment_confirmed', title: 'تم تأكيد استلام تحويل فودافون كاش', timestamp: '2026-10-28T11:00:00Z' },
    { status: 'preparing', title: 'جاري حياكة وتجهيز الوسيلة بالورشة', timestamp: '2026-10-29T09:00:00Z' },
  ]

  const sampleItems = [
    {
      productId: 'prod_1',
      name: 'لوحة الحروف الأبجدية بالجوخ',
      qty: 1,
      unitPrice: 320,
      image: '',
    },
    {
      productId: 'prod_3',
      name: 'فلاش كارد أصوات الحروف',
      qty: 2,
      unitPrice: 110,
      image: '',
    },
  ]

  const tableColumns = [
    { header: 'الاسم', key: 'name' },
    { header: 'الدور', key: 'role' },
    { header: 'الحالة', key: 'status', render: (row) => <StatusBadge status={row.status} size="sm" /> },
    { header: 'السعر', key: 'price', render: (row) => <PriceTag amount={row.price} size="sm" /> },
  ]

  const tableData = [
    { id: 1, name: 'لوحة الأرقام بالجوخ', role: 'البائعة الأولى', status: 'payment_confirmed', price: 240 },
    { id: 2, name: 'بطاقات المفردات', role: 'البائعة الثانية', status: 'preparing', price: 85 },
    { id: 3, name: 'تقويم الطقس', role: 'البائعة الأولى', status: 'shipped', price: 380 },
  ]

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      {/* شريط التحكم بالوضع واللغة في أعلى صفحة الدليل */}
      <div className="sticky top-20 sm:top-24 z-30 p-3 sm:p-4 rounded-[22px] bg-surface/90 backdrop-blur-md border border-surface-border shadow-soft flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <span className="text-[11px] sm:text-xs font-bold text-brand-orange-text dark:text-brand-orange uppercase">
            مختبر نظام التصميم (Dev Only)
          </span>
          <h1 className="text-lg sm:text-xl font-black font-heading text-text-main truncate">
            Little Hands Design System (أيدي صغيرة)
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 p-1 rounded-full bg-surface-subtle border border-surface-border text-xs font-bold">
            <button
              type="button"
              onClick={() => setLanguage('ar')}
              className={`px-2.5 sm:px-3 py-1 rounded-full transition-colors ${
                language === 'ar' ? 'bg-brand-orange text-white' : 'text-text-muted hover:text-text-main'
              }`}
            >
              عربي (RTL)
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 sm:px-3 py-1 rounded-full transition-colors ${
                language === 'en' ? 'bg-brand-orange text-white' : 'text-text-muted hover:text-text-main'
              }`}
            >
              English (LTR)
            </button>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-surface-border bg-surface text-xs font-bold flex items-center gap-2 hover:bg-surface-subtle"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-brand-yellow" /> : <Moon className="w-4 h-4" />}
            <span>{theme === 'dark' ? 'الليلي' : 'النهاري'}</span>
          </button>
        </div>
      </div>

      {/* 1. الأزرار Buttons */}
      <section className="space-y-4">
        <SectionTitle
          title="1. الأزرار (Buttons)"
          subtitle="ارتفاع 48px، استدارة كبسولية كاملة pill، نصوص لا تنكسر، وتأثير النقر الحركي."
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">أساسي (Primary)</Button>
          <Button variant="secondary">ثانوي محدد (Secondary)</Button>
          <Button variant="outline">إطار خفيف (Outline)</Button>
          <Button variant="ghost">شفاف (Ghost)</Button>
          <Button variant="danger">خطر / رفض (Danger)</Button>
          <Button variant="mint">نعناعي (Mint)</Button>
          <Button loading>جاري التحميل</Button>
          <Button startIcon={<ShoppingBag className="w-4 h-4" />}>مع أيقونة بداية</Button>
          <Button endIcon={<Send className="w-4 h-4" />}>مع أيقونة نهاية</Button>
          <Button size="sm">صغير (SM)</Button>
          <Button size="lg">كبير (LG)</Button>
        </div>
      </section>

      {/* 2. حقول الإدخال Form Inputs */}
      <section className="space-y-4">
        <SectionTitle
          title="2. حقول الإدخال والاختيار (Inputs & Selects)"
          subtitle="ارتفاع 52px، حواف 16px، إطار 1.5px، تركيز برتقالي، وأيقونة السهم في أقصى اليسار في RTL."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Input
            label="اسم المشرفة / المعلمة"
            placeholder="أدخلي الاسم..."
            helperText="تظهر للمندوب عند تسليم الشحنة"
          />

          <Input
            label="رقم الهاتف (خطأ تجريبي)"
            defaultValue="0123"
            error="رقم الهاتف غير مطابق للصيغة المصرية 01XXXXXXXXX"
          />

          <PasswordInput
            label="كلمة المرور مع مؤشر القوة"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            showStrength
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Select
            label="المحافظة (سهم اليسار في RTL)"
            options={[
              { label: 'القاهرة (40 ج.م)', value: 'cairo' },
              { label: 'الجيزة (45 ج.م)', value: 'giza' },
              { label: 'الإسكندرية (50 ج.م)', value: 'alex' },
            ]}
          />

          <QuantityStepper value={qty} onChange={setQty} />

          <div className="flex items-center gap-4">
            <CopyButton text="01XXXXXXXXX" label="نسخ محفظة فودافون كاش" />
            <PriceTag amount={320} size="lg" />
          </div>
        </div>

        <Textarea
          label="الملاحظات والتفاصيل"
          placeholder="أدخلي أي تعليمات خاصة بالتوصيل أو مواصفات الوسيلة..."
          rows={3}
        />
      </section>

      {/* 3. عناصر الاختيار والتبديل */}
      <section className="space-y-4">
        <SectionTitle title="3. الاختيار والتبديل (Checkboxes, Switches, Radios)" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
          <div className="space-y-3">
            <Checkbox
              label="وسائل من الجوخ"
              description="خامات متينة ومقاومة للاستخدام المتكرر"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <Checkbox label="بطاقات مقواة ومغلفة حرارياً" />
          </div>

          <div className="space-y-3">
            <Switch
              label="تنبيهات فودافون كاش"
              description="إشعار فوري عند مراجعة واعتماد الإيصال"
              checked={switched}
              onChange={(e) => setSwitched(e.target.checked)}
            />
          </div>

          <div className="space-y-3">
            <RadioCard
              name="test_radio"
              value="opt1"
              label="توصيل عادي للحضانة"
              description="خلال 2-3 أيام عمل"
              badge="الأكثر طلباً"
              checked={radioVal === 'opt1'}
              onChange={() => setRadioVal('opt1')}
            />
            <RadioCard
              name="test_radio"
              value="opt2"
              label="توصيل سريع"
              description="خلال 24 ساعة للمحافظات القريبة"
              checked={radioVal === 'opt2'}
              onChange={() => setRadioVal('opt2')}
            />
          </div>
        </div>
      </section>

      {/* 4. الشارات وحالات الطلب */}
      <section className="space-y-4">
        <SectionTitle title="4. الشارات المبهجة وحالات الطلب (Badges & Order Statuses)" />
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="orange" tilt="left">لوحات الحروف</Badge>
          <Badge variant="sky">لوحات الأرقام</Badge>
          <Badge variant="pink" tilt="right">بطاقات تعليمية</Badge>
          <Badge variant="mint">لوحات حائط</Badge>
          <Badge variant="yellow">زينة الفصول</Badge>
          <Badge variant="default">حقائب الأنشطة</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <StatusBadge status="pending_payment" />
          <StatusBadge status="payment_confirmed" />
          <StatusBadge status="preparing" />
          <StatusBadge status="shipped" />
          <StatusBadge status="delivered" />
          <StatusBadge status="payment_rejected" />
        </div>
      </section>

      {/* 5. صور المنتجات والهوية */}
      <section className="space-y-4">
        <SectionTitle
          title="5. صور المنتجات (ProductImage) والبطاقات"
          subtitle="صورة بنسبة أبعاد ثابتة، أو بديل رمزي بهوية أيدي صغيرة بدون صور خارجية أو ذكاء اصطناعي."
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-xs font-bold text-text-muted mb-2 block">بديل رمزي بهوية المنصة (4:3):</span>
            <ProductImage src="" aspectRatio="4/3" />
          </div>
          <div>
            <span className="text-xs font-bold text-text-muted mb-2 block">بديل رمزي بهوية المنصة (مربع):</span>
            <ProductImage src="" aspectRatio="1/1" />
          </div>
          <div>
            <span className="text-xs font-bold text-text-muted mb-2 block">نسبة 16:9:</span>
            <ProductImage src="" aspectRatio="16/9" />
          </div>
          <div>
            <span className="text-xs font-bold text-text-muted mb-2 block">حالة افتراضية:</span>
            <ProductImage src="" aspectRatio="4/3" />
          </div>
        </div>
      </section>

      {/* 6. بطاقة المنتج ProductCard المتكاملة */}
      <section className="space-y-4">
        <SectionTitle title="6. بطاقة الوسيلة التعليمية (ProductCard)" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <ProductCard product={sampleProduct} />
          <ProductCard
            product={{
              ...sampleProduct,
              id: 'prod_sample_2',
              name: 'تقويم الطقس وفصول السنة الجداري',
              price: 380,
              images: [],
            }}
          />
        </div>
      </section>

      {/* 7. الجداول المتجاوبة (DataTable) */}
      <section className="space-y-4">
        <SectionTitle
          title="7. الجداول المتجاوبة (DataTable)"
          subtitle="جدول على الحاسوب ويتحول تلقائياً لبطاقات مكدسة على الموبايل بدون انزلاق عرضي للصفحة."
        />
        <DataTable columns={tableColumns} data={tableData} />
      </section>

      {/* 8. خط تتبع الطلب وقائمة الوسائل */}
      <section className="space-y-4">
        <SectionTitle title="8. مسار الطلب الزمني وقائمة المشتريات (Order Timeline & Items)" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card padding="md">
            <h4 className="font-heading font-black text-sm mb-3">مسار الطلب (OrderTimeline):</h4>
            <OrderTimeline timeline={sampleTimeline} />
          </Card>

          <Card padding="md">
            <h4 className="font-heading font-black text-sm mb-3">قائمة الوسائل (OrderItemsList):</h4>
            <OrderItemsList items={sampleItems} />
          </Card>
        </div>
      </section>

      {/* 9. النوافذ المنبثقة والقوائم الجانبية (Modals, Drawers) */}
      <section className="space-y-4">
        <SectionTitle title="9. النوافذ المنبثقة والتفاعلية (Modals, Confirm, Drawers, Lightbox)" />
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setModalOpen(true)}>فتح نافذة منبثقة (Modal)</Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            نافذة تأكيد حذف (ConfirmDialog)
          </Button>
          <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
            فتح درج جانبي (Drawer)
          </Button>
          <Button variant="outline" onClick={() => setLightboxOpen(true)}>
            معاينة صورة مكبرة (Lightbox)
          </Button>
        </div>

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="نافذة تجريبية"
          description="تغلق بالضغط على مفتاح Esc وتمنع تمرير الخلفية"
        >
          <p className="text-xs text-text-muted py-4">
            محتوى النموذج أو التفاصيل داخل النافذة المنبثقة المتناسقة مع الألوان.
          </p>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setModalOpen(false)}>حسناً، تم</Button>
          </div>
        </Modal>

        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => setConfirmOpen(false)}
          title="هل تريدين حذف هذه الوسيلة؟"
          message="سيتم حذف الوسيلة التعليمية من كتالوج المتجر ولن تظهر للعميلات."
        />

        <Drawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          side="start"
          title="درج جانبي تجريبي"
        >
          <p className="text-xs text-text-muted">محتوى الدرج الجانبي...</p>
        </Drawer>

        <Lightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          src=""
        />
      </section>

      {/* 10. إدخال رمز التحقق OTP والتبويبات */}
      <section className="space-y-4">
        <SectionTitle title="10. حقل رمز التحقق OTP والتبويبات والترقيم" />
        <div className="space-y-6">
          <OTPInput length={6} value={otp} onChange={setOtp} />

          <Tabs
            tabs={[
              { id: 'tab1', label: 'الوسائل الشائعة', badge: '8' },
              { id: 'tab2', label: 'لوحات الجوخ', badge: '14' },
              { id: 'tab3', label: 'البطاقات التعليمية' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <Pagination
            currentPage={page}
            totalPages={5}
            onPageChange={setPage}
          />
        </div>
      </section>

      {/* 11. رفع الصور والهياكل التوضيحية */}
      <section className="space-y-4">
        <SectionTitle title="11. رفع الصور وهياكل التحميل (ImageUploader, Skeletons, Spinners)" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card padding="md">
            <h4 className="font-heading font-black text-sm mb-3">رافع الصور (ImageUploader):</h4>
            <ImageUploader images={images} onChange={setImages} />
          </Card>

          <Card padding="md" className="space-y-3">
            <h4 className="font-heading font-black text-sm mb-3">هياكل التحميل والمؤشرات:</h4>
            <div className="flex items-center gap-4">
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
            </div>
            <Skeleton className="h-10 w-full rounded-[14px]" />
            <Skeleton className="h-20 w-full rounded-[18px]" />
          </Card>
        </div>
      </section>

      {/* 12. كروت طلبات الحضانات الخاصة للبائعات */}
      <section className="space-y-4">
        <SectionTitle title="12. بطاقات طلبات الحضانات الخاصة للبائعة (Seller Custom Requests)" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* كارت 1: متاح للتنفيذ */}
          <Card padding="lg" className="flex flex-col justify-between border border-surface-border bg-surface dark:bg-surface-raised">
            <div className="space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 font-bold text-base text-text-main truncate">
                    <Building2 className="w-4 h-4 text-brand-orange shrink-0" />
                    <span className="truncate">حضانة براعم المستقبل</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span>أ. مريم السعيد</span>
                  </div>
                </div>
                <Badge variant="info" size="sm">متاح للتنفيذ</Badge>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-text-muted">
                <Clock className="w-3 h-3 shrink-0" />
                <span>منذ ساعتين</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-subtle dark:bg-surface/50 border border-surface-border text-xs text-text-main leading-relaxed">
                مطلوب تصميم 3 لوحات تفاعلية لتعليم الأرقام والحساب للأطفال من سن 3 إلى 5 سنوات باستخدام الجوخ والأزرار الملونة.
              </div>

              <div className="pt-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-text-muted">
                  <Lock className="w-3.5 h-3.5" />
                  <span className="font-medium">الهاتف:</span>
                </div>
                <span dir="ltr" className="font-mono text-xs font-bold text-text-muted tracking-wider [unicode-bidi:isolate]">
                  010*****432
                </span>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-surface-border">
              <Button
                variant="primary"
                onClick={() => setClaimModalOpen(true)}
                className="w-full text-xs font-bold shadow-xs hover:shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5 me-1.5" />
                أنا هنفذ الطلب
              </Button>
            </div>
          </Card>

          {/* كارت 2: مستلم بواسطتي */}
          <Card padding="lg" className="flex flex-col justify-between border border-surface-border bg-surface dark:bg-surface-raised">
            <div className="space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 font-bold text-base text-text-main truncate">
                    <Building2 className="w-4 h-4 text-brand-orange shrink-0" />
                    <span className="truncate">روضة شمس الغد</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span>أ. نجلاء فهمي</span>
                  </div>
                </div>
                <Badge variant="success" size="sm">طلبكِ</Badge>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-text-muted">
                <Clock className="w-3 h-3 shrink-0" />
                <span>أمس</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-subtle dark:bg-surface/50 border border-surface-border text-xs text-text-main leading-relaxed">
                تفصيل مجسمات حيوانات المزرعة وقصص قماشية متحركة لتعليم الأطفال أسماء الحيوانات وأصواتها.
              </div>

              <div className="pt-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-text-muted">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-medium">الهاتف:</span>
                </div>
                <span dir="ltr" className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 select-all [unicode-bidi:isolate]">
                  01098765432
                </span>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-surface-border">
              <div className="flex items-center gap-2">
                <a
                  href="tel:01098765432"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>اتصال</span>
                </a>
                <a
                  href="https://wa.me/201098765432"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] dark:text-[#25D366] border border-[#25D366]/30 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>واتساب</span>
                </a>
              </div>
            </div>
          </Card>

          {/* كارت 3: مستلم بواسطة بائعة أخرى */}
          <Card padding="lg" className="flex flex-col justify-between border border-surface-border bg-surface dark:bg-surface-raised">
            <div className="space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 font-bold text-base text-text-main truncate">
                    <Building2 className="w-4 h-4 text-brand-orange shrink-0" />
                    <span className="truncate">حضانة النور الأزهرية</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span>أ. فاطمة علي</span>
                  </div>
                </div>
                <Badge variant="secondary" size="sm">تم استلامه بواسطة فاطمة محمد</Badge>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-text-muted">
                <Clock className="w-3 h-3 shrink-0" />
                <span>منذ 3 ساعات</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-subtle dark:bg-surface/50 border border-surface-border text-xs text-text-main leading-relaxed">
                وسيلة تعليمية لأركان الإسلام وحروف الهجاء مجهزة بالجيوب القماشية للتعليق على الجدران.
              </div>

              <div className="pt-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-text-muted">
                  <Lock className="w-3.5 h-3.5" />
                  <span className="font-medium">الهاتف:</span>
                </div>
                <span dir="ltr" className="font-mono text-xs font-bold text-text-muted tracking-wider [unicode-bidi:isolate]">
                  012*****901
                </span>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-surface-border">
              <Button variant="outline" disabled className="w-full text-xs opacity-60 cursor-not-allowed">
                تم الاستلام
              </Button>
            </div>
          </Card>
        </div>

        {/* حوار تأكيد الاستلام */}
        <ConfirmDialog
          isOpen={claimModalOpen}
          onClose={() => setClaimModalOpen(false)}
          onConfirm={() => {
            setClaimModalOpen(false)
            alert('تم تأكيد الاستلام تجريبياً!')
          }}
          title="تأكيد استلام الطلب"
          message="هل أنتِ متأكدة؟ بعد التأكيد لن تستطيع بائعة أخرى استلام هذا الطلب."
          confirmText="تأكيد واستلام"
          cancelText="إلغاء"
          variant="primary"
        />
      </section>
    </div>
  )
}
