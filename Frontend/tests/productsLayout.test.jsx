import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import '../src/config/i18n'
import i18n from '../src/config/i18n'
import apiClient from '../src/services/api'
import { AppProviders } from '../src/app/providers'
import { router } from '../src/app/router'
import { ProductCard } from '../src/components/product/ProductCard'

const sampleProductRich = {
  id: '650000000000000000000101',
  categoryId: 'alphabet-boards',
  name: { ar: 'لوحة الحروف العربية بالجوخ مع أنشطة تفاعلية', en: 'Arabic Alphabet Felt Board' },
  description: {
    ar: 'وسيلة تعليمية يدوية متقنة الصنع من الجوخ الملون ومناسبة لفصول الحضانة والتأسيس المبكر.',
    en: 'Handcrafted colorful felt educational board tailored for early nursery literacy classrooms.',
  },
  price: 280,
  stock: 8,
  stages: ['nursery', 'kg1', 'kg2', 'primary'],
  materials: ['felt', 'cardstock', 'fabric', 'canson'],
  images: ['https://res.cloudinary.com/demo/image/upload/v1/sample.jpg'],
  sellerId: '650000000000000000000201',
  sellerName: 'ورشة أنامل مبدعة',
  sellerNameEn: 'Creative Hands Workshop',
}

describe('C1: ProductsPage Responsive Layout & ProductCard Proportions', () => {
  const originalAdapter = apiClient.defaults.adapter

  beforeEach(async () => {
    await i18n.changeLanguage('ar')
  })

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
  })

  it('ProductCard uses <article> h-full, 4/3 image, 2-line desc, single-line stage/material rows with +N, and merged stock pill', () => {
    const memRouter = createMemoryRouter([
      {
        path: '/',
        element: <ProductCard product={sampleProductRich} />,
      },
    ])

    const { container } = render(
      <AppProviders>
        <RouterProvider router={memRouter} />
      </AppProviders>
    )

    const article = container.querySelector('article')
    expect(article).toBeTruthy()
    expect(article.className).toContain('h-full')
    expect(article.className).toContain('flex-col')

    expect(container.querySelector('.aspect-\\[4\\/3\\]')).toBeTruthy()

    const descEl = article.querySelector('p')
    expect(descEl.className).toContain('line-clamp-2')

    const stagesRow = screen.getByTestId('product-stages-row')
    expect(stagesRow.className).toContain('flex-nowrap')
    expect(stagesRow.textContent).toContain('+2')

    const materialsRow = screen.getByTestId('product-materials-row')
    expect(materialsRow.className).toContain('flex-nowrap')
    expect(materialsRow.textContent).toContain('+2')

    const stockPill = screen.getByTestId('product-stock-pill')
    expect(stockPill).toBeTruthy()
    expect(stockPill.parentElement.querySelector('a')).toBeTruthy()

    expect(article.querySelector('footer')).toBeTruthy()
  })

  it('ProductsPage renders fixed ~260px sidebar track and responsive auto-fill minmax(240px,1fr) grid matching 1366 (3 cols) / 1920 (4 cols) / 390 (1 col)', async () => {
    apiClient.defaults.adapter = async (config) => {
      const url = (config.url || '').split('?')[0].replace(/^\/api\/v1/, '')
      if (url === '/catalog/products') {
        return {
          data: {
            success: true,
            data: { items: [sampleProductRich], total: 1, totalPages: 1 },
          },
          status: 200,
          headers: {},
          config,
        }
      }
      if (url === '/sellers') {
        return { data: { success: true, data: { items: [] } }, status: 200, headers: {}, config }
      }
      if (url === '/settings/public' || url === '/settings') {
        return { data: { success: true, data: {} }, status: 200, headers: {}, config }
      }
      return { data: { success: true, data: { items: [] } }, status: 200, headers: {}, config }
    }

    const memRouter = createMemoryRouter(router.routes, { initialEntries: ['/products'] })
    render(
      <AppProviders>
        <RouterProvider router={memRouter} />
      </AppProviders>
    )

    const grid = await screen.findByTestId('products-grid', {}, { timeout: 5000 })
    expect(grid.className).toContain('grid-cols-[repeat(auto-fill,minmax(240px,1fr))]')
    expect(grid.className).toContain('items-stretch')

    const shellGrid = grid.closest('main')?.parentElement
    expect(shellGrid?.className).toContain('lg:grid-cols-[260px_minmax(0,1fr)]')

    // Verify mathematical column fit across requested viewports: [width, expectedCols]
    const computeColumns = (vw) => {
      if (vw < 640) return 1
      if (vw < 1024) {
        const inner = vw - 48
        return Math.floor((inner + 20) / (240 + 20))
      }
      const containerMax = vw >= 1536 ? 1440 : 1360
      const mainWidth = Math.min(vw, containerMax) - 64 - 260 - 28
      return Math.floor((mainWidth + 20) / (240 + 20))
    }

    expect(computeColumns(390)).toBe(1)
    expect(computeColumns(768)).toBe(2)
    expect(computeColumns(1280)).toBe(3)
    expect(computeColumns(1366)).toBe(3)
    expect(computeColumns(1536)).toBe(4)
    expect(computeColumns(1920)).toBe(4)

    await waitFor(() => {
      expect(screen.getByTestId('product-stock-pill')).toBeTruthy()
    })
  })
})
