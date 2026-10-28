
import { Platform } from "react-native";

export async function deriveZipFromDevice() {
  if (Platform.OS === "web") {
    throw new Error(
      "For the web prototype, please choose Enter a ZIP code."
    );
  }

  const Location = await import("expo-location");

  const permission =
    await Location.requestForegroundPermissionsAsync();

  if (permission.status !== "granted") {
    throw new Error(
      "Location permission not granted. Enter a ZIP instead."
    );
  }

  const coords = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced
  });

  const results = await Location.reverseGeocodeAsync({
    latitude: coords.coords.latitude,
    longitude: coords.coords.longitude
  });

  const zip = results[0]?.postalCode ?? "";

  if (!/^\d{5}$/.test(zip)) {
    throw new Error(
      "Could not determine a 5-digit ZIP. Enter it manually."
    );
  }

  return zip;
}
