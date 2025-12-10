import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, Image, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE, Callout, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { rideAPI, userAPI } from '../../lib/api';
import { useSocket } from '../../lib/socket-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GOOGLE_MAPS_ENDPOINTS, buildGoogleMapsUrl, TRAVEL_MODES } from '../../lib/google-maps-config';
import { RouteMap } from '../../utils/RouteMap';
import { PathFinder, Point } from '../../utils/pathfinding';
import upateDriverAvailability from '../../lib/api';
// geocoding module not found – stubbing minimal helpers
const reverseGeocode = async (lat: number, lng: number): Promise<string> => `${lat.toFixed(6)},${lng.toFixed(6)}`;
const toHumanAddress = (raw?: string, lat?: number, lng?: number): string => raw || `${lat?.toFixed(6)},${lng?.toFixed(6)}`;

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

interface RideRequest {
  _id?: string; // MongoDB ObjectId
  id?: string; // Alternative ID field
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
  navigationStatus?: 'navigating_to_pickup' | 'navigating_to_destination' | 'completed';
}

export default function DashboardRider() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
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
  const [routeAlternatives, setRouteAlternatives] = useState<any[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [atPickup, setAtPickup] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [region, setRegion] = useState({
    latitude: 13.6195,
    longitude: 123.1814,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [pathFinder, setPathFinder] = useState<PathFinder | null>(null);
  const [isPathFinderInitialized, setIsPathFinderInitialized] = useState(false);
  const [navigationMode, setNavigationMode] = useState<'google' | 'pathfinder'>('google');
  const [driverId, setDriverId] = useState<string | null>(null);

  const initializePathFinder = async (location: Location) => {
    try {
      console.log('Initializing PathFinder...');
      const newPathFinder = new PathFinder();
      await newPathFinder.fetchRoadNetwork(location, 2000); // 2km radius
      setPathFinder(newPathFinder);
      setIsPathFinderInitialized(true);
      console.log('PathFinder initialized successfully');
    } catch (error) {
      console.error('Error initializing PathFinder:', error);
      // Fallback to Google Maps
      setNavigationMode('google');
    }
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
      
      // Initialize PathFinder with current location
      await initializePathFinder(newLocation);
      // Emit immediate location update if connected
      if (socket && isConnected && driverId) {
        socket.emit('driverLocationUpdate', {
          driverId: driverId,
          location: { latitude: newLocation.latitude, longitude: newLocation.longitude },
          rideId: acceptedRide?._id || acceptedRide?.id || null,
          hasPassenger: !!acceptedRide,
          status: isNavigating ? 'on-trip' : 'available'
        });
      } else {
        // REST fallback
        try {
          await userAPI.updateDriverLocation(newLocation.latitude, newLocation.longitude);
        } catch {}
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your current location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Continuous location tracking and socket emission
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    let interval: NodeJS.Timeout | null = null;
    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        locationSubscription = await Location.watchPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000,
          distanceInterval: 5,
        }, async (loc) => {
          const newLoc = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setCurrentLocation(newLoc);
          if (socket && isConnected && driverId) {
            socket.emit('driverLocationUpdate', {
              driverId: driverId,
              location: { latitude: newLoc.latitude, longitude: newLoc.longitude },
              rideId: acceptedRide?._id || acceptedRide?.id || null,
              hasPassenger: !!acceptedRide,
              status: isNavigating ? 'on-trip' : 'available'
            });
          } else {
            try { await userAPI.updateDriverLocation(newLoc.latitude, newLoc.longitude); } catch {}
          }
        });
        interval = setInterval(async () => {
          if (!currentLocation) return;
          if (socket && isConnected && driverId) {
            socket.emit('driverLocationUpdate', {
              driverId: driverId,
              location: { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
              rideId: acceptedRide?._id || acceptedRide?.id || null,
              hasPassenger: !!acceptedRide,
              status: isNavigating ? 'on-trip' : 'available'
            });
          }
        }, 30000);
      } catch {}
    };
    if (isAvailable) startTracking();
    return () => {
      if (locationSubscription) locationSubscription.remove();
      if (interval) clearInterval(interval);
    };
  }, [isAvailable, isConnected, socket, acceptedRide, isNavigating]);

  const fetchRoute = async (origin: Location, destination: Location) => {
    try {
      // Try PathFinder first if available
      if (pathFinder && isPathFinderInitialized && navigationMode === 'pathfinder') {
        await fetchPathFinderRoute(origin, destination);
      } else {
        // Fallback to Google Maps
        await fetchGoogleRoute(origin, destination);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      // Fallback to Google Maps if PathFinder fails
      if (navigationMode === 'pathfinder') {
        setNavigationMode('google');
        await fetchGoogleRoute(origin, destination);
      }
    }
  };

  const fetchPathFinderRoute = async (origin: Location, destination: Location) => {
    if (!pathFinder) return;

    try {
      console.log('Using PathFinder for route calculation...');
      
      // Find nearest nodes to origin and destination
      const originPoint: Point = { latitude: origin.latitude, longitude: origin.longitude };
      const destinationPoint: Point = { latitude: destination.latitude, longitude: destination.longitude };
      
      const startNodeId = pathFinder.findNearestOsmNode(originPoint);
      const endNodeId = pathFinder.findNearestOsmNode(destinationPoint);
      
      if (!startNodeId || !endNodeId) {
        throw new Error('Could not find nearest nodes for route calculation');
      }
      
      console.log('Found nodes:', { startNodeId, endNodeId });
      
      // Find shortest path
      const pathResult = pathFinder.findShortestPath(startNodeId, endNodeId);
      
      if (pathResult) {
        const coordinates = pathFinder.getPathCoordinates(pathResult.path);
        setRouteCoordinates(coordinates);
        setRouteInfo({
          distance: { text: `${(pathResult.distance / 1000).toFixed(1)} km`, value: pathResult.distance },
          duration: { text: `${Math.round(pathResult.estimatedTime)} min`, value: pathResult.estimatedTime * 60 },
          polyline: { points: '' },
          steps: [],
          legs: [{
            distance: { text: `${(pathResult.distance / 1000).toFixed(1)} km`, value: pathResult.distance },
            duration: { text: `${Math.round(pathResult.estimatedTime)} min`, value: pathResult.estimatedTime * 60 }
          }]
        });
        
        // Fit map to show the entire route
        if (mapRef.current && coordinates.length > 0) {
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }
        
        console.log('PathFinder route calculated:', pathResult);
      } else {
        throw new Error('No path found');
      }
    } catch (error) {
      console.error('PathFinder route calculation failed:', error);
      throw error;
    }
  };

  const fetchGoogleRoute = async (origin: Location, destination: Location) => {
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
      console.error('Error fetching Google route:', error);
      throw error;
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
      // Use getNearbyRides to get available ride requests for drivers
      const response = await rideAPI.getNearbyRides(
        currentLocation.latitude,
        currentLocation.longitude,
        10000, // 10km radius
        ['pending', 'waiting', 'requested']
      );
      console.log('Raw response from getNearbyRides:', response);
      // Filter for pending ride requests
      const pendingRides = response.filter((ride: RideRequest) => {
        const s = String(ride.status || '').toLowerCase();
        return s === 'pending' || s === 'waiting' || s === 'requested';
      });
      console.log('Filtered pending rides:', pendingRides);
      console.log('Sample ride object:', pendingRides[0]);
      setRideRequests(pendingRides);
      console.log('Fetched ride requests:', pendingRides.length);
      console.log('Available rides:', pendingRides);
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
      console.log('Accepting ride with ID:', rideId);
      console.log('Ride ID type:', typeof rideId);
      
      if (!rideId || rideId === '') {
        Alert.alert('Error', 'Invalid ride ID. Please try again.');
        return;
      }
      
      await rideAPI.acceptRide(rideId);
      Alert.alert('Success', 'Ride accepted! Navigate to pickup location.');
      
      // Find the accepted ride
      const acceptedRideData = rideRequests.find(ride => (ride._id || ride.id) === rideId);
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
        const distanceToPickup = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          pickupLocation.latitude,
          pickupLocation.longitude
        );
        if (distanceToPickup > 50) {
          await fetchRoute(currentLocation, pickupLocation);
          const addr = toHumanAddress(pickupLocation.address, pickupLocation.latitude, pickupLocation.longitude);
          if (ttsEnabled) Speech.speak(`Navigating to pickup at ${addr}`);
          setRouteInfo((prev) => prev ? { ...prev, navigationStatus: 'navigating_to_pickup' } : { distance: { text: '', value: 0 }, duration: { text: '', value: 0 }, polyline: { points: '' }, steps: [], legs: [], navigationStatus: 'navigating_to_pickup' });
        } else {
          setAtPickup(true);
          setRouteInfo((prev) => prev ? { ...prev, navigationStatus: 'navigating_to_destination' } : prev);
        }
      }
    } catch (error) {
      console.error('Error accepting ride:', error);
      Alert.alert('Error', 'Failed to accept ride. Please try again.');
    }
  };

  const startNavigation = async () => {
    if (!acceptedRide) return;
    
    try {
      console.log('Starting navigation to destination...');
      
      // Fetch route to destination
      const destinationLocation: Location = {
        latitude: acceptedRide.dropoffLocation.coordinates[1],
        longitude: acceptedRide.dropoffLocation.coordinates[0],
        address: acceptedRide.dropoffLocation.address,
      };
      
      await fetchRoute(currentLocation, destinationLocation);
      
      // Update navigation state to indicate we're navigating to destination
      if (routeInfo) {
        setRouteInfo({
          ...routeInfo,
          navigationStatus: 'navigating_to_destination'
        });
      }
      if (ttsEnabled) Speech.speak('Starting navigation to destination');
      
      Alert.alert(
        'Navigation Started', 
        'You are now navigating to the destination. Follow the route and complete the ride when you arrive.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Error starting navigation:', error);
      Alert.alert('Navigation Error', 'Failed to start navigation. Please try again.');
    }
  };

  useEffect(() => {
    if (!acceptedRide) return;
    const pickupLat = acceptedRide.pickupLocation.coordinates[1];
    const pickupLng = acceptedRide.pickupLocation.coordinates[0];
    const dist = calculateDistance(currentLocation.latitude, currentLocation.longitude, pickupLat, pickupLng);
    if (dist <= 50 && !atPickup) {
      setAtPickup(true);
      if (ttsEnabled) Speech.speak('Arrived at pickup point');
    }
  }, [currentLocation.latitude, currentLocation.longitude, acceptedRide]);

  const completeRide = async () => {
    if (!acceptedRide) return;
    
    try {
      await rideAPI.updateRideStatus(acceptedRide._id || acceptedRide.id || '', 'completed');
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

  const toggleAvailability = async () => {
    const prev = isAvailable;
    const next = !prev;
    setIsAvailable(next);
    try {
      await userAPI.updateDriverAvailability(next);
      if (next) {
        fetchRideRequests();
      } else {
        setRideRequests([]);
      }
    } catch (e: any) {
      const msg = e?.message?.toLowerCase() || '';
      if (msg.includes('not approved')) {
        Alert.alert('Driver not approved', 'Please wait for admin approval before going online. You can go offline anytime.');
      } else if (msg.includes('authenticate')) {
        Alert.alert('Session expired', 'Please log in again.');
        router.replace('/loginrider');
      } else {
        Alert.alert('Error', 'Failed to update availability. Please try again.');
      }
      setIsAvailable(prev);
    }
  };

  const handleNavigationModeChange = (mode: 'google' | 'pathfinder') => {
    setNavigationMode(mode);
    
    // Recalculate route if currently navigating
    if (isNavigating && acceptedRide) {
      const destinationLocation: Location = {
        latitude: acceptedRide.dropoffLocation.coordinates[1],
        longitude: acceptedRide.dropoffLocation.coordinates[0],
        address: acceptedRide.dropoffLocation.address,
      };
      
      fetchRoute(currentLocation, destinationLocation);
    }
  };

  const getRideRequestMarkers = () => {
    return rideRequests.map((ride) => ({
      coordinate: {
        latitude: ride.pickupLocation.coordinates[1],
        longitude: ride.pickupLocation.coordinates[0],
      },
      title: "Ride Request",
      description: `₱${ride.fare.toFixed(2)} • ${(ride.distance / 1000).toFixed(1)}km`,
      pinColor: "#FF6B35",
      onPress: () => setSelectedRide(ride)
    }));
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
    // Check authentication and fetch availability on mount
    const checkAuthAndFetchAvailability = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Session expired', 'Please log in again.');
        router.replace('/loginrider');
        return;
      }
      try {
        const user = await userAPI.getProfile();
        setIsAvailable(!!user.isAvailable);
        setDriverId(user._id);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    checkAuthAndFetchAvailability();
    getCurrentLocation();
  }, []);

  // Fetch ride requests periodically when available
  useEffect(() => {
    if (isAvailable && !isNavigating) {
      fetchRideRequests();
      const interval = setInterval(fetchRideRequests, 10000); // Fetch every 10 seconds
      return () => clearInterval(interval);
    }
  }, [isAvailable, isNavigating, currentLocation.latitude, currentLocation.longitude]);

  // Socket triggers for immediate updates when rides change
  useEffect(() => {
    const s = socket;
    if (!s || !isAvailable) return;
    const refresh = () => { fetchRideRequests(); };
    s.on('rideCreated', refresh);
    s.on('rideUpdated', refresh);
    s.on('rideCancelled', refresh);
    return () => {
      s.off('rideCreated', refresh);
      s.off('rideUpdated', refresh);
      s.off('rideCancelled', refresh);
    };
  }, [socket, isAvailable]);

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
          {isNavigating && acceptedRide ? (
            // Use RouteMap for navigation
            <RouteMap
              origin={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                address: "Your Location"
              }}
              destination={{
                latitude: (routeInfo?.navigationStatus === 'navigating_to_pickup' ? acceptedRide.pickupLocation.coordinates[1] : acceptedRide.dropoffLocation.coordinates[1]),
                longitude: (routeInfo?.navigationStatus === 'navigating_to_pickup' ? acceptedRide.pickupLocation.coordinates[0] : acceptedRide.dropoffLocation.coordinates[0]),
                address: (routeInfo?.navigationStatus === 'navigating_to_pickup' ? acceptedRide.pickupLocation.address : acceptedRide.dropoffLocation.address)
              }}
              travelMode={TRAVEL_MODES.DRIVING}
              showRouteInfo={true}
              onRouteReceived={(route) => {
                console.log('Route received from RouteMap:', route);
                if (Array.isArray(route)) {
                  setRouteAlternatives(route);
                  const primary = route[0];
                  setRouteInfo(primary);
                } else {
                  setRouteInfo(route);
                }
              }}
              style={styles.map}
              showMyLocationButton={false}
              additionalMarkers={[
                {
                  coordinate: {
                    latitude: acceptedRide.pickupLocation.coordinates[1],
                    longitude: acceptedRide.pickupLocation.coordinates[0],
                  },
                  title: "Pickup Location",
                  description: acceptedRide.pickupLocation.address,
                  pinColor: "#FF6B35"
                }
              ]}
            />
          ) : (
            // Use RouteMap for ride requests view
            <RouteMap
              origin={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                address: "Your Location"
              }}
              destination={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                address: "Your Location"
              }}
              travelMode={TRAVEL_MODES.DRIVING}
              showRouteInfo={false}
              style={styles.map}
              showMyLocationButton={false}
              showTraffic={false}
              showBuildings={false}
              showIndoors={false}
              additionalMarkers={getRideRequestMarkers()}
            />
          )}

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
              <View style={styles.navigationHeader}>
                <Text style={styles.navigationTitle}>Navigation Active</Text>
                <View style={styles.navigationModeBadge}>
                  <Ionicons 
                    name={navigationMode === 'pathfinder' ? 'map' : 'logo-google'} 
                    size={12} 
                    color="#fff" 
                  />
                  <Text style={styles.navigationModeText}>
                    {navigationMode === 'pathfinder' ? 'PathFinder' : 'Google Maps'}
                  </Text>
                </View>
              </View>
              <Text style={styles.routeInfo}>
                {(routeInfo.legs?.[0]?.distance?.text || '')} • {(routeInfo.legs?.[0]?.duration?.text || '')}
              </Text>
              {routeInfo?.navigationStatus === 'navigating_to_pickup' && (
                <Text style={styles.routeInfo}>Pickup: {toHumanAddress(acceptedRide?.pickupLocation.address, acceptedRide?.pickupLocation.coordinates[1], acceptedRide?.pickupLocation.coordinates[0])}</Text>
              )}
              {routeAlternatives.length > 1 && (
                <View style={{ marginTop: 6 }}>
                  <Text style={{ color: '#666' }}>Alternatives:</Text>
                  {routeAlternatives.slice(0,3).map((r: any, idx: number) => (
                    <Text key={`alt-${idx}`} style={{ color: '#666' }}>
                      • {r.legs?.[0]?.distance?.text} • {r.legs?.[0]?.duration_in_traffic?.text || r.legs?.[0]?.duration?.text}
                    </Text>
                  ))}
                </View>
              )}
              {atPickup && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: '#28a745', fontWeight: 'bold' }}>Arrived at pickup point</Text>
                </View>
              )}
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
                <View style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff', borderRadius: 10, marginBottom: 10 }}>
                  <Text style={{ color: '#0d4217', fontWeight: 'bold' }}>
                    {(routeInfo?.navigationStatus === 'navigating_to_pickup') ? 'Pickup:' : 'Destination:'}
                  </Text>
                  <Text style={{ color: '#333' }} numberOfLines={2}>
                    {(routeInfo?.navigationStatus === 'navigating_to_pickup')
                      ? toHumanAddress(acceptedRide.pickupLocation.address, acceptedRide.pickupLocation.coordinates[1], acceptedRide.pickupLocation.coordinates[0])
                      : toHumanAddress(acceptedRide.dropoffLocation.address, acceptedRide.dropoffLocation.coordinates[1], acceptedRide.dropoffLocation.coordinates[0])}
                  </Text>
                  <Text style={{ color: '#666', marginTop: 4 }}>
                    ETA: {routeInfo?.legs?.[0]?.duration?.text || '—'}
                  </Text>
                </View>
              )}
              
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
                      style={styles.navigationButton}
                      onPress={() => router.push({ pathname: '/(driver)/chat', params: { rideId: acceptedRide._id || acceptedRide.id || '', conversationId: acceptedRide._id || acceptedRide.id || '' } })}
                    >
                      <Ionicons name="chatbubble" size={20} color="#fff" />
                      <Text style={styles.navigationButtonText}>Message</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.completeButton}
                      onPress={completeRide}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.completeButtonText}>Complete Ride</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.navigationModeContainer}>
                    <Text style={styles.navigationModeLabel}>Navigation Mode:</Text>
                    {navigationMode === 'pathfinder' && !isPathFinderInitialized && (
                      <View style={styles.pathfinderStatus}>
                        <ActivityIndicator size="small" color="#FF6B35" />
                        <Text style={styles.pathfinderStatusText}>Initializing PathFinder...</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[styles.modeButton, navigationMode === 'google' && styles.modeButtonActive]}
                      onPress={() => handleNavigationModeChange('google')}
                    >
                      <Ionicons name="logo-google" size={16} color={navigationMode === 'google' ? '#fff' : '#666'} />
                      <Text style={[styles.modeButtonText, navigationMode === 'google' && styles.modeButtonTextActive]}>
                        Google Maps
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.modeButton, navigationMode === 'pathfinder' && styles.modeButtonActive]}
                      onPress={() => handleNavigationModeChange('pathfinder')}
                    >
                      <Ionicons name="map" size={16} color={navigationMode === 'pathfinder' ? '#fff' : '#666'} />
                      <Text style={[styles.modeButtonText, navigationMode === 'pathfinder' && styles.modeButtonTextActive]}>
                        PathFinder
                      </Text>
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
                    <TouchableOpacity 
                      style={styles.refreshButton}
                      onPress={fetchRideRequests}
                    >
                      <Ionicons name="refresh" size={20} color="#0d4217" />
                    </TouchableOpacity>
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
                  <Text style={styles.debugText}>Location: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}</Text>
                </View>
              ) : (
                <ScrollView style={styles.ridesList} showsVerticalScrollIndicator={false}>
                  {rideRequests.map((ride) => (
                    <TouchableOpacity
                      key={ride._id || ride.id || 'unknown'}
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
                          onPress={() => acceptRide(ride._id || ride.id || '')}
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
              onPress={() => acceptRide(selectedRide._id || selectedRide.id || '')}
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
  refreshButton: {
    marginLeft: 8,
    padding: 4,
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
  debugText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
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
  navigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  navigationModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d4217',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  navigationModeText: {
    fontSize: 10,
    color: '#fff',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  routeInfo: {
    fontSize: 14,
    color: '#666',
  },
  navigationContainer: {
    flex: 1,
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
  navigationModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  navigationModeLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginLeft: 8,
  },
  modeButtonActive: {
    backgroundColor: '#0d4217',
  },
  modeButtonText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  pathfinderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  pathfinderStatusText: {
    fontSize: 12,
    color: '#FF6B35',
    marginLeft: 4,
    fontWeight: '500',
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
