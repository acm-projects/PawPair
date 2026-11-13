import { useState, useEffect, useRef, useCallback } from "react";
import {
  Text,
  View,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { User, House, Dog, Camera as CameraIcon, Check, X, ChevronLeft, PawPrint } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Tabs, router, useFocusEffect } from "expo-router";
import { useFonts } from "expo-font";
import { getPet } from "../../data/pets";
import { statusFor, useStatuses, setStage } from "../../data/petStatus";
import { usePetLists, removePet, clearList } from "../../store/petLists";

const paw = require("../../../assets/images/paw-watermark.png");
import PawNavBar from "@/components/PawNavBar";

const CURRENT_HREF: string = "/homepage";
const FONT = "'Open Sans', system-ui, sans-serif";
const GREEN = "#6EE08F";

// Loads Open Sans once on web (does nothing on iOS/Android).
function loadFont() {
  if (typeof document === "undefined") return;
  if (document.getElementById("open-sans-font")) return;
  const link = document.createElement("link");
  link.id = "open-sans-font";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap";
  document.head.appendChild(link);
}

const paws = [
  { top: 70, left: 16 },
  { top: 70, right: 16 },
  { top: 0, left: "40%" },
  { top: 52, left: "26%" },
  { top: 52, right: "26%" },
  { top: "38%", left: "55%" },
  { top: "51%", left: "17%" },
  { top: "53%", left: "68%" },
  { top: "70%", left: "27%" },
  { top: "78%", left: "73%" },
] as const;

const NAV_ITEMS = [
  { href: "/profile", label: "Profile", Icon: User },
  { href: "/homepage", label: "Homepage", Icon: House },
  { href: "/scrollview", label: "Scrollview", Icon: Dog },
  { href: "/camera", label: "Camera", Icon: CameraIcon },
] as const;

/* ---------- paw burst ---------- */

const PAW_COLORS = ["#F4BFB2", "#BFCBEC"];
const PAW_COUNT = 12;
const EXIT_AFTER_MS = 2300; // how long the card stays before sliding out

type PawSpec = {
  x: number; // % across the card
  y: number; // % down the card
  size: number;
  rotate: number;
  color: string;
  delay: number;
};

function makePaws(): PawSpec[] {
  return Array.from({ length: PAW_COUNT }, (_, i) => ({
    x: 6 + Math.random() * 88,
    y: 8 + Math.random() * 78,
    size: 22 + Math.random() * 16,
    rotate: -45 + Math.random() * 90,
    color: PAW_COLORS[i % PAW_COLORS.length],
    delay: Math.random() * 400,
  }));
}

function PawPop({ spec }: { spec: PawSpec }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(spec.delay),
      // pop in
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      // hang around
      Animated.delay(1100),
      // fade away
      Animated.timing(opacity, {
        toValue: 0,
        duration: 600,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: `${spec.x}%`,
        top: `${spec.y}%`,
        opacity,
        transform: [{ scale }, { rotate: `${spec.rotate}deg` }],
      }}
    >
      {/* white outline + pastel fill so the pink stays visible on the pink card */}
      <PawPrint size={spec.size} color="#FFFFFF" fill={spec.color} strokeWidth={1.5} />
    </Animated.View>
  );
}

function PawBurst({ trigger }: { trigger: number }) {
  const [specs, setSpecs] = useState<PawSpec[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    setSpecs(makePaws());
  }, [trigger]);

  if (specs.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {specs.map((p, i) => (
        <PawPop key={`${trigger}-${i}`} spec={p} />
      ))}
    </View>
  );
}

/* ---------- match card ---------- */

type Pet = NonNullable<ReturnType<typeof getPet>>;

function MatchCard({
  pet,
  applied,
  onApply,
  onDone,
  onRemove,
}: {
  pet: Pet;
  applied: boolean;
  onApply: () => void;
  onDone: () => void;
  onRemove: () => void;
}) {
  const hop = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [burst, setBurst] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const handleApply = () => {
    if (applied) return;
    onApply();
    setBurst((b) => b + 1);

    const jump = () =>
      Animated.sequence([
        Animated.timing(hop, {
          toValue: -12,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(hop, {
          toValue: 0,
          duration: 220,
          easing: Easing.bounce,
          useNativeDriver: true,
        }),
      ]);
    Animated.sequence([jump(), Animated.delay(80), jump()]).start();

    // after the paws, slide the card away (it's now an application)
    timer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slide, {
          toValue: 70,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => onDone());
    }, EXIT_AFTER_MS);
  };

  return (
    <Animated.View
      style={{
        opacity: fade,
        transform: [{ translateY: hop }, { translateX: slide }],
      }}
    >
      <LinearGradient
        colors={["#F4BFB2", "#F8DBD4"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={s.match}
      >
        <Image source={{ uri: pet.image }} style={s.photo} />

        <View style={s.info}>
          <View style={s.infoInner}>
            <Text style={s.name}>{pet.name}</Text>
            {pet.traits.map((t, j) => (
              <View key={j} style={s.trait}>
                <View style={s.iconBox}>
                  <Image source={t.listIcon} style={{ width: 16, height: 16 }} />
                </View>
                <Text style={s.small}>{t.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.actionCol}>
          <Pressable
            style={[s.btn, applied ? s.btnApplied : { borderColor: "#86EFAC" }]}
            onPress={handleApply}
            disabled={applied}
          >
            <Check size={32} color={applied ? "#fff" : GREEN} strokeWidth={applied ? 2.5 : 1.75} />
          </Pressable>
          <Pressable style={[s.btn, { borderColor: "#D32F2F" }]} onPress={onRemove}>
            <X size={30} color="#D32F2F" strokeWidth={1.75} />
          </Pressable>
        </View>

        <PawBurst trigger={burst} />
      </LinearGradient>
    </Animated.View>
  );
}

/* ---------- screen ---------- */

export default function Matches() {
  const [fontsLoaded] = useFonts({
    HeadingFont: require("../../../assets/Fonts/Matcha Style.ttf"),
    NameFont: require("../../../assets/Fonts/NameFont.otf"),
  });

  useEffect(() => {
    loadFont();
  }, []);

  const { matches: matchIds } = usePetLists();
  const statuses = useStatuses();
  const allMatches = matchIds.map(getPet).filter((p): p is Pet => !!p);

  // pets that just got applied to stay on screen until their animation finishes
  const [lingering, setLingering] = useState<Set<string | number>>(new Set());

  // when you leave this page, drop any lingering pets so applied ones disappear
  useFocusEffect(
    useCallback(() => {
      return () => setLingering(new Set());
    }, [])
  );

  // only show pets that haven't been applied to (plus any still celebrating)
  const matches = allMatches.filter(
    (p) => statusFor(statuses, p.id).stage < 1 || lingering.has(p.id)
  );

  if (!fontsLoaded) return null;

  return (
    <View style={s.outer}>
      <Tabs.Screen options={{ headerShown: false, tabBarStyle: { display: "none" } }} />

      <SafeAreaView style={s.container} edges={["top"]}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {paws.map((p, i) => (
            <Image key={i} source={paw} style={[s.paw, p]} />
          ))}
        </View>
        <Pressable
          style={s.backButton}
          onPress={() => router.navigate("homepages/PreHomepage" as any)}
        >
          <ChevronLeft size={24} color="#222" strokeWidth={2.5} />
        </Pressable>

        <Text style={s.heading}>MATCHES</Text>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 16 }}>
          {matches.length === 0 && <Text style={s.empty}>No matches. Keep on swiping!</Text>}

          {matches.map((m) => (
            <MatchCard
              key={m.id}
              pet={m}
              applied={statusFor(statuses, m.id).stage >= 1}
              onApply={() => {
                setStage(m.id, 0);
                setLingering((prev) => new Set(prev).add(m.id));
              }}
              onDone={() =>
                setLingering((prev) => {
                  const next = new Set(prev);
                  next.delete(m.id);
                  return next;
                })
              }
              onRemove={() => removePet("matches", m.id)}
            />
          ))}
        </ScrollView>

        <Pressable style={s.clear} onPress={() => clearList("matches")}>
          <Text style={s.clearText}>Clear All Matches</Text>
        </Pressable>
        <View style={s.navWrapper}>
          <PawNavBar active="/homepage" />
        </View>
      </SafeAreaView>
    </View>
  );
}

const NAV_RADIUS = 20;

const s = StyleSheet.create({
  outer: { flex: 1, backgroundColor: "#6b6b6b", alignItems: "center" },
  container: { flex: 1, width: "100%", maxWidth: 380, backgroundColor: "#F3EDE8", overflow: "hidden" },
  paw: { position: "absolute", width: 52, height: 52, resizeMode: "contain", opacity: 0.8 },
  heading: {
    fontFamily: "HeadingFont",
    fontSize: 40,
    textAlign: "center",
    marginTop: 24,
    marginBottom: 14,
  },
  empty: { fontFamily: FONT, textAlign: "center", fontSize: 14, color: "#555", marginTop: 24 },

  match: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 20,
    marginBottom: 12,
    minHeight: 130,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  photo: { width: 110, height: 110, borderRadius: 22 },
  info: { flex: 1, marginLeft: 10, alignItems: "center" },
  infoInner: { alignItems: "flex-start", marginTop: -14 },
  name: {
    fontFamily: "NameFont",
    fontSize: 36,
    lineHeight: 40,
    alignSelf: "center",
    textAlign: "center",
    marginBottom: -7,
    transform: [{ translateY: -2 }],
  },
  trait: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  iconBox: { width: 22, height: 22, marginRight: 6, alignItems: "center", justifyContent: "center" },
  small: { fontFamily: FONT, fontSize: 13, fontWeight: "400", color: "#241e1e" },

  actionCol: { gap: 8, marginRight: 2, marginLeft: 6 },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  btnApplied: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  clear: { alignSelf: "center", paddingTop: 6, paddingBottom: 14 },
  clearText: { fontFamily: FONT, fontSize: 11, color: "#8B1A1A", textDecorationLine: "underline" },

  navBarBackground: {
    backgroundColor: "#EFAA9A",
    borderTopLeftRadius: NAV_RADIUS,
    borderTopRightRadius: NAV_RADIUS,
    overflow: "hidden",
  },
  navBar: { flexDirection: "row" },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 14 },
  navItemActive: {
    backgroundColor: "rgba(214, 110, 90, 0.35)",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  navWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  backButton: {
    position: "absolute",
    top: 25,
    left: 14,
    zIndex: 99,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(246, 243, 239, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
});