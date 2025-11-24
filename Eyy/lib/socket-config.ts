import io from 'socket.io-client';
import { getSocketUrl } from './config';

const createSocket = (url?: string) => {
  const serverUrl = url || getSocketUrl();
  const finalUrl = serverUrl.startsWith('http') ? serverUrl : `http://${serverUrl}`;
  const socket = io(finalUrl, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    autoConnect: false,
  });
  return socket;
};

export default createSocket;