import React from 'react'
import { View, Text, SafeAreaView, Platform, StatusBar, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { contactsV1 } from '../../lib/api'

type SavedContact = { id: string; name: string; phone: string; email?: string }

export default function CommuterContacts() {
  const router = useRouter()
  const [items, setItems] = React.useState<SavedContact[]>([])
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [email, setEmail] = React.useState('')

  const fetchContacts = async () => {
    try {
      const res = await contactsV1.listByType('commuter')
      const items = (res || []).map((c: any) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email }))
      setItems(items)
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load contacts')
    }
  }
  React.useEffect(() => { fetchContacts() }, [])

  const validate = () => {
    if (!name.trim()) { Alert.alert('Validation', 'Name is required'); return false }
    const phoneVal = phone.trim()
    if (!phoneVal) { Alert.alert('Validation', 'Phone number is required'); return false }
    const phoneOk = /^[0-9+\-()\s]{7,}$/.test(phoneVal)
    if (!phoneOk) { Alert.alert('Validation', 'Enter a valid phone number'); return false }
    const emailVal = email.trim()
    if (emailVal && !/^.+@.+\..+$/.test(emailVal)) { Alert.alert('Validation', 'Enter a valid email'); return false }
    return true
  }

  const add = async () => {
    if (!validate()) return
    try {
      await contactsV1.create({ userType: 'commuter', name: name.trim(), phone: phone.trim(), email: email.trim() || undefined, metadata: {} })
      await fetchContacts()
      setOpen(false)
      setName('')
      setPhone('')
      setEmail('')
      Alert.alert('Success', 'Contact saved')
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save contact')
    }
  }

  const remove = async (id: string) => {
    try {
      await contactsV1.delete(id)
      await fetchContacts()
      Alert.alert('Deleted', 'Contact removed')
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to delete contact')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Contacts</Text>
        <TouchableOpacity onPress={() => setOpen(true)} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="person" size={18} color="#fff" />
              <View style={styles.rowText}>
                <Text style={styles.nameText}>{item.name}</Text>
                <Text style={styles.subText}>{item.phone}</Text>
                {item.email ? <Text style={styles.subText}>{item.email}</Text> : null}
              </View>
            </View>
            <TouchableOpacity onPress={() => remove(item.id)}>
              <Ionicons name="trash" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay} />
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Add Contact</Text>
          <View style={styles.inputRow}>
            <Ionicons name="person" size={18} color="#fff" />
            <TextInput value={name} onChangeText={setName} placeholder="Name" placeholderTextColor="#ffffff80" style={styles.input} />
          </View>
          <View style={styles.inputRow}>
            <Ionicons name="call" size={18} color="#fff" />
            <TextInput value={phone} onChangeText={setPhone} placeholder="Phone" placeholderTextColor="#ffffff80" style={styles.input} keyboardType="phone-pad" />
          </View>
          <View style={styles.inputRow}>
            <Ionicons name="mail" size={18} color="#fff" />
            <TextInput value={email} onChangeText={setEmail} placeholder="Email (optional)" placeholderTextColor="#ffffff80" style={styles.input} keyboardType="email-address" />
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalButton} onPress={() => setOpen(false)}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={add}>
              <Text style={styles.modalButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d4217', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#fff', fontSize: 16, marginLeft: 4 },
  headerTitle: { color: '#fff', fontWeight: 'bold' },
  addButton: { padding: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ffffff20' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { marginLeft: 12 },
  nameText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  subText: { color: '#ffffff80', fontSize: 12 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)' },
  modal: { position: 'absolute', top: 120, left: 16, right: 16, backgroundColor: '#0d4217', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#ffffff20' },
  modalTitle: { color: '#fff', fontWeight: '700', marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff10', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  input: { flex: 1, color: '#fff', marginLeft: 8 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#ffffff10' },
  modalButtonPrimary: { backgroundColor: '#1e8e3e' },
  modalButtonText: { color: '#fff', fontWeight: '600' },
})

