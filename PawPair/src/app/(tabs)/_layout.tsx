import { Tabs } from 'expo-router';
import { House } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <House size={size} color="currentColor" strokeWidth={1.75} />
          ),
        }}
      />
      <Tabs.Screen name="homepage" options={{ title: 'Home' }} />
      <Tabs.Screen name="scrollview" options={{ title: 'Find more Pets' }} />
      <Tabs.Screen name="camera" options={{ title: 'Camera' }} />
    </Tabs>
  );
}