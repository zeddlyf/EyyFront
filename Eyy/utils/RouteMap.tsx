import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { GOOGLE_MAPS_ENDPOINTS, buildGoogleMapsUrl, TRAVEL_MODES } from '../lib/google-maps-config';
import { Ionicons } from '@expo/vector-icons';

interface RouteMapProps {
  origin: {
    latitude: number;
    longitude: number;
    address: string;
  };
  destination: {
    latitude: number;
    longitude: number;
    address: string;
  };
  travelMode?: string;
  showRouteInfo?: boolean;
  onRouteReceived?: (route: any) => void;
  style?: any;
  additionalMarkers?: Array<{
    coordinate: {
      latitude: number;
      longitude: number;
    };
    title: string;
    description: string;
    pinColor?: string;
    icon?: string;
    onPress?: () => void;
  }>;
  showUserLocation?: boolean;
  showMyLocationButton?: boolean;
  showCompass?: boolean;
  showScale?: boolean;
  showTraffic?: boolean;
  showBuildings?: boolean;
  showIndoors?: boolean;
  mapType?: 'standard' | 'satellite' | 'hybrid';
  useDijkstra?: boolean;
  pathFinder?: any;
}

function RouteMap({ 
  origin, 
  destination, 
  travelMode = TRAVEL_MODES.DRIVING,
  showRouteInfo = true,
  onRouteReceived,
  style,
  additionalMarkers = [],
  showUserLocation = true,
  showMyLocationButton = true,
  showCompass = true,
  showScale = true,
  showTraffic = true,
  showBuildings = true,
  showIndoors = true,
  mapType = 'standard',
  useDijkstra = false,
  pathFinder = null
}: RouteMapProps) {
  const mapRef = useRef<MapView>(null);
  const [route, setRoute] = useState<any>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [routeAlternatives, setRouteAlternatives] = useState<Array<{ coords: any[]; info: any }>>([]);

  useEffect(() => {
    if (origin && destination) {
      if (useDijkstra && pathFinder) {
        fetchDijkstraRoute();
      } else {
        fetchGoogleRoute();
      }
      fitMapToMarkers();
    }
  }, [origin, destination, travelMode, useDijkstra, pathFinder]);

  const fetchDijkstraRoute = async () => {
    try {
      if (!pathFinder) {
        console.error('PathFinder not provided for Dijkstra routing');
        return;
      }

      // Find nearest nodes to origin and destination
      const startNode = pathFinder.findNearestOsmNode({
        latitude: origin.latitude,
        longitude: origin.longitude
      });
      const endNode = pathFinder.findNearestOsmNode({
        latitude: destination.latitude,
        longitude: destination.longitude
      });

      if (!startNode || !endNode) {
        console.error('Could not find route points on road network');
        return;
      }

      // Calculate route using Dijkstra algorithm
      const result = pathFinder.findShortestPath(startNode, endNode);

      if (result && result.path && result.path.length > 0) {
        // Convert path to coordinates
        const coordinates = pathFinder.getDetailedPathCoordinates(result.path);
        
        setRoute(result);
        setRouteCoordinates(coordinates);
        onRouteReceived?.(result);
      } else {
        console.warn('No route found using Dijkstra algorithm');
      }
    } catch (error) {
      console.error('Error fetching Dijkstra route:', error);
    }
  };

  const fetchGoogleRoute = async () => {
    try {
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destinationStr = `${destination.latitude},${destination.longitude}`;

      const params = {
        origin: originStr,
        destination: destinationStr,
        mode: travelMode,
        alternatives: 'true',
        departure_time: 'now',
        units: 'metric',
      };

      const url = buildGoogleMapsUrl(GOOGLE_MAPS_ENDPOINTS.DIRECTIONS, params);
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const primary = data.routes[0];
        const primaryCoords = decodePolyline(primary.overview_polyline.points);
        setRoute(primary);
        setRouteCoordinates(primaryCoords);
        const alts = data.routes.slice(0, 3).map((r: any) => ({
          coords: decodePolyline(r.overview_polyline.points),
          info: r
        }));
        setRouteAlternatives(alts);
        onRouteReceived?.(data.routes);
      } else {
        // Fallback to OSRM if Google fails
        fetchOSRMRoute();
      }
    } catch (error) {
      console.error('Error fetching Google route:', error);
      // Fallback to OSRM
      fetchOSRMRoute();
    }
  };

  const fetchOSRMRoute = async () => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/` +
        `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
        `?overview=full&geometries=geojson`
      );
      const data = await response.json();
      
      if (data.routes && data.routes[0]) {
        const coordinates = data.routes[0].geometry.coordinates.map((coord: number[]) => ({
          latitude: coord[1],
          longitude: coord[0],
        }));
        setRouteCoordinates(coordinates);
        onRouteReceived?.(data.routes[0]);
      }
    } catch (error) {
      console.error('Error fetching OSRM route:', error);
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

  const fitMapToMarkers = () => {
    if (mapRef.current) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: origin.latitude, longitude: origin.longitude },
          { latitude: destination.latitude, longitude: destination.longitude }
        ],
        {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        }
      );
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={style || styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: origin.latitude,
          longitude: origin.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={showMyLocationButton}
        showsCompass={showCompass}
        showsScale={showScale}
        showsTraffic={showTraffic}
        showsBuildings={showBuildings}
        showsIndoors={showIndoors}
        mapType={mapType}
        >
        <Marker 
          coordinate={origin}
          title="Origin"
          description={origin.address}
          pinColor="#10b981"
        />
        
        <Marker 
          coordinate={destination}
          title="Destination"
          description={destination.address}
          pinColor="#ef4444"
        />
        
        {/* Additional Markers */}
        {additionalMarkers.map((marker, index) => (
          <Marker
            key={`additional-${index}`}
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
            pinColor={marker.pinColor}
            onPress={marker.onPress}
          >
            {marker.title === "Ride Request" && (
              <View style={styles.rideRequestMarker}>
                <Ionicons name="car" size={24} color="#FF6B35" />
              </View>
            )}
          </Marker>
        ))}
        
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#007AFF"
            strokeWidth={5}
            geodesic={true}
          />
        )}
        {routeAlternatives.map((alt, idx) => (
          <Polyline
            key={`alt-${idx}`}
            coordinates={alt.coords}
            strokeColor={idx === 0 ? '#10b981' : '#9ca3af'}
            strokeWidth={3}
            lineDashPattern={[4]}
            geodesic={true}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  rideRequestMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#FF6B35',
  }
});

export { RouteMap };