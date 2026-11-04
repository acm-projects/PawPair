
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="(tabs)"
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="(auth)/login"
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="(auth)/signup"
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="pets/[id]"
        options={{ title: "Pet Details" }}
      />

      <Stack.Screen
        name="quiz"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
