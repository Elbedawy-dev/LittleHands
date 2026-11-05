import { Setting } from '../../db/models/Setting.js'
import { AuditLog } from '../../db/models/AuditLog.js'
import { SHIPPING_ZONES, EGYPTIAN_GOVERNORATES } from '../../config/constants.js'
import { AppError } from '../../utils/appError.js'
import { mapSettingsDTO, toPublicSettingsDTO, toAdminSettingsDTO } from './dto.js'

/**
 * Ensures platform settings singleton document exists.
 */
async function getOrCreateSettings() {
  let setting = await Setting.findOne({ singletonKey: 'platform_settings' })
  if (!setting) {
    setting = await Setting.create({
      singletonKey: 'platform_settings',
      commissionRate: 0.20,
      platformWallet: '',
      shippingRates: SHIPPING_ZONES,
      deliveryTimeText: {
        ar: 'التوصيل خلال ٢-٤ أيام عمل',
        en: 'Delivery within 2-4 business days',
      },
      supportPhone: '',
      supportEmail: '',
      whatsappNumber: '',
      payoutScheduleText: '',
      maintenanceMode: false,
      notifications: {
        orderCreated: true,
        paymentSubmitted: true,
        payoutRecorded: true,
      },
    })
  } else if (!setting.shippingRates || setting.shippingRates.length === 0) {
    setting.shippingRates = SHIPPING_ZONES
    await setting.save()
  }
  return setting
}

export const settingsService = {
  /**
   * Retrieves settings according to caller role.
   */
  async getSettings(role = 'public') {
    const setting = await getOrCreateSettings()
    return mapSettingsDTO(setting, role)
  },

  /**
   * Retrieves public settings strictly omitting commission rate.
   */
  async getPublicSettings() {
    const setting = await getOrCreateSettings()
    return toPublicSettingsDTO(setting)
  },

  /**
   * Retrieves public shipping rates.
   */
  async getShippingRates() {
    const setting = await getOrCreateSettings()
    return setting.shippingRates || SHIPPING_ZONES
  },

  /**
   * Updates platform settings with audit log.
   */
  async updateSettings(values, { actorId, ip } = {}) {
    const setting = await getOrCreateSettings()
    const before = setting.toObject()

    if (values.commissionRate !== undefined) {
      const rate = Number(values.commissionRate)
      // If given as percentage (e.g. 20 for 20%), convert to decimal 0.20
      setting.commissionRate = rate > 1 ? Number((rate / 100).toFixed(4)) : rate
    }

    if (values.platformWallet !== undefined) {
      setting.platformWallet = values.platformWallet
    }

    if (values.supportPhone !== undefined) {
      setting.supportPhone = values.supportPhone
    }

    if (values.supportEmail !== undefined) {
      setting.supportEmail = values.supportEmail
    }

    if (values.whatsappNumber !== undefined) {
      setting.whatsappNumber = values.whatsappNumber
    }

    if (values.payoutScheduleText !== undefined) {
      setting.payoutScheduleText = values.payoutScheduleText
    }

    if (values.deliveryTimeText !== undefined) {
      setting.deliveryTimeText = values.deliveryTimeText
    }

    if (values.maintenanceMode !== undefined) {
      setting.maintenanceMode = !!values.maintenanceMode
    }

    if (values.notifications !== undefined) {
      setting.notifications = {
        ...setting.notifications,
        ...values.notifications,
      }
    }

    if (values.shippingRates !== undefined) {
      if (Array.isArray(values.shippingRates)) {
        setting.shippingRates = values.shippingRates
      }
    }

    await setting.save()
    const after = setting.toObject()

    // Audit Log
    await AuditLog.create({
      actorId: actorId || null,
      action: 'SETTINGS_UPDATED',
      entityType: 'Setting',
      entityId: setting.id || setting._id.toString(),
      meta: {
        before: {
          commissionRate: before.commissionRate,
          platformWallet: before.platformWallet,
          supportPhone: before.supportPhone,
          supportEmail: before.supportEmail,
          whatsappNumber: before.whatsappNumber,
          maintenanceMode: before.maintenanceMode,
        },
        after: {
          commissionRate: after.commissionRate,
          platformWallet: after.platformWallet,
          supportPhone: after.supportPhone,
          supportEmail: after.supportEmail,
          whatsappNumber: after.whatsappNumber,
          maintenanceMode: after.maintenanceMode,
        },
      },
      ip: ip || '',
    })

    return toAdminSettingsDTO(setting)
  },

  /**
   * Updates shipping rates with partition validation & audit log.
   * Requirement: price >= 0, every governorate in exactly one zone.
   */
  async updateShippingRates(input, { actorId, ip } = {}) {
    const setting = await getOrCreateSettings()
    const before = setting.toObject()

    let newZones = []

    if (Array.isArray(input)) {
      newZones = input
    } else if (input && Array.isArray(input.zones)) {
      newZones = input.zones
    } else if (input && typeof input === 'object') {
      // Map format: { greater_cairo: 45, giza: 50, ... }
      const currentRates = setting.shippingRates?.length ? setting.shippingRates : SHIPPING_ZONES
      newZones = currentRates.map((zoneObj) => {
        const zoneKey = zoneObj.zone || zoneObj.id
        const updatedPrice = input[zoneKey] !== undefined ? Number(input[zoneKey]) : zoneObj.price
        return {
          zone: zoneKey,
          price: updatedPrice,
          governorates: zoneObj.governorates,
        }
      })
    } else {
      throw new AppError('INVALID_SHIPPING_RATES_FORMAT', 400, 'صيغة أسعار الشحن غير صالحة')
    }

    // Validate prices >= 0
    for (const z of newZones) {
      if (z.price === undefined || z.price === null || isNaN(z.price) || Number(z.price) < 0) {
        throw new AppError('INVALID_SHIPPING_PRICE', 400, `سعر الشحن للمنطقة (${z.zone}) غير صالح`)
      }
    }

    // Validate governorates: every governorate in exactly one zone
    const seenGovs = new Set()
    for (const z of newZones) {
      if (!Array.isArray(z.governorates) || z.governorates.length === 0) {
        throw new AppError('EMPTY_ZONE_GOVERNORATES', 400, `المنطقة (${z.zone}) يجب أن تحتوي على محافظة واحدة على الأقل`)
      }
      for (const gov of z.governorates) {
        if (seenGovs.has(gov)) {
          throw new AppError(
            'DUPLICATE_GOVERNORATE_ZONE',
            400,
            `المحافظة (${gov}) مكررة في أكثر من منطقة شحن`
          )
        }
        seenGovs.add(gov)
      }
    }

    const missingGovs = EGYPTIAN_GOVERNORATES.filter((gov) => !seenGovs.has(gov))
    if (missingGovs.length > 0) {
      throw new AppError(
        'MISSING_GOVERNORATES',
        400,
        `مناطق الشحن تنقصها المحافظات التالية: ${missingGovs.join('، ')}`
      )
    }

    setting.shippingRates = newZones
    await setting.save()

    // Audit Log
    await AuditLog.create({
      actorId: actorId || null,
      action: 'SHIPPING_RATES_UPDATED',
      entityType: 'Setting',
      entityId: setting.id || setting._id.toString(),
      meta: {
        before: before.shippingRates,
        after: setting.shippingRates,
      },
      ip: ip || '',
    })

    return setting.shippingRates
  },
}

export default settingsService
