/**
 * Little Hands - Constants & Application Configuration
 * معجم المحتوى وثوابت النظام - أيدي صغيرة
 */

// التصنيفات الستة الأساسية حصراً للمنصة
export const CATEGORIES = [
  {
    id: 'alphabet-boards',
    slug: 'alphabet-boards',
    name: 'لوحات الحروف',
    nameAr: 'لوحات الحروف',
    nameEn: 'Alphabet Boards',
    description: 'وسائل تفاعلية يدوية لتعليم نطق ورسم الحروف العربية والإنجليزية بالجوخ والقماش',
    descriptionAr: 'وسائل تفاعلية يدوية لتعليم نطق ورسم الحروف العربية والإنجليزية بالجوخ والقماش',
    descriptionEn: 'Interactive handmade aids for teaching how Arabic and English letters sound and are written, made from felt and fabric.',
    color: '#4DB6FF',
    bgColor: 'rgba(77, 182, 255, 0.15)',
    textColor: '#0B72B9',
    icon: 'BookOpen',
  },
  {
    id: 'number-boards',
    slug: 'number-boards',
    name: 'لوحات الأرقام',
    nameAr: 'لوحات الأرقام',
    nameEn: 'Number Boards',
    description: 'وسائل عد وحساب تفاعلية مبكرة بألوان محفزة وخامات قماشية آمنة',
    descriptionAr: 'وسائل عد وحساب تفاعلية مبكرة بألوان محفزة وخامات قماشية آمنة',
    descriptionEn: 'Innovative interactive counting and math aids in motivating colors, made from safe fabric materials.',
    color: '#FF8A3D',
    bgColor: 'rgba(255, 138, 61, 0.15)',
    textColor: '#9A4600',
    icon: 'Hash',
  },
  {
    id: 'flash-cards',
    slug: 'flash-cards',
    name: 'بطاقات تعليمية',
    nameAr: 'بطاقات تعليمية',
    nameEn: 'Flash Cards',
    description: 'بطاقات مغلفة مقواة بأركان دائرية آمنة للمفردات والمفاهيم اليومية',
    descriptionAr: 'بطاقات مغلفة مقواة بأركان دائرية آمنة للمفردات والمفاهيم اليومية',
    descriptionEn: 'Laminated, reinforced cards with safe rounded corners for everyday vocabulary and concepts.',
    color: '#FF7EB6',
    bgColor: 'rgba(255, 126, 182, 0.18)',
    textColor: '#B81B60',
    icon: 'Layers',
  },
  {
    id: 'wall-charts',
    slug: 'wall-charts',
    name: 'لوحات حائط',
    nameAr: 'لوحات حائط',
    nameEn: 'Wall Charts',
    description: 'لوحات إرشادية وتفاعلية لجدران غرف الفصول بالحضانات من الجوخ',
    descriptionAr: 'لوحات إرشادية وتفاعلية لجدران غرف الفصول بالحضانات من الجوخ',
    descriptionEn: 'Instructional, interactive wall charts for nursery classroom walls, made from durable felt.',
    color: '#44BE8E',
    bgColor: 'rgba(68, 190, 142, 0.18)',
    textColor: '#1D7753',
    icon: 'LayoutGrid',
  },
  {
    id: 'classroom-decor',
    slug: 'classroom-decor',
    name: 'زينة الفصول',
    nameAr: 'زينة الفصول',
    nameEn: 'Classroom Decor',
    description: 'مجسمات وزينة قماشية مرحبة لبيئة تعليمية مبهجة ومنظمة',
    descriptionAr: 'مجسمات وزينة قماشية مرحبة لبيئة تعليمية مبهجة ومنظمة',
    descriptionEn: 'Welcoming fabric figures and classroom decor for a cheerful and organized learning environment.',
    color: '#FFD23F',
    bgColor: 'rgba(255, 210, 63, 0.22)',
    textColor: '#8C6C00',
    icon: 'Sparkles',
  },
  {
    id: 'activity-kits',
    slug: 'activity-kits',
    name: 'حقائب الأنشطة',
    nameAr: 'حقائب الأنشطة',
    nameEn: 'Activity Kits',
    description: 'حقائب قماشية متكاملة للأنشطة الصفية والمهارات الحركية الدقيقة',
    descriptionAr: 'حقائب قماشية متكاملة للأنشطة الصفية والمهارات الحركية الدقيقة',
    descriptionEn: 'Comprehensive fabric kits for classroom activities and fine motor skills development.',
    color: '#9C27B0',
    bgColor: 'rgba(156, 39, 176, 0.15)',
    textColor: '#6A1B9A',
    icon: 'Briefcase',
  },
]

// حالات الطلبات
export const ORDER_STATUS = {
  pending_payment: {
    key: 'pending_payment',
    label: 'بانتظار تأكيد الدفع',
    labelEn: 'Pending Payment',
    color: 'amber',
    bgLight: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300',
  },
  payment_confirmed: {
    key: 'payment_confirmed',
    label: 'تم تأكيد الدفع',
    labelEn: 'Payment Confirmed',
    color: 'sky',
    bgLight: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border-sky-300',
  },
  preparing: {
    key: 'preparing',
    label: 'جاري التجهيز',
    labelEn: 'Preparing',
    color: 'orange',
    bgLight: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 border-orange-300',
  },
  shipped: {
    key: 'shipped',
    label: 'تم الشحن',
    labelEn: 'Shipped',
    color: 'mint',
    bgLight: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300',
  },
  delivered: {
    key: 'delivered',
    label: 'تم التسليم',
    labelEn: 'Delivered',
    color: 'emerald',
    bgLight: 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border-teal-300',
  },
  payment_rejected: {
    key: 'payment_rejected',
    label: 'مرفوض',
    labelEn: 'Payment Rejected',
    color: 'red',
    bgLight: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300',
  },
  cancelled: {
    key: 'cancelled',
    label: 'ملغي',
    labelEn: 'Cancelled',
    color: 'gray',
    bgLight: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-300',
  },
}

// المراحل التعليمية للحضانات ورياض الأطفال
export const STAGES = [
  { id: 'nursery', label: 'حضانة', labelEn: 'Nursery' },
  { id: 'kg1', label: 'KG1', labelEn: 'KG1' },
  { id: 'kg2', label: 'KG2', labelEn: 'KG2' },
  { id: 'primary', label: 'مرحلة ابتدائية', labelEn: 'Early Primary' },
]

export const GOVERNORATE_NAMES = {
  'القاهرة': { ar: 'القاهرة', en: 'Cairo' },
  'الجيزة': { ar: 'الجيزة', en: 'Giza' },
  'الإسكندرية': { ar: 'الإسكندرية', en: 'Alexandria' },
  'القليوبية': { ar: 'القليوبية', en: 'Qalyubia' },
  'الشرقية': { ar: 'الشرقية', en: 'Sharqia' },
  'الغربية': { ar: 'الغربية', en: 'Gharbia' },
  'الدقهلية': { ar: 'الدقهلية', en: 'Dakahlia' },
  'المنوفية': { ar: 'المنوفية', en: 'Monufia' },
  'كفر الشيخ': { ar: 'كفر الشيخ', en: 'Kafr El Sheikh' },
  'دمياط': { ar: 'دمياط', en: 'Damietta' },
  'بورسعيد': { ar: 'بورسعيد', en: 'Port Said' },
  'الإسماعيلية': { ar: 'الإسماعيلية', en: 'Ismailia' },
  'السويس': { ar: 'السويس', en: 'Suez' },
  'البحيرة': { ar: 'البحيرة', en: 'Beheira' },
  'الفيوم': { ar: 'الفيوم', en: 'Faiyum' },
  'بني سويف': { ar: 'بني سويف', en: 'Beni Suef' },
  'المنيا': { ar: 'المنيا', en: 'Minya' },
  'أسيوط': { ar: 'أسيوط', en: 'Asyut' },
  'سوهاج': { ar: 'سوهاج', en: 'Sohag' },
  'قنا': { ar: 'قنا', en: 'Qena' },
  'الأقصر': { ar: 'الأقصر', en: 'Luxor' },
  'أسوان': { ar: 'أسوان', en: 'Aswan' },
  'البحر الأحمر': { ar: 'البحر الأحمر', en: 'Red Sea' },
  'الوادي الجديد': { ar: 'الوادي الجديد', en: 'New Valley' },
  'مطروح': { ar: 'مطروح', en: 'Matrouh' },
  'شمال سيناء': { ar: 'شمال سيناء', en: 'North Sinai' },
  'جنوب سيناء': { ar: 'جنوب سيناء', en: 'South Sinai' },
}

// المحافظات المصرية ومناطق الشحن بالأسعار
export const SHIPPING_ZONES = [
  {
    id: 'greater_cairo',
    name: 'القاهرة الكبرى',
    nameAr: 'القاهرة الكبرى',
    nameEn: 'Greater Cairo',
    rate: 40,
    governorates: ['القاهرة'],
  },
  {
    id: 'giza',
    name: 'الجيزة',
    nameAr: 'الجيزة',
    nameEn: 'Giza',
    rate: 45,
    governorates: ['الجيزة'],
  },
  {
    id: 'alexandria',
    name: 'الإسكندرية',
    nameAr: 'الإسكندرية',
    nameEn: 'Alexandria',
    rate: 50,
    governorates: ['الإسكندرية'],
  },
  {
    id: 'delta_canal',
    name: 'الدلتا والقناة',
    nameAr: 'الدلتا والقناة',
    nameEn: 'Delta & Canal',
    rate: 55,
    governorates: [
      'القليوبية',
      'الشرقية',
      'الغربية',
      'الدقهلية',
      'المنوفية',
      'كفر الشيخ',
      'دمياط',
      'بورسعيد',
      'الإسماعيلية',
      'السويس',
      'البحيرة',
    ],
  },
  {
    id: 'upper_egypt',
    name: 'الصعيد والوادي الجديد',
    nameAr: 'الصعيد والوادي الجديد',
    nameEn: 'Upper Egypt & Frontiers',
    rate: 65,
    governorates: [
      'الفيوم',
      'بني سويف',
      'المنيا',
      'أسيوط',
      'سوهاج',
      'قنا',
      'الأقصر',
      'أسوان',
      'البحر الأحمر',
      'الوادي الجديد',
      'مطروح',
      'شمال سيناء',
      'جنوب سيناء',
    ],
  },
]

// قائمة مسطحة لجميع المحافظات مع سعر الشحن الخاص بها
export const GOVERNORATES = SHIPPING_ZONES.flatMap((zone) =>
  zone.governorates.map((gov) => ({
    name: gov,
    nameAr: gov,
    nameEn: GOVERNORATE_NAMES[gov]?.en || gov,
    zoneId: zone.id,
    zoneName: zone.name,
    zoneNameAr: zone.nameAr,
    zoneNameEn: zone.nameEn,
    shippingRate: zone.rate,
  }))
)

export function getGovernorateName(gov, lang = 'ar') {
  if (!gov) return ''
  if (typeof gov === 'object') {
    return lang === 'en' ? (gov.nameEn || gov.en || gov.name) : (gov.nameAr || gov.ar || gov.name)
  }
  return lang === 'en' ? (GOVERNORATE_NAMES[gov]?.en || gov) : (GOVERNORATE_NAMES[gov]?.ar || gov)
}

// أسباب رفض إيصال فودافون كاش
export const REJECT_REASONS = [
  { id: 'amount_mismatch', ar: 'المبلغ غير مطابق', en: 'Amount does not match' },
  { id: 'receipt_unclear', ar: 'الإيصال غير واضح', en: 'Receipt image unclear' },
  { id: 'wallet_incorrect', ar: 'رقم المحفظة غير صحيح', en: 'Invalid wallet number' },
  { id: 'other', ar: 'أخرى', en: 'Other reason' },
]

// ثوابت المنصة العامة الأساسية
export const PLATFORM_CONFIG = {
  NAME_AR: 'أيدي صغيرة',
  NAME_EN: 'Little Hands',
  TAGLINE_AR: 'وسائل تعليمية يدوية لرياض الأطفال والحضانات',
  TAGLINE_EN: 'Handmade Educational Teaching Aids for Nurseries',
  FOOTER_COPYRIGHT: 'أيدي صغيرة — وسائل تعليمية يدوية لرياض الأطفال والحضانات © 2026',
  COMMISSION_RATE: 0.20, // عمولة المنصة 20% تظهر للبائعات والإدارة فقط
  ARABIC_DIGITS: false, // الأرقام لاتينية (0-9) دائماً لمنع ظهور الصفر كنقطة
  VODAFONE_CASH_WALLET: '', // رقم محفظة فودافون كاش الرسمية (يُضبط حصراً عبر إعدادات المنصة)
  DISABLED_GATEWAY_NOTE: 'الدفع الإلكتروني التلقائي — قريباً',
  CURRENCY_AR: 'ج.م',
  CURRENCY_EN: 'EGP',
  PHONE_FORMAT_HINT: '01XXXXXXXXX',
}

