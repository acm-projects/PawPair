import { Text, View, StyleSheet, Image, ScrollView, Pressable } from "react-native";
import { Check, X, PawPrint, Cake, Ruler, ChevronLeft } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Tabs, router, type Href } from "expo-router";
import { useEffect } from "react";
import { useFonts } from "expo-font";

import { statusFor, useStatuses, setStage } from "../../data/petStatus";
import { removePet } from "../../store/petLists";
import { useMatchedPets } from "@/data/livePets";
import PawNavBar from "@/components/PawNavBar";

const paw = require("../../../assets/images/paw-watermark.png");

const FONT = "'Open Sans', system-ui, sans-serif";

const PLACEHOLDERS: Record<string, number> = {
  dog: require("../../../assets/images/dog.jpg"),
  cat: require("../../../assets/images/cat.jpg"),
  bird: require("../../../assets/images/bird.jpg"),
  small_animal: require("../../../assets/images/small_animal.jpg"),
};
const DEFAULT_PHOTO = require("../../../assets/images/pet-duo.png");

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

const cap = (s?: string) => (s ? s[0].toUpperCase() + s.slice(1) : "");
const speciesKey = (s?: string) => (s ?? "").toLowerCase().trim().replace(/\s+/g, "_");

function photoFor(pet: any) {
  const url = pet.photoUrl ?? pet.image;
  if (url) return { uri: url };
  return PLACEHOLDERS[speciesKey(pet.species)] ?? DEFAULT_PHOTO;
}

// Builds the small icon rows on each card from the pet's fields
function traitsFor(pet: any) {
  const traits: { Icon: typeof PawPrint; text: string }[] = [];
  if (pet.breed) traits.push({ Icon: PawPrint, text: pet.breed });
  if (pet.age != null && pet.age !== "") {
    // livePets already turns numeric ages into "2 years"
    const text = typeof pet.age === "number" ? `${pet.age} ${pet.age === 1 ? "year" : "years"}` : String(pet.age);
    traits.push({ Icon: Cake, text });
  }
  if (pet.size) traits.push({ Icon: Ruler, text: cap(pet.size) });
  return traits;
}

export default function Matches() {
  const [fontsLoaded] = useFonts({
    HeadingFont: require("../../../assets/Fonts/Matcha Style.ttf"),
    NameFont: require("../../../assets/Fonts/NameFont.otf"),
  });

  const allMatches = useMatchedPets();
  const statuses = useStatuses();

  useEffect(() => {
    loadFont();
  }, []);

  // applied pets move to Applications, so they leave this list
  const matches = allMatches.filter((p) => statusFor(statuses, p.id).stage < 1);

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

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 110 }}>
          {matches.length === 0 && (
            <Text style={s.empty}>No matches yet. Keep on swiping!</Text>
          )}

          {matches.map((pet) => (
            <LinearGradient
              key={String(pet.id)}
              colors={["#F4BFB2", "#F8DBD4"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={s.match}
            >
              <Image source={photoFor(pet)} style={s.photo} />

              <View style={s.info}>
                <View style={s.infoInner}>
                  <Text style={s.name}>{pet.name}</Text>
                  {traitsFor(pet).map(({ Icon, text }, j) => (
                    <View key={j} style={s.trait}>
                      <View style={s.iconBox}>
                        <Icon size={16} color="#241e1e" strokeWidth={1.75} />
                      </View>
                      <Text style={s.small}>{text}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={s.actionCol}>
                {/* ✓ = apply: moves the pet to Applications */}
                <Pressable
                  style={[s.btn, { borderColor: "#86EFAC" }]}
                  onPress={() => setStage(pet.id, 1)}
                >
                  <Check size={32} color="#6EE08F" strokeWidth={1.75} />
                </Pressable>
                {/* ✕ = remove from matches */}
                <Pressable
                  style={[s.btn, { borderColor: "#D32F2F" }]}
                  onPress={() => removePet("matches", pet.id as any)}
                >
                  <X size={30} color="#D32F2F" strokeWidth={1.75} />
                </Pressable>
              </View>
            </LinearGradient>
          ))}

          <Pressable style={s.clear} onPress={() => router.push("/quiz" as Href)}>
            <Text style={s.clearText}>Edit my quiz answers</Text>
          </Pressable>
        </ScrollView>

        <View style={s.navWrapper}>
          <PawNavBar active="/homepage" />
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1, backgroundColor: "#6b6b6b", alignItems: "center" },
  container: { flex: 1, width: "100%", maxWidth: 380, backgroundColor: "#F3EDE8", overflow: "hidden" },
  paw: { position: "absolute", width: 52, height: 52, resizeMode: "contain", opacity: 0.8 },
  heading: {
    fontFamily: "HeadingFont",
    fontSize: 40,
    color: "#1a1a1a",
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
    minHeight: 150,
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
    color: "#1a1a1a",
    alignSelf: "center",
    textAlign: "center",
    marginBottom: -7,
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