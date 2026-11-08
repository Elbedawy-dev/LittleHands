import {
  Building2,
  Phone,
  Search,
  User,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { Tabs } from '../../components/ui/Tabs'
import { useDebounce } from '../../hooks/useDebounce'
import { useFormat } from '../../hooks/useFormat'
import { contactService } from '../../services/contactService'

const STATUS_CONFIG = {
  new: {
    label: 'طلب جديد',
    labelEn: 'New',
    variant: 'danger',
  },
  pending: {
    label: 'قيد المتابعة',
    labelEn: 'Pending',
    variant: 'warning',
  },
  contacted: {
    label: 'تم التواصل',
    labelEn: 'Contacted',
    variant: 'info',
  },
  closed: {
    label: 'مكتمل / مغلق',
    labelEn: 'Closed',
    variant: 'success',
  },
}

export default function AdminCustomRequestsPage() {
  const { i18n } = useTranslation(['admin-core', 'common'])
  const isEn = i18n.language === 'en'
  const { formatDate } = useFormat()

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [updatingId, setUpdatingId] = useState(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await contactService.getCustomRequests()
      const list = Array.isArray(res) ? res : (res?.items || [])
      setRequests(list)
    } catch (err) {
      console.error('Failed to load custom requests:', err)
      toast.error(isEn ? 'Failed to load custom requests' : 'تعذر تحميل طلبات التفصيل الخاصة')
    } finally {
      setLoading(false)
    }
  }, [isEn])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id)
    try {
      await contactService.updateCustomRequestStatus(id, newStatus)
      toast.success(isEn ? 'Status updated' : 'تم تحديث حالة الطلب')
      setRequests((prev) =>
        prev.map((r) => (r.id === id || r._id === id ? { ...r, status: newStatus } : r))
      )
    } catch (err) {
      console.error('Failed to update status:', err)
      toast.error(err.message || (isEn ? 'Failed to update status' : 'تعذر تحديث حالة الطلب'))
    } finally {
      setUpdatingId(null)
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
      render: (r) => (
        <div className="w-36">
          <Select
            id={`request-status-${r.id || r._id}`}
            value={r.status || 'new'}
            onChange={(e) => handleStatusChange(r.id || r._id, e.target.value)}
            disabled={updatingId === (r.id || r._id)}
            className="text-xs py-1 h-8"
          >
            <option value="new">{isEn ? 'New' : 'طلب جديد'}</option>
            <option value="pending">{isEn ? 'Pending' : 'قيد المتابعة'}</option>
            <option value="contacted">{isEn ? 'Contacted' : 'تم التواصل'}</option>
            <option value="closed">{isEn ? 'Closed' : 'مكتمل / مغلق'}</option>
          </Select>
        </div>
      ),
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
  ]

  const renderMobileCard = (r) => {
    const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.new
    return (
      <Card padding="md" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold text-sm text-text-main flex items-center gap-1.5">
            <User className="w-4 h-4 text-brand-orange" />
            <span>{r.name}</span>
          </div>
          <Badge variant={cfg.variant} size="sm">
            {isEn ? cfg.labelEn : cfg.label}
          </Badge>
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

          <div className="w-36">
            <Select
              id={`request-status-mob-${r.id || r._id}`}
              value={r.status || 'new'}
              onChange={(e) => handleStatusChange(r.id || r._id, e.target.value)}
              disabled={updatingId === (r.id || r._id)}
              className="text-xs py-1 h-8"
            >
              <option value="new">{isEn ? 'New' : 'طلب جديد'}</option>
              <option value="pending">{isEn ? 'Pending' : 'قيد المتابعة'}</option>
              <option value="contacted">{isEn ? 'Contacted' : 'تم التواصل'}</option>
              <option value="closed">{isEn ? 'Closed' : 'مكتمل / مغلق'}</option>
            </Select>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEn ? 'Custom Nursery Requests' : 'طلبات الحضانات الخاصة'}
        description={
          isEn
            ? 'Review and manage custom manufacturing requests submitted by nurseries and educators.'
            : 'متابعة وإدارة طلبات تفصيل وتصنيع الوسائل التعليمية المخصصة للحضانات والمعلمات.'
        }
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
              placeholder={isEn ? 'Search requests...' : 'بحث بالاسم، الهاتف، الحضانة...'}
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
        emptyTitle={isEn ? 'No custom requests found' : 'لا توجد طلبات حضانات خاصة'}
        emptyDescription={
          isEn
            ? 'Any custom order requests submitted via the contact form will appear here.'
            : 'أي طلبات تفصيل وسيلة خاصة يتم إرسالها من النموذج ستظهر هنا.'
        }
      />
    </div>
  )
}

