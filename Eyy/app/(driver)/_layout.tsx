import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function DriverLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#bed2d0',
        },
        tabBarActiveTintColor: '#004D00',
        tabBarInactiveTintColor: 'rgba(0, 77, 0, 0.7)',
      }}
    >
      <Tabs.Screen
        name="dashboardrider"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          tabBarShowLabel: false,
        }}
      />
      <Tabs.Screen
        name="historyrider"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
          tabBarShowLabel: false,
        }}
      />
      <Tabs.Screen
        name="profilerider"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
          tabBarShowLabel: false,
        }}
      />
      <Tabs.Screen
        name="menurider"
        options={{
          href: null,
          tabBarShowLabel: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="editprofilerider"
        options={{
          href: null,
          tabBarShowLabel: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          href: null,
          tabBarShowLabel: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          tabBarShowLabel: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          href: null,
          tabBarShowLabel: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="pins"
        options={{
          href: null,
          tabBarShowLabel: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          href: null,
          tabBarShowLabel: false,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
    
    
    
  );
}
