import { useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

export function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const prevPathnameRef = useRef(pathname)

  useLayoutEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname
      if (!hash) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
        const scrollContainers = document.querySelectorAll('main, [data-scroll-container]')
        scrollContainers.forEach((container) => {
          container.scrollTop = 0
        })
      }
    }
  }, [pathname, hash])

  return null
}

