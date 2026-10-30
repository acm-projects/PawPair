import { Stack } from "expo-router";

export default function RootLayout() {
  return ( <Stack>
    <Stack.Screen name="index" options={{headerShown: false}}/>
    <Stack.Screen name="(tabs)" options={{headerShown: false}}/>
    <Stack.Screen name="(auth)/login" options={{headerShown: false}}/>
    <Stack.Screen name="(auth)/signup" options={{headerShown: false}}/>
    <Stack.Screen name="(tabs)/swiping" options={{headerShown: false}}/>
    <Stack.Screen name="(tabs)/matches" options={{headerShown: false}}/>
  </Stack> );
}
