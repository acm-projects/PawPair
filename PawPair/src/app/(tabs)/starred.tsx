import { useFonts } from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs, router } from "expo-router";
import { Camera as CameraIcon, Check, Dog, House, User, X } from "lucide-react-native";
import { Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getPet } from "../../data/pets";
import { clearList, removePet, usePetLists } from "../../store/petLists";

const paw = require("../../../assets/images/paw-watermark.png");

const CURRENT_HREF: string = "/homepage";

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

export default function Starred() {
  const [fontsLoaded] = useFonts({
    HeadingFont: require("../../../assets/Fonts/Matcha Style.ttf"),
    NameFont: require("../../../assets/Fonts/NameFont.otf"),
  });

  const { starred: starredIds } = usePetLists();
  const starred = starredIds.map(getPet).filter((p) => !!p);

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

        <Text style={s.heading}>STARRED</Text>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 16 }}>
          {starred.length === 0 && <Text style={s.empty}>Nothing starred yet.</Text>}

          {starred.map((m) => (
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
                <Pressable style={[s.btn, { borderColor: "#D32F2F" }]} onPress={() => removePet("starred", m!.id)}>
                  <X size={30} color="#D32F2F" strokeWidth={1.75} />
                </Pressable>
              </View>
            </LinearGradient>
          ))}
        </ScrollView>

        <Pressable style={s.clear} onPress={() => clearList("starred")}>
          <Text style={s.clearText}>Clear All Starred</Text>
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
  empty: { textAlign: "center", fontSize: 14, color: "#555", marginTop: 24 },

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
    marginBottom: 2,
    transform: [{ translateY: -2 }],
  },
  trait: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  iconBox: { width: 22, height: 22, marginRight: 6, alignItems: "center", justifyContent: "center" },
  small: { fontSize: 14, fontWeight: "400", color: "#000" },

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
  clearText: { fontSize: 11, color: "#8B1A1A", textDecorationLine: "underline" },

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