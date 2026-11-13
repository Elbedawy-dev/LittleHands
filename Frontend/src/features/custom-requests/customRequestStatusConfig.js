export const CUSTOM_REQUEST_STATUS_CONFIG = {
  new: {
    label: 'طلب جديد',
    labelAr: 'طلب جديد',
    labelEn: 'New',
    variant: 'danger',
  },
  pending: {
    label: 'قيد المتابعة',
    labelAr: 'قيد المتابعة',
    labelEn: 'Pending',
    variant: 'warning',
  },
  contacted: {
    label: 'تم التواصل',
    labelAr: 'تم التواصل',
    labelEn: 'Contacted',
    variant: 'info',
  },
  closed: {
    label: 'مكتمل / مغلق',
    labelAr: 'مكتمل / مغلق',
    labelEn: 'Closed',
    variant: 'success',
  },
}

export const SELLER_STATUS_OPTIONS = [
  { value: 'pending', labelAr: 'قيد المتابعة', labelEn: 'Pending' },
  { value: 'contacted', labelAr: 'تم التواصل', labelEn: 'Contacted' },
  { value: 'closed', labelAr: 'مكتمل / مغلق', labelEn: 'Closed' },
]

export function getCustomRequestStatusLabel(status, isEn) {
  const cfg = CUSTOM_REQUEST_STATUS_CONFIG[status] || CUSTOM_REQUEST_STATUS_CONFIG.new
  return isEn ? cfg.labelEn : cfg.labelAr
}

export function getCustomRequestStatusVariant(status) {
  const cfg = CUSTOM_REQUEST_STATUS_CONFIG[status] || CUSTOM_REQUEST_STATUS_CONFIG.new
  return cfg.variant
}

export default CUSTOM_REQUEST_STATUS_CONFIG

