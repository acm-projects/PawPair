import { Tabs } from 'expo-router';
import { House, User, Camera, Dog } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          href: null,                         
          headerShown: false,                  
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="homepage"
        options={{
          title: 'Homepage',
          href: null,                         
          headerShown: false,                  
          tabBarStyle: { display: "none" },
          
        }}
      />
      <Tabs.Screen
        name="swiping"
        options={{
          title: 'Swiping',
          href: null,                         
          headerShown: false,                  
          tabBarStyle: { display: "none" },
          
        }}
      />
      <Tabs.Screen name="scrollview" options={{
          title: 'Scrollview',
          href: null,                         
          headerShown: false,                  
          tabBarStyle: { display: "none" },
        }} />
      <Tabs.Screen
        name="quiz"
        options={{
        href: null,                         
        headerShown: false,                  
        tabBarStyle: { display: "none" },    
      }}
  />
        
      <Tabs.Screen name="camera" options={{
          headerShown: false,
          title: 'Camera',
          tabBarIcon: ({ color, size }) => (
            <Camera size={size} color="currentColor" strokeWidth={1.75} />
          ),
        }} />
    </Tabs>
  );
}



