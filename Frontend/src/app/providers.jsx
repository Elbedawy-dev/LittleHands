import { Toaster } from 'react-hot-toast'
import {
  AuthProvider,
  CartProvider,
  LanguageProvider,
  NotificationProvider,
  SettingsProvider,
  ThemeProvider,
} from '../context'

export function AppProviders({ children }) {
return (
<ThemeProvider>
  <LanguageProvider>
    <AuthProvider>
      <CartProvider>
        <NotificationProvider>
        <SettingsProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
            duration: 3500,
            style: {
              background: 'var(--bg-surface)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              fontSize: '13px',
              fontFamily: 'Cairo, sans-serif',
              boxShadow: '0 10px 25px -5px rgba(255, 138, 61, 0.15)',
            },
          }}/>
        </SettingsProvider>
        </NotificationProvider>
      </CartProvider>
    </AuthProvider>
  </LanguageProvider>
</ThemeProvider>
  )
}

