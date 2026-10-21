import { useEffect } from "react";
import { Text, View, StyleSheet, Image, ScrollView, Pressable, TouchableOpacity } from "react-native";
import { User, House, Dog, Camera as CameraIcon, Check, X } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Tabs, router } from "expo-router";
import { useFonts } from "expo-font";
import { getPet } from "../../data/pets";
import { usePetLists, removePet, clearList } from "../../store/petLists";

const paw = require("../../../assets/images/paw-watermark.png");

const CURRENT_HREF: string = "/homepage";
const FONT = "'Open Sans', system-ui, sans-serif";

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

export default function Matches() {
  const [fontsLoaded] = useFonts({
    HeadingFont: require("../../../assets/Fonts/Matcha Style.ttf"),
    NameFont: require("../../../assets/Fonts/NameFont.otf"),
  });

  useEffect(() => {
    loadFont();
  }, []);

  const { matches: matchIds } = usePetLists();
  const matches = matchIds.map(getPet).filter((p) => !!p);

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

        <Text style={s.heading}>MATCHES</Text>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 16 }}>
          {matches.length === 0 && <Text style={s.empty}>No matches. Keep on swiping!</Text>}

          {matches.map((m) => (
            <LinearGradient
              key={m!.id}
              colors={["#F4BFB2", "#F8DBD4"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={s.match}
            >
              <Image source={{ uri: m!.image }} style={s.photo} />

              <View style={s.info}>
                <View style={s.infoInner}>
                  <Text style={s.name}>{m!.name}</Text>
                  {m!.traits.map((t, j) => (
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
                <Pressable style={[s.btn, { borderColor: "#86EFAC" }]}>
                  <Check size={32} color="#6EE08F" strokeWidth={1.75} />
                </Pressable>
                <Pressable style={[s.btn, { borderColor: "#D32F2F" }]} onPress={() => removePet("matches", m!.id)}>
                  <X size={30} color="#D32F2F" strokeWidth={1.75} />
                </Pressable>
              </View>
            </LinearGradient>
          ))}
        </ScrollView>

        <Pressable style={s.clear} onPress={() => clearList("matches")}>
          <Text style={s.clearText}>Clear All Matches</Text>
        </Pressable>

        <View style={s.navBarBackground}>
          <SafeAreaView style={s.navBar} edges={["bottom"]}>
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const isActive = href === CURRENT_HREF;
              return (
                <TouchableOpacity
                  key={href}
                  accessibilityLabel={label}
                  style={[s.navItem, isActive && s.navItemActive]}
                  onPress={() => router.navigate(href)}
                >
                  <Icon size={32} color="white" strokeWidth={isActive ? 2.25 : 1.75} />
                </TouchableOpacity>
              );
            })}
          </SafeAreaView>
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
});