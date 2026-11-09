import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../utils'
import { EmptyState } from './EmptyState'
import { Skeleton } from './Skeleton'

/**
 * جدول بيانات متجاوب يتحول تلقائياً إلى بطاقات مكدسة على الشاشات الصغيرة
 */
export function DataTable({
  columns = [],
  data = [],
  keyExtractor = (item) => item.id,
  loading = false,
  emptyTitle,
  emptyMessage,
  emptyAction = null,
  sortable = true,
  renderMobileCard = null,
  className,
}) {
  const [sortKey, setSortKey] = useState(null)
  const [sortOrder, setSortOrder] = useState('asc') // 'asc' | 'desc'

  const handleSort = (key) => {
    if (!sortable) return
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0
    const aVal = a[sortKey]
    const bVal = b[sortKey]
    if (aVal === bVal) return 0
    if (aVal === undefined || aVal === null) return 1
    if (bVal === undefined || bVal === null) return -1

    const comparison = aVal > bVal ? 1 : -1
    return sortOrder === 'asc' ? comparison : -comparison
  })

  if (loading) {
    return (
      <div className="space-y-3 py-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-[16px]" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyMessage}
        action={emptyAction}
      />
    )
  }

  return (
    <div className={cn('w-full', className)}>
      {/* عرض الشاشات الكبيرة: جدول متناسق */}
      <div className="hidden md:block overflow-x-auto overscroll-contain modal-scrollbar rounded-[20px] border border-surface-border bg-surface">
        <table className="w-full text-start border-collapse text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface-subtle/50 text-text-muted">
              {columns.map((col) => (
                <th
                  key={col.key || col.id}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={cn(
                    'py-3.5 px-4 font-bold text-start whitespace-nowrap select-none',
                    col.sortable !== false && sortable && 'cursor-pointer hover:text-text-main'
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable !== false && sortable && (
                      <span className="text-text-muted">
                        {sortKey === col.key ? (
                          sortOrder === 'asc' ? (
                            <ChevronUp className="w-4 h-4 text-brand-orange" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-brand-orange" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {sortedData.map((item, index) => (
              <tr
                key={keyExtractor(item) || index}
                className="hover:bg-surface-subtle/40 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key || col.id}
                    className={cn('py-4 px-4 text-text-main align-middle', col.className)}
                  >
                    {col.render ? col.render(item, index) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* عرض الهواتف المحمولة: بطاقات مكدسة تمنع الانزلاق العرضي */}
      <div className="block md:hidden space-y-3">
        {sortedData.map((item, index) => (
          <div
            key={keyExtractor(item) || index}
            className="p-4 rounded-[20px] bg-surface border border-surface-border shadow-xs space-y-2.5"
          >
            {renderMobileCard ? (
              renderMobileCard(item, index)
            ) : (
              columns.map((col) => (
                <div key={col.key || col.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-text-muted">{col.header}:</span>
                  <div className="text-text-main font-medium text-end">
                    {col.render ? col.render(item, index) : item[col.key]}
                  </div>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

