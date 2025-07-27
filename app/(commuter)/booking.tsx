import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline, PROVIDER_DEFAULT, MapType } from 'react-native-maps';
import * as Location from 'expo-location';
import { PathFinder, Point } from '../../utils/pathfinding';
import { rideAPI } from '../../lib/api';
import { MaterialIcons } from '@expo/vector-icons';
import { RouteMap } from '../../utils/RouteMap';
// Removed: import { useSocket } from '../../lib/socket-context';

interface Location extends Point {
  name?: string;
  address?: string;
  heading?: number;
  instruction?: string;
  distance?: number;
  timestamp?: number;
  accuracy?: number | null;
}

interface SearchResult {
  lat: number;
  lon: number;
  display_name: string;
}

interface TurnInfo {
  instruction: string;
  distance: number;
}

// Naga City boundaries
const NAGA_CITY_BOUNDS = {
  north: 13.6500, // Northern boundary
  south: 13.5800, // Southern boundary
  east: 123.2000,  // Eastern boundary
  west: 123.1500,  // Western boundary
};

// Naga City center coordinates
const NAGA_CITY_CENTER = {
  latitude: 13.6195,
  longitude: 123.1814,
};

// Zoom levels for different scenarios
const ZOOM_LEVELS = {
  USER_LOCATION: 16, // Closer zoom for user location
  DESTINATION: 15,   // Slightly wider for showing destination
  CITY_OVERVIEW: 13  // Overview of Naga City
};

// Location accuracy settings
const LOCATION_SETTINGS = {
  HIGH_ACCURACY: {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 1000, // More frequent updates
    distanceInterval: 1, // Update every meter
  },
  BALANCED_ACCURACY: {
    accuracy: Location.Accuracy.High,
    timeInterval: 2000,
    distanceInterval: 2,
  },
  MIN_ACCURACY_THRESHOLD: 5, // Stricter accuracy threshold (5 meters)
  MAX_ACCURACY_THRESHOLD: 30, // Lower max threshold for better accuracy
  CALIBRATION_SAMPLES: 10, // More samples for better accuracy
  CALIBRATION_INTERVAL: 300, // Shorter interval between samples
};

export default function LocationCommuter() {
  const router = useRouter();
  const params = useLocalSearchParams();
  // Removed: const context = useSocket();
  // Removed: const { socket } = context;
  const mapRef = useRef<MapView>(null);
  const pathFinder = useRef(new PathFinder()).current;
  const [currentLocation, setCurrentLocation] = useState<Location>(NAGA_CITY_CENTER);
  const [destination, setDestination] = useState<Location | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [searchCache, setSearchCache] = useState<Record<string, Location>>({});
  const [searchError, setSearchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const MAX_CACHE_SIZE = 50; // Maximum number of cached locations
  const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes in milliseconds
  const [region, setRegion] = useState({
    latitude: NAGA_CITY_CENTER.latitude,
    longitude: NAGA_CITY_CENTER.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<number>(0);
  const LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds
  const [isBooking, setIsBooking] = useState(false);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const [isRiderView, setIsRiderView] = useState(false);
  const [mapStyle, setMapStyle] = useState('standard');
  const [showTraffic, setShowTraffic] = useState(false);
  const [navigationMode, setNavigationMode] = useState<'follow' | 'overview'>('follow');
  const [nextTurn, setNextTurn] = useState<TurnInfo | null>(null);
  const [remainingDistance, setRemainingDistance] = useState<number>(0);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [fare, setFare] = useState<number>(0);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [waitingForDriver, setWaitingForDriver] = useState(false);

  // Add cache cleaning function
  const cleanCache = () => {
    const now = Date.now();
    const newCache: Record<string, Location> = {};
    let count = 0;

    // Sort cache entries by timestamp (if available) and keep only the most recent ones
    Object.entries(searchCache)
      .sort(([, a], [, b]) => {
        const timeA = (a as any).timestamp || 0;
        const timeB = (b as any).timestamp || 0;
        return timeB - timeA;
      })
      .forEach(([key, value]) => {
        if (count < MAX_CACHE_SIZE) {
          newCache[key] = value;
          count++;
        }
      });

    setSearchCache(newCache);
    console.log('Cache cleaned. New cache size:', Object.keys(newCache).length);
  };

  // Simple path creation
  const createPath = (start: Location, end: Location): { latitude: number; longitude: number }[] => {
    return [
      { latitude: start.latitude, longitude: start.longitude },
      { latitude: end.latitude, longitude: end.longitude }
    ];
  };

  // Initialize pathfinder with OpenStreetMap data
 
  const handleSearch = async (query: string) => {
  try {
    setIsLoading(true);
    setSearchError(null);

    const results = await searchLocation(query);
    if (!results || results.length === 0) throw new Error('No results found');

    const validResult = results.find(result =>
      isWithinNagaCity({
        latitude: result.lat,
        longitude: result.lon,
      } as Location)
    );
    if (!validResult) {
      throw new Error("No destinations found within Naga City.");
    }

    const newDestination: Location = {
      latitude: validResult.lat,           // ✅ Use the filtered valid result
      longitude: validResult.lon,
      name: validResult.display_name,
      address: validResult.display_name,
      timestamp: Date.now(),
    };


    setDestination(newDestination);
    updateMapRegion(newDestination);

    // No pathFinder logic here

  } catch (error) {
    console.error('Search error:', error);
    setSearchError('Failed to find destination or route.');
    setDestination(null);
  } finally {
    setIsLoading(false);
  }
};




  // Enhanced path calculation with smoothing
 const calculatePath = async (
  startNodeId: string,
  endNodeId: string,
  destination: Location
): Promise<Point[]> => {
  try {
    setIsLoading(true);

    console.log("🛣️ Finding shortest path from", startNodeId, "to", endNodeId);
    const pathResult = pathFinder.findShortestPath(startNodeId, endNodeId);

    if (!pathResult || !pathResult.path || pathResult.path.length < 2) {
      console.warn("❌ No valid route found between nodes. Falling back to straight line.");

      const fallback = [
        { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
        { latitude: destination.latitude, longitude: destination.longitude }
      ];

      // setPathCoordinates(fallback); // Removed
      return fallback;
    }

    const detailedPath = pathFinder.getDetailedPathCoordinates(pathResult.path);

    if (!detailedPath || detailedPath.length < 2) {
      console.warn("⚠️ Detailed path is too short, falling back to straight line.");

      const fallback = [
        { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
        { latitude: destination.latitude, longitude: destination.longitude }
      ];

      // setPathCoordinates(fallback); // Removed
      return fallback;
    }

    console.log("✅ Detailed path returned:", detailedPath.length, "points");

    const fare = calculateEstimatedFare(currentLocation, destination);
    setFare(fare);
    setTotalDistance(pathResult.distance);
    setEstimatedTime(pathResult.estimatedTime);
    // setPathCoordinates(detailedPath); // Removed

    if (mapRef.current) {
      mapRef.current.fitToCoordinates(
        detailedPath.map(p => ({
          latitude: p.latitude,
          longitude: p.longitude,
        })),
        {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        }
      );
    }

    return detailedPath;
  } catch (error) {
    console.error("❌ Error calculating path:", error);

    // Extra fallback to straight line in case of unexpected errors
    const fallback = [
      { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
      { latitude: destination.latitude, longitude: destination.longitude }
    ];

    // setPathCoordinates(fallback); // Removed
    return fallback;
  } finally {
    setIsLoading(false);
  }
};


  // Enhanced path smoothing
  const smoothPath = (points: Point[]): Point[] => {
    if (points.length <= 2) return points;

    const smoothed: Point[] = [points[0]];
    let currentIndex = 0;

    while (currentIndex < points.length - 1) {
      let furthestVisible = currentIndex + 1;
      
      // Look ahead to find the furthest visible point
      for (let i = currentIndex + 2; i < points.length; i++) {
        if (isLineOfSight(points[currentIndex], points[i])) {
          furthestVisible = i;
        }
      }

      smoothed.push(points[furthestVisible]);
      currentIndex = furthestVisible;
    }

    return smoothed;
  };

  // Check if there's a direct line of sight between two points
  const isLineOfSight = (point1: Point, point2: Point): boolean => {
    const distance = calculateDistance(point1, point2);
    return distance < 100; // 100 meters threshold
  };

  const updateMapRegion = (newDestination: Location) => {
    const centerLat = (currentLocation.latitude + newDestination.latitude) / 2;
    const centerLon = (currentLocation.longitude + newDestination.longitude) / 2;
    
    // Calculate appropriate zoom level based on distance
    const distance = calculateDistance(currentLocation, newDestination);
    const zoomLevel = distance > 2000 ? ZOOM_LEVELS.CITY_OVERVIEW : ZOOM_LEVELS.DESTINATION;
    
    const newRegion = {
      latitude: centerLat,
      longitude: centerLon,
      latitudeDelta: Math.abs(currentLocation.latitude - newDestination.latitude) * 1.5,
      longitudeDelta: Math.abs(currentLocation.longitude - newDestination.longitude) * 1.5,
    };
    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 300);
  };

const debouncedSearch = (text: string) => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  setSearchText(text);
  const timeout = setTimeout(() => {
    console.log("Searching for:", text); // ✅ this is the fix
    handleSearch(text);
    
  }, 300);
  setSearchTimeout(timeout);
};


  const calculateDistance = (loc1: Location, loc2: Location): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = loc1.latitude * Math.PI/180;
    const φ2 = loc2.latitude * Math.PI/180;
    const Δφ = (loc2.latitude - loc1.latitude) * Math.PI/180;
    const Δλ = (loc2.longitude - loc1.longitude) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const isWithinNagaCity = (location: Location): boolean => {
    return (
      location.latitude >= NAGA_CITY_BOUNDS.south &&
      location.latitude <= NAGA_CITY_BOUNDS.north &&
      location.longitude >= NAGA_CITY_BOUNDS.west &&
      location.longitude <= NAGA_CITY_BOUNDS.east
    );
  };

const handleChooseDestination = async () => {
  if (!destination || isLoading || isBooking) return;

  try {
    setIsBooking(true);

    // 🧠 Basic validations
    if (!currentLocation || !destination) {
      throw new Error('Invalid location data');
    }

    if (
      isNaN(currentLocation.latitude) || isNaN(currentLocation.longitude) ||
      isNaN(destination.latitude) || isNaN(destination.longitude)
    ) {
      throw new Error('Invalid coordinates');
    }

    // 🧮 Distance + fare calculation
    const distance = routeInfo?.legs?.[0]?.distance?.value || calculateDistance(currentLocation, destination);
    const duration = routeInfo?.legs?.[0]?.duration?.value || Math.ceil(distance / 1000 * 3);
    const estimatedFare = calculateEstimatedFare(currentLocation, destination);
    if (distance <= 0) {
      throw new Error('Invalid distance calculation');
    }
    if (estimatedFare <= 0) {
      throw new Error('Invalid fare calculation');
    }

    // ✅ CLEAN rideData object — no extra keys inside GeoJSON
  const rideData = {
    pickupLocation: {
      type: 'Point',
      coordinates: [currentLocation.longitude, currentLocation.latitude] as [number, number],
      address: currentLocation.address || "Current Location"
    },
    dropoffLocation: {
      type: 'Point',
      coordinates: [destination.longitude, destination.latitude] as [number, number],
      address: destination.address || searchText || "Selected Destination"
    },
    fare: estimatedFare,
    distance,
    duration,
    paymentMethod: 'wallet',
    status: 'pending',
  };



  console.log("Creating ride with:", JSON.stringify(rideData, null, 2));

    // 🛰️ Send to backend
    const rideResponse = await rideAPI.createRide(rideData);

    if (!rideResponse || !rideResponse.id) {
      throw new Error('Ride creation failed: no ride ID returned.');
    }

    // Show waiting for driver UI
    setWaitingForDriver(true);

    // Optionally, you can still navigate or update params if needed
    // router.push({ ... });

  } catch (error) {
    console.error('❌ Booking error:', error);
    Alert.alert(
      'Booking Error',
      error instanceof Error ? error.message : 'Something went wrong. Please try again.'
    );
  } finally {
    setIsBooking(false);
  }
};



  const calculateEstimatedFare = (start: Location, end: Location): number => {
    const distance = calculateDistance(start, end);
    const baseFare = 50; // Base fare in pesos
    const perKmRate = 15; // Rate per kilometer
    const minimumFare = 20; // Minimum fare in pesos
    
    const fare = baseFare + (distance / 1000 * perKmRate); // Convert meters to kilometers
    return Math.max(Math.round(fare), minimumFare); // Ensure whole number
  };

  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
        return;
      }

      // Get initial location with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: LOCATION_SETTINGS.HIGH_ACCURACY.accuracy,
      });

      const newLocation: Location = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
         address: "Current Location"
      };

      if (isWithinNagaCity(newLocation)) {
        setCurrentLocation(newLocation);
        setLocationAccuracy(location.coords.accuracy);
        
        // Zoom to user location with closer zoom
        const newRegion = {
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          latitudeDelta: 0.001, // Closer zoom
          longitudeDelta: 0.001,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 300);
      }

      // Start watching location with high accuracy
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: LOCATION_SETTINGS.HIGH_ACCURACY.accuracy,
          timeInterval: LOCATION_SETTINGS.HIGH_ACCURACY.timeInterval,
          distanceInterval: LOCATION_SETTINGS.HIGH_ACCURACY.distanceInterval,
        },
        (location) => {
          const newLocation: Location = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
          };

          if (isWithinNagaCity(newLocation) && 
              location.coords.accuracy !== null && 
              location.coords.accuracy <= LOCATION_SETTINGS.MAX_ACCURACY_THRESHOLD) {
            setCurrentLocation(newLocation);
            setLocationAccuracy(location.coords.accuracy);
            setLastLocationUpdate(Date.now());
          }
        }
      );

    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your current location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup location subscription
  useEffect(() => {
    getCurrentLocation();
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);


  // Add cache cleaning on component mount
  useEffect(() => {
    cleanCache();
  }, []);

  // Add cache cleaning when component unmounts
  useEffect(() => {
    return () => {
      cleanCache();
    };
  }, []);

  // Function to search for locations using Nominatim API
  const searchLocation = async (query: string): Promise<SearchResult[]> => {
    try {
      if (!query.trim()) {
        return [];
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&countrycodes=ph&limit=5`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'EyyRideSharing/1.0', // Required by Nominatim usage policy
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format from Nominatim API');
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format from Nominatim API');
      }

      return data.map((item: any) => ({
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        display_name: item.display_name
      }));
    } catch (error) {
      console.error('Error searching location:', error);
      setSearchError('Failed to search location. Please try again.');
      throw error;
    }
  };

  // Function to calculate next turn information
  const calculateNextTurn = (path: Point[], currentIndex: number): TurnInfo | null => {
    if (currentIndex >= path.length - 2) {
      return null;
    }

    const current = path[currentIndex];
    const next = path[currentIndex + 1];
    const nextNext = path[currentIndex + 2];

    // Calculate bearing between points
    const bearing1 = calculateBearing(current, next);
    const bearing2 = calculateBearing(next, nextNext);
    const angleDiff = (bearing2 - bearing1 + 360) % 360;

    // Calculate distance to next turn
    const distance = calculateDistance(current, next);

    // Determine turn instruction
    let instruction = 'Continue straight';
    if (angleDiff > 30 && angleDiff <= 150) {
      instruction = 'Turn right';
    } else if (angleDiff > 150 && angleDiff <= 210) {
      instruction = 'Turn around';
    } else if (angleDiff > 210 && angleDiff <= 330) {
      instruction = 'Turn left';
    }

    return {
      instruction,
      distance
    };
  };

  // Function to calculate bearing between two points
  const calculateBearing = (start: Point, end: Point): number => {
    const startLat = start.latitude * Math.PI / 180;
    const startLng = start.longitude * Math.PI / 180;
    const endLat = end.latitude * Math.PI / 180;
    const endLng = end.longitude * Math.PI / 180;

    const y = Math.sin(endLng - startLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
              Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360;
    
    return bearing;
  };

  // Function to handle map style change
  const handleMapStyleChange = (style: string) => {
    setMapStyle(style);
  };

  // Function to toggle rider's view
  const toggleRiderView = () => {
    setIsRiderView(!isRiderView);
    if (!isRiderView) {
      // When switching to rider view, adjust the map to follow the rider
      mapRef.current?.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.005, // Closer zoom for rider view
        longitudeDelta: 0.005,
      }, 1000);
    }
  };

  // Function to update rider's heading
  const updateRiderHeading = (heading: number) => {
    setCurrentLocation(prev => ({
      ...prev,
      heading
    }));
  };

  // Function to find closest point on path
  const findClosestPointIndex = (point: Point, path: Point[]): number => {
    let minDistance = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < path.length; i++) {
      const distance = calculateDistance(point, path[i]);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    return closestIndex;
  };

  // Update location tracking to include navigation updates
  useEffect(() => {
    // Removed pathCoordinates dependency
  }, [currentLocation, isRiderView]);

  const handleCancelRide = async () => {
    setWaitingForDriver(false);
    const rideId = params.rideId;
    if (!rideId) {
      Alert.alert('Error', 'No ride ID found to cancel.');
      return;
    }
    try {
      await rideAPI.updateRideStatus(rideId as string, 'cancel');
      Alert.alert('Ride Cancelled', 'Your ride has been cancelled.');
      // Optionally, navigate back to dashboard or reset state
      router.replace('/dashboardcommuter');
    } catch (error) {
      console.error('Error cancelling ride:', error);
      Alert.alert('Error', 'Failed to cancel the ride. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Ionicons name="location-outline" size={20} color="#0d4217" />
          <TextInput
            style={styles.searchInput}
            placeholder="Where do you want to go?"
            placeholderTextColor="#666"
            value={searchText}
            onChangeText={debouncedSearch}
            returnKeyType="search"
          />
          {isLoading && (
            <ActivityIndicator size="small" color="#0d4217" style={styles.searchLoading} />
          )}
        </View>
      </View>

      {/* Error Message */}
      {searchError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{searchError}</Text>
        </View>
      )}

      {/* Main Content - Half Map, Half Booking Info */}
      <View style={styles.mainContent}>
        {/* Map Section - Top Half */}
        <View style={styles.mapSection}>
          {currentLocation && destination ? (
            <RouteMap
              origin={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                address: currentLocation.address || 'Current Location',
              }}
              destination={{
                latitude: destination.latitude,
                longitude: destination.longitude,
                address: destination.address || searchText || 'Selected Destination',
              }}
              onRouteReceived={setRouteInfo}
              style={styles.map}
            />
          ) : (
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              region={region}
              showsUserLocation={true}
              showsMyLocationButton={true}
              mapType={mapStyle as MapType}
              showsTraffic={showTraffic}
            >
              {currentLocation && (
                <Marker
                  coordinate={{
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                  }}
                  title="You are here"
                  pinColor="green"
                />
              )}
            </MapView>
          )}
        </View>

        {/* Booking Info Section - Bottom Half */}
        <View style={styles.bookingSection}>
          {waitingForDriver ? (
            <View style={styles.waitingContainer}>
              <ActivityIndicator size="large" color="#0d4217" style={{ marginBottom: 16 }} />
              <Text style={styles.waitingTitle}>Waiting for driver...</Text>
              <Text style={styles.waitingSubtitle}>
                Your ride request has been sent. Please wait while we connect you to a driver.
              </Text>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelRide}
              >
                <Text style={styles.cancelButtonText}>Cancel Ride</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.bookingInfo}>
              {/* Route Information */}
              {routeInfo && routeInfo.legs && routeInfo.legs[0] && destination ? (
                <View style={styles.routeInfo}>
                  <Text style={styles.sectionTitle}>Route Information</Text>
                  
                  <View style={styles.locationInfo}>
                    <View style={styles.locationItem}>
                      <Ionicons name="location" size={16} color="#0d4217" />
                      <View style={styles.locationText}>
                        <Text style={styles.locationLabel}>From:</Text>
                        <Text style={styles.locationAddress} numberOfLines={2} ellipsizeMode="tail">
                          {currentLocation.address || 'Current Location'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.locationItem}>
                      <Ionicons name="location" size={16} color="#e74c3c" />
                      <View style={styles.locationText}>
                        <Text style={styles.locationLabel}>To:</Text>
                        <Text style={styles.locationAddress} numberOfLines={2} ellipsizeMode="tail">
                          {destination.address || searchText || 'Selected Destination'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.tripDetails}>
                    <View style={styles.detailItem}>
                      <Ionicons name="time-outline" size={16} color="#666" />
                      <Text style={styles.detailText}>{routeInfo.legs[0].duration.text}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="navigate-outline" size={16} color="#666" />
                      <Text style={styles.detailText}>{routeInfo.legs[0].distance.text}</Text>
                    </View>
                  </View>

                  <View style={styles.fareContainer}>
                    <Text style={styles.fareLabel}>Estimated Fare:</Text>
                    <Text style={styles.fareAmount}>₱{calculateEstimatedFare(currentLocation, destination)}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.noDestination}>
                  <Ionicons name="search-outline" size={48} color="#ccc" />
                  <Text style={styles.noDestinationText}>Search for a destination to see route information</Text>
                </View>
              )}

              {/* Book Ride Button */}
              <TouchableOpacity 
                style={[
                  styles.bookButton, 
                  (!destination || isLoading || isBooking) && styles.bookButtonDisabled
                ]}
                onPress={handleChooseDestination}
                disabled={!destination || isLoading || isBooking}
              >
                <Text style={styles.bookButtonText}>
                  {isBooking ? 'PROCESSING...' : 
                   isLoading ? 'LOADING...' : 
                   destination ? 'BOOK RIDE' : 
                   'SELECT A DESTINATION'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#000',
  },
  mainContent: {
    flex: 1,
  },
  mapSection: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  bookingSection: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  waitingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  waitingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0d4217',
    marginBottom: 8,
    textAlign: 'center',
  },
  waitingSubtitle: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bookingInfo: {
    flex: 1,
  },
  routeInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0d4217',
    marginBottom: 16,
  },
  locationInfo: {
    marginBottom: 20,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationText: {
    flex: 1,
    marginLeft: 8,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  fareContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  fareLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  fareAmount: {
    fontSize: 20,
    color: '#0d4217',
    fontWeight: 'bold',
  },
  noDestination: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  noDestinationText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  bookButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 'auto',
  },
  bookButtonDisabled: {
    backgroundColor: '#ccc',
  },
  bookButtonText: {
    color: '#0d4217',
    fontSize: 16,
    fontWeight: 'bold',
  },
  currentLocationMarker: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#0d4217'
  },
  destinationMarker: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#e74c3c'
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
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#bed2d0',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  navItem: {
    alignItems: 'center',
    padding: 10,
  },
  inactiveNavItem: {
    opacity: 0.7,
  },
  inactiveIcon: {
    opacity: 0.7,
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -50 }],
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
  },
  loadingText: {
    marginTop: 10,
    color: '#0d4217',
    fontSize: 14,
    fontWeight: 'bold',
  },
  searchLoading: {
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 8,
    marginHorizontal: 16,
    borderRadius: 4,
    marginTop: 8,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  mapControls: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  controlButton: {
    padding: 8,
    marginVertical: 4,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  activeControlButton: {
    backgroundColor: '#2196F3',
  },
  navigationInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  turnInstruction: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0d4217',
    marginBottom: 5
  },
  distanceInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3
  },
  timeInfo: {
    fontSize: 14,
    color: '#666'
  },
  fareInfo: {
    fontSize: 16,
    color: '#0d4217',
    marginTop: 4,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 13,
    color: '#0d4217',
    fontWeight: 'bold',
  },
  address: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4,
    marginBottom: 2,
    maxWidth: '100%',
  },
}); 