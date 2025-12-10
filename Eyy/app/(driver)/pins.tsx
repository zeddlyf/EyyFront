import React from 'react'
import { View, Text, SafeAreaView, Platform, StatusBar, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '../../lib/AuthContext'
import { addPin, loadPins, removePin, SavedPin } from '../../lib/driver-saved'
import GooglePlacesAutocomplete from '../../utils/GooglePlacesAutocomplete'

export default function Pins() {
  const router = useRouter()
  const { user } = useAuth()
  const [items, setItems] = React.useState<SavedPin[]>([])

  React.useEffect(() => { (async () => { setItems(await loadPins(user?._id)) })() }, [user?._id])

  const onPlaceSelected = async (place: any, details: any) => {
    const address = place.description
    const lat = details?.geometry?.location?.lat ?? 0
    const lng = details?.geometry?.location?.lng ?? 0
    const label = details?.name || place.structured_formatting?.main_text || 'Pinned Place'
    const next = await addPin(user?._id, { label, address, coordinates: [lng, lat] })
    setItems(next)
  }

  const remove = async (id: string) => { setItems(await removePin(user?._id, id)) }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pinned Locations</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchBox}>
        <GooglePlacesAutocomplete placeholder="Add a location" onPlaceSelected={onPlaceSelected} containerStyle={{}} inputStyle={{ color: '#fff' }} listStyle={{ backgroundColor: '#fff' }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="pin" size={18} color="#fff" />
              <View style={styles.rowText}>
                <Text style={styles.nameText}>{item.label}</Text>
                <Text style={styles.subText}>{item.address}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => remove(item.id)}>
              <Ionicons name="trash" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d4217', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#fff', fontSize: 16, marginLeft: 4 },
  headerTitle: { color: '#fff', fontWeight: 'bold' },
  searchBox: { paddingHorizontal: 16, paddingBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ffffff20' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { marginLeft: 12 },
  nameText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  subText: { color: '#ffffff80', fontSize: 12 },
})
