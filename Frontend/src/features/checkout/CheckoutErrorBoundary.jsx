import React from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { withTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'

class CheckoutErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Checkout error boundary caught an exception:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      const { t } = this.props
      return (
        <Card
          padding="lg"
          className="border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-center py-8"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-base text-text-main">
              {t('checkout:errorBoundary.title', {
                defaultValue: 'حدث خطأ غير متوقع أثناء معالجة بيانات الطلب',
              })}
            </h3>
            <p className="text-xs sm:text-sm text-text-muted max-w-md">
              {t('checkout:errorBoundary.description', {
                defaultValue:
                  'نعتذر عن هذا الخطأ المؤقت، يمكنكِ الضغط على زر إعادة المحاولة للعودة واستكمال الطلب.',
              })}
            </p>
            <Button
              onClick={this.handleRetry}
              variant="primary"
              size="sm"
              className="mt-2"
              startIcon={<RotateCcw className="w-4 h-4" />}
            >
              {t('common:actions.retry', { defaultValue: 'إعادة المحاولة' })}
            </Button>
          </div>
        </Card>
      )
    }

    return this.props.children
  }
}

export const CheckoutErrorBoundary = withTranslation(['checkout', 'common'])(CheckoutErrorBoundaryInner)
export default CheckoutErrorBoundary

