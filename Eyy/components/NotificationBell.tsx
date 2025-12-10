import React, { useMemo, useState } from 'react'
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNotifications } from '../lib/notifications-context'

function CategoryBadge({ category }: { category: 'urgent' | 'informational' | 'updates' }) {
  const cfg = useMemo(() => {
    if (category === 'urgent') return { label: 'Urgent', bg: '#FF6B35' }
    if (category === 'updates') return { label: 'Update', bg: '#3B82F6' }
    return { label: 'Info', bg: '#0d4217' }
  }, [category])
  return (
    <View style={[styles.catBadge, { backgroundColor: cfg.bg }]} accessibilityRole="text" accessibilityLabel={cfg.label}>
      <Text style={styles.catBadgeText}>{cfg.label}</Text>
    </View>
  )
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const toggle = () => setOpen(v => !v)

  return (
    <View>
      <Pressable
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        accessibilityHint="Opens notifications"
        onPress={toggle}
        style={styles.bell}
      >
        <Ionicons name="notifications-outline" size={24} color="#FFD700" />
        {unreadCount > 0 && (
          <View style={styles.badge} accessibilityRole="text" accessibilityLabel={`${unreadCount} unread`}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={toggle}>
        <Pressable style={styles.overlay} onPress={toggle} accessibilityRole="button" accessibilityLabel="Close notifications" />
        <View style={styles.panel} accessibilityRole="menu" accessibilityLabel="Notifications list">
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Notifications</Text>
            <Pressable onPress={async () => { await markAllRead(); }} accessibilityRole="button" accessibilityLabel="Mark all as read">
              <Text style={styles.markAll}>Mark all read</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.list}>
            {notifications.length === 0 && (
              <View style={styles.empty}><Text style={styles.emptyText}>No notifications</Text></View>
            )}
            {notifications.map(n => (
              <Pressable key={n.id}
                onPress={async () => { await markRead(n.id) }}
                style={[styles.item, !n.read && styles.itemUnread]}
                accessibilityRole="button"
                accessibilityLabel={`${n.title}, ${n.read ? 'read' : 'unread'}`}
              >
                <View style={styles.itemHeader}>
                  <CategoryBadge category={n.category} />
                  <Text style={styles.itemTime}>{new Date(n.timestamp).toLocaleString()}</Text>
                </View>
                <Text style={styles.itemTitle}>{n.title}</Text>
                <Text style={styles.itemBody}>{n.body}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  bell: { position: 'relative' },
  badge: { position: 'absolute', top: -6, right: -6, backgroundColor: '#FF6B35', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)' },
  panel: { position: 'absolute', top: 80, right: 16, left: 16, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#0d4217' },
  panelTitle: { color: '#FFD700', fontWeight: '700' },
  markAll: { color: '#FFD700', fontWeight: '600' },
  list: { maxHeight: 320 },
  empty: { padding: 16, alignItems: 'center' },
  emptyText: { color: '#374151' },
  item: { padding: 12, borderBottomColor: '#E5E7EB', borderBottomWidth: StyleSheet.hairlineWidth },
  itemUnread: { backgroundColor: '#FFF8E1' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemTitle: { fontWeight: '700', color: '#0d4217', marginBottom: 2 },
  itemBody: { color: '#374151' },
  catBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  catBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  itemTime: { fontSize: 12, color: '#6B7280' },
})
