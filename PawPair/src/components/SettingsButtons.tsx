import { TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ellipsis } from "lucide-react-native";

// The three dots in the top-right corner. Put <SettingsButton /> inside a
// screen's outermost <View> and it floats over the corner and opens Settings.
export default function SettingsButton({ color = "#1A1A1A" }: { color?: string }) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => router.navigate("/settings")}
      accessibilityLabel="Open settings"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ellipsis size={28} color={color} strokeWidth={2.25} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute", // floats over the corner
    top: 56,
    right: 20,
    zIndex: 10, // stays above the rest of the screen
  },
});
