import { Camera, Phone } from 'lucide-react'
import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { useAuth } from '../../context/AuthContext'
import { cn, getFriendlyError } from '../../utils'
import { processAvatarImage } from '../../utils/avatar'
import { userService } from '../../services/userService'

/**
 * بطاقة رأس الملف الشخصي المشتركة (ProfileHeaderCard)
 * تعرض الصورة الشخصية مع إمكانية رفعها، الاسم، شارة الدور، البريد، الهاتف،
 * بالإضافة لمساحات اختيارية للتفاصيل، الجهة المقابلة، وشريط الإحصائيات.
 */
export function ProfileHeaderCard({
  displayName,
  roleBadge,
  avatarRole,
  avatarUploadTitle,
  avatarSuccessMessage,
  avatarErrorMessage,
  bioContent = null,
  metaContent = null,
  endContent = null,
  statsContent = null,
  showPhoneInMeta = false,
  blobEndClass = 'bg-brand-mint/10',
  onAvatarSuccess,
  onAvatarError,
  className = '',
}) {
  const { t } = useTranslation(['profile', 'common', 'errors'])
  const { user, refreshUser } = useAuth()
  const fileInputRef = useRef(null)
  const [updatingAvatar, setUpdatingAvatar] = useState(false)

  const resolvedRole = avatarRole || user?.role || 'customer'
  const resolvedName = displayName || user?.name || t('profile:header.customerAccount')
  const uploadLabel = avatarUploadTitle || t('profile:header.updateAvatar')

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUpdatingAvatar(true)
    try {
      const dataUrl = await processAvatarImage(file)
      const blob = await fetch(dataUrl).then((r) => r.blob())
      const avatarFile = new File([blob], file.name || 'avatar.webp', {
        type: blob.type || 'image/webp',
      })
      await userService.uploadAvatar(avatarFile)
      const updatedUser = await refreshUser()
      const successText = avatarSuccessMessage || t('profile:info.avatarSuccess')
      onAvatarSuccess?.(updatedUser, successText)
    } catch (err) {
      const msg =
        err.message === 'ERR_INVALID_IMAGE_TYPE'
          ? t('errors:ERR_INVALID_IMAGE_TYPE')
          : err.message === 'ERR_FILE_TOO_LARGE'
            ? t('errors:ERR_FILE_TOO_LARGE')
            : getFriendlyError(err, t) || avatarErrorMessage || t('profile:info.avatarError')
      toast.error(msg)
      onAvatarError?.(msg)
    } finally {
      setUpdatingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[28px] bg-surface border border-surface-border p-6 sm:p-8 shadow-card text-start',
        className
      )}
    >
      {/* خلفيات هلامية ملونة ناعمة */}
      <div className="absolute -top-24 -start-24 w-72 h-72 rounded-full bg-brand-orange/10 blur-3xl pointer-events-none" />
      <div className={cn('absolute -bottom-24 -end-24 w-72 h-72 rounded-full blur-3xl pointer-events-none', blobEndClass)} />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* الصورة والبيانات الشخصية */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 min-w-0 flex-1">
          {/* الصورة مع زر الكاميرا للرفع */}
          <div className="relative group shrink-0">
            <Avatar
              name={resolvedName}
              src={user?.avatar}
              role={resolvedRole}
              size="xl"
              className="w-20 h-20 sm:w-24 sm:h-24 shadow-md text-2xl"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={updatingAvatar}
              className="absolute bottom-0 end-0 w-8 h-8 rounded-full bg-brand-orange text-white flex items-center justify-center shadow-soft hover:scale-105 active:scale-95 transition-transform cursor-pointer disabled:opacity-60"
              title={uploadLabel}
              aria-label={uploadLabel}
            >
              <Camera className="w-4 h-4" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          {/* تفاصيل الاسم والدور والبريد والهاتف */}
          <div className="flex flex-col items-start gap-1 text-start flex-1 min-w-0" data-user-content="true">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading font-black text-xl sm:text-2xl text-text-main">
                {resolvedName}
              </h1>
              {roleBadge}
            </div>

            {user?.email && (
              <p className="text-xs text-text-muted font-mono" dir="ltr">
                {user.email}
              </p>
            )}

            <p className="text-[11px] text-text-muted">
              {t('profile:header.avatarFormatsHint')}
            </p>

            {bioContent}

            {(metaContent || (showPhoneInMeta && user?.phone)) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted pt-0.5">
                {metaContent}
                {showPhoneInMeta && user?.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-text-muted" />
                    <span className="font-mono" dir="ltr">{user.phone}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* المحتوى الجانبي (وسيلة الدفع للعميل / المحفظة للبائعة) */}
        {endContent}
      </div>

      {/* شريط الإحصائيات السريعة (إن وُجد) */}
      {statsContent}
    </div>
  )
}

export default ProfileHeaderCard
