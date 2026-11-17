import {
  Bell,
  CreditCard,
  FolderTree,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  ShoppingBag,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { paymentService } from '../../services/paymentService'

export function getSellerNavItems() {
  return [
    {
      href: '/seller',
      labelKey: 'nav:seller.dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      exact: true,
    },
    {
      href: '/seller/products',
      labelKey: 'nav:seller.products',
      icon: <Package className="w-5 h-5" />,
    },
    {
      href: '/seller/orders',
      labelKey: 'nav:seller.orders',
      icon: <ShoppingBag className="w-5 h-5" />,
    },
    {
      href: '/seller/custom-requests',
      labelKey: 'nav:seller.customRequests',
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      href: '/seller/earnings',
      labelKey: 'nav:seller.earnings',
      icon: <Wallet className="w-5 h-5" />,
    },
    {
      href: '/seller/profile',
      labelKey: 'nav:seller.profile',
      icon: <User className="w-5 h-5" />,
    },
    {
      href: '/seller/notifications',
      labelKey: 'nav:seller.notifications',
      icon: <Bell className="w-5 h-5" />,
    },
  ]
}

export function getAdminNavItems({ pendingCount = 0 } = {}) {
  return [
    {
      href: '/admin',
      labelKey: 'nav:admin.dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      exact: true,
    },
    {
      href: '/admin/payments',
      labelKey: 'nav:admin.payments',
      icon: <CreditCard className="w-5 h-5" />,
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: 'bg-rose-600 text-white',
    },
    {
      href: '/admin/orders',
      labelKey: 'nav:admin.orders',
      icon: <ShoppingBag className="w-5 h-5" />,
    },
    {
      href: '/admin/products',
      labelKey: 'nav:admin.products',
      icon: <Package className="w-5 h-5" />,
    },
    {
      href: '/admin/sellers',
      labelKey: 'nav:admin.sellers',
      icon: <Wallet className="w-5 h-5" />,
    },
    {
      href: '/admin/customers',
      labelKey: 'nav:admin.customers',
      icon: <Users className="w-5 h-5" />,
    },
    {
      href: '/admin/categories',
      labelKey: 'nav:admin.categories',
      icon: <FolderTree className="w-5 h-5" />,
    },
    {
      href: '/admin/custom-requests',
      labelKey: 'nav:admin.customRequests',
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      href: '/admin/notifications',
      labelKey: 'nav:admin.notifications',
      icon: <Bell className="w-5 h-5" />,
    },
    {
      href: '/admin/settings',
      labelKey: 'nav:admin.settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ]
}

export function usePendingPaymentsCount(role) {
  const { pathname } = useLocation()
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0)

  useEffect(() => {
    let active = true
    if (role === 'admin') {
      paymentService
        .getPayments({ status: 'pending' })
        .then((res) => {
          if (active) {
            setPendingPaymentsCount(Array.isArray(res) ? res.length : 0)
          }
        })
        .catch(() => {})
    } else {
      setPendingPaymentsCount(0)
    }
    return () => {
      active = false
    }
  }, [role, pathname])

  return pendingPaymentsCount
}
