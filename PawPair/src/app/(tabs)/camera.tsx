import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { Pencil, PawPrint, Plus, User, House, Dog, Camera as CameraIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useIsFocused, Tabs, router } from "expo-router";

export default function Camera() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [isCameraOn, setIsCameraOn] = useState(false);
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();

  // Ask for camera permission the first time the user starts a scan
  const startScan = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    setIsCameraOn(true);
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  // Unmounting CameraView releases the camera
  const showCamera = isCameraOn && isFocused && permission?.granted;

  return (
    <LinearGradient colors={["#F2ACB4", "#E47B86"]} style={styles.container}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {PAWS.map(({ size, rotate, ...position }, i) => (
          <View key={i} style={{ position: "absolute", ...position, transform: [{ rotate }] }}>
            <PawPrint size={size} color="#f6d0d4" strokeWidth={1.5} opacity={0.5} />
          </View>
        ))}
      </View>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.titleRow}>
          <Pencil size={20} color="white" />
          <Text style={styles.title}>Environment Scan1</Text>
        </View>

        {/* Hide the shared tab bar on this screen only; a custom one is rendered below */}
        <Tabs.Screen options={{ tabBarStyle: { display: "none" } }} />
        <View style={styles.viewfinder}>
          {showCamera && <CameraView style={StyleSheet.absoluteFill} facing={facing} />}

          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={[styles.vLine, { left: "33%" }]} />
            <View style={[styles.vLine, { left: "66%" }]} />
            <View style={[styles.hLine, { top: "33%" }]} />
            <View style={[styles.hLine, { top: "66%" }]} />

            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            <View style={styles.crosshair}>
              <Plus size={24} color="white" strokeWidth={1.5} />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.instructions}>
            Ensure to scan all around you (360 degrees). Move the camera slowly.
          </Text>

          {isCameraOn ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.button, styles.smallButton]} onPress={toggleCameraFacing}>
                <Text style={styles.smallButtonText}>FLIP CAMERA</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.smallButton]} onPress={() => setIsCameraOn(false)}>
                <Text style={styles.smallButtonText}>STOP SCAN</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.button, styles.scanButton]} onPress={startScan}>
              <Text style={styles.scanText}>START SCAN NOW</Text>
            </TouchableOpacity>
          )}
        </View>

        <LinearGradient colors={["#F2ACB4", "#E47B86"]} style={styles.navBarBackground}>
          <SafeAreaView style={styles.navBar} edges={["bottom"]}>
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const isActive = href === "/camera";
              return (
                <TouchableOpacity key={href} style={styles.navItem} onPress={() => router.navigate(href)}>
                  <Icon size={40} color="white" strokeWidth={isActive ? 2.25 : 1.75} />
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </SafeAreaView>
        </LinearGradient>
      </SafeAreaView>
    </LinearGradient>
  );
}

const NAV_ITEMS = [
  { href: "/profile", label: "Profile", Icon: User },
  { href: "/homepage", label: "Homepage", Icon: House },
  { href: "/scrollview", label: "Scrollview", Icon: Dog },
  { href: "/camera", label: "Camera", Icon: CameraIcon },
] as const;

const PAWS = [
  { top: 6, left: 8, rotate: "-20deg", size: 45 },
  { top: 30, right: 10, rotate: "15deg", size: 45 },
  { top: "22%", left: 5, rotate: "25deg", size: 45 },
  { top: "45%", left: 6, rotate: "-15deg", size: 45 },
  { top: "66%", left: 5, rotate: "30deg", size: 45 },
  { top: "15%", right: 5, rotate: "-25deg", size: 45 },
  { top: "35%", right: 6, rotate: "10deg", size: 45 },
  { top: "56%", right: 5, rotate: "-30deg", size: 45 },
] as const;

const CORNER_INSET = 30;
const CORNER_SIZE = 40;
const NAV_RADIUS = 20;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "white",
    paddingBottom: 4,
    marginVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  viewfinder: {
    flex: 1,
    marginHorizontal: 32,
    backgroundColor: "black",
    borderWidth: 2,
    borderColor: "white",
    overflow: "hidden",
  },
  vLine: {
    position: "absolute",
    top: CORNER_INSET,
    bottom: CORNER_INSET,
    width: 1,
    backgroundColor: "white",
  },
  hLine: {
    position: "absolute",
    left: CORNER_INSET,
    right: CORNER_INSET,
    height: 1,
    backgroundColor: "white",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: "white",
  },
  cornerTL: { top: CORNER_INSET, left: CORNER_INSET, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: CORNER_INSET, right: CORNER_INSET, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: CORNER_INSET, left: CORNER_INSET, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: CORNER_INSET, right: CORNER_INSET, borderBottomWidth: 2, borderRightWidth: 2 },
  crosshair: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 50,
    height: 50,
    marginTop: -25,
    marginLeft: -25,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#F6F2F0",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    marginTop: 24,
    paddingTop: 32,
    paddingBottom: 32 + NAV_RADIUS,
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 20,
  },
  instructions: {
    fontSize: 15,
    textAlign: "center",
    color: "#222",
  },
  button: {
    backgroundColor: "#F2ABB3",
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  scanButton: {
    width: "100%",
  },
  scanText: {
    color: "white",
    fontSize: 26,
    fontWeight: "bold",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  smallButton: {
    flex: 1,
  },
  smallButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  navBarBackground: {
    borderTopLeftRadius: NAV_RADIUS,
    borderTopRightRadius: NAV_RADIUS,
    overflow: "hidden",
    marginTop: -NAV_RADIUS,
  },
  navBar: {
    flexDirection: "row",
    paddingTop: 8,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingBottom: 4,
  },
  navLabel: {
    color: "transparent",
    fontSize: 4,
  },
  navLabelActive: {
    fontWeight: "bold",
  },
});