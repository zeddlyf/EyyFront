import React, { useEffect, useState, useRef } from 'react'
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, FlatList, Platform, Switch } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSocket } from '../lib/socket-context'
import { API_URL } from '../lib/api'

type ChatPanelProps = {
  rideId: string
  conversationId?: string
  userRole: 'driver' | 'commuter'
}

export default function ChatPanel({ rideId, conversationId, userRole }: ChatPanelProps) {
  const { socket, isConnected } = useSocket()
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const typingTimeout = useRef<NodeJS.Timeout | null>(null)
  const [typing, setTyping] = useState(false)
  const [enableReadReceipts, setEnableReadReceipts] = useState(false)

  useEffect(() => {
    (async () => {
      await Notifications.requestPermissionsAsync()
    })()
  }, [])

  useEffect(() => {
    const room = conversationId || rideId
    if (!socket || !room) return
    socket.emit('joinConversationRoom', room)
    socket.on('messageReceived', async (payload: any) => {
      if (payload.conversationId === room) {
        setMessages(prev => [...prev, payload.message])
        const token = await AsyncStorage.getItem('token')
        if (!token) return
        await Notifications.scheduleNotificationAsync({
          content: { title: 'New Message', body: String(payload.message?.message || 'You received a new message') },
          trigger: null
        })
      }
    })
    socket.on('userTyping', (data: any) => { setTyping(!!data.isTyping) })
    return () => {
      socket.emit('leaveConversationRoom', room)
      socket.off('messageReceived')
      socket.off('userTyping')
    }
  }, [socket, conversationId, rideId])

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/messaging/history?rideId=${encodeURIComponent(rideId)}`)
        const data = await res.json()
        const arr = Array.isArray(data?.messages) ? data.messages : []
        setMessages(arr)
      } catch {}
    })()
  }, [rideId])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    try {
      const token = await AsyncStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/messaging/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
        body: JSON.stringify({ rideId, message: text })
      })
      const data = await res.json()
      if (data && data.success) {
        setMessages(prev => [...prev, data.message])
      }
    } catch {}
  }

  const handleTyping = () => {
    const room = conversationId || rideId
    if (!socket || !room) return
    socket.emit('typingStart', { conversationId: room, userId: userRole })
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      socket.emit('typingStop', { conversationId: room, userId: userRole })
    }, 1000)
  }

  const onMessageVisible = (msg: any) => {
    if (!enableReadReceipts) return
    const room = conversationId || rideId
    if (!socket || !room) return
    if (msg?._id) socket.emit('messageRead', { conversationId: room, messageId: msg._id, userId: userRole })
  }

  const quickReplies = ['On my way', 'Running late', 'Here']

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ride Chat</Text>
        <View style={styles.headerRight}>
          <Text style={styles.readLabel}>Read receipts</Text>
          <Switch value={enableReadReceipts} onValueChange={setEnableReadReceipts} />
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item: any) => item._id || Math.random().toString()}
        renderItem={({ item }) => (
          <View style={[styles.message, item.messageType === 'system' && styles.systemMessage]}>
            <Text style={styles.messageText} onLayout={() => onMessageVisible(item)}>{item.message}</Text>
          </View>
        )}
        contentContainerStyle={styles.list}
      />
      {typing && <Text style={styles.typing}>Typing…</Text>}

      <View style={styles.inputRow}>
        {quickReplies.map(q => (
          <TouchableOpacity key={q} style={styles.quick} onPress={() => setInput(q)}>
            <Text style={styles.quickText}>{q}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={(t) => { setInput(t); handleTyping(); }}
          placeholder="Type a message"
          style={styles.input}
          accessibilityLabel="Message input"
        />
        <TouchableOpacity style={styles.send} onPress={sendMessage}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  readLabel: { color: '#374151', fontSize: 12, marginRight: 6 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0d4217' },
  list: { padding: 12 },
  message: { padding: 10, borderRadius: 8, backgroundColor: '#f1f5f9', marginBottom: 8 },
  systemMessage: { backgroundColor: '#fff7ed' },
  messageText: { color: '#111827' },
  typing: { paddingHorizontal: 12, color: '#6b7280' },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 8 },
  send: { marginLeft: 8, backgroundColor: '#0d4217', padding: 10, borderRadius: 20 },
  quick: { backgroundColor: '#e5e7eb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, marginRight: 6 },
  quickText: { color: '#374151', fontSize: 12 }
})

