import { Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../../components/ui/Card'
import { Switch } from '../../../components/ui/Switch'

/**
 * قسم إعدادات التنبيهات والإشعارات للإدارة
 */
export function NotificationSettingsSection({
  emailNotifications = true,
  onChangeEmailNotifications,
  inSiteNotifications = true,
  onChangeInSiteNotifications,
}) {
  const { t } = useTranslation('admin-manage')

  return (
    <Card variant="default" padding="lg" className="shadow-soft space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-surface-border">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-heading font-black text-base text-text-main">
            {t('settings.notificationsSection.title')}
          </h3>
          <p className="text-xs text-text-muted">
            {t('settings.notificationsSection.description')}
          </p>
        </div>
      </div>

      <div className="space-y-4 divide-y divide-surface-border">
        {/* إشعارات البريد */}
        <div className="pt-2 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <span className="font-bold text-text-main text-sm block">
              {t('settings.notificationsSection.emailNotifLabel')}
            </span>
            <span className="text-xs text-text-muted mt-0.5 block">
              {t('settings.notificationsSection.emailNotifDesc')}
            </span>
          </div>
          <Switch
            id="switch-admin-email-notif"
            checked={emailNotifications}
            onChange={(e) => onChangeEmailNotifications(e.target.checked)}
            aria-label={t('settings.notificationsSection.emailNotifLabel')}
          />
        </div>

        {/* إشعارات المنصة الفورية */}
        <div className="pt-4 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <span className="font-bold text-text-main text-sm block">
              {t('settings.notificationsSection.inSiteNotifLabel')}
            </span>
            <span className="text-xs text-text-muted mt-0.5 block">
              {t('settings.notificationsSection.inSiteNotifDesc')}
            </span>
          </div>
          <Switch
            id="switch-admin-insite-notif"
            checked={inSiteNotifications}
            onChange={(e) => onChangeInSiteNotifications(e.target.checked)}
            aria-label={t('settings.notificationsSection.inSiteNotifLabel')}
          />
        </div>
      </div>
    </Card>
  )
}
