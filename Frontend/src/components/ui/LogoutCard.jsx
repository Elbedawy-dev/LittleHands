import { LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../utils'
import { Button } from './Button'

/**
 * بطاقة تسجيل الخروج المشتركة (Shared Sign Out Card)
 * مصممة بخصائص منطقية (RTL/LTR) وتدعم الوضع الليلي والنهاري
 */
export function LogoutCard({ onLogout, className }) {
  const { t } = useTranslation('common')
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout()
      return
    }
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div
      className={cn(
        'p-6 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-start transition-colors duration-200',
        className
      )}
    >
      <div className="text-start">
        <h3 className="font-heading font-black text-base text-rose-800 dark:text-rose-300">
          {t('logoutCard.title')}
        </h3>
        <p className="text-xs text-rose-700/85 dark:text-rose-300/80 mt-0.5">
          {t('logoutCard.description')}
        </p>
      </div>
      <Button
        type="button"
        variant="danger"
        onClick={handleLogout}
        startIcon={<LogOut className="w-4 h-4 rtl:rotate-180" />}
        className="shrink-0"
      >
        {t('logoutCard.action')}
      </Button>
    </div>
  )
}
