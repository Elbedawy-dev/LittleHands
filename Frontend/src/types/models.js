/**
 * @file models.js
 * JSDoc typedefs for all core models in the "Little Hands" marketplace.
 * توثيق هياكل البيانات الخاصة بمنصة أيدي صغيرة
 */

/**
 * @typedef {'customer' | 'seller' | 'admin'} UserRole
 */

/**
 * @typedef {Object} User
 * @property {string} id - Unique identifier (e.g. 'usr_1')
 * @property {string} name - Display name (e.g. 'أميرة أحمد')
 * @property {string} email - Unique email
 * @property {string} phone - Egyptian mobile format 01XXXXXXXXX
 * @property {UserRole} role - User role
 * @property {string} [avatar] - Optional avatar URL or initial
 * @property {string} [nurseryName] - Optional nursery/kindergarten name
 * @property {string} createdAt - ISO string
 */

/**
 * @typedef {'nursery' | 'kg1' | 'kg2' | 'primary'} EducationalStage
 */

/**
 * @typedef {'felt' | 'paper' | 'fabric'} MaterialType
 */

/**
 * @typedef {Object} LocalizedString
 * @property {string} ar - Arabic content
 * @property {string} en - English content
 */

/**
 * @typedef {Object} ProductDetails
 * @property {LocalizedString} material - Material specification
 * @property {LocalizedString} size - Physical dimensions
 * @property {LocalizedString} [usage] - Classroom usage instructions
 * @property {LocalizedString} [care] - Care and storage tips
 */

/**
 * @typedef {Object} Product
 * @property {string} id - Unique identifier (e.g. 'prod_1')
 * @property {LocalizedString|string} name - Localized product name {ar, en}
 * @property {string} [nameEn] - English product name (legacy compatibility)
 * @property {string} slug - URL slug
 * @property {string} categoryId - Slug matching CATEGORIES (alphabet-boards, etc.)
 * @property {string} sellerId - Seller identifier
 * @property {LocalizedString|string} [sellerName] - Seller display name
 * @property {number} price - Retail price in EGP
 * @property {LocalizedString|string} description - Localized detailed educational description {ar, en}
 * @property {ProductDetails} [details] - Detailed specifications {material, size, usage, care}
 * @property {EducationalStage[]} stages - Target educational stages
 * @property {string[]} materials - Educational materials (felt, cardstock, fabric, canson, nasbian, etc.)
 * @property {string[]} images - Image paths or placeholder identifiers
 * @property {boolean} inStock - Stock availability flag
 * @property {number} stockCount - Current quantity available
 * @property {boolean} isPublished - Published flag
 * @property {boolean} isFeatured - Displayed on home showcase
 * @property {string} createdAt - ISO string
 */

/**
 * @typedef {'pending' | 'confirmed' | 'rejected'} PaymentStatus
 */

/**
 * @typedef {Object} Payment
 * @property {string} senderPhone - Egyptian mobile phone of sender (01XXXXXXXXX)
 * @property {string} reference - Vodafone cash transfer reference or transaction code
 * @property {number} transferredAmount - Amount sent by customer in EGP
 * @property {string} screenshotUrl - Image receipt proof or data URL
 * @property {PaymentStatus} status - Verification status
 * @property {string} [rejectReason] - Reason selected by admin upon rejection
 * @property {string} [rejectNotes] - Additional feedback notes by admin
 * @property {string} submittedAt - ISO string of payment submission
 * @property {string} [reviewedAt] - ISO string when admin verified
 */

/**
 * @typedef {Object} OrderTimelineEntry
 * @property {string} status - Key matching ORDER_STATUS
 * @property {string} title - Human-readable Arabic status title
 * @property {string} [description] - Detailed note for the transition
 * @property {string} timestamp - ISO string
 */

/**
 * @typedef {Object} OrderItem
 * @property {string} productId - Product ID
 * @property {LocalizedString|string} name - Snapshot product name {ar, en}
 * @property {number} qty - Quantity ordered
 * @property {number} unitPrice - Price per unit in EGP
 * @property {string} sellerId - Seller unique identifier
 * @property {string} [image] - Primary image URL or placeholder
 */

/**
 * @typedef {Object} DeliveryAddress
 * @property {string} name - Recipient name / Teacher or Nursery supervisor
 * @property {string} phone - Egyptian mobile format 01XXXXXXXXX
 * @property {string} governorate - Egyptian governorate
 * @property {string} city - District or city
 * @property {string} address - Detailed building and street address
 * @property {string} [nurseryName] - Nursery / School name if applicable
 */

/**
 * @typedef {'pending_payment' | 'payment_confirmed' | 'preparing' | 'shipped' | 'delivered' | 'payment_rejected'} OrderStatusKey
 */

/**
 * @typedef {Object} Order
 * @property {string} id - Internal identifier (e.g. 'ord_101')
 * @property {string} number - Public order number (format 'LH-2026-###')
 * @property {string} customerId - Customer identifier
 * @property {OrderItem[]} items - List of ordered teaching aids
 * @property {DeliveryAddress} delivery - Delivery information
 * @property {number} subtotal - Items subtotal in EGP
 * @property {number} shipping - Shipping cost based on governorate zone
 * @property {number} total - Final total charged to customer
 * @property {OrderStatusKey} status - Current order status
 * @property {Payment|null} payment - Attached Vodafone Cash proof details
 * @property {OrderTimelineEntry[]} timeline - Historical event list
 * @property {string} [notes] - Customer special instructions
 * @property {string} createdAt - ISO string
 * @property {string} updatedAt - ISO string
 */

/**
 * @typedef {Object} SellerEarningsSummary
 * @property {string} sellerId - Seller unique identifier
 * @property {string} sellerName - 'البائعة الأولى' or 'البائعة الثانية'
 * @property {number} grossSales - Total sales amount
 * @property {number} platformCommission - 20% platform share
 * @property {number} netEarnings - 80% seller share
 * @property {number} paidOut - Total transferred to seller
 * @property {number} pendingBalance - Balance awaiting transfer
 */

/**
 * @typedef {Object} Payout
 * @property {string} id - Payout transaction ID
 * @property {string} sellerId - Seller identifier
 * @property {number} amount - Amount transferred in EGP
 * @property {string} reference - Vodafone cash transfer reference
 * @property {string} date - ISO string or date
 * @property {string} notes - Transfer note
 */

/**
 * @typedef {Object} Notification
 * @property {string} id - Notification ID
 * @property {UserRole} role - Target audience ('customer' | 'seller' | 'admin')
 * @property {string} [userId] - Specific user ID or null for role broadcast
 * @property {string} title - Arabic title
 * @property {string} message - Arabic body text
 * @property {string} type - Notification category (order, payment, system)
 * @property {string} [link] - Destination router path
 * @property {boolean} read - Read status
 * @property {string} createdAt - ISO timestamp
 */

/**
 * @typedef {Object} PlatformSettings
 * @property {number} commissionRate - Platform cut (0.20)
 * @property {string} platformWallet - Official Vodafone Cash mobile number
 * @property {boolean} maintenanceMode - Maintenance toggle
 * @property {Record<string, number>} shippingRates - Zone rates in EGP
 * @property {string} [supportPhone] - Platform customer support phone number
 * @property {string} [supportEmail] - Platform official support email
 * @property {string} [whatsappNumber] - Platform WhatsApp contact number
 * @property {string} [payoutScheduleText] - Seller payout schedule description
 */

export {}

