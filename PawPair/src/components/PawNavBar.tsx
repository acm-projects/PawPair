import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { User, House, Dog, Camera as CameraIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

const NAV_ITEMS = [
  { href: "/profile", label: "Profile", Icon: User },
  { href: "/homepage", label: "Homepage", Icon: House },
  { href: "/scrollview", label: "Scrollview", Icon: Dog },
  { href: "/camera", label: "Camera", Icon: CameraIcon },
] as const;

export type NavHref = (typeof NAV_ITEMS)[number]["href"];

const NAV_RADIUS = 20;

export default function PawNavBar({ active, disabled = false }: { active: NavHref; disabled?: boolean }) {
  return (
    <LinearGradient colors={["#F5C0B3", "#E98F78"]} style={styles.background}>
      <SafeAreaView style={styles.bar} edges={["bottom"]}>
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = href === active;
          return (
            <TouchableOpacity
              key={href}
              style={styles.item}
              onPress={() => router.navigate(href)}
              disabled={disabled}
            >
              <Icon size={40} color="white" strokeWidth={isActive ? 2.25 : 1.75} />
              <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    borderTopLeftRadius: NAV_RADIUS,
    borderTopRightRadius: NAV_RADIUS,
    overflow: "hidden",
  },
  bar: {
    flexDirection: "row",
    paddingTop: 8,
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingBottom: 4,
  },
  label: {
    color: "transparent",
    fontSize: 4,
  },
  labelActive: {
    fontWeight: "bold",
  },
});