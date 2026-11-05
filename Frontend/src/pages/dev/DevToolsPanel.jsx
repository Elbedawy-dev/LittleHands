import { Database, LogOut, RefreshCw, Shield, Store, UserCheck } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../mocks/db'

export function DevToolsPanel() {
  const { user, login, logout } = useAuth()
  const [loading, setLoading] = useState(false)

  if (!import.meta.env.DEV) return null

  const handleQuickLogin = async (email, roleLabel) => {
    setLoading(true)
    try {
      await login({ identifier: email, password: '123456' })
      toast.success(`تم تسجيل الدخول كـ ${roleLabel}`)
    } catch (err) {
      toast.error(err.message || 'فشل تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setLoading(true)
    try {
      await logout()
      toast.success('تم تسجيل الخروج بنجاح')
    } catch {
      toast.error('حدث خطأ أثناء تسجيل الخروج')
    } finally {
      setLoading(false)
    }
  }

  const handleResetDb = () => {
    try {
      db.reset()
      toast.success('تمت إعادة ضبط قاعدة البيانات الأولية بنجاح')
      setTimeout(() => {
        window.location.reload()
      }, 300)
    } catch {
      toast.error('فشل في إعادة ضبط قاعدة البيانات')
    }
  }

  return (
    <div className="rounded-[24px] border-2 border-brand-orange/40 bg-surface p-6 shadow-float space-y-5 my-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-brand-orange/15 text-brand-orange flex items-center justify-center font-bold">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black font-heading text-text-main">
              لوحة أدوات المطور (DevToolsPanel)
            </h3>
            <p className="text-xs text-text-muted">
              حسابات الدخول التجريبية الثلاثة وإعادة ضبط قاعدة البيانات المحلية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2 bg-brand-orange/10 px-3 py-1.5 rounded-full text-xs font-bold text-brand-orange-text">
              <UserCheck className="w-3.5 h-3.5" />
              <span>
                {user.name} ({user.role}) — {user.email}
              </span>
            </div>
          ) : (
            <span className="text-xs font-bold text-text-muted bg-surface-subtle px-3 py-1.5 rounded-full">
              غير مسجل (زائر)
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Admin Login */}
        <button
          type="button"
          disabled={loading}
          onClick={() => handleQuickLogin('admin@test.com', 'مدير المنصة (Admin)')}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-[16px] bg-slate-900 text-white dark:bg-slate-800 hover:bg-slate-800 text-xs font-black transition-all cursor-pointer shadow-soft active:scale-95 disabled:opacity-50"
        >
          <Shield className="w-4 h-4 text-brand-orange" />
          <span>دخول: مدير المنصة</span>
        </button>

        {/* Seller 1 Login */}
        <button
          type="button"
          disabled={loading}
          onClick={() => handleQuickLogin('seller1@test.com', 'البائعة الأولى')}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-[16px] bg-brand-orange text-white hover:bg-[#e07528] text-xs font-black transition-all cursor-pointer shadow-soft active:scale-95 disabled:opacity-50"
        >
          <Store className="w-4 h-4" />
          <span>دخول: البائعة الأولى</span>
        </button>

        {/* Seller 2 Login */}
        <button
          type="button"
          disabled={loading}
          onClick={() => handleQuickLogin('seller2@test.com', 'البائعة الثانية')}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-[16px] bg-amber-600 text-white hover:bg-amber-700 text-xs font-black transition-all cursor-pointer shadow-soft active:scale-95 disabled:opacity-50"
        >
          <Store className="w-4 h-4" />
          <span>دخول: البائعة الثانية</span>
        </button>

        {/* Logout */}
        <button
          type="button"
          disabled={loading || !user}
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-[16px] bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100 text-xs font-black transition-all cursor-pointer disabled:opacity-40"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج</span>
        </button>
      </div>

      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-surface-border">
        <span className="text-xs text-text-muted">
          إعادة تعيين مفتاح التخزين ومسح كافة الوسائل والطلبيات مع الإبقاء على الحسابات الثلاثة الخام
        </span>

        <button
          type="button"
          disabled={loading}
          onClick={handleResetDb}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-rose-300 dark:border-rose-800 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 text-xs font-bold transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>تصفير قاعدة البيانات (Reset Mock Database)</span>
        </button>
      </div>
    </div>
  )
}

