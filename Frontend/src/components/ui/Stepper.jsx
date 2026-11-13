import { Check } from 'lucide-react'
import { cn } from '../../utils'

export function Stepper({ steps = [], currentStep = 0, className }) {
  const total = steps.length
  // Center of first and last step is at 1 / (2 * total) * 100%
  const offsetPercent = total > 1 ? 100 / (2 * total) : 0
  const progressPercent =
    total > 1 && currentStep > 0
      ? (Math.min(currentStep, total - 1) / (total - 1)) * (100 - 2 * offsetPercent)
      : 0

  return (
    <div className={cn('w-full py-2 sm:py-4', className)}>
      <div className="flex items-start justify-between relative w-full">
        {/* Background track line running through circle centers */}
        {total > 1 && (
          <div
            className="absolute top-[18px] sm:top-5 -translate-y-1/2 h-0.5 sm:h-1 bg-surface-border z-0"
            style={{
              insetInlineStart: `${offsetPercent}%`,
              insetInlineEnd: `${offsetPercent}%`,
            }}
          />
        )}

        {/* Active progress fill line */}
        {total > 1 && progressPercent > 0 && (
          <div
            className="absolute top-[18px] sm:top-5 -translate-y-1/2 h-0.5 sm:h-1 bg-brand-orange transition-all duration-500 z-0"
            style={{
              insetInlineStart: `${offsetPercent}%`,
              width: `${progressPercent}%`,
            }}
          />
        )}

        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep
          const isCurrent = idx === currentStep

          return (
            <div
              key={idx}
              className="relative z-10 flex flex-col items-center flex-1 min-w-0 px-1 group"
            >
              {/* Number Circle */}
              <div
                className={cn(
                  'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 border-2 select-none shadow-xs shrink-0 mx-auto',
                  isCompleted
                    ? 'bg-brand-orange border-brand-orange text-white'
                    : isCurrent
                    ? 'bg-surface border-brand-orange text-brand-orange ring-3 sm:ring-4 ring-brand-orange/20'
                    : 'bg-surface border-surface-border text-text-muted'
                )}
              >
                {isCompleted ? <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" /> : idx + 1}
              </div>

              {/* Label below the number */}
              <span
                className={cn(
                  'text-[11px] sm:text-xs font-bold mt-2 text-center break-words leading-tight sm:leading-snug w-full px-0.5 transition-colors line-clamp-2',
                  isCurrent
                    ? 'text-brand-orange-text dark:text-brand-orange'
                    : isCompleted
                    ? 'text-text-main'
                    : 'text-text-muted'
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
