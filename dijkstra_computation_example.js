// Sample Dijkstra Computation with Real-World Data
// Based on your project's implementation

// Haversine distance calculation (from your project)
function calculateDistance(point1, point2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Speed limits for different road types (from your project)
const DEFAULT_SPEEDS = {
  motorway: 100,
  trunk: 80,
  primary: 60,
  secondary: 50,
  tertiary: 40,
  residential: 30,
  service: 20
};

// Calculate edge weight based on distance and speed limit
function calculateEdgeWeight(distance, speedLimit) {
  return speedLimit ? 
    (distance / 1000) / (speedLimit / 60) : // Convert to time in minutes
    distance;
}

// Sample road network in Naga City, Philippines
const sampleNodes = {
  'A': { latitude: 13.6197, longitude: 123.1814, name: 'Panganiban Drive & Magsaysay Ave' },
  'B': { latitude: 13.6195, longitude: 123.1818, name: 'Magsaysay Ave & Peñafrancia Ave' },
  'C': { latitude: 13.6192, longitude: 123.1822, name: 'Peñafrancia Ave & J. Hernandez' },
  'D': { latitude: 13.6188, longitude: 123.1826, name: 'J. Hernandez & Elias Angeles' },
  'E': { latitude: 13.6185, longitude: 123.1830, name: 'Elias Angeles & Barlin St' },
  'F': { latitude: 13.6190, longitude: 123.1816, name: 'Magsaysay Ave & J. Hernandez' }
};

const sampleWays = [
  { from: 'A', to: 'B', roadType: 'residential', speedLimit: 30 },
  { from: 'B', to: 'C', roadType: 'secondary', speedLimit: 50 },
  { from: 'C', to: 'D', roadType: 'tertiary', speedLimit: 40 },
  { from: 'D', to: 'E', roadType: 'residential', speedLimit: 30 },
  { from: 'A', to: 'F', roadType: 'unclassified', speedLimit: 20 },
  { from: 'F', to: 'C', roadType: 'unclassified', speedLimit: 20 }
];

// Build graph with time-based weights
function buildGraph() {
  const graph = {};
  
  // Initialize nodes
  Object.keys(sampleNodes).forEach(nodeId => {
    graph[nodeId] = {};
  });
  
  // Add edges with calculated weights
  sampleWays.forEach(way => {
    const fromNode = sampleNodes[way.from];
    const toNode = sampleNodes[way.to];
    
    // Calculate distance
    const distance = calculateDistance(fromNode, toNode);
    
    // Calculate edge weight (time in minutes)
    const weight = calculateEdgeWeight(distance, way.speedLimit);
    
    // Add bidirectional edges (unless one-way)
    graph[way.from][way.to] = weight;
    graph[way.to][way.from] = weight;
    
    console.log(`${way.from} → ${way.to}: ${distance.toFixed(1)}m, ${way.speedLimit}km/h, ${weight.toFixed(4)}min`);
  });
  
  return graph;
}

// Dijkstra algorithm implementation (from your project)
function dijkstra(graph, startNode, endNode) {
  const distances = {};
  const previous = {};
  const unvisited = new Set();
  
  // Initialize
  for (const node in graph) {
    distances[node] = Infinity;
    previous[node] = null;
    unvisited.add(node);
  }
  distances[startNode] = 0;
  
  console.log('\n=== DIJKSTRA ALGORITHM EXECUTION ===');
  console.log(`Finding shortest path from ${startNode} to ${endNode}`);
  console.log(`Start: ${sampleNodes[startNode].name}`);
  console.log(`End: ${sampleNodes[endNode].name}\n`);
  
  let iteration = 1;
  
  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let currentNode = Array.from(unvisited).reduce((minNode, node) => 
      distances[node] < distances[minNode] ? node : minNode
    );
    
    console.log(`\n--- Iteration ${iteration} ---`);
    console.log(`Current node: ${currentNode} (${sampleNodes[currentNode].name})`);
    console.log(`Distance to ${currentNode}: ${distances[currentNode].toFixed(4)} minutes`);
    
    if (currentNode === endNode) {
      console.log(`\n🎯 Destination reached!`);
      break;
    }
    
    unvisited.delete(currentNode);
    
    // Update distances to neighbors
    for (const neighbor in graph[currentNode]) {
      if (unvisited.has(neighbor)) {
        const distance = distances[currentNode] + graph[currentNode][neighbor];
        if (distance < distances[neighbor]) {
          const oldDistance = distances[neighbor];
          distances[neighbor] = distance;
          previous[neighbor] = currentNode;
          console.log(`  Update ${neighbor}: ${oldDistance.toFixed(4)} → ${distance.toFixed(4)} min (via ${currentNode})`);
        }
      }
    }
    
    iteration++;
  }
  
  // Build path
  const path = [];
  let current = endNode;
  while (current !== null) {
    path.unshift(current);
    current = previous[current];
  }
  
  return {
    distance: distances[endNode],
    path
  };
}

// Calculate total distance of path
function calculatePathDistance(path) {
  let totalDistance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const fromNode = sampleNodes[path[i]];
    const toNode = sampleNodes[path[i + 1]];
    const distance = calculateDistance(fromNode, toNode);
    totalDistance += distance;
  }
  return totalDistance;
}

// Main execution
console.log('=== SAMPLE DIJKSTRA COMPUTATION ===');
console.log('Road Network in Naga City, Philippines\n');

// Build the graph
const graph = buildGraph();

console.log('\n=== GRAPH STRUCTURE ===');
console.log(JSON.stringify(graph, null, 2));

// Find shortest path from A to E
const result = dijkstra(graph, 'A', 'E');

console.log('\n=== RESULT ===');
console.log(`Shortest path: ${result.path.join(' → ')}`);
console.log(`Total time: ${result.distance.toFixed(4)} minutes (${(result.distance * 60).toFixed(1)} seconds)`);

// Calculate total distance
const totalDistance = calculatePathDistance(result.path);
console.log(`Total distance: ${totalDistance.toFixed(1)} meters`);

// Show detailed path
console.log('\n=== DETAILED PATH ===');
result.path.forEach((nodeId, index) => {
  const node = sampleNodes[nodeId];
  console.log(`${index + 1}. ${nodeId}: ${node.name} (${node.latitude.toFixed(4)}, ${node.longitude.toFixed(4)})`);
});

// Compare with alternative routes
console.log('\n=== ROUTE COMPARISON ===');

// Alternative route: A → F → C → D → E
const altPath = ['A', 'F', 'C', 'D', 'E'];
const altDistance = calculatePathDistance(altPath);
let altTime = 0;
for (let i = 0; i < altPath.length - 1; i++) {
  altTime += graph[altPath[i]][altPath[i + 1]];
}

console.log(`Optimal route (A → B → C → D → E):`);
console.log(`  Distance: ${totalDistance.toFixed(1)}m, Time: ${result.distance.toFixed(4)}min`);
console.log(`Alternative route (A → F → C → D → E):`);
console.log(`  Distance: ${altDistance.toFixed(1)}m, Time: ${altTime.toFixed(4)}min`);

const timeDifference = ((result.distance - altTime) / altTime * 100).toFixed(1);
console.log(`\nOptimal route is ${timeDifference}% faster than alternative!`);

// Fare calculation (from your project)
function calculateFare(distanceKm) {
  const BASE_FARE = 15;
  const RATE_PER_KM = 11;
  const BASE_KM = 1;
  
  if (distanceKm <= BASE_KM) {
    return BASE_FARE;
  } else {
    return BASE_FARE + (distanceKm - BASE_KM) * RATE_PER_KM;
  }
}

const fare = calculateFare(totalDistance / 1000);
console.log(`\nEstimated fare: ₱${fare.toFixed(2)}`);

console.log('\n=== COMPUTATION COMPLETE ==='); 