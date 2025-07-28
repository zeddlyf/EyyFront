import Constants from 'expo-constants';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use the user's local IP address as the primary server URL.
// Fallback to Constants.expoConfig?.extra?.serverUrl if the IP is not available (less likely).
const USER_LOCAL_IP = 'http://2.1.1.117:3000';
export const API_URL = USER_LOCAL_IP || Constants.expoConfig?.extra?.serverUrl;

// Ensure API_URL is set, otherwise throw an error
if (!API_URL) {
  throw new Error('API_URL is not defined. Make sure your barckend server IP is correctly set or serverUrl is configured in app.json');
}

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Increased timeout to 30 seconds
});

// Add request interceptor for authentication
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add socket bypass headers for ride creation
    if (config.url?.includes('/api/rides') && config.method === 'post') {
      config.headers['X-Skip-Socket'] = 'true';
      config.headers['X-No-Socket'] = 'true';
      config.headers['X-Bypass-Socket'] = 'true';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    
    // Handle network errors (no response received)
    if (!error.response) {
      console.error('Axios Network Error:', error.message, error.toJSON()); // Log more details
      return Promise.reject(new Error('Network error. Please check your internet connection and make sure the server is running.'));
    }
    
    // Extract error message from response
    const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
    return Promise.reject(new Error(errorMessage));
  }
);

// Types
interface UserData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  role?: 'driver' | 'commuter';
  licenseNumber?: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    phoneNumber: string;
    role: 'driver' | 'commuter';
    licenseNumber?: string;
  };
}

// Auth API endpoints
const authAPI = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/api/auth/login', { email, password });
      if (response.data.token) {
        await AsyncStorage.setItem('token', response.data.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to login');
    }
  },
  register: async (userData: UserData): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/api/auth/register', userData);
      if (response.data.token) {
        await AsyncStorage.setItem('token', response.data.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to register');
    }
  },
  logout: async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } catch (error: any) {
      throw new Error('Failed to logout');
    }
  },
  getCurrentUser: async () => {
    try {
      const response = await api.get('/api/auth/me');
      return response.data;
    } catch (error: any) {
      throw new Error('Failed to get user profile');
    }
  },
};

// User API endpoints
const userAPI = {
  getProfile: async () => {
    const response = await api.get('/api/users/profile');
    return response.data;
  },
  updateProfile: async (data: any) => {
    // Only PATCH is allowed, and only certain fields
    const response = await api.patch('/api/users/profile', data);
    return response.data;
  },
  updateDriverAvailability: async (isAvailable: boolean) => {
    const response = await api.patch('/api/users/driver/availability', { isAvailable });
    return response.data;
  },
  updateDriverLocation: async (latitude: number, longitude: number) => {
    const response = await api.patch('/api/users/driver/location', { latitude, longitude });
    return response.data;
  },
  getNearbyDrivers: async (latitude: number, longitude: number, maxDistance = 5000) => {
    const response = await api.get('/api/users/drivers/nearby', {
      params: { latitude, longitude, maxDistance },
    });
    return response.data;
  },
};

// Ride API endpoints
const rideAPI = {
  createRide: async (rideData: any) => {
    // Backend expects passenger from token, not in body
    const response = await api.post('/api/rides', rideData);
    return response.data;
  },
  getMyRides: async () => {
    const response = await api.get('/api/rides/my-rides');
    return response.data;
  },
  getNearbyRides: async (latitude: number, longitude: number, maxDistance = 5000) => {
    const response = await api.get('/api/rides/nearby', {
      params: { latitude, longitude, maxDistance },
    });
    return response.data;
  },
  acceptRide: async (id: string) => {
    const response = await api.patch(`/api/rides/${id}/accept`);
    return response.data;
  },
  updateRideStatus: async (id: string, status: string) => {
    const response = await api.patch(`/api/rides/${id}/status`, { status });
    return response.data;
  },
  rateRide: async (id: string, rating: number, feedback?: string) => {
    const response = await api.post(`/api/rides/${id}/rate`, { rating, feedback });
    return response.data;
  },
};

// Wallet API endpoints
const walletAPI = {
  createWallet: async (walletData: any) => {
    const response = await api.post('/api/wallets', walletData);
    return response.data;
  },
  getWallets: async () => {
    const response = await api.get('/api/wallets');
    return response.data;
  },
  getWalletById: async (id: string) => {
    const response = await api.get(`/api/wallets/${id}`);
    return response.data;
  },
  updateWallet: async (id: string, walletData: any) => {
    const response = await api.put(`/api/wallets/${id}`, walletData);
    return response.data;
  },
  deleteWallet: async (id: string) => {
    const response = await api.delete(`/api/wallets/${id}`);
    return response.data;
  },
};

// Payment API endpoints
const paymentAPI = {
  createPayment: async (paymentData: any) => {
    const response = await api.post('/api/payments', paymentData);
    return response.data;
  },
  getPayments: async () => {
    const response = await api.get('/api/payments');
    return response.data;
  },
  getPaymentById: async (id: string) => {
    const response = await api.get(`/api/payments/${id}`);
    return response.data;
  },
  updatePayment: async (id: string, paymentData: any) => {
    const response = await api.put(`/api/payments/${id}`, paymentData);
    return response.data;
  },
  deletePayment: async (id: string) => {
    const response = await api.delete(`/api/payments/${id}`);
    return response.data;
  },
};

export { authAPI, userAPI, rideAPI, walletAPI, paymentAPI };
export type { UserData, AuthResponse };

export default api; 