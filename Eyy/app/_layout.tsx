import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../lib/AuthContext';
import { SocketProvider } from '../lib/socket-context';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../lib/api';
import Constants from 'expo-constants';

// Import polyfills first
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import '../lib/polyfills';

function RootLayout() {
  const colorScheme = useColorScheme();
  React.useEffect(() => {
    (async () => {
      // Skip remote push token registration in Expo Go; only supports development builds
      if ((Constants as any).executionEnvironment === 'storeClient') {
        return;
      }
      const { status } = await Notifications.getPermissionsAsync();
      let granted = status === 'granted';
      if (!granted) {
        const req = await Notifications.requestPermissionsAsync();
        granted = req.status === 'granted';
      }
      if (granted) {
        try {
          const token = (await Notifications.getExpoPushTokenAsync()).data;
          try { await api.makeRequest('/notifications/push-token', { method: 'POST', body: JSON.stringify({ token }) }); } catch {}
          await AsyncStorage.setItem('pushToken', token);
        } catch {}
      }
    })();
  }, []);

  return (
    <AuthProvider>
      <SocketProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: '#0B4619',
                },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(commuter)" />
              <Stack.Screen name="(driver)" />
              <Stack.Screen name="logincommuter" />
              <Stack.Screen name="loginrider" />
              <Stack.Screen name="signupcommuter" />
              <Stack.Screen name="signuprider" /> 
              <Stack.Screen name="locationcommuter" />
              <Stack.Screen name="otpcommuter" />
              <Stack.Screen name="otprider" />
              <Stack.Screen name="waitingcommuter" />
              <Stack.Screen name="forgot-password" />
            </Stack>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </SocketProvider>
    </AuthProvider>
  );
}

export default RootLayout;
