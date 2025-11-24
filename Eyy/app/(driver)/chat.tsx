import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSocket } from '../../lib/socket-context';
import { authAPI } from '../../lib/api';

export default function DriverChat() {
  const { rideId, conversationId } = useLocalSearchParams<{ rideId: string, conversationId: string }>();
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!socket || !conversationId) return;
    socket.emit('joinConversationRoom', conversationId);
    socket.on('messageReceived', (payload: any) => {
      if (payload.conversationId === conversationId) {
        setMessages(prev => [...prev, payload.message]);
      }
    });
    socket.on('userTyping', (data: any) => {
      setTyping(!!data.isTyping);
    });
    return () => {
      socket.emit('leaveConversationRoom', conversationId);
      socket.off('messageReceived');
      socket.off('userTyping');
    };
  }, [socket, conversationId]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    try {
      const tokenUser = await authAPI.getCurrentUser();
      const res = await fetch(`${require('../../lib/api').API_URL}/api/messaging/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await require('@react-native-async-storage/async-storage').default.getItem('token')}` },
        body: JSON.stringify({ rideId, message: text })
      });
      const data = await res.json();
      if (data && data.success) {
        setMessages(prev => [...prev, data.message]);
      }
    } catch {}
  };

  const quickReplies = ['On my way', 'Running late', 'Here'];

  const handleTyping = () => {
    if (!socket || !conversationId) return;
    socket.emit('typingStart', { conversationId, userId: 'driver' });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typingStop', { conversationId, userId: 'driver' });
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#0d4217" />
        </TouchableOpacity>
        <Text style={styles.title}>Ride Chat</Text>
        <View style={styles.statusDot} />
      </View>
      <FlatList
        data={messages}
        keyExtractor={(item: any) => item._id || Math.random().toString()}
        renderItem={({ item }) => (
          <View style={[styles.message, item.messageType === 'system' && styles.systemMessage]}>
            <Text style={styles.messageText}>{item.message}</Text>
          </View>
        )}
        contentContainerStyle={styles.list}
      />
      {typing && <Text style={styles.typing}>Passenger is typing…</Text>}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0d4217' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#28a745' },
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
});