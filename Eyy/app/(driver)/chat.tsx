import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import ChatPanel from '../../components/ChatPanel';

export default function DriverChat() {
  const { rideId, conversationId } = useLocalSearchParams<{ rideId: string, conversationId: string }>();
  return <ChatPanel rideId={String(rideId || '')} conversationId={String(conversationId || '')} userRole="driver" />
}
