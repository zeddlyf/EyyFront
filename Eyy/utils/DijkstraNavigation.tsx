import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { PathFinder, Point } from './pathfinding';
import { dijkstra } from '../lib/Djikstra';

interface DijkstraNavigationProps {
  origin: Point;
  destination: Point;
  onRouteCalculated?: (route: any) => void;
}

const DijkstraNavigation: React.FC<DijkstraNavigationProps> = ({
  origin,
  destination,
  onRouteCalculated
}) => {
  const [pathFinder, setPathFinder] = useState<PathFinder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [route, setRoute] = useState<any>(null);


  useEffect(() => {
    initializePathFinder();
  }, []);

  const initializePathFinder = async () => {
    try {
      const pf = new PathFinder();
      const center: Point = {
        latitude: (origin.latitude + destination.latitude) / 2,
        longitude: (origin.longitude + destination.longitude) / 2
      };
      
      await pf.fetchRoadNetwork(center, 2000); // 2km radius
      setPathFinder(pf);
    } catch (error) {
      console.error('Error initializing PathFinder:', error);
      Alert.alert('Error', 'Failed to initialize navigation system');
    }
  };

  const calculateRoute = async () => {
    if (!pathFinder) {
      Alert.alert('Error', 'Navigation system not initialized');
      return;
    }

    setIsLoading(true);
    try {
      // Find nearest nodes to origin and destination
      const startNode = pathFinder.findNearestOsmNode(origin);
      const endNode = pathFinder.findNearestOsmNode(destination);

      if (!startNode || !endNode) {
        Alert.alert('Error', 'Could not find route points on road network');
        return;
      }

      // Calculate route using Dijkstra algorithm
      const result = pathFinder.findShortestPath(startNode, endNode);

      if (result) {
        setRoute(result);
        onRouteCalculated?.(result);
        
        Alert.alert(
          'Route Found!',
          `Distance: ${(result.distance / 1000).toFixed(2)} km\n` +
          `Time: ${Math.round(result.estimatedTime)} minutes\n` +
          `Fare: ₱${result.fare.toFixed(2)}\n` +
          `Algorithm: Dijkstra`
        );
      } else {
        Alert.alert('No Route', 'Could not find a route between the specified points');
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      Alert.alert('Error', 'Failed to calculate route');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <View style={styles.container}>
      <Text style={styles.title}>Navigation with Dijkstra Algorithm</Text>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          <Text style={styles.label}>Origin:</Text> {origin.latitude.toFixed(6)}, {origin.longitude.toFixed(6)}
        </Text>
        <Text style={styles.infoText}>
          <Text style={styles.label}>Destination:</Text> {destination.latitude.toFixed(6)}, {destination.longitude.toFixed(6)}
        </Text>
        <Text style={styles.infoText}>
          <Text style={styles.label}>Algorithm:</Text> Dijkstra
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={calculateRoute}
        disabled={isLoading || !pathFinder}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Calculating...' : 'Calculate Route'}
        </Text>
      </TouchableOpacity>



      {route && (
        <View style={styles.routeContainer}>
          <Text style={styles.routeTitle}>Route Information</Text>
          <Text style={styles.routeText}>Distance: {(route.distance / 1000).toFixed(2)} km</Text>
          <Text style={styles.routeText}>Time: {Math.round(route.estimatedTime)} minutes</Text>
          <Text style={styles.routeText}>Fare: ₱{route.fare.toFixed(2)}</Text>
          <Text style={styles.routeText}>Path nodes: {route.path.length}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    elevation: 2,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  label: {
    fontWeight: 'bold',
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  routeContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    elevation: 2,
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  routeText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
});

export { DijkstraNavigation }; 