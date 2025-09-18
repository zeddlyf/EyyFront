import Constants from 'expo-constants';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use the user's local IP address as the primary server URL.
// Fallback to Constants.expoConfig?.extra?.serverUrl if the IP is not available (less likely).
const USER_LOCAL_IP = 'http://10.128.65.35:3000';
const FALLBACK_IPS = [
  'http://192.168.56.1:3000',
  'http://192.168.57.2:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

export const API_URL = USER_LOCAL_IP || Constants.expoConfig?.extra?.serverUrl;
export const FALLBACK_URLS = FALLBACK_IPS;

// Ensure API_URL is set, otherwise throw an error
if (!API_URL) {
  throw new Error('API_URL is not defined. Make sure your backend server IP is correctly set or serverUrl is configured in app.json');
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
interface Address {
  street?: string;
  city: string;
  province: string;
  postalCode?: string;
  country?: string;
  fullAddress?: string;
}

interface UserData {
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  password: string;
  phoneNumber: string;
  role?: 'driver' | 'commuter' | 'admin';
  licenseNumber?: string;
  address?: Address;
}

interface AuthResponse {
  token: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    role: 'driver' | 'commuter' | 'admin';
    licenseNumber?: string;
    address?: Address;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    isAvailable?: boolean;
    rating?: number;
    totalRides?: number;
    isActive?: boolean;
    profilePicture?: string;
  };
}

interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'driver' | 'commuter' | 'admin';
  licenseNumber?: string;
  address?: Address;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  isAvailable?: boolean;
  rating?: number;
  totalRides?: number;
  isActive?: boolean;
  profilePicture?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  createdAt: string;
  updatedAt: string;
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
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get('/api/users/profile');
    return response.data;
  },
  updateProfile: async (data: Partial<UserProfile>) => {
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
  // Address-specific endpoints
  getAddress: async (): Promise<Address> => {
    const response = await api.get('/api/users/address');
    return response.data;
  },
  updateAddress: async (address: Partial<Address>) => {
    const response = await api.patch('/api/users/address', address);
    return response.data;
  },
  getUsersByCity: async (city: string, role?: 'driver' | 'commuter') => {
    const params = role ? { role } : {};
    const response = await api.get(`/api/users/by-city/${encodeURIComponent(city)}`, { params });
    return response.data;
  },
  // Admin endpoints
  getAllUsers: async (params?: {
    page?: number;
    limit?: number;
    role?: 'driver' | 'commuter' | 'admin';
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    search?: string;
  }) => {
    const response = await api.get('/api/users', { params });
    return response.data;
  },
  getUserById: async (id: string) => {
    const response = await api.get(`/api/users/${id}`);
    return response.data;
  },
  createUser: async (userData: UserData) => {
    const response = await api.post('/api/users', userData);
    return response.data;
  },
  updateUser: async (id: string, userData: Partial<UserProfile>) => {
    const response = await api.put(`/api/users/${id}`, userData);
    return response.data;
  },
  patchUser: async (id: string, userData: Partial<UserProfile>) => {
    const response = await api.patch(`/api/users/${id}`, userData);
    return response.data;
  },
  deleteUser: async (id: string) => {
    const response = await api.delete(`/api/users/${id}`);
    return response.data;
  },
  hardDeleteUser: async (id: string) => {
    const response = await api.delete(`/api/users/${id}/hard`);
    return response.data;
  },
  // Driver approval endpoints
  getPendingDrivers: async () => {
    const response = await api.get('/api/users/admin/drivers/pending');
    return response.data;
  },
  approveDriver: async (id: string) => {
    const response = await api.post(`/api/users/admin/drivers/${id}/approve`);
    return response.data;
  },
  rejectDriver: async (id: string) => {
    const response = await api.post(`/api/users/admin/drivers/${id}/reject`);
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
  getAllRides: async (status?: string) => {
    const params = status ? { status } : {};
    const response = await api.get('/api/rides', { params });
    return response.data;
  },
  getRideById: async (id: string) => {
    const response = await api.get(`/api/rides/${id}`);
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
  completeRide: async (id: string, rating?: number) => {
    const data = rating ? { rating } : {};
    const response = await api.post(`/api/rides/${id}/complete`, data);
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
  addFunds: async (amount: number) => {
    const response = await api.post('/api/wallets/add-funds', { amount });
    return response.data;
  },
  withdrawFunds: async (amount: number) => {
    const response = await api.post('/api/wallets/withdraw', { amount });
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

// Utility functions
const apiUtils = {
  // Check if user is authenticated
  isAuthenticated: async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem('token');
      return !!token;
    } catch {
      return false;
    }
  },
  
  // Get stored user data
  getStoredUser: async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  },
  
  // Clear all stored data
  clearStoredData: async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } catch (error) {
      console.error('Error clearing stored data:', error);
    }
  },
  
  // Set stored user data
  setStoredUser: async (user: any) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Error storing user data:', error);
    }
  },
  
  // Test server connectivity
  testConnection: async (url?: string): Promise<{ success: boolean; url: string; error?: string }> => {
    const testUrl = url || API_URL;
    try {
      const response = await axios.get(`${testUrl}/api/auth/me`, {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      });
      return { success: true, url: testUrl };
    } catch (error: any) {
      return { 
        success: false, 
        url: testUrl, 
        error: error.message || 'Connection failed' 
      };
    }
  },
  
  // Find working server URL
  findWorkingServer: async (): Promise<string | null> => {
    const urlsToTest = [API_URL, ...FALLBACK_URLS];
    
    for (const url of urlsToTest) {
      const result = await apiUtils.testConnection(url);
      if (result.success) {
        console.log(`✅ Found working server at: ${url}`);
        return url;
      } else {
        console.log(`❌ Failed to connect to: ${url} - ${result.error}`);
      }
    }
    
    console.log('❌ No working server found. Please check if your backend is running.');
    return null;
  }
};

export { authAPI, userAPI, rideAPI, walletAPI, paymentAPI, apiUtils };
export type { UserData, AuthResponse, UserProfile, Address };

export default api; 