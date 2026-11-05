import { Outlet } from 'react-router-dom'
import { Footer } from './Footer'
import { MobileTabBar } from './MobileTabBar'
import { MobileTopBar } from './MobileTopBar'
import { Navbar } from './Navbar'

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-app text-text-main transition-colors">
      {/* 1. Mobile Shared Top Bar (lg:hidden) */}
      <MobileTopBar />

      {/* 2. Desktop Navbar (hidden lg:block) */}
      <Navbar />

      {/* منطقة المحتوى مع هامش سفلي للموبايل لتفادي تداخل شريط التبويب */}
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      <Footer />
      <MobileTabBar />
    </div>
  )
}
