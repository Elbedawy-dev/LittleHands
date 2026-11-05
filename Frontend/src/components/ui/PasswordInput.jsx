import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { forwardRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils'

export const PasswordInput = forwardRef(function PasswordInput(
  {
    label,
    error,
    helperText,
    id,
    name,
    showStrength = false,
    value,
    onChange,
    className,
    containerClassName,
    disabled,
    required,
    ...props
  },
  ref
) {
  const { i18n } = useTranslation('common')
  const isEn = i18n.language === 'en'
  const [showPassword, setShowPassword] = useState(false)
  const inputId = id || name || `pwd_${Math.random().toString(36).slice(2, 7)}`

  // حساب قوة كلمة المرور البسيطة
  const getStrength = (val) => {
    if (!val || val.length === 0) return 0
    let score = 0
    if (val.length >= 6) score += 1
    if (val.length >= 8) score += 1
    if (/[A-Z]/.test(val) || /[\u0621-\u064A]/.test(val)) score += 1
    if (/[0-9]/.test(val)) score += 1
    if (/[^A-Za-z0-9\u0621-\u064A]/.test(val)) score += 1
    return Math.min(score, 4)
  }

  const strength = showStrength ? getStrength(value || '') : 0
  const strengthLabels = isEn
    ? ['Very Weak', 'Weak', 'Medium', 'Good', 'Strong']
    : ['ضعيفة جداً', 'ضعيفة', 'متوسطة', 'جيدة', 'قوية وممتازة']
  const strengthColors = ['bg-rose-500', 'bg-amber-500', 'bg-yellow-500', 'bg-brand-mint', 'bg-emerald-600']

  return (
    <div className={cn('flex flex-col mb-5', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-semibold text-text-main mb-2 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-brand-orange ms-1">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={cn(
            'w-full h-[52px] ps-4 pe-12 rounded-[16px] text-sm text-text-main bg-surface border-[1.5px] transition-colors duration-200 outline-none placeholder:text-text-muted/60 disabled:opacity-50 disabled:bg-surface-subtle',
            error
              ? 'border-rose-500 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/20'
              : 'border-surface-border hover:border-brand-orange/50 focus:border-brand-orange focus:ring-3 focus:ring-brand-orange/20',
            className
          )}
          {...props}
        />

        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute end-3.5 p-1.5 text-text-muted hover:text-text-main focus:outline-none focus:text-brand-orange cursor-pointer"
          aria-label={
            showPassword
              ? (isEn ? 'Hide password' : 'إخفاء كلمة المرور')
              : (isEn ? 'Show password' : 'إظهار كلمة المرور')
          }
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      {showStrength && value && value.length > 0 && (
        <div className="mt-2">
          <div className="flex gap-1.5 h-1.5 w-full">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={cn(
                  'flex-1 rounded-full transition-all duration-300',
                  strength >= step ? strengthColors[strength] : 'bg-surface-subtle'
                )}
              />
            ))}
          </div>
          <p className="text-[11px] text-text-muted mt-1 font-medium">
            {isEn ? 'Password strength: ' : 'مستوى القوة: '}
            <span className="font-bold text-text-main">{strengthLabels[strength]}</span>
          </p>
        </div>
      )}

      {error ? (
        <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-xs text-text-muted mt-1.5">{helperText}</p>
      ) : null}
    </div>
  )
})
