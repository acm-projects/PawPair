import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PawPrint, X } from "lucide-react-native";

import PawNavBar from "@/components/PawNavBar";
import ScanNameEditor from "@/components/ScanNameEditor";
import { listenToScan, renameScan } from "@/services/scanApi";
import type { Hazard, ScanDoc, Snapshot } from "@/types/scan";

const COLORS = {
  background: "#F6F2F0",
  pink: "#E98F78",
  pinkBorder: "#edab9b",
  paw: "rgba(224, 120, 138, 0.18)",
  text: "#1E1E1E",
  muted: "#555",
  hazardFill: "rgba(214, 64, 69, 0.35)",
  hazardDot: "#C9343B",
  overlay: "rgba(60, 60, 60, 0.35)",
  button: "#a9b4df",
};

const SCREEN_W = Dimensions.get("window").width;
const IMAGE_W = SCREEN_W - 64;
const POPUP_W = SCREEN_W - 48;
const DETAIL_W = POPUP_W - 48;
const DETAIL_H = DETAIL_W * 1.05;
const MIN_TAP = 32;

function jpegUri(s: Snapshot) {
  return `data:image/jpeg;base64,${s.jpeg}`;
}

const PAWS = [
  { top: 70, left: -6, rotate: "-20deg", size: 40 },
  { top: 120, right: -4, rotate: "15deg", size: 36 },
  { top: "40%", left: -8, rotate: "25deg", size: 38 },
  { top: "48%", right: -6, rotate: "-25deg", size: 40 },
  { top: "62%", left: -4, rotate: "30deg", size: 36 },
] as const;


function SnapshotWithMarkers({
  snapshot,
  hazards,
  onSelect,
}: {
  snapshot: Snapshot;
  hazards: Hazard[];
  onSelect: (h: Hazard) => void;
}) {
  const scale = IMAGE_W / snapshot.width;
  const height = snapshot.height * scale;

  return (
    <View style={{ width: IMAGE_W, height }}>
      <Image source={{ uri: jpegUri(snapshot) }} style={{ width: IMAGE_W, height }} />
      {hazards.map((h) => {
        const [x1, y1, x2, y2] = h.box;
        const w = Math.max((x2 - x1) * scale, MIN_TAP);
        const hgt = Math.max((y2 - y1) * scale, MIN_TAP);
        const cx = ((x1 + x2) / 2) * scale;
        const cy = ((y1 + y2) / 2) * scale;
        return (
          <Pressable
            key={h.id}
            onPress={() => onSelect(h)}
            style={[styles.hazardBox, { left: cx - w / 2, top: cy - hgt / 2, width: w, height: hgt }]}
          >
            <View style={styles.hazardDot}>
              <Text style={styles.hazardDotText}>{h.id}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}


function ZoomedHazard({ snapshot, hazard }: { snapshot: Snapshot; hazard: Hazard }) {
  const [x1, y1, x2, y2] = hazard.box;
  const aspect = DETAIL_W / DETAIL_H;

  let rw = Math.max((x2 - x1) * 1.6, (y2 - y1) * 1.6 * aspect, snapshot.width * 0.45);
  let rh = rw / aspect;
  if (rh > snapshot.height) {
    rh = snapshot.height;
    rw = rh * aspect;
  }
  if (rw > snapshot.width) {
    rw = snapshot.width;
    rh = rw / aspect;
  }
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const left = Math.min(Math.max(cx - rw / 2, 0), snapshot.width - rw);
  const top = Math.min(Math.max(cy - rh / 2, 0), snapshot.height - rh);
  const scale = DETAIL_W / rw;

  return (
    <View style={styles.detailImageFrame}>
      <Image
        source={{ uri: jpegUri(snapshot) }}
        style={{
          position: "absolute",
          width: snapshot.width * scale,
          height: snapshot.height * scale,
          left: -left * scale,
          top: -top * scale,
        }}
      />
    </View>
  );
}

function HazardPopup({
  hazard,
  snapshot,
  onClose,
}: {
  hazard: Hazard;
  snapshot?: Snapshot;
  onClose: () => void;
}) {
  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <Pressable style={styles.popup} onPress={() => {}}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={12}>
          <X size={20} color={COLORS.pink} />
        </TouchableOpacity>

        <Text style={styles.popupTitle}>
          HAZARD #{hazard.id} - {hazard.title.toUpperCase()}
        </Text>

        {snapshot && <ZoomedHazard snapshot={snapshot} hazard={hazard} />}

        <Text style={styles.popupBody}>{hazard.reason}</Text>
        <Text style={styles.popupBody}>
          <Text style={styles.suggestionLabel}>Suggestion: </Text>
          {hazard.suggestion}
        </Text>
      </Pressable>
    </Pressable>
  );
}

export default function CameraResults() {
  const router = useRouter();
  const { scanId, name: nameFromCamera } = useLocalSearchParams<{ scanId: string; name?: string }>();
  const [scan, setScan] = useState<ScanDoc | null>(null);
  const [selected, setSelected] = useState<Hazard | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!scanId) return;
    return listenToScan(scanId, setScan);
  }, [scanId]);

  const hazards = scan?.hazards ?? [];

  const pages = useMemo(() => {
    const snapshots = scan?.snapshots ?? [];
    return snapshots
      .map((s) => ({ snapshot: s, hazards: hazards.filter((h) => h.frame_index === s.index) }))
      .filter((p) => p.hazards.length > 0);
  }, [scan, hazards]);

  const selectedSnapshot = selected
    ? scan?.snapshots?.find((s) => s.index === selected.frame_index)
    : undefined;

  const isWaiting = !scan || scan.status === "uploaded" || scan.status === "processing";

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {PAWS.map(({ size, rotate, ...position }, i) => (
          <View key={i} style={{ position: "absolute", ...position, transform: [{ rotate }] }}>
            <PawPrint size={size} color={COLORS.paw} strokeWidth={2} />
          </View>
        ))}
      </View>

      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScanNameEditor
          value={scan?.name ?? nameFromCamera ?? "Environment Scan"}
          onSave={(name) => (scanId ? renameScan(scanId, name) : undefined)}
          color={COLORS.pink}
          disabled={!scan}
        />

        <ScrollView contentContainerStyle={styles.content}>
          {isWaiting && (
            <View style={styles.statusBox}>
              <ActivityIndicator size="large" color={COLORS.pink} />
              <Text style={styles.subtitle}>
                {scan?.status === "processing"
                  ? "Checking your space for hazards…"
                  : "Waiting for the scanner to pick up your scan…"}
              </Text>
            </View>
          )}

          {scan?.status === "error" && (
            <View style={styles.statusBox}>
              <Text style={styles.heading}>SCAN FAILED</Text>
              <Text style={styles.subtitle}>{scan.error}</Text>
              <TouchableOpacity style={styles.button} onPress={() => router.back()}>
                <Text style={styles.buttonText}>TRY AGAIN</Text>
              </TouchableOpacity>
            </View>
          )}

          {scan?.status === "done" && (
            <>
              {pages.length > 0 && (
                <View style={styles.imageCard}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    style={{ width: IMAGE_W }}
                    onMomentumScrollEnd={(e) =>
                      setPage(Math.round(e.nativeEvent.contentOffset.x / IMAGE_W))
                    }
                  >
                    {pages.map((p) => (
                      <SnapshotWithMarkers
                        key={p.snapshot.index}
                        snapshot={p.snapshot}
                        hazards={p.hazards}
                        onSelect={setSelected}
                      />
                    ))}
                  </ScrollView>

                  {pages.length > 1 && (
                    <View style={styles.dots}>
                      {pages.map((p, i) => (
                        <View key={p.snapshot.index} style={[styles.dot, i === page && styles.dotActive]} />
                      ))}
                    </View>
                  )}
                </View>
              )}

              <View style={styles.summary}>
                <Text style={styles.heading}>
                  {hazards.length === 0
                    ? "NO HAZARDS DETECTED"
                    : `${hazards.length} HAZARDOUS OBJECT${hazards.length > 1 ? "S" : ""} DETECTED`}
                </Text>
                <Text style={styles.subtitle}>
                  {hazards.length === 0
                    ? "Nothing risky for your pet was spotted in this scan."
                    : pages.length > 1
                      ? "Click on the circles to view full hazard. Swipe for more photos."
                      : "Click on the circles to view full hazard"}
                </Text>
                <Text style={styles.saved}>Scan saved.</Text>
                <Text style={styles.disclaimer}>
                  Tips are general pet-safety guidance, not veterinary advice.
                </Text>
              </View>
            </>
          )}
        </ScrollView>

        <PawNavBar active="/camera" />
      </SafeAreaView>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        {selected && (
          <HazardPopup hazard={selected} snapshot={selectedSnapshot} onClose={() => setSelected(null)} />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.pink,
    paddingBottom: 4,
    marginVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.pink,
  },
  content: {
    paddingBottom: 24,
  },
  imageCard: {
    alignSelf: "center",
    width: IMAGE_W,
  },
  hazardBox: {
    position: "absolute",
    backgroundColor: COLORS.hazardFill,
    justifyContent: "center",
    alignItems: "center",
  },
  hazardDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.hazardDot,
    borderWidth: 1.5,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  hazardDotText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.pinkBorder,
    opacity: 0.5,
  },
  dotActive: {
    opacity: 1,
    backgroundColor: COLORS.pink,
  },
  summary: {
    paddingHorizontal: 32,
    paddingTop: 28,
    gap: 6,
  },
  heading: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.text,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text,
  },
  saved: {
    fontSize: 13,
    color: COLORS.pink,
    marginTop: 16,
  },
  disclaimer: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 4,
  },
  statusBox: {
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  button: {
    backgroundColor: COLORS.button,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 20,
    marginTop: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  popup: {
    width: POPUP_W,
    backgroundColor: COLORS.background,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: COLORS.pinkBorder,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 28,
    gap: 14,
  },
  closeButton: {
    position: "absolute",
    top: 14,
    right: 16,
    zIndex: 1,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
    textAlign: "center",
    textDecorationLine: "underline",
    paddingHorizontal: 16,
  },
  detailImageFrame: {
    width: DETAIL_W,
    height: DETAIL_H,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#ddd",
  },
  popupBody: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 22,
  },
  suggestionLabel: {
    color: COLORS.pink,
    fontWeight: "600",
  },
});