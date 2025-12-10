import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { useSocket } from './socket-context'
import { AppNotification, NotificationCategory, addNotification, clearAll, getUnreadCount, loadNotifications, markAllAsRead, markAsRead, sortByTimestampDesc } from './notifications-service'
import { timeAsync } from './perf'

type NotificationsContextType = {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  add: (n: { title: string; body: string; category: NotificationCategory; id?: string; timestamp?: number }) => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  clear: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { socket } = useSocket()
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const loaded = await timeAsync('notifications_load_ms', () => loadNotifications(user?._id))
      if (mounted) {
        setItems(sortByTimestampDesc(loaded))
        setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [user?._id])

  useEffect(() => {
    const s = socket
    if (!s) return
    const handler = async (note: any) => {
      const payload = {
        title: String(note?.title ?? ''),
        body: String(note?.body ?? ''),
        category: (String(note?.category ?? 'informational') as NotificationCategory),
        id: String(note?.id ?? note?._id ?? undefined),
        timestamp: typeof note?.timestamp === 'number' ? note.timestamp : Date.now(),
      }
      const next = await addNotification(user?._id, payload)
      setItems(next)
    }
    s.on('notification', handler)
    return () => {
      s.off('notification', handler)
    }
  }, [socket, user?._id])

  const unreadCount = useMemo(() => getUnreadCount(items), [items])

  const addFn = async (n: { title: string; body: string; category: NotificationCategory; id?: string; timestamp?: number }) => {
    const next = await addNotification(user?._id, n)
    setItems(next)
  }

  const markReadFn = async (id: string) => {
    const next = await markAsRead(user?._id, id)
    setItems(next)
  }

  const markAllReadFn = async () => {
    const next = await markAllAsRead(user?._id)
    setItems(next)
  }

  const clearFn = async () => {
    await clearAll(user?._id)
    setItems([])
  }

  return (
    <NotificationsContext.Provider value={{ notifications: items, unreadCount, loading, add: addFn, markRead: markReadFn, markAllRead: markAllReadFn, clear: clearFn }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within a NotificationsProvider')
  return ctx
}
