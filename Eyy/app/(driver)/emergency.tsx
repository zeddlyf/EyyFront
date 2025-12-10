import React from 'react'
import { View, Text, SafeAreaView, Platform, StatusBar, StyleSheet, TouchableOpacity, TextInput, ScrollView, Switch, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import api from '../../lib/api'

type ContactItem = { _id: string; name: string; phoneMasked: string; priority: number; enabled: boolean }

export default function Emergency() {
  const router = useRouter()
  const [contacts, setContacts] = React.useState<ContactItem[]>([])
  const [name, setName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [priority, setPriority] = React.useState('1')
  const [enabled, setEnabled] = React.useState(true)
  const [loadingContacts, setLoadingContacts] = React.useState(false)
  const [messageTemplate, setMessageTemplate] = React.useState('EMERGENCY ALERT')
  const [includeLocation, setIncludeLocation] = React.useState(true)
  const [otpRequired, setOtpRequired] = React.useState(false)
  const [otp, setOtp] = React.useState('')

  const loadContacts = async () => {
    try {
      setLoadingContacts(true)
      const res = await api.get('/api/emergency/contacts')
      setContacts(res.data.items || [])
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load contacts')
    } finally {
      setLoadingContacts(false)
    }
  }
  React.useEffect(() => { loadContacts() }, [])

  const addContact = async () => {
    try {
      if (!name.trim() || !phone.trim()) return Alert.alert('Missing info', 'Enter name and phone')
      await api.post('/api/emergency/contacts', { name: name.trim(), phone: phone.trim(), priority: Number(priority) || 1, enabled })
      setName(''); setPhone(''); setPriority('1'); setEnabled(true)
      await loadContacts()
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add contact')
    }
  }

  const removeContact = async (id: string) => {
    try { await api.delete(`/api/emergency/contacts/${id}`); await loadContacts() } catch (e: any) { Alert.alert('Error', e.message || 'Failed to remove contact') }
  }

  const requestOtp = async () => {
    try { await api.post('/api/emergency/request-otp'); Alert.alert('2FA', 'Code sent via SMS') } catch (e: any) { Alert.alert('Error', e.message || 'Failed to request 2FA') }
  }

  const sendAlert = async () => {
    try {
      const payload: any = { type: 'manual', messageTemplate }
      if (includeLocation) payload.location = {}
      if (otpRequired) { payload.require2fa = true; payload.otp = otp }
      const res = await api.post('/api/emergency/alert', payload)
      Alert.alert('Alert sent', `Recipients: ${res.data.recipients?.length || 0}`)
      setOtp('')
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send alert')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.rowWrap}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add Contact</Text>
            <View style={styles.inputRow}><Ionicons name="person" size={18} color="#fff" /><TextInput value={name} onChangeText={setName} placeholder="Name" placeholderTextColor="#ffffff80" style={styles.input} /></View>
            <View style={styles.inputRow}><Ionicons name="call" size={18} color="#fff" /><TextInput value={phone} onChangeText={setPhone} placeholder="Phone" placeholderTextColor="#ffffff80" style={styles.input} keyboardType="phone-pad" /></View>
            <View style={styles.inputRow}><Ionicons name="list" size={18} color="#fff" /><TextInput value={priority} onChangeText={setPriority} placeholder="Priority (1-5)" placeholderTextColor="#ffffff80" style={styles.input} keyboardType="number-pad" /></View>
            <View style={styles.switchRow}><Text style={styles.label}>Enabled</Text><Switch value={enabled} onValueChange={setEnabled} trackColor={{ false: '#666', true: '#1e8e3e' }} /></View>
            <TouchableOpacity style={styles.primaryButton} onPress={addContact}><Text style={styles.primaryText}>Add</Text></TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={requestOtp}><Text style={styles.secondaryText}>Request 2FA Code</Text></TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contacts</Text>
            {loadingContacts ? <Text style={styles.loading}>Loading...</Text> : (
              contacts.length === 0 ? <Text style={styles.empty}>No contacts</Text> : (
                contacts.map(c => (
                  <View key={c._id} style={styles.contactRow}>
                    <View style={styles.contactText}><Text style={styles.nameText}>{c.name}</Text><Text style={styles.subText}>{c.phoneMasked} • Priority {c.priority} {c.enabled ? '' : '(disabled)'}</Text></View>
                    <TouchableOpacity onPress={() => removeContact(c._id)}><Ionicons name="trash" size={18} color="#fff" /></TouchableOpacity>
                  </View>
                ))
              )
            )}
            <View style={styles.divider} />
            <Text style={styles.cardTitle}>Send Alert</Text>
            <View style={styles.inputRow}><Ionicons name="alert" size={18} color="#fff" /><TextInput value={messageTemplate} onChangeText={setMessageTemplate} placeholder="Message" placeholderTextColor="#ffffff80" style={styles.input} /></View>
            <View style={styles.switchRow}><Text style={styles.label}>Include Location</Text><Switch value={includeLocation} onValueChange={setIncludeLocation} trackColor={{ false: '#666', true: '#1e8e3e' }} /></View>
            <View style={styles.switchRow}><Text style={styles.label}>Require 2FA</Text><Switch value={otpRequired} onValueChange={setOtpRequired} trackColor={{ false: '#666', true: '#1e8e3e' }} /></View>
            {otpRequired && (<View style={styles.inputRow}><Ionicons name="key" size={18} color="#fff" /><TextInput value={otp} onChangeText={setOtp} placeholder="Enter 2FA code" placeholderTextColor="#ffffff80" style={styles.input} keyboardType="number-pad" /></View>)}
            <TouchableOpacity style={styles.primaryButton} onPress={sendAlert}><Text style={styles.primaryText}>Send Alert</Text></TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  label: { color: '#fff' },
  primaryButton: { backgroundColor: '#1e8e3e', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  primaryText: { color: '#fff', fontWeight: '600' },
  secondaryButton: { backgroundColor: '#ffffff10', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  secondaryText: { color: '#fff', fontWeight: '600' },
  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#ffffff20' },
  contactText: { flexDirection: 'column' },
  nameText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  subText: { color: '#ffffff80', fontSize: 12 },
  divider: { height: 1, backgroundColor: '#ffffff20', marginVertical: 12 },
  loading: { color: '#fff' },
  empty: { color: '#ffffff80' },
})
