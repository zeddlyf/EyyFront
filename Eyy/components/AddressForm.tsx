import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

type AddressValue = {
  street: string;
  barangay: string;
  city: string;
  province: string;
  postalCode?: string;
};

export default function AddressForm({
  value,
  onChange,
  accessibilityPrefix = 'Address'
}: {
  value?: Partial<AddressValue>;
  onChange: (addr: AddressValue) => void;
  accessibilityPrefix?: string;
}) {
  const [streetCombined, setStreetCombined] = useState(value?.street || '');
  const [barangay, setBarangay] = useState(value?.barangay || '');
  const [city, setCity] = useState(value?.city || '');
  const [province, setProvince] = useState(value?.province || '');
  const [postalCode, setPostalCode] = useState(value?.postalCode || '');

  useEffect(() => {
    onChange({ street: normalizeStreet(streetCombined), barangay: barangay.trim(), city: city.trim(), province: province.trim(), postalCode: postalCode.trim() });
  }, [streetCombined, barangay, city, province, postalCode]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>House/Unit, Block & Street</Text>
      <TextInput
        style={styles.input}
        value={streetCombined}
        onChangeText={setStreetCombined}
        placeholder="e.g., Unit 3-B, Block 9, Panganiban Drive"
        accessibilityLabel={`${accessibilityPrefix} Street Combined`}
      />
      <Text style={styles.label}>Barangay</Text>
      <TextInput
        style={styles.input}
        value={barangay}
        onChangeText={setBarangay}
        placeholder="e.g., Barangay Dinaga"
        accessibilityLabel={`${accessibilityPrefix} Barangay`}
      />
      <Text style={styles.label}>City / Municipality</Text>
      <TextInput
        style={styles.input}
        value={city}
        onChangeText={setCity}
        placeholder="e.g., Naga City"
        accessibilityLabel={`${accessibilityPrefix} City`}
      />
      <Text style={styles.label}>Province</Text>
      <TextInput
        style={styles.input}
        value={province}
        onChangeText={setProvince}
        placeholder="e.g., Camarines Sur"
        accessibilityLabel={`${accessibilityPrefix} Province`}
      />
      <Text style={styles.labelOptional}>ZIP Code (optional)</Text>
      <TextInput
        style={styles.input}
        value={postalCode}
        onChangeText={setPostalCode}
        keyboardType="numeric"
        placeholder="e.g., 4400"
        accessibilityLabel={`${accessibilityPrefix} ZIP Code (optional)`}
      />
    </View>
  );
}

function normalizeStreet(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim();
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  label: { fontSize: 14, color: '#333', fontWeight: '500' },
  labelOptional: { fontSize: 14, color: '#666' },
  input: { borderWidth: 1, borderColor: '#666', borderRadius: 8, paddingHorizontal: 12, height: 44, color: '#000' }
});