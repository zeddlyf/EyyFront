import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { DijkstraNavigation } from '../utils/DijkstraNavigation';
import { RouteMap } from '../utils/RouteMap';

interface Point {
  latitude: number;
  longitude: number;
}

export default function TestDijkstra() {
  const [origin, setOrigin] = useState<Point>({
    latitude: 13.6191,
    longitude: 123.1814
  });
  const [destination, setDestination] = useState<Point>({
    latitude: 13.6200,
    longitude: 123.1820
  });
  const [originLat, setOriginLat] = useState('13.6191');
  const [originLng, setOriginLng] = useState('123.1814');
  const [destLat, setDestLat] = useState('13.6200');
  const [destLng, setDestLng] = useState('123.1820');
  const [showMap, setShowMap] = useState(false);

  const updateCoordinates = () => {
    const newOrigin: Point = {
      latitude: parseFloat(originLat),
      longitude: parseFloat(originLng)
    };
    const newDestination: Point = {
      latitude: parseFloat(destLat),
      longitude: parseFloat(destLng)
    };

    if (isNaN(newOrigin.latitude) || isNaN(newOrigin.longitude) ||
        isNaN(newDestination.latitude) || isNaN(newDestination.longitude)) {
      Alert.alert('Error', 'Please enter valid coordinates');
      return;
    }

    setOrigin(newOrigin);
    setDestination(newDestination);
    Alert.alert('Success', 'Coordinates updated successfully');
  };

  const handleRouteCalculated = (route: any) => {
    console.log('Route calculated:', route);
    setShowMap(true);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Dijkstra Algorithm Navigation Test</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Set Coordinates</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Origin Latitude:</Text>
          <TextInput
            style={styles.input}
            value={originLat}
            onChangeText={setOriginLat}
            placeholder="Enter latitude"
            keyboardType="numeric"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Origin Longitude:</Text>
          <TextInput
            style={styles.input}
            value={originLng}
            onChangeText={setOriginLng}
            placeholder="Enter longitude"
            keyboardType="numeric"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Destination Latitude:</Text>
          <TextInput
            style={styles.input}
            value={destLat}
            onChangeText={setDestLat}
            placeholder="Enter latitude"
            keyboardType="numeric"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Destination Longitude:</Text>
          <TextInput
            style={styles.input}
            value={destLng}
            onChangeText={setDestLng}
            placeholder="Enter longitude"
            keyboardType="numeric"
          />
        </View>
        
        <TouchableOpacity style={styles.button} onPress={updateCoordinates}>
          <Text style={styles.buttonText}>Update Coordinates</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Coordinates</Text>
        <Text style={styles.coordinateText}>
          Origin: {origin.latitude.toFixed(6)}, {origin.longitude.toFixed(6)}
        </Text>
        <Text style={styles.coordinateText}>
          Destination: {destination.latitude.toFixed(6)}, {destination.longitude.toFixed(6)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dijkstra Navigation</Text>
        <DijkstraNavigation
          origin={origin}
          destination={destination}
          onRouteCalculated={handleRouteCalculated}
        />
      </View>

      {showMap && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route Map</Text>
          <View style={styles.mapContainer}>
            <RouteMap
              origin={{
                latitude: origin.latitude,
                longitude: origin.longitude,
                address: 'Origin'
              }}
              destination={{
                latitude: destination.latitude,
                longitude: destination.longitude,
                address: 'Destination'
              }}
              style={styles.map}
            />
          </View>
        </View>
      )}

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>About Dijkstra Algorithm</Text>
        <Text style={styles.infoText}>
          • Dijkstra's algorithm finds the shortest path between two nodes in a graph
        </Text>
        <Text style={styles.infoText}>
          • It guarantees the optimal solution for navigation
        </Text>
        <Text style={styles.infoText}>
          • This implementation uses real road network data from OpenStreetMap
        </Text>
        <Text style={styles.infoText}>
          • The algorithm considers road types, speed limits, and one-way streets
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  coordinateText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
    fontFamily: 'monospace',
  },
  mapContainer: {
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  infoSection: {
    backgroundColor: '#e8f4fd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#555',
    lineHeight: 20,
  },
}); 