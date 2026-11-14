import {
  AlertCircle,
  Building,
  Check,
  CheckCircle2,
  FileText,
  Info,
  Save,
  ShieldCheck,
  User,
  Wallet,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { LocalizedText } from '../../components/ui/LocalizedText'
import { LogoutCard } from '../../components/ui/LogoutCard'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { Textarea } from '../../components/ui/Textarea'
import { GOVERNORATES } from '../../config/constants'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { useSettings } from '../../context/SettingsContext'
import { ChangePasswordCard, PersonalInfoForm, ProfileHeaderCard } from '../../features/profile'
import { sellerService } from '../../services/sellerService'
import { cn, getFriendlyError } from '../../utils'

const STAGE_OPTIONS = [
  { id: 'nursery', labelKey: 'seller.stageToddler' },
  { id: 'kg1', labelKey: 'seller.stageKg' },
  { id: 'primary', labelKey: 'seller.stageFoundation' },
]

const MATERIAL_OPTIONS = [
  { id: 'felt', labelKey: 'seller.matFelt' },
  { id: 'cardstock', labelKey: 'seller.matCardstock' },
  { id: 'fabric', labelKey: 'seller.matFabric' },
  { id: 'canson', labelKey: 'seller.matCanson' },
  { id: 'nasbian', labelKey: 'seller.matNasbian' },
]

export default function SellerProfilePage() {
  const { t } = useTranslation('profile')
  const { language } = useLanguage()
  const isEn = language === 'en'
  const navigate = useNavigate()
  const { user, isLoading, refreshUser, logout } = useAuth()
  const { settings } = useSettings()

  const [activeTab, setActiveTab] = useState('info') // 'info' | 'bio' | 'wallet'
  const [savingBio, setSavingBio] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // النبذة والتخصص والمحفظة (متزامنة من AuthContext user)
  const [bio, setBio] = useState({ ar: '', en: '' })
  const [stages, setStages] = useState(['nursery', 'kg1'])
  const [materials, setMaterials] = useState(['felt'])

  // حالة نافذة تحديث المحفظة
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [newWalletNumber, setNewWalletNumber] = useState('')
  const [walletError, setWalletError] = useState('')
  const [updatingWallet, setUpdatingWallet] = useState(false)

  useEffect(() => {
    if (!user) return
    const sellerMeta = user.seller || {}
    const rawBio = sellerMeta.bio
    setBio(
      typeof rawBio === 'object' && rawBio !== null
        ? { ar: rawBio.ar || '', en: rawBio.en || '' }
        : { ar: rawBio || '', en: '' }
    )
    if (Array.isArray(sellerMeta.stages) && sellerMeta.stages.length > 0) {
      setStages(sellerMeta.stages)
    }
    if (Array.isArray(sellerMeta.materials) && sellerMeta.materials.length > 0) {
      setMaterials(sellerMeta.materials)
    }
  }, [user])

  const governorate = user?.governorate || user?.seller?.governorate || ''
  const govObj = GOVERNORATES.find((g) => g.name === governorate)
  const govDisplay = isEn ? (govObj?.nameEn || governorate) : governorate
  const walletNumber = user?.seller?.payoutWallet || user?.phone || ''

  const toggleItem = (list, setList, value) => {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
  }

  // حفظ النبذة والتخصص التربوي
  const handleSaveBio = async (e) => {
    e.preventDefault()
    setSavingBio(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      await sellerService.updateSellerProfile({
        bio,
        stages,
        materials,
      })
      await refreshUser()
      setSuccessMsg(t('seller.saveSuccess'))
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      setErrorMsg(getFriendlyError(err, t) || t('seller.saveError'))
    } finally {
      setSavingBio(false)
    }
  }

  // تحديث رقم محفظة فودافون كاش
  const handleUpdateWallet = async (e) => {
    e.preventDefault()
    setWalletError('')

    const cleanNum = newWalletNumber.trim()
    if (!cleanNum) {
      setWalletError(t('seller.walletErrorRequired'))
      return
    }
    if (!/^01[0-2,5]{1}[0-9]{8}$/.test(cleanNum)) {
      setWalletError(t('seller.walletErrorInvalid'))
      return
    }

    setUpdatingWallet(true)
    try {
      await sellerService.updateSellerProfile({ payoutWallet: cleanNum })
      await refreshUser()
      setWalletModalOpen(false)
      setNewWalletNumber('')
      setSuccessMsg(t('seller.walletSuccess'))
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      setWalletError(getFriendlyError(err, t) || t('seller.walletErrorFailed'))
    } finally {
      setUpdatingWallet(false)
    }
  }

  if (isLoading && !user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 rounded-full" />
        <Skeleton className="h-44 rounded-[28px]" />
        <Skeleton className="h-96 rounded-[28px]" />
      </div>
    )
  }

  const tabs = [
    { id: 'info', label: t('seller.tabInfo'), icon: <User className="w-4 h-4" /> },
    { id: 'bio', label: t('seller.tabBio'), icon: <FileText className="w-4 h-4" /> },
    { id: 'wallet', label: t('seller.tabWallet'), icon: <Wallet className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-6">
      {/* ترويسة الصفحة */}
      <PageHeader
        title={t('seller.pageTitle')}
        description={t('seller.pageSubtitle')}
      />

      {/* بطاقة هوية البائعة العلوية المشتركة */}
      <ProfileHeaderCard
        displayName={user?.name || (isEn ? 'Seller' : 'البائعة')}
        avatarRole="seller"
        avatarUploadTitle={t('seller.updateAvatar')}
        avatarSuccessMessage={t('seller.avatarSuccess')}
        avatarErrorMessage={t('seller.avatarError')}
        blobEndClass="bg-brand-yellow/10"
        roleBadge={
          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('seller.badgeProfessional')}</span>
          </span>
        }
        bioContent={
          (bio.ar || bio.en) ? (
            <p className="text-xs text-text-muted leading-relaxed max-w-xl" data-user-content="true">
              <LocalizedText value={bio} />
            </p>
          ) : null
        }
        metaContent={
          <span className="flex items-center gap-1 font-semibold text-text-main">
            <Building className="w-3.5 h-3.5 text-brand-orange" />
            <span>{govDisplay ? `${govDisplay} — ` : ''}{t('seller.handicraftWorkshop')}</span>
          </span>
        }
        showPhoneInMeta={true}
        endContent={
          <div className="flex flex-wrap md:flex-col items-start md:items-end justify-between w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-surface-border text-xs gap-1.5">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand-orange/15 text-brand-orange-text dark:text-brand-orange font-bold">
              <Wallet className="w-3.5 h-3.5" />
              <span>{t('seller.walletActiveBadge')}</span>
            </span>
            {walletNumber && (
              <span className="font-mono text-sm font-extrabold text-text-main" dir="ltr">
                {walletNumber}
              </span>
            )}
          </div>
        }
      />

      {/* رسائل التنبيهات */}
      {successMsg && (
        <div className="p-4 rounded-[18px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-[18px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* شريط التبويبات الثلاثة */}
      <div className="border-b border-surface-border pb-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {tabs.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shadow-xs cursor-pointer select-none',
                  active
                    ? 'bg-brand-orange text-white shadow-soft font-black scale-102'
                    : 'bg-surface border border-surface-border text-text-muted hover:text-text-main hover:bg-surface-subtle'
                )}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* المحتوى حسب التبويب النشط */}
      <div>
        {/* التبويب الأول: بياناتي وورشتي باستخدام PersonalInfoForm المشترك */}
        {activeTab === 'info' && (
          <PersonalInfoForm
            variant="sellerWorkshop"
            formClassName="space-y-4 max-w-2xl"
            onExtraSave={async ({ name }) => {
              if (user?.role === 'seller') {
                const existingEn =
                  typeof user?.seller?.displayName === 'object'
                    ? user.seller.displayName?.en || ''
                    : ''
                await sellerService.updateSellerProfile({
                  displayName: { ar: name, en: existingEn },
                })
              }
            }}
          />
        )}

        {/* التبويب الثاني: نبذة عني وتخصصي التربوي */}
        {activeTab === 'bio' && (
          <Card padding="lg" className="space-y-6">
            <div className="pb-4 border-b border-surface-border">
              <h3 className="text-base font-heading font-black text-text-main">
                {t('seller.bioSectionTitle')}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                {t('seller.bioSectionDesc')}
              </p>
            </div>

            <form onSubmit={handleSaveBio} className="space-y-5 max-w-2xl">
              <Textarea
                id="seller-bio-ar"
                label={t('seller.bioArLabel')}
                value={bio.ar}
                onChange={(e) => setBio((prev) => ({ ...prev, ar: e.target.value }))}
                rows={3}
                required
              />

              <Textarea
                id="seller-bio-en"
                label={t('seller.bioEnLabel')}
                value={bio.en}
                onChange={(e) => setBio((prev) => ({ ...prev, en: e.target.value }))}
                rows={3}
                dir="ltr"
                className="text-start"
                placeholder={t('seller.bioEnPlaceholder')}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* المراحل العمرية */}
                <div className="p-4 rounded-2xl bg-surface-subtle/70 space-y-2.5">
                  <span className="text-xs font-bold text-text-main block">
                    {t('seller.ageStagesTitle')}
                  </span>
                  {STAGE_OPTIONS.map((stage) => (
                    <label key={stage.id} className="flex items-center gap-2 text-xs text-text-main cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stages.includes(stage.id)}
                        onChange={() => toggleItem(stages, setStages, stage.id)}
                        className="w-4 h-4 text-brand-orange rounded"
                      />
                      <span>{t(stage.labelKey)}</span>
                    </label>
                  ))}
                </div>

                {/* الخامات المخصصة */}
                <div className="p-4 rounded-2xl bg-surface-subtle/70 space-y-2.5">
                  <span className="text-xs font-bold text-text-main block">
                    {t('seller.materialsTitle')}
                  </span>
                  {MATERIAL_OPTIONS.map((mat) => (
                    <label key={mat.id} className="flex items-center gap-2 text-xs text-text-main cursor-pointer">
                      <input
                        type="checkbox"
                        checked={materials.includes(mat.id)}
                        onChange={() => toggleItem(materials, setMaterials, mat.id)}
                        className="w-4 h-4 text-brand-orange rounded"
                      />
                      <span>{t(mat.labelKey)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  size="md"
                  loading={savingBio}
                  startIcon={<Save className="w-4 h-4" />}
                >
                  {t('seller.saveBioBtn')}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* التبويب الثالث: محفظة فودافون كاش للتحويل (مع العمولة 20%) */}
        {activeTab === 'wallet' && (
          <div className="space-y-6">
            <Card padding="lg" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#E60000]/15 text-[#E60000] flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-heading font-black text-text-main">
                      {t('seller.walletSectionTitle')}
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      {t('seller.walletSectionDesc')}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-xs font-bold self-start sm:self-auto">
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('seller.walletVerifiedBadge')}</span>
                </span>
              </div>

              {/* تنبيه احتساب العمولة والشفافية المالية */}
              <div className="p-4 rounded-[20px] bg-brand-orange/10 border border-brand-orange/20 text-text-main text-xs flex items-start gap-3 leading-relaxed">
                <Info className="w-5 h-5 text-brand-orange shrink-0 mt-0.5" />
                <div>
                  <strong className="text-brand-orange-text dark:text-brand-orange font-bold">{t('seller.walletNoticeTitle')}</strong>{' '}
                  {t('seller.walletNoticeText')}
                  <div className="mt-1 font-semibold text-text-muted">
                    {t('seller.walletNoticeExample')}
                  </div>
                </div>
              </div>

              {/* بطاقة عرض المحفظة الحالية وجدول التحويل */}
              <div className="p-6 rounded-[24px] bg-surface-subtle/80 border border-surface-border flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#E60000] text-white flex items-center justify-center text-xl font-bold shadow-md shrink-0">
                    VF
                  </div>
                  <div>
                    <span className="text-xs text-text-muted block font-semibold">
                      {t('seller.currentWalletLabel')}
                    </span>
                    {walletNumber ? (
                      <>
                        <span className="font-mono text-2xl font-black text-text-main [unicode-bidi:isolate] tracking-wider" dir="ltr">
                          {walletNumber}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t('seller.nationalIdVerified')}</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-xs font-bold text-text-muted mt-1 block">
                        {t('seller.noWalletRegistered')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-surface-border">
                  {settings?.payoutScheduleText && (
                    <div className="px-3.5 py-1.5 rounded-full bg-surface border border-surface-border text-xs font-bold text-text-main shadow-xs">
                      {settings.payoutScheduleText}
                    </div>
                  )}
                  <span className="text-[11px] text-text-muted">
                    {t('seller.noExtraFees')}
                  </span>
                </div>
              </div>

              {/* زر طلب تعديل رقم المحفظة */}
              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setNewWalletNumber(walletNumber)
                    setWalletError('')
                    setWalletModalOpen(true)
                  }}
                  startIcon={<Wallet className="w-4 h-4" />}
                >
                  {t('seller.requestWalletUpdateBtn')}
                </Button>
              </div>
            </Card>

            {/* نافذة منبثقة لتعديل رقم المحفظة */}
            <Modal
              isOpen={walletModalOpen}
              onClose={() => setWalletModalOpen(false)}
              title={t('seller.modalUpdateTitle')}
              description={t('seller.modalUpdateDesc')}
            >
              <form onSubmit={handleUpdateWallet} className="space-y-4 pt-2">
                <Input
                  id="new-wallet-input"
                  type="tel"
                  label={t('seller.newWalletLabel')}
                  value={newWalletNumber}
                  onChange={(e) => {
                    setNewWalletNumber(e.target.value)
                    if (walletError) setWalletError('')
                  }}
                  placeholder="010XXXXXXXX"
                  error={walletError}
                  dir="ltr"
                  className="[unicode-bidi:isolate] text-start"
                  helperText={t('seller.newWalletHelper')}
                  required
                />

                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  <strong>{t('seller.securityNoticeTitle')}</strong> {t('seller.securityNoticeText')}
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-surface-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setWalletModalOpen(false)}
                  >
                    {t('seller.cancelBtn')}
                  </Button>
                  <Button
                    type="submit"
                    size="md"
                    loading={updatingWallet}
                    startIcon={<Check className="w-4 h-4" />}
                  >
                    {t('seller.confirmWalletBtn')}
                  </Button>
                </div>
              </form>
            </Modal>
          </div>
        )}
      </div>

      {/* الأقسام المشتركة: تغيير كلمة المرور وتسجيل الخروج */}
      <ChangePasswordCard />

      <LogoutCard
        onLogout={async () => {
          await logout()
          navigate('/login')
        }}
      />
    </div>
  )
}
