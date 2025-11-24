import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

type Props = {
  value: number;
  onChange?: (val: number) => void;
  readOnly?: boolean;
  accessibilityLabel?: string;
};

export default function StarRating({ value = 0, onChange, readOnly = false, accessibilityLabel = 'Rating' }: Props) {
  const handlePress = (index: number, half: boolean) => {
    if (readOnly) return;
    const newVal = Math.max(1, Math.min(5, index + (half ? 0.5 : 1)));
    onChange && onChange(newVal);
  };

  return (
    <View accessibilityLabel={accessibilityLabel} style={{ flexDirection: 'row', alignItems: 'center' }}>
      {[0,1,2,3,4].map((i) => {
        const full = value >= i + 1;
        const half = !full && value >= i + 0.5;
        return (
          <View key={i} style={{ position: 'relative', width: 28, height: 28 }}>
            <FontAwesome name="star" size={24} color={full ? '#fbbf24' : '#d1d5db'} />
            {half && (
              <View style={{ position: 'absolute', left: 0, top: 0, width: '50%', overflow: 'hidden' }}>
                <FontAwesome name="star" size={24} color="#fbbf24" />
              </View>
            )}
            {!readOnly && (
              <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, flexDirection: 'row' }}>
                <TouchableOpacity accessibilityLabel={`Rate ${i + 0.5} stars`} style={{ flex: 1 }} onPress={() => handlePress(i, true)} />
                <TouchableOpacity accessibilityLabel={`Rate ${i + 1} stars`} style={{ flex: 1 }} onPress={() => handlePress(i, false)} />
              </View>
            )}
          </View>
        );
      })}
      {!readOnly && (
        <Text style={{ marginLeft: 8, color: '#6b7280' }}>{value ? value.toFixed(1) : ''}</Text>
      )}
    </View>
  );
}