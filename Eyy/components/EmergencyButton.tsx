import React from 'react'
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

type Props = { onPress: () => void }

export default function EmergencyButton({ onPress }: Props) {
  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.button} onPress={onPress} accessibilityLabel="Emergency">
        <Ionicons name="alert" size={20} color="#fff" />
        <Text style={styles.text}>Emergency</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 24, right: 24 },
  button: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e53935', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, elevation: 5 },
  text: { color: '#fff', fontWeight: '700', marginLeft: 8 }
})

