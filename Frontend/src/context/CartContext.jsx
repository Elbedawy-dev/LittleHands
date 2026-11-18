import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { getProductStockMeta } from '../utils/productStock'
import { ANALYTICS_CURRENCY, toAnalyticsItem, trackEvent } from '../utils/analytics'
import { pickLocaleText } from '../utils'

const CartContext = createContext({
  items: [],
  itemsBySeller: {},
  totalCount: 0,
  subtotal: 0,
  addItem: () => {},
  removeItem: () => {},
  updateQty: () => {},
  clearCart: () => {},
})

const CART_PREFIX = 'lh_cart_v1'
const GUEST_KEY = `${CART_PREFIX}:guest`

const readCart = (key) => {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const mergeCarts = (base, extra) => {
  const out = [...base]
  extra.forEach((g) => {
    const i = out.findIndex((x) => x.productId === g.productId)
    if (i === -1) {
      out.push(g)
    } else {
      const cap = typeof out[i].stockCount === 'number' ? out[i].stockCount : Infinity
      out[i] = { ...out[i], qty: Math.min(out[i].qty + g.qty, cap) }
    }
  })
  return out
}

export function CartProvider({ children }) {
  const { user, isLoading } = useAuth()
  const cartKey = `${CART_PREFIX}:${user?.id || 'guest'}`

  const [items, setItems] = useState([])
  const [loadedKey, setLoadedKey] = useState(null)

  // تحميل سلة الحساب الحالي (ودمج سلة الزائر عند تسجيل الدخول)
  useEffect(() => {
    if (isLoading) return
    let next = readCart(cartKey)
    if (cartKey !== GUEST_KEY) {
      const guest = readCart(GUEST_KEY)
      if (guest.length) {
        next = mergeCarts(next, guest)
        try {
          localStorage.setItem(cartKey, JSON.stringify(next))
          localStorage.removeItem(GUEST_KEY)
        } catch (e) {
          console.warn('Failed to merge guest cart:', e)
        }
      }
    }
    setItems(next)
    setLoadedKey(cartKey)
  }, [cartKey, isLoading])

  // حفظ السلة (فقط بعد ما تتحمّل سلة نفس الحساب)
  useEffect(() => {
    if (loadedKey !== cartKey) return
    try {
      localStorage.setItem(cartKey, JSON.stringify(items))
    } catch (e) {
      console.warn('Failed to persist cart:', e)
    }
  }, [items, loadedKey, cartKey])

  const addItem = (product, qty = 1) => {
    const { stockCount } = getProductStockMeta(product)
    if (stockCount === 0) return

    trackEvent('add_to_cart', {
      currency: ANALYTICS_CURRENCY,
      value: (Number(product.price) || 0) * qty,
      items: [
        toAnalyticsItem({
          id: product.id,
          name: pickLocaleText(product.name, 'en'),
          price: product.price,
          qty,
        }),
      ],
    })

    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.productId === product.id)
      if (existingIndex > -1) {
        const next = [...prev]
        const existing = next[existingIndex]
        const cap = stockCount ?? existing.stockCount ?? null
        const mergedQty = existing.qty + qty
        next[existingIndex] = {
          ...existing,
          stockCount: cap,
          qty: cap !== null ? Math.min(mergedQty, cap) : mergedQty,
        }
        return next
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          unitPrice: product.price,
          qty: stockCount !== null ? Math.min(qty, stockCount) : qty,
          stockCount,
          sellerId: product.sellerId || '',
          sellerName: product.sellerName || '',
          sellerNameEn: product.sellerNameEn || '',
          image: (product.images && product.images[0]) || '',
          categoryId: product.categoryId,
        },
      ]
    })
  }

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  const updateQty = (productId, qty) => {
    if (qty <= 0) {
      removeItem(productId)
      return
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i
        const cap = typeof i.stockCount === 'number' ? i.stockCount : Infinity
        return { ...i, qty: Math.min(qty, cap) }
      })
    )
  }

  const clearCart = () => {
    setItems([])
  }

  // تجميع السلع حسب البائعة
  const itemsBySeller = useMemo(() => {
    const grouped = {}
    items.forEach((item) => {
      const sid = item.sellerId || ''
      if (!grouped[sid]) {
        grouped[sid] = {
          sellerId: sid,
          sellerName: item.sellerName || '',
          sellerNameEn: item.sellerNameEn || '',
          items: [],
          subtotal: 0,
        }
      }
      grouped[sid].items.push(item)
      grouped[sid].subtotal += item.price * item.qty
    })
    return grouped
  }, [items])

  const totalCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.qty, 0)
  }, [items])

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.qty, 0)
  }, [items])

  return (
    <CartContext.Provider
      value={{
        items,
        itemsBySeller,
        totalCount,
        subtotal,
        addItem,
        removeItem,
        updateQty,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

