import { Manager } from 'socket.io-client';
import { Platform } from 'react-native';
import { config, getSocketUrl } from './config';

// Configure Socket.IO to use native WebSocket
const socketConfig = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  // Disable Node.js specific features
  rejectUnauthorized: false,
  // Use native WebSocket
  websocket: {
    native: true
  },
  // Add polyfill support
  parser: {
    encoding: 'utf8'
  },
  // Ensure proper initialization
  autoConnect: false
};

// Create socket instance
const createSocket = (url?: string) => {
  // Use provided URL or fallback to config
  const serverUrl = url || getSocketUrl();
  const finalUrl = serverUrl.startsWith('http') ? serverUrl : `http://${serverUrl}`;
  
  const manager = new Manager(finalUrl, socketConfig);
  const socket = manager.socket('/');
  
  // Ensure proper initialization
  if (Platform.OS === 'android') {
    // Add Android specific configuration
    socket.io.opts = {
      ...socket.io.opts,
      auth: {
        'User-Agent': 'React-Native'
      }
    };
  }
  
  return socket;
};

export default createSocket; 