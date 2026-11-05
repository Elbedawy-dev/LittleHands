import { Check } from 'lucide-react'
import { cn } from '../../utils'

export function Stepper({ steps = [], currentStep = 0, className }) {
  return (
    <div className={cn('w-full py-4', className)}>
      <div className="flex items-center justify-between relative">
        {/* خط التوصيل الخلفي */}
        <div className="absolute top-1/2 start-0 end-0 -translate-y-1/2 h-1 bg-surface-subtle -z-0" />

        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep
          const isCurrent = idx === currentStep

          return (
            <div key={idx} className="relative z-10 flex flex-col items-center group">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-2 select-none shadow-xs',
                  isCompleted
                    ? 'bg-brand-orange border-brand-orange text-white'
                    : isCurrent
                    ? 'bg-surface border-brand-orange text-brand-orange ring-4 ring-brand-orange/20'
                    : 'bg-surface border-surface-border text-text-muted'
                )}
              >
                {isCompleted ? <Check className="w-5 h-5 stroke-[3]" /> : idx + 1}
              </div>

              <span
                className={cn(
                  'text-xs font-bold mt-2 text-center whitespace-nowrap transition-colors max-w-[80px] sm:max-w-none',
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

