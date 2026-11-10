import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { PublicLayout } from '../components/layout/PublicLayout'
import { ScrollToTop } from '../components/layout/ScrollToTop'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../context/AuthContext'
import ErrorPage from '../pages/ErrorPage'

// Lazy loading all pages
const HomePage = lazy(() => import('../pages/storefront/HomePage'))
const ProductsPage = lazy(() => import('../pages/storefront/ProductsPage'))
const ProductDetailsPage = lazy(() => import('../pages/storefront/ProductDetailsPage'))
const SellersPage = lazy(() => import('../pages/storefront/SellersPage'))
const SellerPublicPage = lazy(() => import('../pages/storefront/SellerPublicPage'))
const AboutPage = lazy(() => import('../pages/storefront/AboutPage'))

const CartPage = lazy(() => import('../pages/cart/CartPage'))
const CheckoutPage = lazy(() => import('../pages/checkout/CheckoutPage'))
const OrderSuccessPage = lazy(() => import('../pages/checkout/OrderSuccessPage'))

const LoginPage = lazy(() => import('../pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'))
const VerifyEmailPage = lazy(() => import('../pages/auth/VerifyEmailPage'))

const AccountLayout = lazy(() => import('../pages/account/AccountLayout'))
const ProfilePage = lazy(() => import('../pages/account/ProfilePage'))
const AccountOrdersPage = lazy(() => import('../pages/account/AccountOrdersPage'))
const AccountOrderDetailsPage = lazy(() => import('../pages/account/AccountOrderDetailsPage'))
const AccountFavoritesPage = lazy(() => import('../pages/account/AccountFavoritesPage'))
const AccountAddressesPage = lazy(() => import('../pages/account/AccountAddressesPage'))
const AccountSettingsPage = lazy(() => import('../pages/account/AccountSettingsPage'))

const NotificationsPage = lazy(() => import('../pages/notifications/NotificationsPage'))

const SellerOverviewPage = lazy(() => import('../pages/seller/SellerOverviewPage'))
const SellerProductsPage = lazy(() => import('../pages/seller/SellerProductsPage'))
const SellerProductFormPage = lazy(() => import('../pages/seller/SellerProductFormPage'))
const SellerOrdersPage = lazy(() => import('../pages/seller/SellerOrdersPage'))
const SellerEarningsPage = lazy(() => import('../pages/seller/SellerEarningsPage'))
const SellerProfilePage = lazy(() => import('../pages/seller/SellerProfilePage'))
const SellerCustomRequestsPage = lazy(() => import('../pages/seller/SellerCustomRequestsPage'))
const SellerNotificationsPage = lazy(() => import('../pages/seller/SellerNotificationsPage'))

const AdminOverviewPage = lazy(() => import('../pages/admin/AdminOverviewPage'))
const AdminPaymentsPage = lazy(() => import('../pages/admin/AdminPaymentsPage'))
const AdminOrdersPage = lazy(() => import('../pages/admin/AdminOrdersPage'))
const AdminProductsPage = lazy(() => import('../pages/admin/AdminProductsPage'))
const AdminProductFormPage = lazy(() => import('../pages/admin/AdminProductFormPage'))
const AdminSellersPage = lazy(() => import('../pages/admin/AdminSellersPage'))
const AdminCustomersPage = lazy(() => import('../pages/admin/AdminCustomersPage'))
const AdminCategoriesPage = lazy(() => import('../pages/admin/AdminCategoriesPage'))
const AdminCustomRequestsPage = lazy(() => import('../pages/admin/AdminCustomRequestsPage'))
const AdminNotificationsPage = lazy(() => import('../pages/admin/AdminNotificationsPage'))
const AdminSettingsPage = lazy(() => import('../pages/admin/AdminSettingsPage'))
const AdminAccountPage = lazy(() => import('../pages/admin/AdminAccountPage'))

const DesignSystemPage = import.meta.env.DEV
  ? lazy(() => import('../pages/dev/DesignSystemPage'))
  : null
const EmailPreviewPage = import.meta.env.DEV
  ? lazy(() => import('../pages/dev/EmailPreviewPage'))
  : null
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))

// عنصر التحميل للتبديل السلس
function PageLoader() {
  const { i18n } = useTranslation('common')
  const isEn = i18n.language === 'en'
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center py-16">
      <Spinner size="lg" />
      <span className="text-xs text-text-muted font-bold mt-3">
        {isEn ? 'Loading page...' : 'جاري تجهيز الصفحة...'}
      </span>
    </div>
  )
}

function SuspenseWrapper({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

// حارس التوثيق والصلاحيات
function RequireAuth({ allowedRoles, children }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <PageLoader />
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  }

  if (allowedRoles && allowedRoles.length > 0) {
    // الإدارة تمتلك وصولاً لصفحات البائعة، لكن البائعة لا تصل للإدارة
    const hasRole = allowedRoles.includes(user.role)
    if (!hasRole) {
      return <Navigate to="/" replace />
    }
  }

  return children
}

function RootLayout() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  )
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
  // المسارات العامة والمتجر
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <SuspenseWrapper><HomePage /></SuspenseWrapper> },
      { path: 'products', element: <SuspenseWrapper><ProductsPage /></SuspenseWrapper> },
      { path: 'products/:id', element: <SuspenseWrapper><ProductDetailsPage /></SuspenseWrapper> },
      { path: 'sellers', element: <SuspenseWrapper><SellersPage /></SuspenseWrapper> },
      { path: 'sellers/:id', element: <SuspenseWrapper><SellerPublicPage /></SuspenseWrapper> },
      { path: 'about', element: <SuspenseWrapper><AboutPage /></SuspenseWrapper> },

      // السلة وإتمام الطلب
      { path: 'cart', element: <SuspenseWrapper><CartPage /></SuspenseWrapper> },
      { path: 'checkout', element: <SuspenseWrapper><CheckoutPage /></SuspenseWrapper> },
      { path: 'order-success/:number', element: <SuspenseWrapper><OrderSuccessPage /></SuspenseWrapper> },

      // حساب العميل
      {
        path: 'account',
        element: (
          <RequireAuth allowedRoles={['customer', 'seller', 'admin']}>
            <SuspenseWrapper><AccountLayout /></SuspenseWrapper>
          </RequireAuth>
        ),
        children: [
          { index: true, element: <SuspenseWrapper><ProfilePage /></SuspenseWrapper> },
          { path: 'orders', element: <SuspenseWrapper><AccountOrdersPage /></SuspenseWrapper> },
          { path: 'orders/:id', element: <SuspenseWrapper><AccountOrderDetailsPage /></SuspenseWrapper> },
          { path: 'favorites', element: <SuspenseWrapper><AccountFavoritesPage /></SuspenseWrapper> },
          { path: 'addresses', element: <SuspenseWrapper><AccountAddressesPage /></SuspenseWrapper> },
          { path: 'settings', element: <SuspenseWrapper><AccountSettingsPage /></SuspenseWrapper> },
        ],
      },
      {
        path: 'notifications',
        element: (
          <RequireAuth allowedRoles={['customer', 'seller', 'admin']}>
            <SuspenseWrapper><NotificationsPage /></SuspenseWrapper>
          </RequireAuth>
        ),
      },

      // صفحات المطورين (معاينة التصميم والبريد - بيئة التطوير فقط)
      ...(import.meta.env.DEV && DesignSystemPage && EmailPreviewPage
        ? [
            { path: 'dev/design-system', element: <SuspenseWrapper><DesignSystemPage /></SuspenseWrapper> },
            { path: 'dev/emails', element: <SuspenseWrapper><EmailPreviewPage /></SuspenseWrapper> },
          ]
        : []),

      // صفحة 404
      { path: '*', element: <SuspenseWrapper><NotFoundPage /></SuspenseWrapper> },
    ],
  },

  // مسارات المصادقة
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <SuspenseWrapper><LoginPage /></SuspenseWrapper> },
      { path: 'register', element: <SuspenseWrapper><RegisterPage /></SuspenseWrapper> },
      { path: 'forgot-password', element: <SuspenseWrapper><ForgotPasswordPage /></SuspenseWrapper> },
      { path: 'reset-password', element: <SuspenseWrapper><ResetPasswordPage /></SuspenseWrapper> },
      { path: 'verify-email', element: <SuspenseWrapper><VerifyEmailPage /></SuspenseWrapper> },
    ],
  },

  // مسارات لوحة تحكم البائعة (تتطلب seller أو admin)
  {
    path: '/seller',
    element: (
      <RequireAuth allowedRoles={['seller', 'admin']}>
        <DashboardLayout role="seller" />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <SuspenseWrapper><SellerOverviewPage /></SuspenseWrapper> },
      { path: 'products', element: <SuspenseWrapper><SellerProductsPage /></SuspenseWrapper> },
      { path: 'products/new', element: <SuspenseWrapper><SellerProductFormPage /></SuspenseWrapper> },
      { path: 'products/:id/edit', element: <SuspenseWrapper><SellerProductFormPage /></SuspenseWrapper> },
      { path: 'orders', element: <SuspenseWrapper><SellerOrdersPage /></SuspenseWrapper> },
      { path: 'custom-requests', element: <SuspenseWrapper><SellerCustomRequestsPage /></SuspenseWrapper> },
      { path: 'earnings', element: <SuspenseWrapper><SellerEarningsPage /></SuspenseWrapper> },
      { path: 'profile', element: <SuspenseWrapper><SellerProfilePage /></SuspenseWrapper> },
      { path: 'notifications', element: <SuspenseWrapper><SellerNotificationsPage /></SuspenseWrapper> },
    ],
  },

  // مسارات لوحة تحكم الإدارة (تتطلب admin حصراً)
  {
    path: '/admin',
    element: (
      <RequireAuth allowedRoles={['admin']}>
        <DashboardLayout role="admin" />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <SuspenseWrapper><AdminOverviewPage /></SuspenseWrapper> },
      { path: 'payments', element: <SuspenseWrapper><AdminPaymentsPage /></SuspenseWrapper> },
      { path: 'orders', element: <SuspenseWrapper><AdminOrdersPage /></SuspenseWrapper> },
      { path: 'products', element: <SuspenseWrapper><AdminProductsPage /></SuspenseWrapper> },
      { path: 'products/new', element: <SuspenseWrapper><AdminProductFormPage /></SuspenseWrapper> },
      { path: 'products/:id/edit', element: <SuspenseWrapper><AdminProductFormPage /></SuspenseWrapper> },
      { path: 'sellers', element: <SuspenseWrapper><AdminSellersPage /></SuspenseWrapper> },
      { path: 'customers', element: <SuspenseWrapper><AdminCustomersPage /></SuspenseWrapper> },
      { path: 'categories', element: <SuspenseWrapper><AdminCategoriesPage /></SuspenseWrapper> },
      { path: 'custom-requests', element: <SuspenseWrapper><AdminCustomRequestsPage /></SuspenseWrapper> },
      { path: 'notifications', element: <SuspenseWrapper><AdminNotificationsPage /></SuspenseWrapper> },
      { path: 'settings', element: <SuspenseWrapper><AdminSettingsPage /></SuspenseWrapper> },
      { path: 'account', element: <SuspenseWrapper><AdminAccountPage /></SuspenseWrapper> },
    ],
  },
    ],
  },
])

