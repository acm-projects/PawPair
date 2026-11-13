import { useState, useEffect, useCallback } from "react";
import { Text, View, StyleSheet, Image, ScrollView, Pressable, TouchableOpacity, ActivityIndicator } from "react-native";
import { User, House, Dog, Camera as CameraIcon, Check, X, PawPrint, Cake, Ruler, ChevronLeft } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Tabs, router, useFocusEffect, type Href } from "expo-router";
import { getAuth } from "firebase/auth";

// backend imports
import { app } from "../../firebase.js";
import { getQuizAnswers } from "../../services/quizService";
import { getAnimals } from "../../services/animalServices";
import { matchPets } from "../../services/matchingService";

const paw = require("../../../assets/images/paw-watermark.png");
import PawNavBar from "@/components/PawNavBar";

const CURRENT_HREF: string = "/homepage";
const FONT = "'Open Sans', system-ui, sans-serif";
const GREEN = "#6EE08F";
const TOP_MATCHES = 5;
const MIN_MATCH = 85;

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

const NAV_ITEMS = [
  { href: "/profile", label: "Profile", Icon: User },
  { href: "/homepage", label: "Homepage", Icon: House },
  { href: "/scrollview", label: "Scrollview", Icon: Dog },
  { href: "/camera", label: "Camera", Icon: CameraIcon },
] as const;

const cap = (s?: string) => (s ? s[0].toUpperCase() + s.slice(1) : "");
const speciesKey = (s?: string) => (s ?? "").toLowerCase().trim().replace(/\s+/g, "_");

function photoFor(pet: any) {
  if (pet.photoUrl) return { uri: pet.photoUrl };
  return PLACEHOLDERS[speciesKey(pet.species)] ?? DEFAULT_PHOTO;
}

// Builds the small icon rows on each card from the pet's Firestore fields
function traitsFor(pet: any) {
  const traits: { Icon: typeof PawPrint; text: string }[] = [];
  if (pet.breed) traits.push({ Icon: PawPrint, text: pet.breed });
  if (pet.age != null) traits.push({ Icon: Cake, text: `${pet.age} ${pet.age === 1 ? "year" : "years"}` });
  if (pet.size) traits.push({ Icon: Ruler, text: cap(pet.size) });
  return traits;
}

export default function Matches() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState<string[]>([]);

  useEffect(() => {
    loadFont();
  }, []);

  // Recalculates matches every time this screen opens
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadMatches() {
        setLoading(true);
        setError("");
        try {
          const auth = getAuth(app);
          await auth.authStateReady();
          const uid = auth.currentUser?.uid;
          if (!uid) throw new Error("Please log in to see your matches.");

          const [answers, pets] = await Promise.all([getQuizAnswers(uid), getAnimals()]);
          if (!answers) throw new Error("Finish the quiz to see your matches.");

          const res = matchPets(pets, answers, pets.length);
          const strong = res.matches
            .filter((m: any) => m.score != null && m.score >= MIN_MATCH)
            .slice(0, TOP_MATCHES);
          if (active) setResult({ ...res, matches: strong });
        } catch (e: any) {
          if (active) setError(e.message ?? "Unable to calculate matches.");
        } finally {
          if (active) setLoading(false);
        }
      }

      loadMatches();
      return () => {
        active = false;
      };
    }, [])
  );

  const openPet = (id: string) =>
    router.push({ pathname: "/pets/[id]", params: { id } } as Href);

  const visible = (result?.matches ?? []).filter((m: any) => !hidden.includes(m.pet.id));

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

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#D66E5A" />
            <Text style={s.empty}>Finding your matches...</Text>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 110 }}>
            {!!error && <Text style={s.warning}>{error}</Text>}

            {!error && visible.length === 0 && (
              <Text style={s.empty}>No pets are an {MIN_MATCH}%+ match yet. Try updating your quiz answers!</Text>
            )}

            {visible.map((item: any) => {
              const pet = item.pet;
              return (
                <Pressable key={pet.id} onPress={() => openPet(pet.id)}>
                  <LinearGradient
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
                        <Text style={s.score}>
                          {item.score == null ? "Not enough info yet" : `${item.score}% match`}
                        </Text>
                        {item.reasons?.length > 0 && (
                          <Text style={s.reasons} numberOfLines={2}>
                            {item.reasons.join(" · ")}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={s.actionCol}>
                      <Pressable style={[s.btn, { borderColor: "#86EFAC" }]} onPress={() => openPet(pet.id)}>
                        <Check size={32} color="#6EE08F" strokeWidth={1.75} />
                      </Pressable>
                      <Pressable
                        style={[s.btn, { borderColor: "#D32F2F" }]}
                        onPress={() => setHidden((h) => [...h, pet.id])}
                      >
                        <X size={30} color="#D32F2F" strokeWidth={1.75} />
                      </Pressable>
                    </View>
                  </LinearGradient>
                </Pressable>
              );
            })}

            <Pressable style={s.clear} onPress={() => router.push("/quiz" as Href)}>
              <Text style={s.clearText}>Edit my quiz answers</Text>
            </Pressable>
          </ScrollView>
        )}

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
    fontSize: 26,
    fontWeight: "bold",
    color: "#1a1a1a",
    textAlign: "center",
    marginTop: 24,
    marginBottom: 14,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  empty: { fontFamily: FONT, textAlign: "center", fontSize: 14, color: "#555", marginTop: 24 },
  warning: { fontFamily: FONT, fontSize: 13, color: "#8B1A1A", textAlign: "center", marginVertical: 10 },

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
    fontSize: 26,
    fontWeight: "bold",
    color: "#1a1a1a",
    alignSelf: "center",
    textAlign: "center",
    marginBottom: 2,
  },
  trait: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  iconBox: { width: 22, height: 22, marginRight: 6, alignItems: "center", justifyContent: "center" },
  small: { fontFamily: FONT, fontSize: 13, fontWeight: "400", color: "#241e1e" },
  score: { fontFamily: FONT, fontSize: 13, fontWeight: "600", color: "#B23A48", marginTop: 8 },
  reasons: { fontFamily: FONT, fontSize: 10, color: "#6b4b45", marginTop: 2, maxWidth: 150 },

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