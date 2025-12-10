import { addNotification, loadNotifications, markAsRead, markAllAsRead, getUnreadCount, clearAll } from '../lib/notifications-service'
import AsyncStorage from '@react-native-async-storage/async-storage'

const store: Record<string, string> = {}

jest.spyOn(AsyncStorage, 'getItem').mockImplementation(async (k: string) => store[k] ?? null)
jest.spyOn(AsyncStorage, 'setItem').mockImplementation(async (k: string, v: string) => { store[k] = v })
jest.spyOn(AsyncStorage, 'removeItem').mockImplementation(async (k: string) => { delete store[k] })

describe('notifications service', () => {
  const uid = 'u1'

  beforeEach(async () => {
    for (const k of Object.keys(store)) delete store[k]
    await clearAll(uid)
  })

  it('adds and persists notifications', async () => {
    const after = await addNotification(uid, { title: 't', body: 'b', category: 'informational' })
    expect(after.length).toBe(1)
    const loaded = await loadNotifications(uid)
    expect(loaded.length).toBe(1)
    expect(loaded[0].title).toBe('t')
    expect(getUnreadCount(loaded)).toBe(1)
  })

  it('marks a notification as read', async () => {
    const after = await addNotification(uid, { title: 'A', body: 'B', category: 'updates' })
    const id = after[0].id
    const next = await markAsRead(uid, id)
    expect(next[0].read).toBe(true)
    expect(getUnreadCount(next)).toBe(0)
  })

  it('marks all notifications as read', async () => {
    await addNotification(uid, { title: '1', body: '1', category: 'urgent' })
    await addNotification(uid, { title: '2', body: '2', category: 'informational' })
    const loaded = await loadNotifications(uid)
    expect(getUnreadCount(loaded)).toBe(2)
    const next = await markAllAsRead(uid)
    expect(getUnreadCount(next)).toBe(0)
  })
})
