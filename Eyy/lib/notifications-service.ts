import AsyncStorage from '@react-native-async-storage/async-storage'

export type NotificationCategory = 'urgent' | 'informational' | 'updates'

export type AppNotification = {
  id: string
  title: string
  body: string
  category: NotificationCategory
  timestamp: number
  read: boolean
}

const keyFor = (userId: string | null | undefined) => `notifications:${userId ?? 'guest'}`

export async function loadNotifications(userId: string | null | undefined): Promise<AppNotification[]> {
  const k = keyFor(userId)
  const raw = await AsyncStorage.getItem(k)
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export async function saveNotifications(userId: string | null | undefined, items: AppNotification[]): Promise<void> {
  const k = keyFor(userId)
  await AsyncStorage.setItem(k, JSON.stringify(items))
}

export function getUnreadCount(items: AppNotification[]): number {
  return items.reduce((acc, n) => acc + (n.read ? 0 : 1), 0)
}

export function sortByTimestampDesc(items: AppNotification[]): AppNotification[] {
  return [...items].sort((a, b) => b.timestamp - a.timestamp)
}

export async function addNotification(userId: string | null | undefined, next: Omit<AppNotification, 'id' | 'timestamp' | 'read'> & Partial<AppNotification>): Promise<AppNotification[]> {
  const existing = await loadNotifications(userId)
  const item: AppNotification = {
    id: next.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: next.title ?? '',
    body: next.body ?? '',
    category: (next.category as NotificationCategory) ?? 'informational',
    timestamp: next.timestamp ?? Date.now(),
    read: next.read ?? false,
  }
  const items = sortByTimestampDesc([item, ...existing])
  await saveNotifications(userId, items)
  return items
}

export async function markAsRead(userId: string | null | undefined, id: string): Promise<AppNotification[]> {
  const existing = await loadNotifications(userId)
  const items = existing.map(n => (n.id === id ? { ...n, read: true } : n))
  await saveNotifications(userId, items)
  return items
}

export async function markAllAsRead(userId: string | null | undefined): Promise<AppNotification[]> {
  const existing = await loadNotifications(userId)
  const items = existing.map(n => ({ ...n, read: true }))
  await saveNotifications(userId, items)
  return items
}

export async function clearAll(userId: string | null | undefined): Promise<void> {
  const k = keyFor(userId)
  await AsyncStorage.removeItem(k)
}
