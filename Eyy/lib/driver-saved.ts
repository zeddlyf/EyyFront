import AsyncStorage from '@react-native-async-storage/async-storage'

export type SavedContact = { id: string; name: string; phone: string }
export type SavedPin = { id: string; label: string; address: string; coordinates: [number, number] }

const kContacts = (userId: string | null | undefined) => `driver:contacts:${userId ?? 'guest'}`
const kPins = (userId: string | null | undefined) => `driver:pins:${userId ?? 'guest'}`

export async function loadContacts(userId: string | null | undefined): Promise<SavedContact[]> {
  const raw = await AsyncStorage.getItem(kContacts(userId))
  try { return raw ? JSON.parse(raw) : [] } catch { return [] }
}

export async function saveContacts(userId: string | null | undefined, list: SavedContact[]): Promise<void> {
  await AsyncStorage.setItem(kContacts(userId), JSON.stringify(list))
}

export async function addContact(userId: string | null | undefined, c: Omit<SavedContact, 'id'> & Partial<SavedContact>): Promise<SavedContact[]> {
  const existing = await loadContacts(userId)
  const item: SavedContact = { id: c.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: c.name ?? '', phone: c.phone ?? '' }
  const next = [item, ...existing]
  await saveContacts(userId, next)
  return next
}

export async function removeContact(userId: string | null | undefined, id: string): Promise<SavedContact[]> {
  const existing = await loadContacts(userId)
  const next = existing.filter(x => x.id !== id)
  await saveContacts(userId, next)
  return next
}

export async function loadPins(userId: string | null | undefined): Promise<SavedPin[]> {
  const raw = await AsyncStorage.getItem(kPins(userId))
  try { return raw ? JSON.parse(raw) : [] } catch { return [] }
}

export async function savePins(userId: string | null | undefined, list: SavedPin[]): Promise<void> {
  await AsyncStorage.setItem(kPins(userId), JSON.stringify(list))
}

export async function addPin(userId: string | null | undefined, p: Omit<SavedPin, 'id'> & Partial<SavedPin>): Promise<SavedPin[]> {
  const existing = await loadPins(userId)
  const item: SavedPin = { id: p.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`, label: p.label ?? 'Pinned Place', address: p.address ?? '', coordinates: p.coordinates ?? [0,0] }
  const next = [item, ...existing]
  await savePins(userId, next)
  return next
}

export async function removePin(userId: string | null | undefined, id: string): Promise<SavedPin[]> {
  const existing = await loadPins(userId)
  const next = existing.filter(x => x.id !== id)
  await savePins(userId, next)
  return next
}
