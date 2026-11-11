import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { notificationService } from '../services/notificationService'
import { useAuth } from './AuthContext'

const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  fetchNotifications: async () => {},
  fetchUnreadCount: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
  deleteNotifications: async () => {},
})

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // جلب عدد الإشعارات غير المقروءة
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0)
      return
    }
    try {
      const res = await notificationService.getUnreadCount()
      const count = typeof res === 'number' ? res : (res?.unreadCount ?? res?.count ?? 0)
      setUnreadCount(count)
    } catch {
      // تجاهل أخطاء التوثيق أو الشبكة العارضة أثناء الاستطلاع الدوري
    }
  }, [isAuthenticated])

  // جلب قائمة الإشعارات الكاملة
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([])
      return
    }
    setIsLoading(true)
    try {
      const res = await notificationService.getNotifications()
      const items = Array.isArray(res) ? res : (res?.items || [])
      setNotifications(items)
      if (res?.unreadCount !== undefined) {
        setUnreadCount(res.unreadCount)
      }
    } catch (e) {
      console.warn('Failed to load notifications:', e)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  // استطلاع دوري لعدد الإشعارات غير المقروءة كل 45 ثانية أثناء تنشيط علامة التبويب
  useEffect(() => {
    if (!isAuthenticated) return

    fetchUnreadCount()

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchUnreadCount()
      }
    }, 45000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated, fetchUnreadCount])

  const markAsRead = async (id) => {
    try {
      await notificationService.markRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }

  const deleteNotification = async (id) => {
    try {
      await notificationService.deleteNotification(id)
      setNotifications((prev) => {
        const target = prev.find((n) => n.id === id)
        if (target && !target.read) {
          setUnreadCount((c) => Math.max(0, c - 1))
        }
        return prev.filter((n) => n.id !== id)
      })
    } catch (err) {
      console.error('Failed to delete notification:', err)
      throw err
    }
  }

  const deleteNotifications = async (readOnly = false) => {
    try {
      await notificationService.deleteNotifications(readOnly)
      setNotifications((prev) => {
        if (readOnly) {
          return prev.filter((n) => !n.read)
        }
        setUnreadCount(0)
        return []
      })
    } catch (err) {
      console.error('Failed to clear notifications:', err)
      throw err
    }
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteNotifications,
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

export default NotificationContext
