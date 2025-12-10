import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, Image, ScrollView, ActivityIndicator, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NotificationBell from '../../components/NotificationBell';
import { rideAPI } from '../../lib/api';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define Ride type based on backend model
interface Ride {
  _id: string;
  pickupLocation?: { 
    address?: string;
    coordinates?: [number, number];
  };
  dropoffLocation?: { 
    address?: string;
    coordinates?: [number, number];
  };
  status: string;
  createdAt?: string;
  fare?: number;
  distance?: number;
  duration?: number;
  driver?: {
    fullName?: string;
    phoneNumber?: string;
  };
  [key: string]: any;
}

export default function HistoryCommuter() {
  const router = useRouter();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchRides = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await rideAPI.getMyRides();
      setRides(data);
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('authenticate')) {
        Alert.alert('Session expired', 'Please log in again.');
        router.replace('/logincommuter');
      } else {
        setError(err.message || 'Failed to fetch rides');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRides();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Unknown date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return '#28a745';
      case 'cancelled':
        return '#dc3545';
      case 'accepted':
        return '#007bff';
      case 'pending':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'checkmark-circle';
      case 'cancelled':
        return 'close-circle';
      case 'accepted':
        return 'car';
      case 'pending':
        return 'time';
      default:
        return 'help-circle';
    }
  };

  useEffect(() => {
    // Check authentication on mount
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Session expired', 'Please log in again.');
        router.replace('/logincommuter');
        return;
      }
      fetchRides();
    };
    checkAuth();
  }, []);

  const completedRides = rides.filter(ride => ride.status === 'completed');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoSection}>
            <Image 
              source={require('../../assets/images/eyytrike1.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerActions}>
            <NotificationBell />
          </View>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0d4217']}
            tintColor="#0d4217"
          />
        }
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Ride History</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.statText}>
                  {completedRides.length} completed
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Track your completed rides and payments
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#0d4217" />
              <Text style={styles.loadingText}>Loading your ride history...</Text>
            </View>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={64} color="#dc3545" />
              <Text style={styles.errorTitle}>Oops!</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchRides}>
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : completedRides.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="car-outline" size={48} color="#ccc" />
              </View>
              <Text style={styles.emptyTitle}>No completed rides yet!</Text>
              <Text style={styles.emptySubtext}>
                Your completed rides will appear here once you take your first trip.
              </Text>
              <TouchableOpacity 
                style={styles.bookRideButton}
                onPress={() => router.push('/locationcommuter')}
              >
                <Ionicons name="location" size={16} color="#fff" />
                <Text style={styles.bookRideButtonText}>Book a Ride</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.ridesContainer}>
            {completedRides.map((ride, index) => (
              <View key={ride._id || index} style={styles.rideCard}>
                {/* Card Header */}
                <View style={styles.rideCardHeader}>
                  <View style={styles.rideInfo}>
                    <Text style={styles.rideFare}>
                      ₱{ride.fare ? ride.fare.toFixed(2) : '0.00'}
                    </Text>
                    <View style={styles.rideMeta}>
                      <View style={styles.metaItem}>
                        <Ionicons name="navigate" size={12} color="#666" />
                        <Text style={styles.metaText}>
                          {ride.distance ? (ride.distance / 1000).toFixed(1) : '0'} km
                        </Text>
                      </View>
                      {ride.duration && (
                        <View style={styles.metaItem}>
                          <Ionicons name="time" size={12} color="#666" />
                          <Text style={styles.metaText}>{ride.duration} min</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.statusContainer}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ride.status) + '20' }]}>
                      <Ionicons 
                        name={getStatusIcon(ride.status) as any} 
                        size={14} 
                        color={getStatusColor(ride.status)} 
                      />
                      <Text style={[styles.statusText, { color: getStatusColor(ride.status) }]}>
                        {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>
                
                {/* Locations */}
                <View style={styles.rideLocations}>
                  <View style={styles.locationRow}>
                    <View style={styles.locationIcon}>
                      <Ionicons name="location" size={16} color="#0d4217" />
                    </View>
                    <View style={styles.locationContent}>
                      <Text style={styles.locationLabel}>Pickup</Text>
                      <Text style={styles.locationText} numberOfLines={2}>
                        {ride.pickupLocation?.address || 'Pickup location'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.locationDivider} />
                  <View style={styles.locationRow}>
                    <View style={styles.locationIcon}>
                      <Ionicons name="flag" size={16} color="#e74c3c" />
                    </View>
                    <View style={styles.locationContent}>
                      <Text style={styles.locationLabel}>Destination</Text>
                      <Text style={styles.locationText} numberOfLines={2}>
                        {ride.dropoffLocation?.address || 'Destination'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                {/* Driver Info */}
                {ride.driver && (
                  <View style={styles.driverInfo}>
                    <View style={styles.driverIcon}>
                      <Ionicons name="person" size={14} color="#666" />
                    </View>
                    <View style={styles.driverContent}>
                      <Text style={styles.driverLabel}>Driver</Text>
                      <Text style={styles.driverText}>
                        {ride.driver.fullName || 'Driver'}
                      </Text>
                    </View>
                  </View>
                )}
                
                {/* Card Footer */}
                <View style={styles.rideCardFooter}>
                  <View style={styles.dateContainer}>
                    <Ionicons name="calendar" size={12} color="#999" />
                    <Text style={styles.dateText}>
                      {ride.createdAt ? formatDate(ride.createdAt) : 'Unknown date'}
                    </Text>
                  </View>
                  <View style={styles.rideId}>
                    <Text style={styles.rideIdText}>
                      #{ride._id?.slice(-6) || 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    backgroundColor: '#0d4217',
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoSection: {
    flex: 1,
  },
  logoImage: {
    width: 120,
    height: 32,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dc3545',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerSection: {
    paddingVertical: 24,
  },
  titleContainer: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0d4217',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statText: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
    marginLeft: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#0d4217',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  bookRideButton: {
    backgroundColor: '#0d4217',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookRideButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  ridesContainer: {
    paddingBottom: 20,
  },
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#0d4217',
  },
  rideCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  rideInfo: {
    flex: 1,
  },
  rideFare: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0d4217',
    marginBottom: 8,
  },
  rideMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  rideLocations: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
    fontWeight: '500',
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  locationDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
    marginLeft: 36,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  driverIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverContent: {
    flex: 1,
  },
  driverLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
    fontWeight: '500',
  },
  driverText: {
    fontSize: 14,
    color: '#333',
  },
  rideCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  rideId: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rideIdText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
}); 
