import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSocket } from '../../lib/socket-context';

export default function NotificationsDriver() {
  const { socket } = useSocket();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    const s = socket;
    if (!s) return;
    const handler = (note: any) => setItems(prev => [note, ...prev]);
    s.on('notification', handler);
    return () => { s.off('notification', handler); };
  }, [socket]);
  return (
    <ScrollView style={styles.container}>
      {items.map((n, i) => (
        <View key={n._id || i} style={styles.card}>
          <Text style={styles.title}>{n.title}</Text>
          <Text style={styles.body}>{n.body}</Text>
        </View>
      ))}
      {items.length === 0 && (
        <View style={styles.empty}><Text>No notifications</Text></View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { backgroundColor: '#fff', margin: 12, padding: 12, borderRadius: 8 },
  title: { fontWeight: '600', marginBottom: 6 },
  body: { color: '#374151' },
  empty: { padding: 24, alignItems: 'center' }
});