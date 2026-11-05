import { CheckCircle2, Circle } from 'lucide-react'
import { useFormat } from '../../hooks/useFormat'
import { StatusBadge } from '../ui/StatusBadge'

export function OrderTimeline({ timeline = [] }) {
  const { formatDateTime } = useFormat()

  if (!timeline || timeline.length === 0) {
    return null
  }

  return (
    <div className="py-2">
      <div className="relative ps-6 border-s-2 border-brand-orange/30 space-y-6">
        {timeline.map((entry, index) => {
          const isLatest = index === timeline.length - 1

          return (
            <div key={index} className="relative group">
              {/* أيقونة النقطة على الخط الزمني */}
              <div className="absolute -start-[31px] top-0.5 w-6 h-6 rounded-full bg-surface border-2 border-brand-orange flex items-center justify-center">
                {isLatest ? (
                  <CheckCircle2 className="w-4 h-4 text-brand-orange stroke-[3]" />
                ) : (
                  <Circle className="w-2.5 h-2.5 fill-brand-orange text-brand-orange" />
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-text-main">
                    {entry.title}
                  </span>
                  {entry.status && (
                    <StatusBadge status={entry.status} size="sm" />
                  )}
                </div>

                {entry.description && (
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                    {entry.description}
                  </p>
                )}

                {entry.timestamp && (
                  <time className="text-[11px] text-text-muted font-medium block mt-1">
                    {formatDateTime(entry.timestamp)}
                  </time>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

