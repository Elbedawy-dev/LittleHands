import { ArrowLeft, Bell, Settings, ShieldCheck, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { LogoutCard } from '../../components/ui/LogoutCard'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../context/AuthContext'
import { ChangePasswordCard, PersonalInfoForm, ProfileHeaderCard } from '../../features/profile'

export default function AdminAccountPage() {
  const { t } = useTranslation(['profile', 'common'])
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const quickLinks = [
    {
      href: '/admin/settings',
      label: t('profile:admin.platformSettingsLink'),
      icon: <Settings className="w-5 h-5" />,
      colorClass: 'bg-brand-orange/15 text-brand-orange',
    },
    {
      href: '/admin/sellers',
      label: t('profile:admin.sellerAccountsLink'),
      icon: <Users className="w-5 h-5" />,
      colorClass: 'bg-brand-mint/15 text-brand-mint-text dark:text-brand-mint',
    },
    {
      href: '/admin/notifications',
      label: t('profile:admin.notificationsLink'),
      icon: <Bell className="w-5 h-5" />,
      colorClass: 'bg-brand-sky/15 text-brand-sky-text dark:text-brand-sky',
    },
  ]

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <PageHeader
        title={t('profile:admin.pageTitle')}
        description={t('profile:admin.pageSubtitle')}
      />

      {/* بطاقة الهوية المشتركة */}
      <ProfileHeaderCard
        displayName={user?.name || t('common:roles.admin')}
        avatarRole="admin"
        avatarUploadTitle={t('profile:admin.avatarUpdateTitle')}
        showPhoneInMeta={true}
        roleBadge={
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('profile:admin.roleBadge')}</span>
          </span>
        }
      />

      {/* نموذج البيانات الأساسية المشترك */}
      <PersonalInfoForm
        variant="basic"
        title={t('profile:admin.personalInfoTitle')}
        subtitle={t('profile:admin.personalInfoDesc')}
        submitLabel={t('profile:admin.saveChanges')}
        emailHelperText={t('profile:admin.emailHelper')}
        phoneRequired={false}
      />

      {/* روابط الإدارة السريعة */}
      <Card padding="lg" className="space-y-4">
        <div>
          <h2 className="text-base font-heading font-black text-text-main">
            {t('profile:admin.quickLinksTitle')}
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            {t('profile:admin.quickLinksDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-surface-border bg-surface-subtle/60 hover:bg-surface-subtle hover:border-brand-orange/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.colorClass}`}>
                  {item.icon}
                </div>
                <span className="font-bold text-sm text-text-main truncate">
                  {item.label}
                </span>
              </div>
              <ArrowLeft className="w-4 h-4 text-text-muted shrink-0 rtl:rotate-0 rotate-180" />
            </Link>
          ))}
        </div>
      </Card>

      {/* قسم تغيير كلمة المرور المشترك */}
      <ChangePasswordCard />

      {/* بطاقة تسجيل الخروج المشتركة */}
      <LogoutCard onLogout={handleLogout} />
    </div>
  )
}
