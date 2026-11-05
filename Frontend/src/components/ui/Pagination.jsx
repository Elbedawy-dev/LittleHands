import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../utils'

export function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className,
}) {
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages = []
    const showMax = 5

    if (totalPages <= showMax) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('...')

      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i)
      }

      if (currentPage < totalPages - 2) pages.push('...')
      if (!pages.includes(totalPages)) pages.push(totalPages)
    }

    return pages
  }

  return (
    <div
      role="navigation"
      aria-label="التنقل بين الصفحات"
      className={cn('flex items-center justify-center gap-1.5 py-4 select-none', className)}
    >
      {/* زر الصفحة السابقة */}
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="w-10 h-10 rounded-full flex items-center justify-center border border-surface-border bg-surface text-text-main disabled:opacity-30 disabled:pointer-events-none hover:border-brand-orange hover:text-brand-orange transition-colors"
        aria-label="الصفحة السابقة"
      >
        <ChevronRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
      </button>

      {/* أرقام الصفحات */}
      {getPageNumbers().map((p, idx) => {
        if (p === '...') {
          return (
            <span key={`dots_${idx}`} className="w-8 text-center text-text-muted">
              ...
            </span>
          )
        }

        const isCurrent = p === currentPage
        return (
          <button
            key={p}
            type="button"
            aria-current={isCurrent ? 'page' : undefined}
            onClick={() => onPageChange(p)}
            className={cn(
              'w-10 h-10 rounded-full text-sm font-bold flex items-center justify-center transition-all',
              isCurrent
                ? 'bg-brand-orange text-white shadow-soft font-black'
                : 'bg-surface border border-surface-border text-text-main hover:border-brand-orange/60'
            )}
          >
            {p}
          </button>
        )
      })}

      {/* زر الصفحة التالية */}
      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="w-10 h-10 rounded-full flex items-center justify-center border border-surface-border bg-surface text-text-main disabled:opacity-30 disabled:pointer-events-none hover:border-brand-orange hover:text-brand-orange transition-colors"
        aria-label="الصفحة التالية"
      >
        <ChevronLeft className="w-4 h-4 rtl:rotate-0 rotate-180" />
      </button>
    </div>
  )
}

