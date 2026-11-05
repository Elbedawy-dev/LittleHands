import { env } from '../config/env.js'
import { connectDB, disconnectDB } from '../db/connection.js'
import { Category } from '../db/models/Category.js'
import { Setting } from '../db/models/Setting.js'
import { CATEGORIES, SHIPPING_ZONES, DEFAULT_COMMISSION_RATE } from '../config/constants.js'

export async function seedBase() {
  console.info('[SEED_BASE] Connecting to database...')
  await connectDB(env.MONGODB_URI)

  console.info(`[SEED_BASE] Seeding ${CATEGORIES.length} categories...`)
  for (const cat of CATEGORIES) {
    await Category.findOneAndUpdate(
      { slug: cat.slug },
      {
        $set: {
          slug: cat.slug,
          nameAr: cat.nameAr,
          nameEn: cat.nameEn,
          descriptionAr: cat.descriptionAr,
          descriptionEn: cat.descriptionEn,
          color: cat.color,
          bgColor: cat.bgColor,
          textColor: cat.textColor,
          icon: cat.icon,
          order: cat.order,
        },
      },
      { upsert: true, new: true }
    )
  }
  console.info('[SEED_BASE] Categories seeded successfully.')

  console.info('[SEED_BASE] Seeding default Platform Settings...')
  await Setting.findOneAndUpdate(
    { singletonKey: 'platform_settings' },
    {
      $setOnInsert: {
        singletonKey: 'platform_settings',
        commissionRate: DEFAULT_COMMISSION_RATE,
        platformWallet: '',
        supportPhone: '',
        supportEmail: '',
        whatsappNumber: '',
        payoutScheduleText: 'تحويل الأرباح للبائعات يوم الخميس من كل أسبوع عبر فودافون كاش',
        maintenanceMode: false,
        shippingRates: SHIPPING_ZONES,
        deliveryTimeText: {
          ar: 'التوصيل خلال ٢-٤ أيام عمل',
          en: 'Delivery within 2-4 business days',
        },
        notifications: {
          orderCreated: true,
          paymentSubmitted: true,
          payoutRecorded: true,
        },
      },
    },
    { upsert: true, new: true }
  )
  console.info('[SEED_BASE] Platform Settings seeded successfully.')
}

// If invoked directly from CLI
if (process.argv[1]?.endsWith('seedBase.js')) {
  seedBase()
    .then(async () => {
      console.info('[SEED_BASE] Base seed completed successfully.')
      await disconnectDB()
      process.exit(0)
    })
    .catch(async (error) => {
      console.error('[SEED_BASE] Error running base seed:', error)
      await disconnectDB()
      process.exit(1)
    })
}

export default seedBase

