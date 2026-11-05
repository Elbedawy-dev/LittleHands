import { useEffect, useRef } from 'react'
import { cn } from '../../utils'

export function OTPInput({
  length = 6,
  value = '',
  onChange,
  disabled = false,
  className,
}) {
  const inputRefs = useRef([])

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length)
  }, [length])

  const handleChange = (e, index) => {
    const val = e.target.value.slice(-1) // حرف واحد فقط
    if (!/^[0-9]$/.test(val) && val !== '') return

    const chars = value.split('')
    chars[index] = val
    const newValue = chars.join('')
    onChange(newValue)

    // تحريك التركيز إلى الحقل التالي إذا تم إدخال رقم
    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').trim().slice(0, length)
    if (/^[0-9]+$/.test(pasted)) {
      onChange(pasted)
      const nextFocus = Math.min(pasted.length, length - 1)
      inputRefs.current[nextFocus]?.focus()
    }
  }

  return (
    <div
      dir="ltr"
      className={cn('flex items-center justify-center gap-2 sm:gap-3 my-4', className)}
    >
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-black rounded-[16px] bg-surface border-[1.5px] border-surface-border text-text-main focus:border-brand-orange focus:ring-3 focus:ring-brand-orange/20 outline-none transition-all shadow-xs"
          aria-label={`الرمز ${index + 1}`}
        />
      ))}
    </div>
  )
}

