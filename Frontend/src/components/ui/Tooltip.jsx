import { useState } from 'react'
import { cn } from '../../utils'

export function Tooltip({ children, content, position = 'top', className }) {
  const [visible, setVisible] = useState(false)

  const positions = {
    top: 'bottom-full start-1/2 -translate-x-1/2 rtl:translate-x-1/2 mb-2',
    bottom: 'top-full start-1/2 -translate-x-1/2 rtl:translate-x-1/2 mt-2',
    start: 'top-1/2 end-full -translate-y-1/2 me-2',
    end: 'top-1/2 start-full -translate-y-1/2 ms-2',
  }

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}

      {visible && content && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-800 rounded-lg shadow-md whitespace-nowrap pointer-events-none transition-opacity duration-150',
            positions[position] || positions.top,
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}

