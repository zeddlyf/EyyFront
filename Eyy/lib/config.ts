import Constants from 'expo-constants';

// Environment configuration
export const config = {
  // API Configuration
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.6:3000',
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.6:3000/api',
  
  // Socket.IO Configuration
  SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL || 'http://192.168.1.6:3000',
  
  // Google Maps Configuration
  // Do not hardcode keys in client; use env or expo extras
  
  // Development Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Fallback URLs for different network configurations
  FALLBACK_URLS: [
    'http://192.168.1.9:3000',
    'http://192.168.1.6:3000',
    'http://127.0.0.1:3000'
  ],
  
  // Remove backend secrets from client build
  // (use backend .env for secrets)
};

// Get API URL with fallback
export const getApiUrl = (): string => {
  return config.API_URL || Constants.expoConfig?.extra?.serverUrl || 'https://eyyback-production.up.railway.app';
};

// Get Socket URL with fallback
export const getSocketUrl = (): string => {
  return config.SOCKET_URL || Constants.expoConfig?.extra?.serverUrl || 'https://eyyback-production.up.railway.app';
};

// Get Google Maps API Key
export const getGoogleMapsApiKey = (): string => {
  const envKey = (typeof process !== 'undefined' && process.env && (process.env.EXPO_PUBLIC_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY)) || '';
  return envKey || (Constants as any).expoConfig?.extra?.googleMapsApiKey || 'YOUR_GOOGLE_MAPS_API_KEY';
};

export default config;
