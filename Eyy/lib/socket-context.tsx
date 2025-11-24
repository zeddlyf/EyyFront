import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import createSocket from './socket-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSocketUrl } from './config';

// Define the context type
interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  error: string | null;
}

// Create the context
const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  error: null,
});

// Create the provider component
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const serverUrl = getSocketUrl();
    let interval: any;
    try {
      const socketInstance = createSocket(serverUrl);

      socketInstance.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
        setError(null);
      });

      socketInstance.on('disconnect', (reason: any) => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (err: Error) => {
        console.error('Socket connection error:', err);
        setError(err.message);
        setIsConnected(false);
      });

      const tryConnectWithToken = async () => {
        try {
          const token = await AsyncStorage.getItem('token');
          if (!token) {
            return; // Do not connect without auth; server will reject unauthenticated sockets
          }
          socketInstance.auth = { token };
          if (!socketInstance.connected) {
            socketInstance.connect();
          }
        } catch {}
      };

      setSocket(socketInstance);
      // Attempt initial connect only if token exists
      tryConnectWithToken();
      // Periodically attempt reconnect if we have a token and are not connected
      interval = setInterval(tryConnectWithToken, 10000);

      return () => {
        clearInterval(interval);
        if (socketInstance.connected) {
          socketInstance.disconnect();
        }
      };
    } catch (err) {
      console.error('Error creating socket:', err);
      setError(err instanceof Error ? err.message : 'Failed to create socket connection');
    }
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, error }}>
      {children}
    </SocketContext.Provider>
  );
}

// Custom hook to use the socket context
export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}