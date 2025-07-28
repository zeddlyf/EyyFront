# Dijkstra Algorithm Navigation Integration

This project uses Dijkstra's algorithm for pathfinding in the navigation system. The implementation provides optimal shortest path routing using real road network data.

## Features

- **Dijkstra Algorithm**: Guarantees optimal shortest path
- **Real Road Network**: Uses OpenStreetMap data for accurate routing
- **Fare Calculation**: Automatic fare calculation based on distance
- **Time Estimation**: Estimated travel time based on road types and speed limits

## Implementation Details

### Core Files

1. **`lib/Djikstra.ts`** - Original Dijkstra algorithm implementation
2. **`utils/pathfinding.ts`** - Enhanced PathFinder class with both Dijkstra and A* algorithms
3. **`utils/DijkstraNavigation.tsx`** - React component for Dijkstra navigation
4. **`app/test-dijkstra.tsx`** - Test page to demonstrate the functionality

### Key Changes

#### PathFinder Class (`utils/pathfinding.ts`)

The `findShortestPath` method uses Dijkstra algorithm:

```typescript
findShortestPath(startId: string, endId: string)
```

- **Dijkstra**: Uses the imported `dijkstra` function from `lib/Djikstra.ts`

#### RouteMap Component (`utils/RouteMap.tsx`)

Added support for Dijkstra routing:

```typescript
<RouteMap
  origin={origin}
  destination={destination}
  useDijkstra={true}
  pathFinder={pathFinderInstance}
/>
```

## Usage Examples

### Basic Dijkstra Navigation

```typescript
import { DijkstraNavigation } from '../utils/DijkstraNavigation';

const origin = { latitude: 13.6191, longitude: 123.1814 };
const destination = { latitude: 13.6200, longitude: 123.1820 };

<DijkstraNavigation
  origin={origin}
  destination={destination}
  onRouteCalculated={(route) => {
    console.log('Route found:', route);
  }}
/>
```

### Using PathFinder Directly

```typescript
import { PathFinder } from '../utils/pathfinding';

const pathFinder = new PathFinder();
await pathFinder.fetchRoadNetwork(center, 2000);

const startNode = pathFinder.findNearestOsmNode(origin);
const endNode = pathFinder.findNearestOsmNode(destination);

// Use Dijkstra algorithm
const result = pathFinder.findShortestPath(startNode, endNode);
```

### RouteMap with Dijkstra

```typescript
import { RouteMap } from '../utils/RouteMap';
import { PathFinder } from '../utils/pathfinding';

const pathFinder = new PathFinder();
await pathFinder.fetchRoadNetwork(center, 2000);

<RouteMap
  origin={origin}
  destination={destination}
  useDijkstra={true}
  pathFinder={pathFinder}
/>
```

## Dijkstra Algorithm Benefits

- **Optimality**: Guarantees the shortest path between two points
- **Reliability**: Works consistently regardless of graph structure
- **Simplicity**: Straightforward implementation and debugging
- **Accuracy**: Provides precise distance and time calculations

## Testing

Visit `/test-dijkstra` in the app to test the Dijkstra navigation functionality. The test page allows you to:

- Set custom coordinates for origin and destination
- View route information (distance, time, fare)
- Display the route on a map

## Road Network Data

The system fetches real road network data from OpenStreetMap using the Overpass API. It considers:

- Road types (motorway, primary, secondary, etc.)
- Speed limits
- One-way streets
- Road connectivity

## Performance Considerations

- **Caching**: Road network data is cached for 24 hours
- **Retry Logic**: Automatic retries for failed API requests
- **Graph Optimization**: Isolated nodes are removed for better performance
- **Memory Management**: Efficient graph representation

## Future Enhancements

- [ ] Add more pathfinding algorithms (Bellman-Ford, Floyd-Warshall)
- [ ] Implement real-time traffic consideration
- [ ] Add support for multiple waypoints
- [ ] Optimize for larger road networks
- [ ] Add algorithm performance metrics

## Troubleshooting

### Common Issues

1. **"No route found"**: Check if coordinates are within the road network
2. **"PathFinder not initialized"**: Ensure `fetchRoadNetwork` is called first
3. **"Could not find route points"**: Try increasing the search radius

### Debug Tips

- Use the test page to verify coordinates
- Check console logs for detailed error messages
- Verify internet connection for OSM data fetching
- Ensure coordinates are in the correct format (decimal degrees) 