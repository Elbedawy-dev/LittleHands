import { useEffect, useState } from 'react'
import { paymentService } from '../services/paymentService'

/**
 * Hook to stream authenticated payment receipts as Blob Object URLs.
 * Private receipts require credentials (cookies) to be streamed from GET /payments/:id/screenshot.
 */
export function usePrivateReceipt(paymentId) {
  const [imageUrl, setImageUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!paymentId) {
      setImageUrl('')
      setLoading(false)
      setError(null)
      return
    }

    let active = true
    let blobUrl = ''

    async function loadReceipt() {
      setLoading(true)
      setError(null)
      try {
        const blob = await paymentService.getScreenshotBlob(paymentId)
        if (active) {
          blobUrl = URL.createObjectURL(blob)
          setImageUrl(blobUrl)
        }
      } catch (err) {
        if (active) {
          console.error('Failed to load private receipt screenshot:', err)
          setError(err)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadReceipt()

    return () => {
      active = false
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [paymentId])

  return { imageUrl, loading, error }
}

export default usePrivateReceipt

