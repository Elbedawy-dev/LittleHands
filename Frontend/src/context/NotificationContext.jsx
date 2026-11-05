import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { notificationService } from '../services/notificationService'
import { useAuth } from './AuthContext'

const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  fetchNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
})

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const role = user ? user.role : 'customer'

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const list = await notificationService.getNotifications(role)
      setNotifications(list)
    } catch (e) {
      console.warn('Failed to load notifications:', e)
    } finally {
      setIsLoading(false)
    }
  }, [role])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAsRead = async (id) => {
    await notificationService.markRead(id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const markAllAsRead = async () => {
    await notificationService.markAllRead(role)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length
  }, [notifications])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}

