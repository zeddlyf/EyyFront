import React from 'react'
import { View, Text, SafeAreaView, Platform, StatusBar, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '../../lib/AuthContext'
import { contactsV1 } from '../../lib/api'

export default function Contacts() {
  const router = useRouter()
  const { user } = useAuth()
  const [items, setItems] = React.useState<SavedContact[]>([])
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [phone, setPhone] = React.useState('')

  const fetchContacts = async () => {
    const res = await contactsV1.list()
    const items = (res.items || []).map((c: any) => ({ id: c.id, name: c.name, phone: c.phone }))
    setItems(items)
  }
  React.useEffect(() => { fetchContacts() }, [])

  const add = async () => {
    if (!name.trim() || !phone.trim()) return
    await contactsV1.create({ userType: 'driver', name: name.trim(), phone: phone.trim(), metadata: {} })
    await fetchContacts()
    setOpen(false)
    setName('')
    setPhone('')
  }

  const remove = async (id: string) => { await contactsV1.delete(id); await fetchContacts() }

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
