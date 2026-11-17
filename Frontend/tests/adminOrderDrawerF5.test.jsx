import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../src/config/i18n'
import { ORDER_STATUS } from '../src/config/constants'
import { OrderTimeline } from '../src/components/order/OrderTimeline'
import { AdminOrderDrawer } from '../src/features/admin/orders/AdminOrderDrawer'
import { toOrderDTO } from '../../Backend/src/modules/orders/dto.js'

describe('F5: AdminOrderDrawer layout, single scroll, and OrderTimeline deduplication', () => {
  afterEach(async () => {
    cleanup()
    await i18n.changeLanguage('ar')
  })

  function buildOrder(timeline = []) {
    const sellerId = '650000000000000000000011'
    const sellerNamesMap = new Map([
      [sellerId, { sellerName: 'ورشة النور', sellerNameEn: 'Al Noor Workshop' }],
    ])

    return toOrderDTO(
      {
        _id: '650000000000000000000030',
        number: 'LH-2026-0200',
        customerId: '650000000000000000000003',
        items: [
          {
            productId: '650000000000000000000051',
            name: { ar: 'لوحة الأرقام', en: 'Numbers Board' },
            qty: 1,
            unitPrice: 200,
            sellerId,
            commissionRate: 0.2,
            commissionAmount: 40,
            sellerNet: 160,
          },
        ],
        delivery: {
          name: 'سارة علي',
          phone: '01012345678',
          governorate: 'الجيزة',
          city: 'الدقي',
          address: 'شارع التحرير',
        },
        subtotal: 200,
        shipping: 35,
        total: 235,
        status: 'pending_payment',
        timeline,
        createdAt: new Date('2026-11-16T09:00:00.000Z'),
        updatedAt: new Date('2026-11-16T09:10:00.000Z'),
      },
      'admin',
      null,
      sellerNamesMap
    )
  }

  it('removes nested vertical scroll, keeps status bar responsive without clipping delete button, and isolates table horizontal scroll', async () => {
    await i18n.changeLanguage('ar')
    const order = buildOrder([
      { status: 'pending_payment', at: '2026-11-16T09:00:00.000Z' },
    ])

    render(
      <MemoryRouter>
        <AdminOrderDrawer
          order={order}
          isOpen={true}
          onClose={() => {}}
          onDeleteOrder={() => {}}
        />
      </MemoryRouter>
    )

    const content = screen.getByTestId('admin-order-drawer-content')
    expect(content.className).not.toContain('overflow-y-auto')
    expect(content.className).not.toContain('max-h-[calc(100vh-140px)]')

    // Exactly one vertical scroller inside drawer dialog (owned by Drawer.jsx)
    const dialog = screen.getByRole('dialog')
    const verticalScrollers = dialog.querySelectorAll('.overflow-y-auto')
    expect(verticalScrollers).toHaveLength(1)
    expect(verticalScrollers[0].contains(content)).toBe(true)

    // Responsive status bar ordering & Select container spacing
    const badgeWrap = screen.getByTestId('admin-order-status-badge-wrap')
    const selectWrap = screen.getByTestId('admin-order-status-select-wrap')
    const deleteWrap = screen.getByTestId('admin-order-delete-wrap')

    expect(badgeWrap.className).toContain('order-1')
    expect(deleteWrap.className).toContain('order-2')
    expect(deleteWrap.className).toContain('sm:order-3')
    expect(deleteWrap.className).toContain('shrink-0')
    expect(selectWrap.className).toContain('order-3')
    expect(selectWrap.className).toContain('sm:order-2')
    expect(selectWrap.className).toContain('w-full')
    expect(selectWrap.className).toContain('sm:w-44')
    expect(selectWrap.className).toContain('min-w-0')

    // Select's containerClassName="mb-0" strips default mb-5
    const selectContainer = selectWrap.firstElementChild
    expect(selectContainer.className).toContain('mb-0')
    expect(selectContainer.className).not.toContain('mb-5')

    // Commission table horizontal scroll stays isolated inside table region
    const tableRegion = screen.getByTestId('admin-order-commission-scroll')
    expect(tableRegion.getAttribute('role')).toBe('region')
    expect(tableRegion.getAttribute('tabindex')).toBe('0')
    expect(tableRegion.className).toContain('overflow-x-auto')
    expect(tableRegion.querySelector('table').className).toContain('min-w-[520px]')
  })

  it('collapses consecutive identical statuses in AR/EN with translated proof sub-notes and preserves non-consecutive repetitions', async () => {
    await i18n.changeLanguage('ar')
    const consecutiveTimeline = [
      { status: 'pending_payment', note: '', at: '2026-11-16T09:00:00.000Z' },
      { status: 'pending_payment', note: 'Proof submitted', at: '2026-11-16T09:05:00.000Z' },
    ]

    const { rerender, container } = render(<OrderTimeline timeline={consecutiveTimeline} />)

    // Only one visible step for consecutive pending_payment
    const stepBadgesAr = screen.getAllByText(ORDER_STATUS.pending_payment.label)
    // Title + StatusBadge = 2 elements per visible step -> expect exactly 2 elements total
    expect(stepBadgesAr).toHaveLength(2)
    expect(screen.getByText('تم إرسال إثبات الدفع')).toBeTruthy()
    expect(document.body.textContent).not.toContain('Proof submitted')
    // Latest checkmark appears on the single visible entry
    expect(container.querySelectorAll('.lucide-circle-check')).toHaveLength(1)

    // Switch to EN and verify Proof submitted renders cleanly
    await i18n.changeLanguage('en')
    rerender(<OrderTimeline timeline={consecutiveTimeline} />)
    expect(screen.getByText('Proof submitted')).toBeTruthy()
    expect(screen.getAllByText(ORDER_STATUS.pending_payment.labelEn)).toHaveLength(2)

    // Non-consecutive repetitions (pending_payment -> payment_rejected -> pending_payment) stay separate
    await i18n.changeLanguage('ar')
    const resubmittedTimeline = [
      { status: 'pending_payment', at: '2026-11-16T09:00:00.000Z' },
      { status: 'pending_payment', note: 'Proof submitted', at: '2026-11-16T09:05:00.000Z' },
      { status: 'payment_rejected', reasonCode: 'unclear_receipt', at: '2026-11-16T09:20:00.000Z' },
      { status: 'pending_payment', at: '2026-11-16T09:30:00.000Z' },
      { status: 'pending_payment', note: 'Proof resubmitted', at: '2026-11-16T09:35:00.000Z' },
    ]
    rerender(<OrderTimeline timeline={resubmittedTimeline} />)

    // 2 visible pending_payment groups (first + post-rejection) = 4 elements (title + badge each)
    expect(screen.getAllByText(ORDER_STATUS.pending_payment.label)).toHaveLength(4)
    expect(screen.getAllByText(ORDER_STATUS.payment_rejected.label)).toHaveLength(2)
    expect(screen.getByText('تم إرسال إثبات الدفع')).toBeTruthy()
    expect(screen.getByText('تمت إعادة إرسال إثبات الدفع')).toBeTruthy()
    expect(document.body.textContent).not.toContain('Proof resubmitted')
    // Exactly 1 CheckCircle2 icon on the last visible entry
    expect(container.querySelectorAll('.lucide-circle-check')).toHaveLength(1)
  })
})
