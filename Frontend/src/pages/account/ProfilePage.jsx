import { ArrowLeft, Briefcase, LayoutDashboard, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { useAuth } from '../../context/AuthContext'
import { ChangePasswordCard, PersonalInfoForm } from '../../features/profile'

export default function ProfilePage() {
  const { t } = useTranslation('profile')
  const { user } = useAuth()

  const role = user?.role || 'customer'
  const isCustomer = role === 'customer'
  const isSeller = role === 'seller'
  const isAdmin = role === 'admin'

  const professionalHref = isSeller ? '/seller/profile' : '/admin/account'
  const professionalLabel = isSeller
    ? t('quickAccess.sellerProfileLink')
    : t('quickAccess.adminAccountLink')
  const dashboardHref = isSeller ? '/seller' : '/admin'
  const dashboardLabel = isSeller
    ? t('quickAccess.sellerDashboardLink')
    : t('quickAccess.adminDashboardLink')

  return (
    <div className="space-y-8">
      {/* بطاقة الانتقال السريع للبائعة أو الإدارة */}
      {(isSeller || isAdmin) && (
        <Card padding="lg" className="space-y-4">
          <div>
            <h2 className="text-base font-heading font-black text-text-main">
              {t('quickAccess.title')}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {t('quickAccess.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to={professionalHref}
              className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-surface-border bg-surface-subtle/60 hover:bg-brand-orange/10 hover:border-brand-orange/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-orange/15 text-brand-orange flex items-center justify-center shrink-0">
                  {isSeller ? <Briefcase className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                </div>
                <span className="font-bold text-sm text-text-main truncate">
                  {professionalLabel}
                </span>
              </div>
              <ArrowLeft className="w-4 h-4 text-text-muted shrink-0 rtl:rotate-0 rotate-180" />
            </Link>

            <Link
              to={dashboardHref}
              className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-surface-border bg-surface-subtle/60 hover:bg-brand-mint/10 hover:border-brand-mint/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-mint/15 text-brand-mint-text dark:text-brand-mint flex items-center justify-center shrink-0">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm text-text-main truncate">
                  {dashboardLabel}
                </span>
              </div>
              <ArrowLeft className="w-4 h-4 text-text-muted shrink-0 rtl:rotate-0 rotate-180" />
            </Link>
          </div>
        </Card>
      )}

      {/* النموذج الأول: البيانات الشخصية المشتركة (كامل للعميل، وأساسي للبائعة والأدمن) */}
      <PersonalInfoForm
        variant={isCustomer ? 'customer' : 'basic'}
        phoneRequired={isCustomer || isSeller}
      />

      {/* النموذج الثاني: تغيير كلمة المرور المشترك */}
      <ChangePasswordCard />
    </div>
  )
}
