/**
 * Application Constants & Fixed System Dictionaries
 * Little Hands (أيدي صغيرة)
 */

export const CATEGORIES = [
  {
    slug: 'alphabet-boards',
    nameAr: 'لوحات الحروف',
    nameEn: 'Alphabet Boards',
    descriptionAr: 'وسائل تفاعلية يدوية لتعليم نطق ورسم الحروف العربية والإنجليزية بالجوخ والقماش',
    descriptionEn: 'Handmade interactive felt and fabric aids for learning Arabic and English alphabet letters',
    color: '#4DB6FF',
    bgColor: 'rgba(77, 182, 255, 0.15)',
    textColor: '#0B72B9',
    icon: 'BookOpen',
    order: 1,
  },
  {
    slug: 'number-boards',
    nameAr: 'لوحات الأرقام',
    nameEn: 'Number Boards',
    descriptionAr: 'وسائل عد وحساب تفاعلية مبكرة بألوان محفزة وخامات قماشية آمنة',
    descriptionEn: 'Interactive early counting and math aids with vibrant colors and safe fabric materials',
    color: '#FF8A3D',
    bgColor: 'rgba(255, 138, 61, 0.15)',
    textColor: '#9A4600',
    icon: 'Hash',
    order: 2,
  },
  {
    slug: 'flash-cards',
    nameAr: 'بطاقات تعليمية',
    nameEn: 'Flash Cards',
    descriptionAr: 'بطاقات مغلفة مقواة بأركان دائرية آمنة للمفردات والمفاهيم اليومية',
    descriptionEn: 'Laminated cardstock flash cards with rounded safety corners for daily vocabulary and concepts',
    color: '#FF7EB6',
    bgColor: 'rgba(255, 126, 182, 0.18)',
    textColor: '#B81B60',
    icon: 'Layers',
    order: 3,
  },
  {
    slug: 'wall-charts',
    nameAr: 'لوحات حائط',
    nameEn: 'Wall Charts',
    descriptionAr: 'لوحات إرشادية وتفاعلية لجدران غرف الفصول بالحضانات من الجوخ',
    descriptionEn: 'Interactive and informative felt wall charts for kindergarten classroom walls',
    color: '#44BE8E',
    bgColor: 'rgba(68, 190, 142, 0.18)',
    textColor: '#1D7753',
    icon: 'LayoutGrid',
    order: 4,
  },
  {
    slug: 'classroom-decor',
    nameAr: 'زينة الفصول',
    nameEn: 'Classroom Decor',
    descriptionAr: 'مجسمات وزينة قماشية مرحبة لبيئة تعليمية مبهجة ومنظمة',
    descriptionEn: 'Welcoming fabric decor and figures for a cheerful and organized learning environment',
    color: '#FFD23F',
    bgColor: 'rgba(255, 210, 63, 0.22)',
    textColor: '#8C6C00',
    icon: 'Sparkles',
    order: 5,
  },
  {
    slug: 'activity-kits',
    nameAr: 'حقائب الأنشطة',
    nameEn: 'Activity Kits',
    descriptionAr: 'حقائب قماشية متكاملة للأنشطة الصفية والمهارات الحركية الدقيقة',
    descriptionEn: 'Integrated fabric activity kits for classroom exercises and fine motor skills',
    color: '#9C27B0',
    bgColor: 'rgba(156, 39, 176, 0.15)',
    textColor: '#6A1B9A',
    icon: 'Briefcase',
    order: 6,
  },
]

export const SHIPPING_ZONES = [
  {
    zone: 'greater_cairo',
    price: 40,
    governorates: ['القاهرة'],
  },
  {
    zone: 'giza',
    price: 45,
    governorates: ['الجيزة'],
  },
  {
    zone: 'alexandria',
    price: 50,
    governorates: ['الإسكندرية'],
  },
  {
    zone: 'delta_canal',
    price: 55,
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
    zone: 'upper_egypt',
    price: 65,
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

export const EGYPTIAN_GOVERNORATES = SHIPPING_ZONES.flatMap((z) => z.governorates)

export const EGYPTIAN_PHONE_REGEX = /^01[0125]\d{8}$/

export const FORBIDDEN_WORDS = [
  'خشب',
  'مونتيسوري',
  'حسي',
  'ألعاب',
  'toys',
  'wood',
  'Montessori',
  'فيزا',
  'ماستركارد',
  'مدى',
  'ضمان',
]

export const USER_ROLES = ['customer', 'seller', 'admin']

export const ACCOUNT_TYPES = ['parent', 'teacher', 'nursery']

export const EDUCATIONAL_STAGES = ['nursery', 'kg1', 'kg2', 'primary']

export const MATERIAL_TYPES = ['felt', 'paper', 'fabric', 'cardstock']

export const ORDER_STATUSES = [
  'pending_payment',
  'payment_confirmed',
  'preparing',
  'shipped',
  'delivered',
  'payment_rejected',
  'cancelled',
]

export const PAYMENT_STATUSES = ['pending', 'confirmed', 'rejected']

export const REJECT_REASONS = [
  { id: 'amount_mismatch', ar: 'المبلغ غير مطابق', en: 'Amount does not match' },
  { id: 'receipt_unclear', ar: 'الإيصال غير واضح', en: 'Receipt image unclear' },
  { id: 'wallet_incorrect', ar: 'رقم المحفظة غير صحيح', en: 'Invalid wallet number' },
  { id: 'other', ar: 'أخرى', en: 'Other reason' },
]

export const DEFAULT_COMMISSION_RATE = 0.20
export const DEFAULT_SHIPPING_RATE = 40

