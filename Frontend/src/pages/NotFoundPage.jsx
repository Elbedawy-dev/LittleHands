import { ArrowRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 select-none">
      <div className="w-24 h-24 rounded-3xl bg-brand-orange/15 text-brand-orange flex items-center justify-center font-heading font-black text-5xl mb-6 shadow-soft sticker-tilt-left">
        404
      </div>

      <h1 className="text-3xl font-black font-heading text-text-main mb-2">
        الصفحة غير موجودة
      </h1>

      <p className="text-sm text-text-muted max-w-sm mb-8 leading-relaxed">
        عذراً، لم نتمكن من العثور على الصفحة التي تبحثين عنها. ربما تم نقلها أو تعديل مسارها.
      </p>

      <div className="flex items-center gap-3">
        <Link to="/">
          <Button startIcon={<Home className="w-4 h-4" />}>
            العودة للرئيسية
          </Button>
        </Link>
        <Link to="/products">
          <Button variant="outline" startIcon={<ArrowRight className="w-4 h-4 rtl:rotate-0 rotate-180" />}>
            تصفح الوسائل
          </Button>
        </Link>
      </div>
    </div>
  )
}

