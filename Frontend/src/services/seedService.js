import { db } from '../mocks/db'
import { contactService } from './contactService'
import { earningsService } from './earningsService'
import { orderService } from './orderService'
import { productService } from './productService'

/**
 * دالة بذر البيانات التجريبية الشاملة عبر الخدمات الرسمية
 * Seed comprehensive test dataset strictly through application services
 */
export async function seedComprehensiveDataset() {
  db.reset()

  // 1. Create 4 bilingual products across different categories
  const p1 = await productService.createProduct({
    name: {
      ar: 'لوحة الحروف الأبجدية التفاعلية بالجوخ',
      en: 'Interactive Arabic Alphabet Felt Board',
    },
    nameEn: 'Interactive Arabic Alphabet Felt Board',
    categoryId: 'alphabet-boards',
    sellerId: 'seller_1',
    price: 180,
    description: {
      ar: 'لوحة جدارية تعليمية مصنوعة يدوياً من الجوخ لتعليم الحروف لرياض الأطفال.',
      en: 'Handmade interactive felt wall board for early childhood alphabet learning.',
    },
    stages: ['nursery', 'kg1'],
    materials: ['felt'],
    images: ['/products/alphabet-board.jpg'],
    inStock: true,
    stockCount: 15,
    isPublished: true,
    isFeatured: true,
  })

  const p2 = await productService.createProduct({
    name: {
      ar: 'بطاقات الأرقام والمعدود المصورة بالورق المقوى',
      en: 'Illustrated Flash Cards for Numbers',
    },
    nameEn: 'Illustrated Flash Cards for Numbers',
    categoryId: 'number-boards',
    sellerId: 'seller_2',
    price: 120,
    description: {
      ar: 'مجموعة بطاقات تعليمية مقواة ومغلفة حرارياً لتعليم الأرقام والعد.',
      en: 'Laminated cardstock flash cards set for teaching numbers and counting.',
    },
    stages: ['kg1', 'kg2'],
    materials: ['cardstock'],
    images: ['/products/numbers-card.jpg'],
    inStock: true,
    stockCount: 20,
    isPublished: true,
    isFeatured: true,
  })

  const p3 = await productService.createProduct({
    name: {
      ar: 'حقيبة أنشطة المهارات الحركية بالقماش',
      en: 'Fabric Activity Kit for Motor Skills',
    },
    nameEn: 'Fabric Activity Kit for Motor Skills',
    categoryId: 'activity-kits',
    sellerId: 'seller_1',
    price: 240,
    description: {
      ar: 'حقيبة تعليمية قماشية تتضمن أزرار وسحابات وأربطة لتنمية المهارات الدقيقة.',
      en: 'Fabric activity kit including buttons, zippers, and laces for fine motor skills.',
    },
    stages: ['nursery', 'kg1'],
    materials: ['fabric'],
    images: ['/products/activity-kit.jpg'],
    inStock: true,
    stockCount: 10,
    isPublished: true,
    isFeatured: false,
  })

  const p4 = await productService.createProduct({
    name: {
      ar: 'لوحة الطقس والفصول بالجوخ',
      en: 'Weather and Seasons Felt Wall Chart',
    },
    nameEn: 'Weather and Seasons Felt Wall Chart',
    categoryId: 'wall-charts',
    sellerId: 'seller_2',
    price: 160,
    description: {
      ar: 'لوحة تفاعلية بالجوخ لمتابعة حالة الطقس وفصول السنة في الطابور وحلقة الصباح.',
      en: 'Interactive felt chart for tracking daily weather and seasons during morning circle.',
    },
    stages: ['kg1', 'kg2'],
    materials: ['felt'],
    images: ['/products/weather-board.jpg'],
    inStock: true,
    stockCount: 8,
    isPublished: true,
    isFeatured: true,
  })

  // 2. Add customer user
  if (!db.data.users.find((u) => u.id === 'usr_cust_1')) {
    db.data.users.push({
      id: 'usr_cust_1',
      name: 'سارة محمد',
      email: 'sarah@nursery.eg',
      phone: '01033333333',
      role: 'customer',
      nurseryName: 'روضة براعم الأمل',
      governorate: 'القاهرة',
      city: 'مدينة نصر',
      address: 'شارع مكرم عبيد، مبنى 15',
      createdAt: '2026-09-01T00:00:00Z',
    })
  }

  // 3. Create at least 1 customer order with real items
  const o1 = await orderService.createOrder({
    items: [
      {
        productId: p1.id,
        name: p1.name,
        qty: 2,
        unitPrice: 180,
        sellerId: 'seller_1',
        image: p1.images[0],
      },
    ],
    delivery: {
      name: 'سارة محمد',
      phone: '01033333333',
      governorate: 'القاهرة',
      city: 'مدينة نصر',
      address: 'شارع مكرم عبيد، مبنى 15',
      nurseryName: 'روضة براعم الأمل',
    },
    notes: 'يرجى التوصيل خلال الدوام الصباحي',
  })

  // 4. Submit payment receipt in admin queue
  await orderService.submitPayment(o1.id, {
    senderPhone: '01033333333',
    reference: 'VF98765432',
    transferredAmount: o1.total,
    screenshotFile: '/receipts/sample.jpg',
  })

  // 5. Create at least 1 payout in seller/admin history
  await earningsService.recordPayout({
    sellerId: 'seller_1',
    amount: 288,
    reference: 'VF_PAY_001',
    date: '2026-09-20',
    notes: 'تحويل أرباح طلبات الأسبوع',
  })

  // 6. Create at least 1 nursery custom request in admin queue
  await contactService.sendCustomRequest({
    name: 'مها علي',
    phone: '01044444444',
    nurseryName: 'حضانة النور',
    details: 'تفصيل 10 لوحات حروف بالجوخ مع تطريز اسم الحضانة',
  })

  // Add default favorite & address for customer testing
  db.data.favorites['usr_cust_1'] = [p1.id]
  db.data.addresses['usr_cust_1'] = [
    {
      id: 'addr_1',
      name: 'سارة محمد',
      phone: '01033333333',
      governorate: 'القاهرة',
      city: 'مدينة نصر',
      address: 'شارع مكرم عبيد، مبنى 15',
      nurseryName: 'روضة براعم الأمل',
      isDefault: true,
    },
  ]

  db.save()
  return { p1, p2, p3, p4, o1 }
}
