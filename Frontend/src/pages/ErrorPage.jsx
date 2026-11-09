import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useRouteError } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

/**
 * RouteErrorBoundary / ErrorPage
 * Friendly translated error boundary attached to the root route.
 * Replaces React Router's default "Unexpected Application Error" screen.
 */
export default function ErrorPage() {
  const error = useRouteError()
  const { t } = useTranslation('errors-page')

  useEffect(() => {
    if (error) {
      console.error('[RouteErrorBoundary caught error]:', error)
    }
  }, [error])

  return (
    <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <Card
        padding="lg"
        className="max-w-lg w-full text-center space-y-6 shadow-float border-surface-border/80 bg-surface"
      >
        <div className="mx-auto w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="font-heading font-black text-xl sm:text-2xl text-text-main">
            {t('title')}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted leading-relaxed max-w-md mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            onClick={() => window.location.reload()}
            startIcon={<RefreshCw className="w-4 h-4" />}
          >
            {t('reload')}
          </Button>

          <Link to="/" className="w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full sm:w-auto"
              startIcon={<Home className="w-4 h-4" />}
            >
              {t('backHome')}
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

