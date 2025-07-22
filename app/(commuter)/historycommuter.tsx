import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, Image, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { rideAPI } from '../../lib/api';

// Define Ride type based on backend model
interface Ride {
  _id: string;
  pickupLocation?: { address?: string };
  dropoffLocation?: { address?: string };
  status: string;
  createdAt?: string;
  [key: string]: any;
}

export default function HistoryCommuter() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const data = await rideAPI.getMyRides();
        setRides(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch rides');
      } finally {
        setLoading(false);
      }
    };
    fetchRides();
  }, []);

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
          <Ionicons name="notifications-outline" size={24} color="#FFD700" />
        </View>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Recent Rides</Text>
        {loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color="#0d4217" /></View>
        ) : error ? (
          <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View>
        ) : rides.filter(ride => ride.status === 'completed').length === 0 ? (
          <View style={styles.noRidesContainer}>
            <Text style={styles.noRidesText}>You didn't take a ride yet!</Text>
          </View>
        ) : (
          rides.filter(ride => ride.status === 'completed').map((ride, idx) => (
            <View key={ride._id || idx} style={styles.rideCard}>
              <Text style={styles.rideInfo}><Text style={styles.rideLabel}>From:</Text> {ride.pickupLocation?.address || 'N/A'}</Text>
              <Text style={styles.rideInfo}><Text style={styles.rideLabel}>To:</Text> {ride.dropoffLocation?.address || 'N/A'}</Text>
              <Text style={styles.rideInfo}><Text style={styles.rideLabel}>Status:</Text> {ride.status}</Text>
              <Text style={styles.rideInfo}><Text style={styles.rideLabel}>Date:</Text> {ride.createdAt ? new Date(ride.createdAt).toLocaleString() : 'N/A'}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#004D00',
    marginBottom: 16,
  },
  noRidesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  noRidesText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  rideCard: {
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rideInfo: {
    fontSize: 16,
    marginBottom: 4,
  },
  rideLabel: {
    fontWeight: 'bold',
    color: '#0d4217',
  },
}); 