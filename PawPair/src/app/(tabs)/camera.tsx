import { Text, View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { PawPrint, Plus, User, House, Dog, Camera as CameraIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useIsFocused, Tabs, router } from "expo-router";

import { getNextScanName, uploadScan } from "@/services/scanApi";
import ScanNameEditor from "@/components/ScanNameEditor";
import type { PetType } from "@/types/scan";


type ScanStatus = "idle" | "starting" | "recording" | "uploading";

const SNAPSHOT_EVERY_MS = 1500;
const MAX_SNAPSHOTS = 12;
const MAX_SNAPSHOT_CHARS = 900_000;
const PET_TYPE: PetType = "dog";

function pickSmallPictureSize(sizes: string[]): string | undefined {
  const parsed = sizes
    .map((s) => {
      const m = s.match(/^(\d+)x(\d+)$/);
      return m ? { s, long: Math.max(+m[1], +m[2]) } : null;
    })
    .filter((x): x is { s: string; long: number } => x !== null)
    .sort((a, b) => a.long - b.long);
  const good = parsed.find((p) => p.long >= 640);
  if (good) return good.s;
  return sizes.find((s) => s === "Medium") ?? sizes.find((s) => s === "Low");
}

export default function Camera() {
  const cameraRef = useRef<CameraView>(null);
  const isFocused = useIsFocused();
  const [camPermission, requestCamPermission] = useCameraPermissions();

  const [status, setStatus] = useState<ScanStatus>("idle");
  const [seconds, setSeconds] = useState(0);
  const [snapshotCount, setSnapshotCount] = useState(0);
  const [pictureSize, setPictureSize] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const [scanName, setScanName] = useState("Environment Scan");
  const renamedRef = useRef(false);
  const scanNameRef = useRef(scanName);
  scanNameRef.current = scanName;

  const renameScanDraft = (name: string) => {
    renamedRef.current = true;
    setScanName(name);
  };

  useEffect(() => {
    if (!isFocused || status !== "idle" || renamedRef.current) return;
    getNextScanName().then((name) => {
      if (!renamedRef.current) setScanName(name);
    });
  }, [isFocused, status]);

  const snapshotsRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const capturingRef = useRef(false);
  const finishingRef = useRef(false);

  const startScan = async () => {
    setError(null);
    if (!camPermission?.granted) {
      const result = await requestCamPermission();
      if (!result.granted) return;
    }
    setStatus("starting");
  };

  const takeSnapshot = async () => {
    if (capturingRef.current || finishingRef.current || !cameraRef.current) return;
    capturingRef.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.4,
        base64: true,
        shutterSound: false,
      });
      if (!photo?.base64) return;
      if (photo.base64.length > MAX_SNAPSHOT_CHARS) {
        console.warn(`Snapshot too large (${photo.width}x${photo.height}), skipping`);
        return;
      }
      snapshotsRef.current.push(photo.base64);
      setSnapshotCount(snapshotsRef.current.length);
      if (snapshotsRef.current.length >= MAX_SNAPSHOTS) finishScan();
    } catch (e) {
      console.warn("Snapshot failed", e);
    } finally {
      capturingRef.current = false;
    }
  };

  const onCameraReady = async () => {
    if (status !== "starting") return;
    snapshotsRef.current = [];
    finishingRef.current = false;
    setSnapshotCount(0);
    setSeconds(0);
    setStatus("recording");

    try {
      const sizes = (await cameraRef.current?.getAvailablePictureSizesAsync()) ?? [];
      setPictureSize(pickSmallPictureSize(sizes));
    } catch (e) {
      console.warn("Couldn't read picture sizes", e);
    }

    timerRef.current = setInterval(takeSnapshot, SNAPSHOT_EVERY_MS);
  };

  const finishScan = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    const snapshots = snapshotsRef.current;
    if (snapshots.length === 0) {
      setError("No snapshots were taken. Hold the camera steady and try again.");
      setStatus("idle");
      return;
    }

    setStatus("uploading");
    try {
      const scanId = await uploadScan(snapshots, PET_TYPE, scanNameRef.current);
      renamedRef.current = false;
      setStatus("idle");
      router.push({ pathname: "/cameraResults", params: { scanId, name: scanNameRef.current } });
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Something went wrong. Please try again.");
      setStatus("idle");
    }
  };

  const stopScan = () => finishScan();

  useEffect(() => {
    if (status !== "recording") return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (!isFocused && status === "recording") {
      if (timerRef.current) clearInterval(timerRef.current);
      finishingRef.current = true;
      setStatus("idle");
    }
  }, [isFocused, status]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const showCamera =
    isFocused && camPermission?.granted && (status === "starting" || status === "recording");

  return (
    <LinearGradient colors={["#F5C0B3", "#E98F78"]} style={styles.container}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {PAWS.map(({ size, rotate, ...position }, i) => (
          <View key={i} style={{ position: "absolute", ...position, transform: [{ rotate }] }}>
            <PawPrint size={size} color="rgb(248, 231, 233)" strokeWidth={1.5} opacity={0.5} />
          </View>
        ))}
      </View>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScanNameEditor
          value={scanName}
          onSave={renameScanDraft}
          color="white"
          disabled={status !== "idle"}
        />

        <Tabs.Screen options={{ tabBarStyle: { display: "none" } }} />
        <View style={styles.viewfinder}>
          {showCamera && (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              mode="picture"
              pictureSize={pictureSize}
              onCameraReady={onCameraReady}
            />
          )}

          {status === "uploading" && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="large" color="white" />
              <Text style={styles.uploadingText}>Saving your scan…</Text>
            </View>
          )}

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

            {status === "recording" && (
              <View style={styles.recBadge}>
                <View style={styles.recDot} />
                <Text style={styles.recText}>
                  SCANNING 0:{String(seconds).padStart(2, "0")} · {snapshotCount}/{MAX_SNAPSHOTS}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.instructions}>
            {status === "recording"
              ? "Scanning… slowly turn all the way around (360°), then tap Stop Scan."
              : "Ensure to scan all around you (360 degrees). Move the camera slowly."}
          </Text>

          {error && <Text style={styles.error}>{error}</Text>}

          {status === "idle" && (
            <TouchableOpacity style={[styles.button, styles.scanButton]} onPress={startScan}>
              <Text style={styles.scanText}>START SCAN NOW</Text>
            </TouchableOpacity>
          )}

          {status === "starting" && (
            <View style={[styles.button, styles.scanButton]}>
              <ActivityIndicator color="white" />
            </View>
          )}

          {status === "recording" && (
            <TouchableOpacity style={[styles.button, styles.scanButton, styles.stopButton]} onPress={stopScan}>
              <Text style={styles.scanText}>STOP SCAN</Text>
            </TouchableOpacity>
          )}

          {status === "uploading" && (
            <View style={[styles.button, styles.scanButton]}>
              <Text style={styles.smallButtonText}>PROCESSING…</Text>
            </View>
          )}
        </View>

        <LinearGradient colors={["#F5C0B3", "#E98F78"]} style={styles.navBarBackground}>
          <SafeAreaView style={styles.navBar} edges={["bottom"]}>
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const isActive = href === "/camera";
              return (
                <TouchableOpacity
                  key={href}
                  style={styles.navItem}
                  onPress={() => router.navigate(href)}
                  disabled={status === "uploading"}
                >
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
  recBadge: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF3B30",
  },
  recText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 13,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  uploadingText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
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
  error: {
    fontSize: 14,
    textAlign: "center",
    color: "#C0392B",
  },
  button: {
    backgroundColor: "#a9b4df",
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
    minHeight: 60,
    justifyContent: "center",
  },
  stopButton: {
    backgroundColor: "#E5737F",
  },
  scanText: {
    color: "white",
    fontSize: 26,
    fontWeight: "bold",
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