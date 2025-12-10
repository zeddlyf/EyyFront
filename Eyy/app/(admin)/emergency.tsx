import React from 'react'
import { View, Text, SafeAreaView, Platform, StatusBar, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { userAPI } from '../../lib/api'
import EmergencyButton from '../../components/EmergencyButton'
import { getDriverContacts, sendEmergencyAlert, enqueueEmergency, processQueue, logEmergency } from '../../lib/emergency'

export default function AdminEmergency() {
  const router = useRouter()
  const [drivers, setDrivers] = React.useState<any[]>([])
  const [selectedDriver, setSelectedDriver] = React.useState<any>(null)
  const [contacts, setContacts] = React.useState<any[]>([])
  const [message, setMessage] = React.useState('EMERGENCY ALERT')
  const [includeLocation, setIncludeLocation] = React.useState(true)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => { const i = setInterval(() => { processQueue() }, 15000); return () => clearInterval(i) }, [])

  const loadDrivers = async () => {
    try { const res = await userAPI.getAllUsers({ role: 'driver', limit: 50 }); setDrivers(res.items || res || []) } catch {}
  }
  React.useEffect(() => { loadDrivers() }, [])

  const selectDriver = async (d: any) => {
    setSelectedDriver(d)
    setLoading(true)
    try { const list = await getDriverContacts(d._id || d.id); setContacts(list) } catch (e: any) { Alert.alert('Error', e?.message || 'Failed to load contacts') } finally { setLoading(false) }
  }

  const sendNow = async () => {
    if (!selectedDriver) return
    const payload = { driverId: selectedDriver._id || selectedDriver.id, message, includeLocation }
    try {
      const res = await sendEmergencyAlert(payload)
      Alert.alert('Sent', `Recipients: ${res?.recipients?.length || 0}`)
      await logEmergency({ driverId: payload.driverId, message, ts: Date.now(), status: 'sent' })
    } catch (e: any) {
      await enqueueEmergency(payload)
      await logEmergency({ driverId: payload.driverId, message, ts: Date.now(), status: 'queued', error: e?.message })
      Alert.alert('Queued', 'Network issue detected, message queued')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="chevron-back" size={24} color="#fff" /><Text style={styles.backText}>Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Emergency</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.rowWrap}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select Driver</Text>
            {drivers.length === 0 ? <Text style={styles.empty}>No drivers</Text> : drivers.map(d => (
              <TouchableOpacity key={d._id || d.id} style={styles.driverRow} onPress={() => selectDriver(d)}>
                <Ionicons name="person" size={18} color="#fff" />
                <Text style={styles.driverText}>{d.fullName || d.name || d.email}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contacts</Text>
            {loading ? <ActivityIndicator color="#fff" /> : (
              contacts.length === 0 ? <Text style={styles.empty}>No contacts</Text> : contacts.map((c: any) => (
                <View key={c._id || c.id} style={styles.contactRow}>
                  <Text style={styles.nameText}>{c.name}</Text>
                  <Text style={styles.subText}>{String(c.phone || '').replace(/(\d{3})\d+(\d{2})/, '$1*****$2')}</Text>
                </View>
              ))
            )}
            <View style={styles.divider} />
            <Text style={styles.cardTitle}>Message</Text>
            <View style={styles.inputRow}><Ionicons name="alert" size={18} color="#fff" /><TextInput value={message} onChangeText={setMessage} placeholder="Message" placeholderTextColor="#ffffff80" style={styles.input} /></View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.primaryButton} onPress={sendNow}><Text style={styles.primaryText}>Send Emergency SMS</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <EmergencyButton onPress={sendNow} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d4217', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#fff', fontSize: 16, marginLeft: 4 },
  headerTitle: { color: '#fff', fontWeight: 'bold' },
  content: { flex: 1 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingHorizontal: 16, paddingBottom: 24 },
  card: { flexGrow: 1, minWidth: 280, backgroundColor: '#ffffff10', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#ffffff20' },
  cardTitle: { color: '#fff', fontWeight: '700', marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff10', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  input: { flex: 1, color: '#fff', marginLeft: 8 },
  primaryButton: { backgroundColor: '#1e8e3e', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  primaryText: { color: '#fff', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#ffffff20', marginVertical: 12 },
  empty: { color: '#ffffff80' },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#ffffff20' },
  driverText: { color: '#fff' },
  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#ffffff20' },
  nameText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  subText: { color: '#ffffff80', fontSize: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' }
})

