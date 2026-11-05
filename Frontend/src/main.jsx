import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import './config/i18n'
import './index.css'
import { seedComprehensiveDataset } from './services/seedService'

if (import.meta.env.DEV) {
  window.__seedLittleHandsDataset = seedComprehensiveDataset
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
