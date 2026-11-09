import { Building2, Calendar, Mail, Phone, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Select } from '../../../components/ui/Select'
import { Skeleton } from '../../../components/ui/Skeleton'
import { SHIPPING_ZONES, getGovernorateName } from '../../../config/constants'
import { useFormat } from '../../../hooks/useFormat'

/**
 * جدول وبطاقات قاعدة بيانات العملاء والحضانات (للقراءة فقط)
 */
export function CustomerListTable({
  customers = [],
  loading = false,
  searchQuery = '',
  onSearchChange,
  selectedGovernorate = '',
  onSelectGovernorate,
}) {
  const { t, i18n } = useTranslation('admin-manage')
  const { formatMoney, formatNumber, formatDate } = useFormat()

  // استخراج قائمة المحافظات الفريدة
  const allGovernorates = Array.from(
    new Set(SHIPPING_ZONES.flatMap((zone) => zone.governorates))
  )

  return (
    <div className="space-y-4">
      {/* شريط البحث وتصفية المحافظات */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* حقل البحث */}
        <div className="sm:col-span-8 relative">
          <label htmlFor="admin-customer-search" className="sr-only">
            {t('customers.searchPlaceholder')}
          </label>
          <div className="absolute top-1/2 -translate-y-1/2 start-4 pointer-events-none text-text-muted">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="admin-customer-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('customers.searchPlaceholder')}
            className="w-full h-[52px] ps-11 pe-4 rounded-[16px] bg-surface border-[1.5px] border-surface-border text-text-main text-sm placeholder:text-text-muted/70 outline-none transition-colors focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
          />
        </div>

        {/* تصفية المحافظة */}
        <div className="sm:col-span-4">
          <Select
            aria-label={t('customers.allGovernorates')}
            value={selectedGovernorate}
            onChange={(e) => onSelectGovernorate(e.target.value)}
            placeholder={t('customers.allGovernorates')}
            containerClassName="mb-0"
          >
            {allGovernorates.map((gov) => (
              <option key={gov} value={gov}>
                {getGovernorateName(gov, i18n.language) || gov}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* حالة التحميل */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-[20px]" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          title={t('customers.emptyTitle')}
          description={t('customers.emptyMessage')}
        />
      ) : (
        <div className="w-full">
          {/* عرض الشاشات المتوسطة والكبيرة (جدول منظم) */}
          <div className="hidden lg:block overflow-x-auto overscroll-contain modal-scrollbar rounded-[24px] border border-surface-border bg-surface shadow-soft">
            <table className="w-full text-start border-collapse text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-subtle/60 text-text-muted text-xs font-bold">
                  <th className="py-4 px-4 text-start">{t('customers.table.customer')}</th>
                  <th className="py-4 px-4 text-start">{t('customers.table.type')}</th>
                  <th className="py-4 px-4 text-start">{t('customers.table.phone')}</th>
                  <th className="py-4 px-4 text-start">{t('customers.table.governorate')}</th>
                  <th className="py-4 px-4 text-center">{t('customers.table.ordersCount')}</th>
                  <th className="py-4 px-4 text-start">{t('customers.table.lastOrderDate')}</th>
                  <th className="py-4 px-4 text-end">{t('customers.table.totalSpent')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-surface-subtle/30 transition-colors"
                  >
                    {/* الاسم والبريد */}
                    <td className="py-4 px-4">
                      <div>
                        <span className="font-bold text-text-main block">
                          {c.name}
                        </span>
                        {c.email && (
                          <span
                            dir="ltr"
                            style={{ unicodeBidi: 'isolate' }}
                            className="text-xs text-text-muted font-mono block mt-0.5"
                          >
                            {c.email}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* نوع الجهة والحضانة */}
                    <td className="py-4 px-4">
                      <div>
                        <span className="font-semibold text-xs text-text-main block">
                          {c.nurseryName || t('customers.individualType')}
                        </span>
                        <span className="text-[11px] text-text-muted block mt-0.5">
                          {c.nurseryName ? t('customers.nurseryTypeDefault') : t('customers.individualType')}
                        </span>
                      </div>
                    </td>

                    {/* رقم الهاتف */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        dir="ltr"
                        style={{ unicodeBidi: 'isolate' }}
                        className="font-mono text-xs font-bold text-text-main"
                      >
                        {c.phone}
                      </span>
                    </td>

                    {/* المحافظة */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-subtle text-text-main border border-surface-border/50">
                        {c.governorate ? getGovernorateName(c.governorate, i18n.language) : '—'}
                      </span>
                    </td>

                    {/* عدد الطلبات */}
                    <td className="py-4 px-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-xs font-bold font-mono bg-surface-subtle text-text-main">
                        {formatNumber(c.ordersCount || 0)}
                      </span>
                    </td>

                    {/* تاريخ آخر طلب */}
                    <td className="py-4 px-4 whitespace-nowrap text-xs text-text-muted">
                      {c.lastOrderDate ? (
                        formatDate(c.lastOrderDate)
                      ) : (
                        <span className="text-text-muted/60">{t('customers.noOrdersYet')}</span>
                      )}
                    </td>

                    {/* إجمالي المشتريات */}
                    <td className="py-4 px-4 whitespace-nowrap text-end font-bold text-text-main">
                      {formatMoney(c.totalSpent || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* عرض الشاشات الصغيرة (بطاقات مكدسة تمنع الانزلاق العرضي) */}
          <div className="block lg:hidden space-y-3.5">
            {customers.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-[20px] bg-surface border border-surface-border shadow-soft space-y-3"
              >
                {/* الاسم ونوع الجهة */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-text-main text-sm">
                      {c.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-text-muted mt-1">
                      <Building2 className="w-3.5 h-3.5 text-brand-orange" />
                      <span className="font-medium">
                        {c.nurseryName || t('customers.individualType')}
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-surface-subtle text-text-main border border-surface-border/50 shrink-0">
                    {c.governorate ? getGovernorateName(c.governorate, i18n.language) : '—'}
                  </span>
                </div>

                {/* معلومات الاتصال */}
                <div className="space-y-1.5 pt-2 border-t border-surface-border/60 text-xs">
                  <div className="flex items-center gap-2 text-text-muted">
                    <Phone className="w-3.5 h-3.5 shrink-0 text-text-muted" />
                    <span
                      dir="ltr"
                      style={{ unicodeBidi: 'isolate' }}
                      className="font-mono font-bold text-text-main"
                    >
                      {c.phone}
                    </span>
                  </div>

                  {c.email && (
                    <div className="flex items-center gap-2 text-text-muted">
                      <Mail className="w-3.5 h-3.5 shrink-0 text-text-muted" />
                      <span
                        dir="ltr"
                        style={{ unicodeBidi: 'isolate' }}
                        className="font-mono text-text-muted"
                      >
                        {c.email}
                      </span>
                    </div>
                  )}
                </div>

                {/* الطلبيات وإجمالي المشتريات */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-border/60 text-xs">
                  <div>
                    <span className="text-text-muted text-[11px] block">{t('customers.table.ordersCount')}</span>
                    <span className="font-bold font-mono text-text-main">
                      {formatNumber(c.ordersCount || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted text-[11px] block">{t('customers.table.totalSpent')}</span>
                    <span className="font-bold text-text-main">
                      {formatMoney(c.totalSpent || 0)}
                    </span>
                  </div>
                  <div className="col-span-2 pt-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                      <Calendar className="w-3 h-3 text-text-muted" />
                      <span>{t('customers.table.lastOrderDate')}: </span>
                      <span className="font-medium text-text-main">
                        {c.lastOrderDate ? formatDate(c.lastOrderDate) : t('customers.noOrdersYet')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
