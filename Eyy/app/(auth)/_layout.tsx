import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: '#0B4619',
        },
      }}
    >
      <Stack.Screen name="login" />
      {Platform.OS !== 'web' && (
        <Stack.Screen name="signup" />
      )}
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="otp" />
    </Stack>
  );
}
