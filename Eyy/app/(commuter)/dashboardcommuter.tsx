import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, Image, TouchableOpacity, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NotificationBell from '../../components/NotificationBell';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSocket } from '../../lib/socket-context';
import { userAPI } from '../../lib/api';

interface Location {
  latitude: number;
  longitude: number;
}

export default function DashboardCommuter() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const mapRef = useRef<MapView>(null);
  const [currentLocation, setCurrentLocation] = useState<Location>({
    latitude: 13.6195,
    longitude: 123.1814,
  });
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [region, setRegion] = useState({
    latitude: 13.6195,
    longitude: 123.1814,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const [activeDrivers, setActiveDrivers] = useState<any[]>([]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(newLocation);
      setLocationAccuracy(location.coords.accuracy);
      
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setRegion(newRegion);
      
      mapRef.current?.animateToRegion(newRegion, 1000);

      // Start watching location
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setCurrentLocation(newLocation);
          setLocationAccuracy(location.coords.accuracy);
        }
      );

    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your current location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getCurrentLocation();
    startPulseAnimation();

    // Initial load of active drivers
    (async () => {
      try {
        const drivers = await userAPI.getNearbyDrivers(currentLocation.latitude, currentLocation.longitude, 20000);
        setActiveDrivers(drivers);
      } catch (err) {}
    })();

    // Socket updates for driver locations
    if (socket) {
      socket.on('driverLocationChanged', (payload: any) => {
        const { driverId, location, status } = payload;
        setActiveDrivers((prev) => {
          const idx = prev.findIndex((d: any) => d._id === driverId);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              location: { type: 'Point', coordinates: [location.longitude, location.latitude] },
              isAvailable: status !== 'on-trip'
            };
            return updated;
          }
          return prev;
        });
      });
    }

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (socket) socket.off('driverLocationChanged');
    };
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
          <NotificationBell />
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
        >
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description={locationAccuracy ? `Accuracy: ${Math.round(locationAccuracy)}m` : undefined}
          >
            <Animated.View 
              style={[
                styles.currentLocationMarker,
                {
                  transform: [{ scale: pulseAnim }]
                }
              ]}
            >
              <View style={styles.markerDot} />
              <Ionicons name="location" size={30} color="#0d4217" />
            </Animated.View>
          </Marker>

          {/* Active drivers markers */}
          {activeDrivers.map((driver: any) => (
            <Marker
              key={driver._id}
              coordinate={{
                latitude: driver.location.coordinates[1],
                longitude: driver.location.coordinates[0]
              }}
              title={`${driver.firstName} ${driver.lastName}`}
              description={driver.isAvailable ? 'Available' : 'On trip'}
              pinColor={driver.isAvailable ? '#3B82F6' : '#FF6B35'}
            />
          ))}
        </MapView>

        {/* Recenter Button */}
        <TouchableOpacity 
          style={styles.recenterButton}
          onPress={getCurrentLocation}
        >
          <Ionicons name="locate" size={24} color="#0d4217" />
        </TouchableOpacity>
        {/* Book Button - now absolutely positioned */}
        <TouchableOpacity 
          style={styles.bookButton}
          onPress={() => router.push({
            pathname: '/booking',
            params: {
              initialLocation: JSON.stringify({
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                accuracy: locationAccuracy
              })
            }
          })}
        >
          <Text style={styles.bookButtonText}>Book eyytrike</Text>
        </TouchableOpacity>
      </View>
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
  },
  logoImage: {
    width: 120,
    height: 40,
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  map: {
    // Removed width and height, using StyleSheet.absoluteFill instead
  },
  currentLocationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0d4217',
    borderWidth: 2,
    borderColor: '#fff',
  },
  recenterButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bookButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 40,
    marginHorizontal: 40,
    // Removed marginBottom
    alignSelf: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  bookButtonText: {
    color: '#0d4217',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
