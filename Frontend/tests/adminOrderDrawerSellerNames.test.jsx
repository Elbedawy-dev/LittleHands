import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../src/config/i18n'
import { AdminOrderDrawer } from '../src/features/admin/orders/AdminOrderDrawer'
import { toOrderDTO } from '../../Backend/src/modules/orders/dto.js'

describe('F2: AdminOrderDrawer seller names and unknown-seller fallback', () => {
  afterEach(async () => {
    await i18n.changeLanguage('ar')
  })

  function buildOrder() {
    const sellerId1 = '650000000000000000000011'
    const sellerId2 = '650000000000000000000099'

    const sellerNamesMap = new Map([
      [sellerId1, { sellerName: 'ورشة النور التعليمية', sellerNameEn: 'Al Noor Workshop' }],
    ])

    return toOrderDTO(
      {
        _id: '650000000000000000000030',
        number: 'LH-2026-0100',
        customerId: '650000000000000000000003',
        items: [
          {
            productId: '650000000000000000000051',
            name: { ar: 'لوحة الحروف', en: 'Letters Board' },
            qty: 1,
            unitPrice: 150,
            sellerId: sellerId1,
            commissionRate: 0.2,
            commissionAmount: 30,
            sellerNet: 120,
          },
          {
            productId: '650000000000000000000052',
            name: { ar: 'بطاقات الألوان', en: 'Color Cards' },
            qty: 2,
            unitPrice: 50,
            sellerId: sellerId2,
            commissionRate: 0.2,
            commissionAmount: 20,
            sellerNet: 80,
          },
        ],
        delivery: {
          name: 'منى أحمد',
          phone: '01012345678',
          governorate: 'القاهرة',
          city: 'المعادي',
          address: 'شارع 9',
        },
        subtotal: 250,
        shipping: 40,
        total: 290,
        status: 'pending_payment',
        timeline: [],
        createdAt: new Date('2026-11-15T10:00:00.000Z'),
        updatedAt: new Date('2026-11-15T10:00:00.000Z'),
      },
      'admin',
      null,
      sellerNamesMap
    )
  }

  it('displays seller names in AR and falls back to translated unknown seller without ever exposing sellerId', async () => {
    await i18n.changeLanguage('ar')
    const order = buildOrder()

    render(
      <MemoryRouter>
        <AdminOrderDrawer order={order} isOpen={true} onClose={() => {}} />
      </MemoryRouter>
    )

    expect(screen.getAllByText('ورشة النور التعليمية').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('بائعة غير معروفة').length).toBeGreaterThanOrEqual(2)
    expect(document.body.textContent).not.toContain('650000000000000000000011')
    expect(document.body.textContent).not.toContain('650000000000000000000099')
  })

  it('displays English seller names in EN and translated Unknown seller fallback without exposing sellerId', async () => {
    await i18n.changeLanguage('en')
    const order = buildOrder()

    render(
      <MemoryRouter>
        <AdminOrderDrawer order={order} isOpen={true} onClose={() => {}} />
      </MemoryRouter>
    )

    expect(screen.getAllByText('Al Noor Workshop').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Unknown seller').length).toBeGreaterThanOrEqual(2)
    expect(document.body.textContent).not.toContain('650000000000000000000011')
    expect(document.body.textContent).not.toContain('650000000000000000000099')
  })
})
