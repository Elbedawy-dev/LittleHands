/**
 * Notifications DTO Mapper
 * Shapes notification objects for API responses with role isolation and localization.
 */

export function toNotificationDTO(notif, lang = 'ar') {
  if (!notif) return null
  const n = notif.toObject ? notif.toObject() : { ...notif }
  const isEn = lang && lang.toLowerCase().startsWith('en')

  let title = n.title || ''
  let text = n.message || ''

  // 1. Check if raw bilingual objects were saved in params
  if (n.params?.rawTitle && typeof n.params.rawTitle === 'object') {
    title = isEn ? (n.params.rawTitle.en || n.params.rawTitle.ar) : (n.params.rawTitle.ar || n.params.rawTitle.en)
  }
  if (n.params?.rawMessage && typeof n.params.rawMessage === 'object') {
    text = isEn ? (n.params.rawMessage.en || n.params.rawMessage.ar) : (n.params.rawMessage.ar || n.params.rawMessage.en)
  }

  // 2. Interpolate params into text if placeholders exist (e.g. {{orderNumber}})
  if (n.params && typeof text === 'string') {
    for (const [key, val] of Object.entries(n.params)) {
      if (typeof val === 'string' || typeof val === 'number') {
        text = text.replace(new RegExp(`{{${key}}}`, 'g'), String(val))
        title = title.replace(new RegExp(`{{${key}}}`, 'g'), String(val))
      }
    }
  }

  return {
    id: n.id || n._id?.toString(),
    type: n.type,
    title,
    text,
    message: text,
    link: n.link || '',
    read: Boolean(n.read),
    createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
  }
}

export default toNotificationDTO
