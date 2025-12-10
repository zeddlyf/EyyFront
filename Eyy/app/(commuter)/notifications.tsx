import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useNotifications } from '../../lib/notifications-context';

export default function NotificationsCommuter() {
  const { notifications, markRead, markAllRead } = useNotifications()
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Pressable onPress={async () => { await markAllRead() }} accessibilityRole="button" accessibilityLabel="Mark all as read">
          <Text style={styles.markAll}>Mark all read</Text>
        </Pressable>
      </View>
      {notifications.map((n) => (
        <Pressable key={n.id} style={[styles.card, !n.read && styles.unread]} onPress={async () => { await markRead(n.id) }} accessibilityRole="button" accessibilityLabel={`${n.title}, ${n.read ? 'read' : 'unread'}`}>
          <View style={styles.row}>
            <Text style={styles.category}>{n.category}</Text>
            <Text style={styles.time}>{new Date(n.timestamp).toLocaleString()}</Text>
          </View>
          <Text style={styles.title}>{n.title}</Text>
          <Text style={styles.body}>{n.body}</Text>
        </Pressable>
      ))}
      {notifications.length === 0 && (
        <View style={styles.empty}><Text>No notifications</Text></View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12, backgroundColor: '#0d4217', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFD700', fontWeight: '700' },
  markAll: { color: '#FFD700', fontWeight: '600' },
  card: { backgroundColor: '#fff', margin: 12, padding: 12, borderRadius: 8 },
  unread: { backgroundColor: '#FFF8E1' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  category: { color: '#0d4217', fontWeight: '700' },
  time: { color: '#6B7280', fontSize: 12 },
  title: { fontWeight: '700', marginBottom: 6, color: '#0d4217' },
  body: { color: '#374151' },
  empty: { padding: 24, alignItems: 'center' }
})
