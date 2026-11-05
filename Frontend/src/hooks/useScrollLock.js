import { useLayoutEffect } from 'react'

let lockCount = 0
let savedScrollX = 0
let savedScrollY = 0
let savedHtmlStyles = null
let savedBodyStyles = null
let savedContainers = []
let removeEventListeners = null

function findScrollableAncestor(el, boundary) {
  let node = el
  while (node && node !== document.body && node !== document.documentElement) {
    if ( node instanceof HTMLElement ) {
      const style = window.getComputedStyle(node)
      const overflowY = style.overflowY
      const isScrollableY =
        (overflowY === 'auto' || overflowY === 'scroll') &&
        node.scrollHeight > node.clientHeight
      if (isScrollableY) {
        return node
      }
    }
    if (boundary && node === boundary) break
    node = node.parentElement
  }
  return null
}

function attachScrollBlockers() {
  let touchStartY = 0

  const onTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      touchStartY = e.touches[0].clientY
    }
  }

  const onWheel = (e) => {
    const target = e.target instanceof Element ? e.target : null
    if (!target) {
      e.preventDefault()
      return
    }

    const overlayRoot = target.closest('[role="dialog"], [role="listbox"], [data-scroll-lock-scrollable]')
    if (!overlayRoot) {
      e.preventDefault()
      return
    }

    const scrollable = findScrollableAncestor(target, overlayRoot)
    if (!scrollable) {
      e.preventDefault()
      return
    }

    const { scrollTop, scrollHeight, clientHeight } = scrollable
    const deltaY = e.deltaY
    const isAtTop = deltaY < 0 && scrollTop <= 0
    const isAtBottom = deltaY > 0 && scrollTop + clientHeight >= scrollHeight - 1

    if (isAtTop || isAtBottom) {
      e.preventDefault()
    }
  }

  const onTouchMove = (e) => {
    if (e.touches && e.touches.length > 1) return

    const target = e.target instanceof Element ? e.target : null
    if (!target) {
      e.preventDefault()
      return
    }

    const overlayRoot = target.closest('[role="dialog"], [role="listbox"], [data-scroll-lock-scrollable]')
    if (!overlayRoot) {
      e.preventDefault()
      return
    }

    const scrollable = findScrollableAncestor(target, overlayRoot)
    if (!scrollable) {
      e.preventDefault()
      return
    }

    const currentY = e.touches ? e.touches[0].clientY : touchStartY
    const deltaY = touchStartY - currentY
    const { scrollTop, scrollHeight, clientHeight } = scrollable
    const isAtTop = deltaY < 0 && scrollTop <= 0
    const isAtBottom = deltaY > 0 && scrollTop + clientHeight >= scrollHeight - 1

    if (isAtTop || isAtBottom) {
      e.preventDefault()
    }
  }

  const onKeyDown = (e) => {
    const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar']
    if (!scrollKeys.includes(e.key)) return

    const target = e.target instanceof Element ? e.target : null
    if (target) {
      const tag = target.tagName
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        tag === 'BUTTON' ||
        target.isContentEditable ||
        target.closest('[role="listbox"], [role="combobox"], [role="option"]')
      ) {
        return
      }

      const overlayRoot = target.closest('[role="dialog"], [data-scroll-lock-scrollable]')
      if (overlayRoot) {
        const scrollable = findScrollableAncestor(target, overlayRoot) || overlayRoot.querySelector('.overflow-y-auto')
        if (scrollable && scrollable.scrollHeight > scrollable.clientHeight) {
          return
        }
      }
    }

    e.preventDefault()
  }

  window.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
  window.addEventListener('wheel', onWheel, { passive: false, capture: true })
  window.addEventListener('touchmove', onTouchMove, { passive: false, capture: true })
  window.addEventListener('keydown', onKeyDown, { capture: true })

  return () => {
    window.removeEventListener('touchstart', onTouchStart, { capture: true })
    window.removeEventListener('wheel', onWheel, { capture: true })
    window.removeEventListener('touchmove', onTouchMove, { capture: true })
    window.removeEventListener('keydown', onKeyDown, { capture: true })
  }
}

function acquireScrollLock() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  if (lockCount === 0) {
    const html = document.documentElement
    const body = document.body

    savedScrollX = window.scrollX || window.pageXOffset || 0
    savedScrollY = window.scrollY || window.pageYOffset || 0

    const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth)

    savedHtmlStyles = {
      overflow: html.style.overflow,
      overscrollBehavior: html.style.overscrollBehavior,
    }

    savedBodyStyles = {
      overflow: body.style.overflow,
      overscrollBehavior: body.style.overscrollBehavior,
      paddingInlineEnd: body.style.paddingInlineEnd,
    }

    if (scrollbarWidth > 0) {
      const computedPaddingEnd = parseFloat(window.getComputedStyle(body).paddingInlineEnd) || 0
      body.style.paddingInlineEnd = `${computedPaddingEnd + scrollbarWidth}px`
    }

    html.style.overflow = 'hidden'
    html.style.overscrollBehavior = 'none'
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'

    const containers = document.querySelectorAll('main, [data-scroll-container]')
    savedContainers = Array.from(containers).map((el) => {
      const prev = {
        el,
        overflow: el.style.overflow,
        overscrollBehavior: el.style.overscrollBehavior,
        scrollTop: el.scrollTop,
      }
      el.style.overflow = 'hidden'
      el.style.overscrollBehavior = 'none'
      return prev
    })

    removeEventListeners = attachScrollBlockers()
  }

  lockCount += 1
}

function releaseScrollLock() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (lockCount <= 0) return

  lockCount -= 1

  if (lockCount === 0) {
    if (removeEventListeners) {
      removeEventListeners()
      removeEventListeners = null
    }

    const html = document.documentElement
    const body = document.body

    if (savedHtmlStyles) {
      html.style.overflow = savedHtmlStyles.overflow
      html.style.overscrollBehavior = savedHtmlStyles.overscrollBehavior
      savedHtmlStyles = null
    }

    if (savedBodyStyles) {
      body.style.overflow = savedBodyStyles.overflow
      body.style.overscrollBehavior = savedBodyStyles.overscrollBehavior
      body.style.paddingInlineEnd = savedBodyStyles.paddingInlineEnd
      savedBodyStyles = null
    }

    if (savedContainers.length > 0) {
      savedContainers.forEach(({ el, overflow, overscrollBehavior, scrollTop }) => {
        el.style.overflow = overflow
        el.style.overscrollBehavior = overscrollBehavior
        el.scrollTop = scrollTop
      })
      savedContainers = []
    }

    window.scrollTo({ top: savedScrollY, left: savedScrollX, behavior: 'instant' })
  }
}

export function useScrollLock(isLocked) {
  useLayoutEffect(() => {
    if (!isLocked) return undefined

    acquireScrollLock()
    return () => {
      releaseScrollLock()
    }
  }, [isLocked])
}

