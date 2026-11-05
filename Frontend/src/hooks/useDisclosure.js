import { useCallback, useState } from 'react'

/**
 * إدارة حالات الفتح والإغلاق للنوافذ المنبثقة والقوائم الجانبية
 */
export function useDisclosure(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen,
  }
}

