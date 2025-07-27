import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, Image, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE, Callout, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { rideAPI } from '../../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GOOGLE_MAPS_ENDPOINTS, buildGoogleMapsUrl, TRAVEL_MODES } from '../../lib/google-maps-config';

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

interface RideRequest {
  id: string;
  pickupLocation: {
    type: string;
    coordinates: [number, number];
    address: string;
  };
  dropoffLocation: {
    type: string;
    coordinates: [number, number];
    address: string;
  };
  fare: number;
  distance: number;
  duration: number;
  status: string;
  createdAt: string;
  commuter?: {
    id: string;
    fullName: string;
    phoneNumber: string;
  };
}

interface RouteInfo {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  polyline: { points: string };
  steps: any[];
  legs?: Array<{
    distance: { text: string; value: number };
    duration: { text: string; value: number };
  }>;
}

export default function DashboardRider() {
  const router = useRouter();
  const [isAvailable, setIsAvailable] = useState(false);
  const mapRef = useRef<MapView>(null);
  const [currentLocation, setCurrentLocation] = useState<Location>({
    latitude: 13.6195,
    longitude: 123.1814,
  });
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [selectedRide, setSelectedRide] = useState<RideRequest | null>(null);
  const [acceptedRide, setAcceptedRide] = useState<RideRequest | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [region, setRegion] = useState({
    latitude: 13.6195,
    longitude: 123.1814,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

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
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your current location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoute = async (origin: Location, destination: Location) => {
    try {
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destinationStr = `${destination.latitude},${destination.longitude}`;

      const params = {
        origin: originStr,
        destination: destinationStr,
        mode: TRAVEL_MODES.DRIVING,
        alternatives: 'false',
        units: 'metric',
      };

      const url = buildGoogleMapsUrl(GOOGLE_MAPS_ENDPOINTS.DIRECTIONS, params);
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes && data.routes[0]) {
        const routeData = data.routes[0];
        const coordinates = decodePolyline(routeData.overview_polyline.points);
        
        setRouteCoordinates(coordinates);
        setRouteInfo(routeData);
        
        // Fit map to show the entire route
        if (mapRef.current && coordinates.length > 0) {
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  const decodePolyline = (encoded: string) => {
    const poly = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let shift = 0, result = 0;

      do {
        let b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (result >= 0x20);

      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        let b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (result >= 0x20);

      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push({
        latitude: lat / 1E5,
        longitude: lng / 1E5,
      });
    }

    return poly;
  };

  const fetchRideRequests = async () => {
    try {
      const response = await rideAPI.getMyRides();
      // Filter for pending ride requests
      const pendingRides = response.filter((ride: RideRequest) => 
        ride.status === 'pending' || ride.status === 'waiting'
      );
      setRideRequests(pendingRides);
      console.log('Fetched ride requests:', pendingRides.length);
    } catch (error: any) {
      if (error.message && error.message.toLowerCase().includes('authenticate')) {
        Alert.alert('Session expired', 'Please log in again.');
        router.replace('/loginrider');
      } else {
        console.error('Error fetching ride requests:', error);
      }
    }
  };

  const acceptRide = async (rideId: string) => {
    try {
      await rideAPI.updateRideStatus(rideId, 'accepted');
      Alert.alert('Success', 'Ride accepted! Navigate to pickup location.');
      
      // Find the accepted ride
      const acceptedRideData = rideRequests.find(ride => ride.id === rideId);
      if (acceptedRideData) {
        setAcceptedRide(acceptedRideData);
        setIsNavigating(true);
        
        // Clear other ride requests
        setRideRequests([]);
        setSelectedRide(null);
        
        // Fetch route to pickup location
        const pickupLocation: Location = {
          latitude: acceptedRideData.pickupLocation.coordinates[1],
          longitude: acceptedRideData.pickupLocation.coordinates[0],
          address: acceptedRideData.pickupLocation.address,
        };
        
        await fetchRoute(currentLocation, pickupLocation);
      }
    } catch (error) {
      console.error('Error accepting ride:', error);
      Alert.alert('Error', 'Failed to accept ride. Please try again.');
    }
  };

  const startNavigation = async () => {
    if (!acceptedRide) return;
    
    try {
      // Fetch route to destination
      const destinationLocation: Location = {
        latitude: acceptedRide.dropoffLocation.coordinates[1],
        longitude: acceptedRide.dropoffLocation.coordinates[0],
        address: acceptedRide.dropoffLocation.address,
      };
      
      await fetchRoute(currentLocation, destinationLocation);
    } catch (error) {
      console.error('Error starting navigation:', error);
    }
  };

  const completeRide = async () => {
    if (!acceptedRide) return;
    
    try {
      await rideAPI.updateRideStatus(acceptedRide.id, 'completed');
      Alert.alert('Success', 'Ride completed!');
      
      // Reset navigation state
      setAcceptedRide(null);
      setIsNavigating(false);
      setRouteCoordinates([]);
      setRouteInfo(null);
      
      // Refresh ride requests
      fetchRideRequests();
    } catch (error) {
      console.error('Error completing ride:', error);
      Alert.alert('Error', 'Failed to complete ride. Please try again.');
    }
  };

  const toggleAvailability = () => {
    setIsAvailable(!isAvailable);
    if (!isAvailable) {
      // When becoming available, fetch ride requests
      fetchRideRequests();
    } else {
      // When becoming unavailable, clear ride requests
      setRideRequests([]);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2 - lat1) * Math.PI/180;
    const Δλ = (lon2 - lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  useEffect(() => {
    // Check authentication on mount
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Session expired', 'Please log in again.');
        router.replace('/loginrider');
      }
    };
    checkAuth();
    getCurrentLocation();
  }, []);

  // Fetch ride requests periodically when available
  useEffect(() => {
    if (isAvailable && !isNavigating) {
      fetchRideRequests();
      const interval = setInterval(fetchRideRequests, 10000); // Fetch every 10 seconds
      return () => clearInterval(interval);
    }
  }, [isAvailable, isNavigating]);

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
        <TouchableOpacity 
          style={[styles.statusBar, isAvailable ? styles.statusBarOn : styles.statusBarOff]} 
          onPress={toggleAvailability}
        >
          <Text style={styles.statusText}>
            {isAvailable ? 'Available for ride now!' : 'You are not available for ride now!'}
          </Text>
          <View style={[styles.toggleButton, isAvailable ? styles.toggleOn : styles.toggleOff]}>
            <Text style={styles.toggleText}>{isAvailable ? 'On' : 'Off'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Content - Split Layout */}
      <View style={styles.content}>
        {/* Top Half - Map */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={region}
            onRegionChangeComplete={setRegion}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={true}
            showsScale={true}
          >
            {/* Current Location Marker */}
            <Marker
              coordinate={currentLocation}
              title="Your Location"
              description={locationAccuracy ? `Accuracy: ${Math.round(locationAccuracy)}m` : undefined}
            >
              <View style={styles.currentLocationMarker}>
                <Ionicons name="location" size={30} color="#0d4217" />
              </View>
            </Marker>

            {/* Ride Request Markers */}
            {!isNavigating && rideRequests.map((ride) => (
              <Marker
                key={ride.id}
                coordinate={{
                  latitude: ride.pickupLocation.coordinates[1],
                  longitude: ride.pickupLocation.coordinates[0],
                }}
                title="Ride Request"
                description={`₱${ride.fare.toFixed(2)} • ${(ride.distance / 1000).toFixed(1)}km`}
                onPress={() => setSelectedRide(ride)}
              >
                <View style={styles.rideRequestMarker}>
                  <Ionicons name="car" size={24} color="#FF6B35" />
                </View>
              </Marker>
            ))}

            {/* Accepted Ride Markers */}
            {isNavigating && acceptedRide && (
              <>
                <Marker
                  coordinate={{
                    latitude: acceptedRide.pickupLocation.coordinates[1],
                    longitude: acceptedRide.pickupLocation.coordinates[0],
                  }}
                  title="Pickup Location"
                  description={acceptedRide.pickupLocation.address}
                  pinColor="#FF6B35"
                />
                <Marker
                  coordinate={{
                    latitude: acceptedRide.dropoffLocation.coordinates[1],
                    longitude: acceptedRide.dropoffLocation.coordinates[0],
                  }}
                  title="Destination"
                  description={acceptedRide.dropoffLocation.address}
                  pinColor="#e74c3c"
                />
              </>
            )}

            {/* Route Polyline */}
            {routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#007AFF"
                strokeWidth={4}
                lineDashPattern={[1]}
                geodesic={true}
              />
            )}
          </MapView>

          {/* Recenter Button */}
          <TouchableOpacity 
            style={styles.recenterButton}
            onPress={getCurrentLocation}
          >
            <Ionicons name="locate" size={24} color="#0d4217" />
          </TouchableOpacity>

          {/* Ride Requests Counter */}
          {isAvailable && !isNavigating && rideRequests.length > 0 && (
            <View style={styles.requestsCounter}>
              <Text style={styles.counterText}>{rideRequests.length} ride request{rideRequests.length !== 1 ? 's' : ''}</Text>
            </View>
          )}

          {/* Navigation Info */}
          {isNavigating && routeInfo && (
            <View style={styles.navigationInfo}>
              <Text style={styles.navigationTitle}>Navigation Active</Text>
              <Text style={styles.routeInfo}>
                {routeInfo.legs?.[0]?.distance?.text} • {routeInfo.legs?.[0]?.duration?.text}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Half - Booking Information */}
        <View style={styles.bookingContainer}>
          {isNavigating ? (
            // Navigation Mode
            <View style={styles.navigationContainer}>
              <View style={styles.navigationHeader}>
                <Text style={styles.navigationTitle}>Active Ride</Text>
                <View style={styles.statusIndicator}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>In Progress</Text>
                </View>
              </View>
              
              {acceptedRide && (
                <ScrollView style={styles.rideDetails} showsVerticalScrollIndicator={false}>
                  <View style={styles.rideCard}>
                    <View style={styles.rideCardHeader}>
                      <Text style={styles.rideFare}>₱{acceptedRide.fare.toFixed(2)}</Text>
                      <Text style={styles.rideDistance}>{(acceptedRide.distance / 1000).toFixed(1)} km</Text>
                    </View>
                    
                    <View style={styles.rideLocations}>
                      <View style={styles.locationRow}>
                        <Ionicons name="location" size={16} color="#0d4217" />
                        <Text style={styles.locationText} numberOfLines={2}>
                          {acceptedRide.pickupLocation.address}
                        </Text>
                      </View>
                      <View style={styles.locationRow}>
                        <Ionicons name="flag" size={16} color="#e74c3c" />
                        <Text style={styles.locationText} numberOfLines={2}>
                          {acceptedRide.dropoffLocation.address}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.navigationActions}>
                    <TouchableOpacity
                      style={styles.navigationButton}
                      onPress={startNavigation}
                    >
                      <Ionicons name="navigate" size={20} color="#fff" />
                      <Text style={styles.navigationButtonText}>Start Navigation</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.completeButton}
                      onPress={completeRide}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.completeButtonText}>Complete Ride</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </View>
          ) : (
            // Booking Mode
            <>
              <View style={styles.bookingHeader}>
                <Text style={styles.bookingTitle}>Available Rides</Text>
                {isAvailable && (
                  <View style={styles.statusIndicator}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Active</Text>
                  </View>
                )}
              </View>

              {!isAvailable ? (
                <View style={styles.noRidesContainer}>
                  <Ionicons name="car-outline" size={64} color="#ccc" />
                  <Text style={styles.noRidesText}>Go online to see ride requests</Text>
                  <Text style={styles.noRidesSubtext}>Toggle the availability button above to start receiving ride requests</Text>
                </View>
              ) : rideRequests.length === 0 ? (
                <View style={styles.noRidesContainer}>
                  <Ionicons name="search-outline" size={64} color="#ccc" />
                  <Text style={styles.noRidesText}>No ride requests available</Text>
                  <Text style={styles.noRidesSubtext}>Waiting for new ride requests...</Text>
                </View>
              ) : (
                <ScrollView style={styles.ridesList} showsVerticalScrollIndicator={false}>
                  {rideRequests.map((ride) => (
                    <TouchableOpacity
                      key={ride.id}
                      style={styles.rideCard}
                      onPress={() => setSelectedRide(ride)}
                    >
                      <View style={styles.rideCardHeader}>
                        <View style={styles.rideInfo}>
                          <Text style={styles.rideFare}>₱{ride.fare.toFixed(2)}</Text>
                          <Text style={styles.rideDistance}>{(ride.distance / 1000).toFixed(1)} km</Text>
                        </View>
                        <View style={styles.rideStatus}>
                          <Text style={styles.statusBadge}>New</Text>
                        </View>
                      </View>
                      
                      <View style={styles.rideLocations}>
                        <View style={styles.locationRow}>
                          <Ionicons name="location" size={16} color="#0d4217" />
                          <Text style={styles.locationText} numberOfLines={1}>
                            {ride.pickupLocation.address}
                          </Text>
                        </View>
                        <View style={styles.locationRow}>
                          <Ionicons name="flag" size={16} color="#e74c3c" />
                          <Text style={styles.locationText} numberOfLines={1}>
                            {ride.dropoffLocation.address}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.rideCardFooter}>
                        <Text style={styles.distanceToPickup}>
                          {(calculateDistance(
                            currentLocation.latitude,
                            currentLocation.longitude,
                            ride.pickupLocation.coordinates[1],
                            ride.pickupLocation.coordinates[0]
                          ) / 1000).toFixed(1)} km away
                        </Text>
                        <TouchableOpacity
                          style={styles.acceptRideButton}
                          onPress={() => acceptRide(ride.id)}
                        >
                          <Text style={styles.acceptRideButtonText}>Accept</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </>
          )}
        </View>
      </View>

      {/* Ride Request Details Modal */}
      {selectedRide && (
        <View style={styles.rideRequestModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ride Details</Text>
            <TouchableOpacity onPress={() => setSelectedRide(null)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.rideDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="location" size={20} color="#0d4217" />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Pickup</Text>
                <Text style={styles.detailValue}>{selectedRide.pickupLocation.address}</Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="flag" size={20} color="#e74c3c" />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Destination</Text>
                <Text style={styles.detailValue}>{selectedRide.dropoffLocation.address}</Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="cash" size={20} color="#0d4217" />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Fare</Text>
                <Text style={styles.detailValue}>₱{selectedRide.fare.toFixed(2)}</Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="time" size={20} color="#0d4217" />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Distance</Text>
                <Text style={styles.detailValue}>{(selectedRide.distance / 1000).toFixed(1)} km</Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="navigate" size={20} color="#0d4217" />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Distance to Pickup</Text>
                <Text style={styles.detailValue}>
                  {(calculateDistance(
                    currentLocation.latitude,
                    currentLocation.longitude,
                    selectedRide.pickupLocation.coordinates[1],
                    selectedRide.pickupLocation.coordinates[0]
                  ) / 1000).toFixed(1)} km
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => acceptRide(selectedRide.id)}
            >
              <Text style={styles.acceptButtonText}>Accept Ride</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => setSelectedRide(null)}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    marginBottom: 8,
  },
  logoImage: {
    width: 120,
    height: 32,
    marginLeft: -20,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#083010',
  },
  statusBarOn: {
    backgroundColor: '#004D00',
  },
  statusBarOff: {
    backgroundColor: '#083010',
  },
  statusText: {
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 45,
    alignItems: 'center',
  },
  toggleOn: {
    backgroundColor: '#FFD700',
  },
  toggleOff: {
    backgroundColor: '#666',
  },
  toggleText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  content: {
    flex: 1,
    flexDirection: 'column',
  },
  mapContainer: {
    height: '50%',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  bookingContainer: {
    height: '50%',
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bookingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0d4217',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#28a745',
    marginRight: 6,
  },
  noRidesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  noRidesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  noRidesSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  ridesList: {
    flex: 1,
  },
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  rideCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rideFare: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0d4217',
    marginRight: 12,
  },
  rideDistance: {
    fontSize: 14,
    color: '#666',
  },
  rideStatus: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadge: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rideLocations: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  rideCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceToPickup: {
    fontSize: 12,
    color: '#666',
  },
  acceptRideButton: {
    backgroundColor: '#0d4217',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptRideButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  currentLocationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rideRequestMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#FF6B35',
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
  requestsCounter: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  counterText: {
    color: '#0d4217',
    fontWeight: 'bold',
    fontSize: 14,
  },
  navigationInfo: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  navigationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0d4217',
    marginBottom: 4,
  },
  routeInfo: {
    fontSize: 14,
    color: '#666',
  },
  navigationContainer: {
    flex: 1,
  },
  navigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navigationActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  navigationButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  navigationButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  rideRequestModal: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0d4217',
  },
  rideDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#0d4217',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
