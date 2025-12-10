import AsyncStorage from '@react-native-async-storage/async-storage'
import api from './api'

export async function getDriverContacts(driverId: string) {
  const res = await api.get('/api/emergency/contacts', { params: { driverId } })
  return Array.isArray(res.data?.items) ? res.data.items : []
}

export async function sendEmergencyAlert(payload: { driverId: string; message: string; includeLocation?: boolean }) {
  const body: any = { driverId: payload.driverId, messageTemplate: payload.message, includeLocation: !!payload.includeLocation, bypass2fa: true, priority: 'emergency' }
  const res = await api.post('/api/emergency/admin/alert', body)
  return res.data
}

export async function logEmergency(data: any) {
  try { await api.post('/api/emergency/logs', data) } catch {}
}

const QUEUE_KEY = 'emergency:queue'

export async function enqueueEmergency(payload: any) {
  const raw = await AsyncStorage.getItem(QUEUE_KEY)
  const arr = raw ? JSON.parse(raw) : []
  arr.push({ ...payload, queuedAt: Date.now() })
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(arr))
}

export async function processQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY)
  const arr = raw ? JSON.parse(raw) : []
  const remaining: any[] = []
  for (const item of arr) {
    try { await sendEmergencyAlert(item) } catch { remaining.push(item) }
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining))
}

