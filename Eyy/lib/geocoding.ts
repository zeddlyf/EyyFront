import * as Location from 'expo-location'

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
    const r = results?.[0]
    if (!r) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    const parts = [r.name, r.street, r.city, r.region, r.postalCode, r.country].filter(Boolean)
    return parts.join(', ')
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}

export function toHumanAddress(address?: string, lat?: number, lng?: number): string {
  if (address && address.trim().length > 0) return address
  if (typeof lat === 'number' && typeof lng === 'number') return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  return 'Unknown location'
}

