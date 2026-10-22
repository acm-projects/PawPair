import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { listenToScan } from "@/services/scanApi";
import type { Hazard, ScanDoc } from "@/types/scan";

const PINK = "#F2ABB3";
const IMAGE_WIDTH = Dimensions.get("window").width - 32;
const SEVERITY_COLOR = { high: "#E5737F", medium: "#F4B860", low: "#8CC7A1" };

/** Turns the small JPEG saved in Firestore into something <Image> can show. */
function frameUri(hazard: Hazard) {
  return `data:image/jpeg;base64,${hazard.frame_jpeg}`;
}

function HazardFrame({ hazard, onPress }: { hazard: Hazard; onPress: () => void }) {
  const url = frameUri(hazard);
  const scale = IMAGE_WIDTH / hazard.frame_width;
  const height = hazard.frame_height * scale;
  const [x1, y1, x2, y2] = hazard.box;
  const cx = ((x1 + x2) / 2) * scale;
  const cy = ((y1 + y2) / 2) * scale;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      {url ? (
        <Image source={{ uri: url }} style={{ width: IMAGE_WIDTH, height, borderRadius: 16 }} />
      ) : (
        <View style={[styles.placeholder, { width: IMAGE_WIDTH, height }]}>
          <ActivityIndicator color={PINK} />
        </View>
      )}
      <View
        style={[
          styles.box,
          { left: x1 * scale, top: y1 * scale, width: (x2 - x1) * scale, height: (y2 - y1) * scale },
        ]}
      />
      <View style={[styles.marker, { left: cx - 16, top: cy - 16, backgroundColor: SEVERITY_COLOR[hazard.severity] }]}>
        <Text style={styles.markerText}>{hazard.id}</Text>
      </View>
    </TouchableOpacity>
  );
}

function HazardDetail({ hazard, onClose }: { hazard: Hazard; onClose: () => void }) {
  const url = frameUri(hazard);
  return (
    <View style={styles.modal}>
      <Text style={styles.modalTitle}>
        HAZARD #{hazard.id} – {hazard.title.toUpperCase()}
      </Text>
      {url && <Image source={{ uri: url }} style={styles.modalImage} resizeMode="cover" />}
      <Text style={styles.modalBody}>{hazard.reason}</Text>
      <Text style={styles.modalBody}>
        <Text style={{ fontWeight: "bold" }}>Suggestion: </Text>
        {hazard.suggestion}
      </Text>
      <TouchableOpacity style={styles.button} onPress={onClose}>
        <Text style={styles.buttonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function CameraResults() {
  const router = useRouter();
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const [scan, setScan] = useState<ScanDoc | null>(null);
  const [selected, setSelected] = useState<Hazard | null>(null);

  // Live-updates when the server moves the scan from "processing" → "done"
  useEffect(() => {
    if (!scanId) return;
    return listenToScan(scanId, setScan);
  }, [scanId]);

  if (!scan || scan.status === "processing") {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={PINK} />
        <Text style={styles.subtitle}>
          {scan?.status === "processing" ? "Checking your space for hazards…" : "Preparing your scan…"}
        </Text>
      </View>
    );
  }

  if (scan.status === "error") {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.title}>Scan failed</Text>
        <Text style={styles.subtitle}>{scan.error}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hazards = scan.hazards ?? [];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          {hazards.length === 0
            ? "No hazards found 🎉"
            : `${hazards.length} HAZARDOUS OBJECT${hazards.length > 1 ? "S" : ""} DETECTED`}
        </Text>
        {hazards.length > 0 && <Text style={styles.subtitle}>Tap a circle to view the full hazard</Text>}

        {hazards.map((h) => (
          <View key={h.id} style={styles.card}>
            <HazardFrame hazard={h} onPress={() => setSelected(h)} />
            <Text style={styles.cardTitle}>
              #{h.id} {h.title}
            </Text>
          </View>
        ))}

        <Text style={styles.saved}>Scan saved.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Scan Again</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          {selected && <HazardDetail hazard={selected} onClose={() => setSelected(null)} />}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF7F8" },
  center: { justifyContent: "center", alignItems: "center", gap: 16, padding: 24 },
  content: { padding: 16, paddingTop: 70, gap: 16, alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center", color: "#333" },
  subtitle: { fontSize: 15, color: "#666", textAlign: "center" },
  saved: { fontSize: 14, color: "#888" },
  card: { gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: "600", color: "#333" },
  placeholder: { borderRadius: 16, backgroundColor: "#F6E3E6", justifyContent: "center", alignItems: "center" },
  box: { position: "absolute", borderWidth: 2, borderColor: "white", borderRadius: 6 },
  marker: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  markerText: { color: "white", fontWeight: "bold" },
  button: { backgroundColor: PINK, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 999, marginTop: 8 },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 16 },
  modal: { backgroundColor: "white", borderRadius: 20, padding: 20, gap: 12, alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "bold", textAlign: "center" },
  modalImage: { width: "100%", height: 260, borderRadius: 12 },
  modalBody: { fontSize: 15, color: "#444", textAlign: "center" },
});