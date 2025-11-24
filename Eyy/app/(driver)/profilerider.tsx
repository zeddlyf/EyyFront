import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { rideAPI, userAPI, authAPI } from '../../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DriverStats {
  totalEarnings: number;
  completedRides: number;
  pendingRides: number;
  cancelledRides: number;
  totalRides: number;
}

interface UserProfile {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'driver';
  licenseNumber?: string;
  isAvailable?: boolean;
}

export default function ProfileRider() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<DriverStats>({
    totalEarnings: 0,
    completedRides: 0,
    pendingRides: 0,
    cancelledRides: 0,
    totalRides: 0,
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const fetchDriverData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch user profile
      const profile = await userAPI.getProfile();
      setUserProfile(profile);

      // Fetch all rides
      const rides = await rideAPI.getMyRides();
      
      // Calculate statistics
      const completedRides = rides.filter((ride: any) => ride.status === 'completed');
      const pendingRides = rides.filter((ride: any) => ride.status === 'pending' || ride.status === 'accepted');
      const cancelledRides = rides.filter((ride: any) => ride.status === 'cancelled');
      
      const totalEarnings = completedRides.reduce((sum: number, ride: any) => {
        return sum + (ride.fare || 0);
      }, 0);

      setStats({
        totalEarnings,
        completedRides: completedRides.length,
        pendingRides: pendingRides.length,
        cancelledRides: cancelledRides.length,
        totalRides: rides.length,
      });

    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('authenticate')) {
        Alert.alert('Session expired', 'Please log in again.');
        router.replace('/');
      } else {
        setError(err.message || 'Failed to load profile data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      router.replace('/loginrider');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2)}`;
  };

  useEffect(() => {
    // Check authentication on mount
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Session expired', 'Please log in again.');
        router.replace('/loginrider');
        return;
      }
      fetchDriverData();
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Image 
              source={require('../../assets/images/eyytrike1.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <TouchableOpacity onPress={() => router.push('/menurider')}>
              <Ionicons name="menu" size={24} color="#FFD700" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logo}>
          <Image 
            source={require('../../assets/images/eyytrike1.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <TouchableOpacity onPress={() => router.push('/menurider')}>
            <Ionicons name="menu" size={24} color="#FFD700" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color="#dc3545" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchDriverData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* User Profile Section */}
            <View style={styles.profileSection}>
              <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                  <Ionicons name="person" size={40} color="#FFD700" />
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>
                    {userProfile?.fullName || 'Driver'}
                  </Text>
                  <Text style={styles.profileEmail}>
                    {userProfile?.email || 'driver@example.com'}
                  </Text>
                  <Text style={styles.profilePhone}>
                    {userProfile?.phoneNumber || 'No phone number'}
                  </Text>
                </View>
              </View>
              {userProfile?.licenseNumber && (
                <View style={styles.licenseInfo}>
                  <Ionicons name="card" size={16} color="#FFD700" />
                  <Text style={styles.licenseText}>
                    License: {userProfile.licenseNumber}
                  </Text>
                </View>
              )}
            </View>

            {/* Statistics Grid */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Your Statistics</Text>
              <View style={styles.statsGrid}>
                {/* Total Earning */}
                <View style={styles.statsCard}>
                  <Text style={styles.statsValue}>
                    {formatCurrency(stats.totalEarnings)}
                  </Text>
                  <View style={styles.statsIconContainer}>
                    <Ionicons name="wallet-outline" size={20} color="#fff" />
                  </View>
                  <Text style={styles.statsLabel}>Total{'\n'}Earning</Text>
                </View>

                {/* Complete Ride */}
                <View style={styles.statsCard}>
                  <Text style={styles.statsValue}>{stats.completedRides}</Text>
                  <View style={styles.statsIconContainer}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  </View>
                  <Text style={styles.statsLabel}>Complete{'\n'}Ride</Text>
                </View>

                {/* Pending Ride */}
                <View style={styles.statsCard}>
                  <Text style={styles.statsValue}>{stats.pendingRides}</Text>
                  <View style={styles.statsIconContainer}>
                    <Ionicons name="time-outline" size={20} color="#fff" />
                  </View>
                  <Text style={styles.statsLabel}>Pending{'\n'}Ride</Text>
                </View>

                {/* Cancel Ride */}
                <View style={styles.statsCard}>
                  <Text style={styles.statsValue}>{stats.cancelledRides}</Text>
                  <View style={styles.statsIconContainer}>
                    <Ionicons name="close-circle-outline" size={20} color="#fff" />
                  </View>
                  <Text style={styles.statsLabel}>Cancel{'\n'}Ride</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/historyrider')}
                >
                  <Ionicons name="time" size={24} color="#0d4217" />
                  <Text style={styles.actionButtonText}>View History</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/dashboardrider')}
                >
                  <Ionicons name="car" size={24} color="#0d4217" />
                  <Text style={styles.actionButtonText}>Go Online</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Logout Button */}
            <View style={styles.logoutSection}>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#fff" />
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d4217',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    backgroundColor: '#0d4217',
    padding: 16,
  },
  logo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    paddingLeft: 10,
  },
  logoImage: {
    width: 120,
    height: 32,
    marginLeft: -20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFD700',
    fontSize: 16,
    marginTop: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  retryButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#0d4217',
    fontWeight: 'bold',
    fontSize: 16,
  },
  profileSection: {
    backgroundColor: '#083010',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0d4217',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#FFD700',
    marginBottom: 2,
  },
  profilePhone: {
    fontSize: 14,
    color: '#ccc',
  },
  licenseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#0d4217',
  },
  licenseText: {
    fontSize: 14,
    color: '#FFD700',
    marginLeft: 8,
  },
  statsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  statsCard: {
    width: '48%',
    backgroundColor: '#083010',
    borderRadius: 8,
    padding: 16,
    alignItems: 'flex-start',
    marginBottom: 10,
    height: 120,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  statsIconContainer: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    padding: 8,
    marginBottom: 8,
    position: 'absolute',
    right: 8,
    top: 8,
  },
  statsLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  actionsSection: {
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#083010',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  logoutSection: {
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
}); 