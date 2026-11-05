import { Sparkles } from 'lucide-react'
import { useState } from 'react'

/**
 * صندوق الحسابات التجريبية للمطورين والمراجعين (DEV ONLY)
 * يُسهل الانتقال الفوري بين الأدوار بدون كتابة كلمات المرور يدوياً
 */
export function MockAccountsBox({ onQuickLogin, disabled }) {
  const [loadingRole, setLoadingRole] = useState(null)

  const accounts = [
    {
      role: 'seller1',
      label: '🧵 البائعة الأولى',
      email: 'seller1@test.com',
      badge: 'بائعة',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    },
    {
      role: 'seller2',
      label: '🎨 البائعة الثانية',
      email: 'seller2@test.com',
      badge: 'بائعة',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    },
    {
      role: 'admin',
      label: '👑 Admin',
      email: 'admin@test.com',
      badge: 'إدارة',
      badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    },
  ]

  const handleSelect = async (role) => {
    if (disabled || loadingRole) return
    setLoadingRole(role)
    try {
      await onQuickLogin(role)
    } finally {
      setLoadingRole(null)
    }
  }

  return (
    <div className="mt-8 pt-6 border-t border-surface-border">
      <div className="flex items-center justify-between mb-3 text-[11px] font-bold text-text-muted">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
          <span>حسابات تجريبية سريعة (DEV Mock Accounts):</span>
        </span>
        <span className="font-mono text-[10px]" dir="ltr">كلمة المرور: 123456</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        {accounts.map((acc) => (
          <button
            key={acc.role}
            type="button"
            disabled={disabled || loadingRole !== null}
            onClick={() => handleSelect(acc.role)}
            className="p-2.5 rounded-xl border border-surface-border bg-surface hover:bg-surface-subtle font-semibold text-text-main text-start flex items-center justify-between gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <div className="overflow-hidden">
              <div className="truncate text-xs font-bold">{acc.label}</div>
              <div className="text-[10px] text-text-muted truncate font-mono" dir="ltr">
                {acc.email}
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${acc.badgeClass}`}>
              {acc.badge}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
