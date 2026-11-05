/**
 * Initial mock data for Little Hands educational marketplace
 * البيانات التجريبية الأولية الخالية تماماً من البيانات الوهمية
 */

export const INITIAL_USERS = [
  {
    id: 'usr_admin',
    name: 'Admin',
    email: 'admin@test.com',
    role: 'admin',
    createdAt: '2026-07-01T00:00:00Z',
  },
  {
    id: 'seller_1',
    name: { ar: 'البائعة الأولى', en: 'First Seller' },
    nameEn: 'First Seller',
    city: { ar: 'القاهرة', en: 'Cairo' },
    governorate: 'القاهرة',
    email: 'seller1@test.com',
    role: 'seller',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'seller_2',
    name: { ar: 'البائعة الثانية', en: 'Second Seller' },
    nameEn: 'Second Seller',
    city: { ar: 'الإسكندرية', en: 'Alexandria' },
    governorate: 'الإسكندرية',
    email: 'seller2@test.com',
    role: 'seller',
    createdAt: '2026-08-05T11:00:00Z',
  },
]

export const INITIAL_PRODUCTS = []

export const INITIAL_ORDERS = []

export const INITIAL_PAYOUTS = []

export const INITIAL_NOTIFICATIONS = []

export const INITIAL_SETTINGS = {
  commissionRate: 0.20, // 20%
  platformWallet: '', // محفظة فودافون كاش فارغة افتراضياً وتُضبط من لوحة الإدارة
  supportPhone: '',
  supportEmail: '',
  whatsappNumber: '',
  payoutScheduleText: '',
  maintenanceMode: false,
  shippingRates: {
    greater_cairo: 40,
    giza: 45,
    alexandria: 50,
    delta_canal: 55,
    upper_egypt: 65,
  },
}
