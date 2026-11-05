import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Arabic namespaces
import arCommon from '../locales/ar/common.json'
import arNav from '../locales/ar/nav.json'
import arStorefront from '../locales/ar/storefront.json'
import arCart from '../locales/ar/cart.json'
import arCheckout from '../locales/ar/checkout.json'
import arAuth from '../locales/ar/auth.json'
import arProfile from '../locales/ar/profile.json'
import arNotifications from '../locales/ar/notifications.json'
import arSeller from '../locales/ar/seller.json'
import arAdmin from '../locales/ar/admin.json'
import arAdminCore from '../locales/ar/admin-core.json'
import arAdminManage from '../locales/ar/admin-manage.json'
import arEmails from '../locales/ar/emails.json'
import arErrorsPage from '../locales/ar/errors-page.json'

// English namespaces
import enCommon from '../locales/en/common.json'
import enNav from '../locales/en/nav.json'
import enStorefront from '../locales/en/storefront.json'
import enCart from '../locales/en/cart.json'
import enCheckout from '../locales/en/checkout.json'
import enAuth from '../locales/en/auth.json'
import enProfile from '../locales/en/profile.json'
import enNotifications from '../locales/en/notifications.json'
import enSeller from '../locales/en/seller.json'
import enAdmin from '../locales/en/admin.json'
import enAdminCore from '../locales/en/admin-core.json'
import enAdminManage from '../locales/en/admin-manage.json'
import enEmails from '../locales/en/emails.json'
import enErrorsPage from '../locales/en/errors-page.json'

const savedLanguage = (() => {
  try {
    return localStorage.getItem('lh_lang') || 'ar'
  } catch {
    return 'ar'
  }
})()

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: {
        common: arCommon,
        nav: arNav,
        storefront: arStorefront,
        cart: arCart,
        checkout: arCheckout,
        auth: arAuth,
        profile: arProfile,
        notifications: arNotifications,
        seller: arSeller,
        admin: arAdmin,
        'admin-core': arAdminCore,
        'admin-manage': arAdminManage,
        emails: arEmails,
        'errors-page': arErrorsPage,
      },
      en: {
        common: enCommon,
        nav: enNav,
        storefront: enStorefront,
        cart: enCart,
        checkout: enCheckout,
        auth: enAuth,
        profile: enProfile,
        notifications: enNotifications,
        seller: enSeller,
        admin: enAdmin,
        'admin-core': enAdminCore,
        'admin-manage': enAdminManage,
        emails: enEmails,
        'errors-page': enErrorsPage,
      },
    },
    lng: savedLanguage,
    fallbackLng: 'ar',
    defaultNS: 'common',
    ns: [
      'common',
      'nav',
      'storefront',
      'cart',
      'checkout',
      'auth',
      'profile',
      'notifications',
      'seller',
      'admin',
      'admin-core',
      'admin-manage',
      'emails',
      'errors-page',
    ],
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n

