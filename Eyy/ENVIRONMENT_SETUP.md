# EyyTrike Frontend Environment Setup Guide

This guide explains how to configure the EyyTrike frontend application with the latest backend configuration.

## Environment Configuration

The frontend now uses a centralized configuration system located in `lib/config.ts`. This configuration supports both environment variables and fallback values.

### Configuration Files

1. **`lib/config.ts`** - Main configuration file with environment variable support
2. **`app.json`** - Expo configuration with fallback values
3. **`lib/api.ts`** - Updated to use the new configuration system
4. **`lib/socket-config.ts`** - Updated to use the new configuration system

## Environment Variables

To configure the application, you can set the following environment variables:

### Required Variables

```bash
# Backend API Configuration
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api

# Socket.IO Configuration
EXPO_PUBLIC_SOCKET_URL=http://localhost:3000

# Google Maps Configuration
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
```

### Optional Variables

```bash
# Development Configuration
NODE_ENV=development

# Database Configuration (for reference)
EXPO_PUBLIC_MONGODB_URI=mongodb://localhost:27017/eyytrike

# JWT Configuration (for reference)
EXPO_PUBLIC_JWT_SECRET=your-super-secret-jwt-key-here
```

## Setting Environment Variables

### Method 1: Using .env file (if supported)
Create a `.env` file in the root directory:

```bash
# .env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SOCKET_URL=http://localhost:3000
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### Method 2: Using app.json (Current Method)
The configuration is already set up in `app.json` under the `extra` section:

```json
{
  "expo": {
    "extra": {
      "serverUrl": "http://localhost:3000",
      "apiUrl": "http://localhost:3000/api",
      "socketUrl": "http://localhost:3000",
      "googleMapsApiKey": "YOUR_GOOGLE_MAPS_API_KEY",
      "fallbackUrls": [
        "http://10.128.65.35:3000",
        "http://192.168.56.1:3000",
        "http://192.168.57.2:3000",
        "http://127.0.0.1:3000"
      ]
    }
  }
}
```

## Network Configuration

### Local Development
For local development, the default configuration uses:
- API URL: `http://localhost:3000`
- Socket URL: `http://localhost:3000`

### Network Development
If you're running the backend on a different machine or IP, update the URLs in `lib/config.ts` or set the environment variables:

```typescript
// In lib/config.ts
export const config = {
  API_URL: 'http://YOUR_IP_ADDRESS:3000',
  SOCKET_URL: 'http://YOUR_IP_ADDRESS:3000',
  // ... other config
};
```

### Fallback URLs
The system includes fallback URLs that will be tried if the primary URL fails:
- `http://10.128.65.35:3000`
- `http://192.168.56.1:3000`
- `http://192.168.57.2:3000`
- `http://127.0.0.1:3000`

## Backend Compatibility

This configuration is compatible with the latest EyyBack backend which includes:

### Features
- User authentication and registration
- Ride management
- Real-time messaging via Socket.IO
- Wallet and payment integration
- Driver approval system
- Location tracking

### API Endpoints
- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User management endpoints
- `/api/rides/*` - Ride management endpoints
- `/api/wallets/*` - Wallet management endpoints
- `/api/payments/*` - Payment processing endpoints
- `/api/messaging/*` - Real-time messaging endpoints

### Socket.IO Events
- `joinUserRoom` - Join user-specific room
- `joinRideRoom` - Join ride-specific room
- `joinConversationRoom` - Join conversation room
- `driverLocationUpdate` - Real-time driver location updates
- `typingStart` / `typingStop` - Typing indicators

## Testing the Configuration

### 1. Test API Connection
Use the built-in connection test:

```typescript
import { apiUtils } from './lib/api';

// Test connection
const result = await apiUtils.testConnection();
console.log('Connection test:', result);
```

### 2. Test Socket Connection
The Socket.IO connection is automatically managed by the `SocketProvider`. Check the connection status:

```typescript
import { useSocket } from './lib/socket-context';

function MyComponent() {
  const { isConnected, error } = useSocket();
  
  if (error) {
    console.log('Socket error:', error);
  }
  
  console.log('Socket connected:', isConnected);
}
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure the backend server is running
   - Check the IP address and port in the configuration
   - Verify firewall settings

2. **Socket Connection Failed**
   - Check if Socket.IO is properly configured on the backend
   - Verify the Socket URL configuration
   - Check network connectivity

3. **API Calls Failing**
   - Verify the API URL configuration
   - Check if the backend endpoints are accessible
   - Ensure proper CORS configuration on the backend

### Debug Mode
Enable debug logging by setting:

```typescript
// In lib/config.ts
export const config = {
  // ... other config
  DEBUG: true,
};
```

## Production Deployment

For production deployment:

1. Update the configuration URLs to point to your production server
2. Set proper environment variables
3. Configure proper SSL/HTTPS URLs
4. Update Google Maps API key with production restrictions

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify the backend server is running and accessible
3. Test the configuration using the built-in test functions
4. Ensure all required environment variables are set
