import { RouterProvider } from 'react-router-dom'
import { AppProviders } from './providers'
import { router } from './router'
import { Analytics } from "@vercel/analytics/react"
export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      <Analytics />
    </AppProviders>
  )
}

