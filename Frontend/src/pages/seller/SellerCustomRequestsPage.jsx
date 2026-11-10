import {
  Building2,
  Clock,
  Lock,
  MessageCircle,
  MessageSquare,
  Phone,
  PhoneCall,
  Search,
  Sparkles,
  User,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { Tabs } from '../../components/ui/Tabs'
import { useDebounce } from '../../hooks/useDebounce'
import { useFormat } from '../../hooks/useFormat'
import { sellerService } from '../../services/sellerService'
import { getFriendlyError } from '../../utils'

/**
 * Converts Egyptian local phone number to international WhatsApp wa.me format
 * Example: 01012345678 -> https://wa.me/201012345678
 */
function getWhatsAppLink(phone) {
  if (!phone || typeof phone !== 'string') return ''
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) {
    digits = digits.slice(1)
  }
  if (!digits.startsWith('20')) {
    digits = '20' + digits
  }
  return `https://wa.me/${digits}`
}

export default function SellerCustomRequestsPage() {
  const { t, i18n } = useTranslation(['seller', 'nav', 'errors', 'common'])
  const isEn = i18n.language === 'en'
  const { formatRelativeTime, formatDate } = useFormat()

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('available')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Expanded card IDs for long descriptions
  const [expandedIds, setExpandedIds] = useState(new Set())

  // Claim modal state
  const [claimTarget, setClaimTarget] = useState(null)
  const [claiming, setClaiming] = useState(false)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await sellerService.getCustomRequests()
      const list = Array.isArray(res) ? res : res?.items || []
      setRequests(list)
    } catch (err) {
      console.error('Failed to load seller custom requests:', err)
      toast.error(getFriendlyError(err, t))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleOpenClaimConfirm = (request) => {
    setClaimTarget(request)
  }

  const handleConfirmClaim = async () => {
    if (!claimTarget) return
    setClaiming(true)
    try {
      const updated = await sellerService.claimCustomRequest(claimTarget.id)
      toast.success(
        t(
          'seller:customRequests.confirm.successToast',
          'تم استلام الطلب بنجاح! يمكنكِ الآن التواصل مع العميلة.'
        )
      )

      // Update state locally with full details
      setRequests((prev) =>
        prev.map((r) =>
          r.id === claimTarget.id
            ? {
                ...r,
                ...updated,
                claimed: true,
                claimedByMe: true,
                status: 'contacted',
                phone: updated?.phone || r.phone,
              }
            : r
        )
      )
      setClaimTarget(null)
    } catch (err) {
      console.error('Claim custom request failed:', err)
      const code = err.response?.data?.error?.code || err.code
      if (code === 'CUSTOM_REQUEST_ALREADY_CLAIMED') {
        toast.error(
          t('errors:CUSTOM_REQUEST_ALREADY_CLAIMED', 'سبقتك بائعة أخرى لاستلام هذا الطلب')
        )
      } else {
        toast.error(getFriendlyError(err, t))
      }
      // Re-fetch in background to sync state
      fetchRequests()
      setClaimTarget(null)
    } finally {
      setClaiming(false)
    }
  }

  // Counts for tabs
  const counts = useMemo(() => {
    const availableCount = requests.filter((r) => !r.claimed && ['new', 'pending'].includes(r.status)).length
    const mineCount = requests.filter((r) => r.claimedByMe).length
    return {
      all: requests.length,
      available: availableCount,
      mine: mineCount,
    }
  }, [requests])

  // Filtered requests based on active tab & search
  const filteredRequests = useMemo(() => {
    let list = [...requests]

    if (activeTab === 'available') {
      list = list.filter((r) => !r.claimed && ['new', 'pending'].includes(r.status))
    } else if (activeTab === 'mine') {
      list = list.filter((r) => r.claimedByMe)
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase()
      list = list.filter(
        (r) =>
          (r.nurseryName && r.nurseryName.toLowerCase().includes(q)) ||
          (r.customerName && r.customerName.toLowerCase().includes(q)) ||
          (r.details && r.details.toLowerCase().includes(q))
      )
    }

    return list
  }, [requests, activeTab, debouncedSearch])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('seller:customRequests.title', 'طلبات الحضانات الخاصة')}
        description={t(
          'seller:customRequests.subtitle',
          "وسائل تعليمية مخصصة مطلوبة من الحضانات. أول بائعة تضغط 'أنا هنفذ الطلب' تستلمه ويتقفل على غيرها."
        )}
      />

      {/* Tabs & Search Card */}
      <Card padding="none" className="p-3.5 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 min-w-0">
          <div className="w-full sm:w-auto overflow-x-auto no-scrollbar min-w-0">
            <Tabs
              tabs={[
                {
                  id: 'available',
                  label: t('seller:customRequests.tabs.available', 'متاحة للتنفيذ'),
                  count: counts.available,
                },
                {
                  id: 'mine',
                  label: t('seller:customRequests.tabs.mine', 'طلباتي المستلمة'),
                  count: counts.mine,
                },
                {
                  id: 'all',
                  label: t('seller:customRequests.tabs.all', 'الكل'),
                  count: counts.all,
                },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </div>

          <div className="w-full sm:w-72 shrink-0">
            <Input
              id="seller-custom-requests-search"
              placeholder={t(
                'seller:customRequests.searchPlaceholder',
                'بحث باسم الحضانة، صاحبة الطلب، أو التفاصيل...'
              )}
              icon={<Search className="w-4 h-4 text-text-muted" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Requests Grid / Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <Card key={idx} padding="lg" className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32 rounded-lg" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <div className="pt-3 border-t border-surface-border flex items-center justify-between">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-9 w-28 rounded-xl" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="w-8 h-8 text-brand-orange" />}
          title={t('seller:customRequests.empty.title', 'لا توجد طلبات خاصة')}
          description={
            activeTab === 'available'
              ? t(
                  'seller:customRequests.empty.descAvailable',
                  'لا توجد طلبات خاصة متاحة حالياً للتنفيذ. تفقدي القائمة لاحقاً.'
                )
              : activeTab === 'mine'
              ? t(
                  'seller:customRequests.empty.descMine',
                  'لم تقومي باستلام أي طلب خاص حتى الآن. تفقدي الطلبات المتاحة واستلمي طلبكِ!'
                )
              : t(
                  'seller:customRequests.empty.descAll',
                  'ستظهر هنا أي طلبات تفصيل مخصصة تقدمها الحضانات والمعلمات.'
                )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRequests.map((item) => {
            const isExpanded = expandedIds.has(item.id)
            const isAvailable = !item.claimed && ['new', 'pending'].includes(item.status)
            const isClaimedByMe = item.claimedByMe
            const isClaimedByOther = item.claimed && !item.claimedByMe

            return (
              <Card
                key={item.id}
                padding="none"
                className="p-4 sm:p-5 flex flex-col justify-between transition-shadow hover:shadow-md border border-surface-border bg-surface dark:bg-surface-raised"
              >
                <div className="space-y-3">
                  {/* Top Header: Nursery / Client & Status Badge */}
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="space-y-1 min-w-0 flex-1">
                      {item.nurseryName ? (
                        <div className="flex items-center gap-1.5 font-bold text-base text-text-main truncate">
                          <Building2 className="w-4 h-4 text-brand-orange shrink-0" />
                          <span className="truncate">{item.nurseryName}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 font-bold text-base text-text-main truncate">
                          <User className="w-4 h-4 text-brand-orange shrink-0" />
                          <span className="truncate">{item.customerName}</span>
                        </div>
                      )}

                      {item.nurseryName && item.customerName && (
                        <div className="flex items-center gap-1.5 text-xs text-text-muted truncate">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{item.customerName}</span>
                        </div>
                      )}
                    </div>

                    {/* Badge */}
                    <div className="shrink-0">
                      {isClaimedByMe ? (
                        <Badge variant="success" size="sm">
                          {t('seller:customRequests.card.myRequest', 'طلبكِ')}
                        </Badge>
                      ) : isClaimedByOther ? (
                        <Badge variant="secondary" size="sm">
                          {t('seller:customRequests.card.claimedByOther', {
                            name: item.claimedByName || (isEn ? 'Another Seller' : 'بائعة أخرى'),
                            defaultValue: `استلمتها: ${item.claimedByName || 'بائعة أخرى'}`,
                          })}
                        </Badge>
                      ) : (
                        <Badge variant="info" size="sm">
                          {t('seller:customRequests.card.availableBadge', 'متاح للتنفيذ')}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Relative Time & Date */}
                  <div className="flex items-center gap-1 text-[11px] text-text-muted">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>
                      {item.createdAt
                        ? formatRelativeTime(item.createdAt) || formatDate(item.createdAt)
                        : '—'}
                    </span>
                  </div>

                  {/* Details box with expand/collapse */}
                  <div className="p-3 rounded-xl bg-surface-subtle dark:bg-surface/50 border border-surface-border text-xs text-text-main leading-relaxed">
                    <p
                      className={`${
                        !isExpanded ? 'line-clamp-3' : ''
                      } whitespace-pre-wrap select-text`}
                    >
                      {item.details}
                    </p>
                    {item.details && item.details.length > 100 && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(item.id)}
                        className="mt-1 text-[11px] font-bold text-brand-orange hover:underline focus:outline-hidden"
                      >
                        {isExpanded
                          ? t('seller:customRequests.card.showLess', 'عرض أقل')
                          : t('seller:customRequests.card.showMore', 'عرض المزيد')}
                      </button>
                    )}
                  </div>

                  {/* Phone Section */}
                  <div className="pt-1 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-text-muted">
                      {isClaimedByMe ? (
                        <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-text-muted" />
                      )}
                      <span className="font-medium text-text-muted">
                        {t('seller:customRequests.card.phone', 'الهاتف')}:
                      </span>
                    </div>

                    <span
                      dir="ltr"
                      className={`font-mono text-xs font-bold ${
                        isClaimedByMe
                          ? 'text-emerald-600 dark:text-emerald-400 select-all'
                          : 'text-text-muted tracking-wider'
                      } [unicode-bidi:isolate]`}
                    >
                      {item.phone}
                    </span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-4 mt-4 border-t border-surface-border">
                  {isClaimedByMe ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${item.phone}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>{t('seller:customRequests.card.call', 'اتصال')}</span>
                      </a>
                      <a
                        href={getWhatsAppLink(item.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] dark:text-[#25D366] border border-[#25D366]/30 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{t('seller:customRequests.card.whatsapp', 'واتساب')}</span>
                      </a>
                    </div>
                  ) : isClaimedByOther ? (
                    <Button
                      variant="outline"
                      disabled
                      className="w-full text-xs opacity-60 cursor-not-allowed"
                    >
                      {t('seller:customRequests.card.claimedDisabled', 'تم الاستلام')}
                    </Button>
                  ) : isAvailable ? (
                    <Button
                      variant="primary"
                      onClick={() => handleOpenClaimConfirm(item)}
                      className="w-full text-xs font-bold shadow-xs hover:shadow-md"
                    >
                      <Sparkles className="w-3.5 h-3.5 me-1.5" />
                      {t('seller:customRequests.card.claimBtn', 'أنا هنفذ الطلب')}
                    </Button>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(claimTarget)}
        onClose={() => setClaimTarget(null)}
        onConfirm={handleConfirmClaim}
        title={t('seller:customRequests.confirm.title', 'تأكيد استلام الطلب')}
        message={t(
          'seller:customRequests.confirm.message',
          'هل أنتِ متأكدة؟ بعد التأكيد لن تستطيع بائعة أخرى استلام هذا الطلب.'
        )}
        confirmText={t('seller:customRequests.confirm.confirmBtn', 'تأكيد واستلام')}
        cancelText={t('seller:customRequests.confirm.cancelBtn', 'إلغاء')}
        variant="primary"
        loading={claiming}
      />
    </div>
  )
}
