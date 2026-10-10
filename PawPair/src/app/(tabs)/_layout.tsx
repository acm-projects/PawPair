import { Tabs } from 'expo-router';
import { House, User, Camera, Dog } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <User size={size} color="currentColor" strokeWidth={1.75} />
          ),
        }}
      />
      <Tabs.Screen name="homepage" options={{
          title: 'Homepage',
          tabBarIcon: ({ color, size }) => (
            <House size={size} color="currentColor" strokeWidth={1.75} />
          ),
        }} />
      <Tabs.Screen name="scrollview" options={{
          title: 'Scrollview',
          tabBarIcon: ({ color, size }) => (
            <Dog size={size} color="currentColor" strokeWidth={1.75} />
          ),
        }} />
      <Tabs.Screen name="camera" options={{
          title: 'Camera',
          tabBarIcon: ({ color, size }) => (
            <Camera size={size} color="currentColor" strokeWidth={1.75} />
          ),
        }} />
    </Tabs>
  );
}