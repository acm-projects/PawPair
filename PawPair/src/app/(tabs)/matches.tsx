import { useState } from "react";
import { Text, View, StyleSheet, Image, ScrollView, Pressable, TouchableOpacity } from "react-native";
import { User, House, Dog, Camera as CameraIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Tabs, router } from "expo-router";
import { useFonts } from "expo-font";

const paw = require("../../../assets/images/paw-watermark.png");
const kidsIcon = require("../../../assets/images/children-icon.png");
const outdoorsIcon = require("../../../assets/images/outdoors-icon.png");

const CURRENT_HREF: string = "/matches";

const paws = [
  { top: 20, left: 16 },
  { top: 20, right: 16 },
  { top: "33%", left: "53%" },
  { top: "48%", left: "17%" },
  { top: "50%", left: "70%" },
  { top: "68%", left: "25%" },
  { top: "76%", left: "75%" },
] as const;

const initialMatches = [
  {
    id: "buddy",
    name: "Buddy",
    photo: "https://i.pinimg.com/736x/65/cb/b0/65cbb0e43c50b5486da05e02e5c53172.jpg",
    traits: [
      { icon: kidsIcon, text: "Great with kids", size: 18 },
      { icon: outdoorsIcon, text: "Loves the outdoors", size: 28 },
    ],
  },
];

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

  const [matches, setMatches] = useState(initialMatches);

  if (!fontsLoaded) return null;

  const removeMatch = (id: string) => {
    setMatches((current) => current.filter((m) => m.id !== id));
  };

  const clearAll = () => {
    setMatches([]);
  };

  return (
    <View style={s.outer}>
      {/* Hide the router header and the shared tab bar on this screen only */}
      <Tabs.Screen options={{ headerShown: false, tabBarStyle: { display: "none" } }} />

      <SafeAreaView style={s.container} edges={["top"]}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {paws.map((p, i) => (
            <Image key={i} source={paw} style={[s.paw, p]} />
          ))}
        </View>

        <Text style={s.heading}>MATCHES</Text>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 16 }}>
          {matches.map((m) => (
            <LinearGradient
              key={m.id}
              colors={["#F5B8C4", "#F6C9B0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.match}
            >
              <Image source={{ uri: m.photo }} style={s.photo} />

              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.name}>{m.name}</Text>
                {m.traits.map((t, j) => (
                  <View key={j} style={s.trait}>
                    <View style={s.iconBox}>
                      <Image source={t.icon} style={{ width: t.size, height: t.size }} />
                    </View>
                    <Text style={s.small}>{t.text}</Text>
                  </View>
                ))}
              </View>

              <View style={s.actionCol}>
                <Pressable style={[s.btn, { borderColor: "#86EFAC" }]}>
                  <Text style={[s.symbol, { color: "#4ADE80" }]}>✓</Text>
                </Pressable>
                <Pressable style={[s.btn, { borderColor: "#D32F2F" }]} onPress={() => removeMatch(m.id)}>
                  <Text style={[s.symbol, { color: "#D32F2F" }]}>✕</Text>
                </Pressable>
              </View>
            </LinearGradient>
          ))}
        </ScrollView>

        <Pressable style={s.clear} onPress={clearAll}>
          <Text style={s.clearText}>Clear All Matches</Text>
        </Pressable>

        {/* Nav bar from the camera page */}
        <LinearGradient colors={["#F2ACB4", "#E47B86"]} style={s.navBarBackground}>
          <SafeAreaView style={s.navBar} edges={["bottom"]}>
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const isActive = href === CURRENT_HREF;
              return (
                <TouchableOpacity key={href} style={s.navItem} onPress={() => router.navigate(href)}>
                  <Icon size={30} color="white" strokeWidth={isActive ? 2.25 : 1.75} />
                  <Text style={[s.navLabel, isActive && s.navLabelActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </SafeAreaView>
        </LinearGradient>
      </SafeAreaView>
    </View>
  );
}

const NAV_RADIUS = 24;

const s = StyleSheet.create({
  outer: { flex: 1, backgroundColor: "#6b6b6b", alignItems: "center" },
  container: { flex: 1, width: "100%", maxWidth: 380, backgroundColor: "#F3EDE8", overflow: "hidden" },
  paw: { position: "absolute", width: 52, height: 52, resizeMode: "contain" },
  heading: {
    fontFamily: "HeadingFont",
    fontSize: 36,
    textAlign: "center",
    marginTop: 24,
    marginBottom: 14,
  },
  match: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 14, marginBottom: 10 },
  photo: { width: 80, height: 80, borderRadius: 16 },
  name: { fontFamily: "NameFont", fontSize: 26, marginBottom: 2, marginLeft: 20 },
  trait: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  iconBox: { width: 30, height: 30, marginRight: 4, alignItems: "center", justifyContent: "center" },

  small: { fontSize: 14, fontWeight: "400", color: "#000" },

  actionCol: { gap: 6, marginRight: 10 },

  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  symbol: { fontSize: 18, fontWeight: "400" },
  clear: { alignSelf: "center", paddingTop: 6, paddingBottom: 10 },
  clearText: { fontSize: 11, color: "#8B1A1A", textDecorationLine: "underline" },

  navBarBackground: {
    borderTopLeftRadius: NAV_RADIUS,
    borderTopRightRadius: NAV_RADIUS,
    overflow: "hidden",
  },
  navBar: { flexDirection: "row", paddingTop: 12, paddingBottom: 4 },
  navItem: { flex: 1, alignItems: "center", gap: 2, paddingBottom: 4 },
  navLabel: { color: "transparent", fontSize: 4 },
  navLabelActive: { fontWeight: "bold" },
});