import { cn } from '../../utils'

/**
 * مكون التبويبات المتجاوب
 */
export function Tabs({
  tabs = [],
  activeTab,
  onChange,
  variant = 'pills', // 'pills' | 'underline'
  className,
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center gap-1.5 overflow-x-auto no-scrollbar',
        variant === 'pills' && 'p-1 bg-surface-subtle rounded-full border border-surface-border',
        variant === 'underline' && 'border-b border-surface-border gap-6',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap transition-all duration-200 cursor-pointer select-none text-xs sm:text-sm',
              variant === 'pills' && [
                'px-4 py-2 rounded-full',
                isActive
                  ? 'bg-brand-orange text-white shadow-xs'
                  : 'text-text-muted hover:text-text-main hover:bg-surface/50',
              ],
              variant === 'underline' && [
                'pb-3 pt-1 border-b-2 font-bold -mb-[1px]',
                isActive
                  ? 'border-brand-orange text-brand-orange-text dark:text-brand-orange'
                  : 'border-transparent text-text-muted hover:text-text-main hover:border-surface-border',
              ]
            )}
          >
            {tab.icon && <span className="w-4 h-4 shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-bold',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-surface border border-surface-border text-text-muted'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

