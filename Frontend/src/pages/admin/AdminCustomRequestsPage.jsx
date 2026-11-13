import {
  Building2,
  Phone,
  Search,
  Trash2,
  User,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable } from '../../components/ui/DataTable'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Tabs } from '../../components/ui/Tabs'
import {
  CUSTOM_REQUEST_STATUS_CONFIG,
  getCustomRequestStatusLabel,
  getCustomRequestStatusVariant,
} from '../../features/custom-requests/customRequestStatusConfig'
import { useDebounce } from '../../hooks/useDebounce'
import { useFormat } from '../../hooks/useFormat'
import { contactService } from '../../services/contactService'
import { getFriendlyError } from '../../utils'

export default function AdminCustomRequestsPage() {
  const { t, i18n } = useTranslation(['admin-core', 'common'])
  const isEn = i18n.language === 'en'
  const { formatDate } = useFormat()

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [requestToDelete, setRequestToDelete] = useState(null)
  const [isDeletingRequest, setIsDeletingRequest] = useState(false)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await contactService.getCustomRequests()
      const list = Array.isArray(res) ? res : (res?.items || [])
      setRequests(list)
    } catch (err) {
      console.error('Failed to load custom requests:', err)
      toast.error(getFriendlyError(err, t))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleDeleteRequest = async () => {
    if (!requestToDelete) return
    const id = requestToDelete.id || requestToDelete._id
    try {
      setIsDeletingRequest(true)
      await contactService.deleteCustomRequest(id)
      toast.success(isEn ? 'Custom request deleted successfully' : 'تم حذف طلب التفصيل بنجاح')
      setRequestToDelete(null)
      await fetchRequests()
    } catch (err) {
      toast.error(getFriendlyError(err, t))
    } finally {
      setIsDeletingRequest(false)
    }
  }

  const counts = useMemo(() => {
    return {
      all: requests.length,
      new: requests.filter((r) => r.status === 'new').length,
      pending: requests.filter((r) => r.status === 'pending').length,
      contacted: requests.filter((r) => r.status === 'contacted').length,
      closed: requests.filter((r) => r.status === 'closed').length,
    }
  }, [requests])

  const filteredRequests = useMemo(() => {
    let list = [...requests]

    if (activeTab !== 'all') {
      list = list.filter((r) => r.status === activeTab)
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase()
      list = list.filter(
        (r) =>
          (r.name && r.name.toLowerCase().includes(q)) ||
          (r.phone && r.phone.includes(q)) ||
          (r.nurseryName && r.nurseryName.toLowerCase().includes(q)) ||
          (r.details && r.details.toLowerCase().includes(q))
      )
    }

    return list
  }, [requests, activeTab, debouncedSearch])

  const columns = [
    {
      header: isEn ? 'Client / Nursery' : 'العميلة / الحضانة',
      key: 'name',
      render: (r) => (
        <div className="space-y-1">
          <div className="font-bold text-text-main flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-brand-orange" />
            <span>{r.name}</span>
          </div>
          {r.nurseryName && (
            <div className="text-xs text-text-muted flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              <span>{r.nurseryName}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: isEn ? 'Phone' : 'رقم الهاتف',
      key: 'phone',
      render: (r) => (
        <a
          href={`tel:${r.phone}`}
          dir="ltr"
          className="font-mono text-xs font-bold text-brand-orange-text dark:text-brand-orange inline-flex items-center gap-1 hover:underline [unicode-bidi:isolate]"
        >
          <Phone className="w-3 h-3" />
          <span>{r.phone}</span>
        </a>
      ),
    },
    {
      header: isEn ? 'Requested Details' : 'تفاصيل الوسيلة المطلوبة',
      key: 'details',
      render: (r) => (
        <p className="text-xs text-text-main max-w-md line-clamp-3 leading-relaxed whitespace-pre-wrap">
          {r.details}
        </p>
      ),
    },
    {
      header: isEn ? 'Status' : 'الحالة',
      key: 'status',
      render: (r) => {
        const variant = getCustomRequestStatusVariant(r.status)
        const label = getCustomRequestStatusLabel(r.status, isEn)
        return (
          <div className="w-36 space-y-1.5">
            <Badge variant={variant} size="sm" className="w-full text-center justify-center">
              {label}
            </Badge>
            {r.claimedByName && (
              <Badge variant="secondary" size="sm" className="truncate max-w-full block text-center">
                {isEn ? `Claimed by: ${r.claimedByName}` : `استلمتها: ${r.claimedByName}`}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      header: isEn ? 'Date' : 'تاريخ الطلب',
      key: 'createdAt',
      render: (r) => (
        <span className="text-xs text-text-muted whitespace-nowrap block">
          {r.createdAt ? formatDate(r.createdAt) : '—'}
        </span>
      ),
    },
    {
      header: isEn ? 'Actions' : 'إجراءات',
      key: 'actions',
      render: (r) => (
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRequestToDelete(r)}
            className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            title={isEn ? 'Delete Request' : 'حذف الطلب'}
            aria-label={isEn ? 'Delete Request' : 'حذف الطلب'}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ]

  const renderMobileCard = (r) => {
    const cfg = CUSTOM_REQUEST_STATUS_CONFIG[r.status] || CUSTOM_REQUEST_STATUS_CONFIG.new
    return (
      <Card padding="md" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold text-sm text-text-main flex items-center gap-1.5">
            <User className="w-4 h-4 text-brand-orange" />
            <span>{r.name}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {r.claimedByName && (
              <Badge variant="secondary" size="sm">
                {isEn ? `Claimed by: ${r.claimedByName}` : `استلمتها: ${r.claimedByName}`}
              </Badge>
            )}
            <Badge variant={cfg.variant} size="sm">
              {isEn ? cfg.labelEn : cfg.labelAr}
            </Badge>
          </div>
        </div>

        {r.nurseryName && (
          <div className="text-xs text-text-muted flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-text-muted" />
            <span>{r.nurseryName}</span>
          </div>
        )}

        <div className="text-xs">
          <a
            href={`tel:${r.phone}`}
            dir="ltr"
            className="font-mono font-bold text-brand-orange-text dark:text-brand-orange inline-flex items-center gap-1 [unicode-bidi:isolate]"
          >
            <Phone className="w-3 h-3" />
            <span>{r.phone}</span>
          </a>
        </div>

        <div className="p-3 rounded-xl bg-surface-subtle text-xs text-text-main leading-relaxed">
          {r.details}
        </div>

        <div className="pt-2 border-t border-surface-border flex items-center justify-between gap-3">
          <span className="text-[11px] text-text-muted">
            {r.createdAt ? formatDate(r.createdAt) : '—'}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRequestToDelete(r)}
            className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            title={isEn ? 'Delete Request' : 'حذف الطلب'}
            aria-label={isEn ? 'Delete Request' : 'حذف الطلب'}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('customRequests.title')}
        description={t('customRequests.description')}
      />

      {/* شريط البحث والتبويبات */}
      <Card padding="md" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Tabs
            tabs={[
              { id: 'all', label: isEn ? 'All' : 'الكل', count: counts.all },
              { id: 'new', label: isEn ? 'New' : 'جديدة', count: counts.new },
              { id: 'pending', label: isEn ? 'Pending' : 'قيد المتابعة', count: counts.pending },
              { id: 'contacted', label: isEn ? 'Contacted' : 'تم التواصل', count: counts.contacted },
              { id: 'closed', label: isEn ? 'Closed' : 'مكتملة', count: counts.closed },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <div className="w-full sm:w-64">
            <Input
              id="custom-requests-search"
              placeholder={t('customRequests.searchPlaceholder')}
              icon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={filteredRequests}
        loading={loading}
        renderMobileCard={renderMobileCard}
        keyExtractor={(r) => r.id || r._id}
        emptyTitle={t('customRequests.emptyTitle')}
        emptyDescription={t('customRequests.emptyDescription')}
      />

      {/* نافذة تأكيد حذف طلب التفصيل */}
      <ConfirmDialog
        isOpen={Boolean(requestToDelete)}
        onClose={() => !isDeletingRequest && setRequestToDelete(null)}
        onConfirm={handleDeleteRequest}
        title={isEn ? 'Delete Custom Request' : 'حذف طلب التفصيل'}
        message={
          isEn
            ? `Are you sure you want to delete the custom request from "${requestToDelete?.name}"? This action cannot be undone.`
            : `هل أنتِ متأكدة من رغبتكِ في حذف طلب التفصيل المقدم من "${requestToDelete?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
        }
        confirmText={isEn ? 'Delete' : 'حذف'}
        cancelText={isEn ? 'Cancel' : 'إلغاء'}
        variant="danger"
        loading={isDeletingRequest}
      />
    </div>
  )
}

