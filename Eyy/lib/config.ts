import Constants from 'expo-constants';

// Environment configuration
export const config = {
  // API Configuration
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://eyyback-production.up.railway.app',
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://eyyback-production.up.railway.app/api',
  
  // Socket.IO Configuration
  SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL || 'https://eyyback-production.up.railway.app',
  
  // Google Maps Configuration
  GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY',
  
  // Development Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Fallback URLs for different network configurations
  FALLBACK_URLS: [
    'http://10.128.65.35:3000',
    'http://192.168.56.1:3000',
    'http://192.168.57.2:3000',
    'http://127.0.0.1:3000'
  ],
  
  // Database Configuration (for reference)
  MONGODB_URI: process.env.EXPO_PUBLIC_MONGODB_URI || 'mongodb://localhost:27017/eyytrike',
  
  // JWT Configuration (for reference)
  JWT_SECRET: process.env.EXPO_PUBLIC_JWT_SECRET || 'your-super-secret-jwt-key-here'
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
  return config.GOOGLE_MAPS_API_KEY || Constants.expoConfig?.extra?.googleMapsApiKey || 'YOUR_GOOGLE_MAPS_API_KEY';
};

export default config;
