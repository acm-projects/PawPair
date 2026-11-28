import { Text, View, StyleSheet, Image, ScrollView, Pressable, Platform } from "react-native";
import { Check, X, PawPrint, Cake, Ruler, ChevronLeft, ChevronDown, ChevronUp, Heart } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Tabs, router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { getAuth } from "firebase/auth";

import { app } from "../../firebase.js";
import { removeFavorite } from "../../services/favoriteServices";
import { statusFor, useStatuses, setStage } from "../../data/petStatus";
import { removePet, usePetLists } from "../../store/petLists";
import { useMatchedPets } from "@/data/livePets";
import PawNavBar from "@/components/PawNavBar";

const paw = require("../../../assets/images/paw-watermark.png");

const FONT = Platform.OS === "web" ? "'Open Sans', system-ui, sans-serif" : undefined;

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

const PAW_PEACH = "#F2C4B8";
const PAW_BLUE = "#AFC0E3";

const PEACH_CARD = ["#F4BFB2", "#F8DBD4"] as const;
const BLUE_CARD = ["#B3C1E6", "#D5DCF0"] as const;
const FAV_BLUE = "#7F93CC";
const QUIZ_PEACH = "#E98F78";

const paws = [
  { top: "30%", left: "80%", size: 52, rotate: "14deg" },
  { top: "48%", left: "6%", size: 56, rotate: "-12deg" },
  { top: "64%", left: "74%", size: 50, rotate: "18deg" },
  { top: "80%", left: "12%", size: 54, rotate: "-16deg" },
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
  const [showFavorites, setShowFavorites] = useState(true);
  const statuses = useStatuses();
  const { favorites: favoriteIds } = usePetLists();

  useEffect(() => {
    loadFont();
  }, []);

  // applied pets move to Applications, so they leave this list
  const matches = allMatches.filter((p) => statusFor(statuses, p.id).stage < 1);
  const isFavorite = (id: string | number) =>
    (favoriteIds ?? []).some((f) => String(f) === String(id));
  const quizMatches = matches.filter((p) => !isFavorite(p.id));
  const favorites = matches.filter((p) => isFavorite(p.id));

  // ✕ removes the pet from matches and from the user's saved favorites
  const removeMatch = (id: string | number) => {
    removePet("matches", id as any);
    removePet("favorites", id as any);
    const uid = getAuth(app).currentUser?.uid;
    if (uid) removeFavorite(uid, String(id)).catch((e: any) => console.warn(e));
  };

  const renderCard = (pet: any, colors: readonly [string, string]) => (
    <LinearGradient
      key={String(pet.id)}
      colors={colors}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={s.match}
    >
      <Image source={photoFor(pet)} style={s.photo} />

      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>
          {pet.name}
        </Text>
        {traitsFor(pet).map(({ Icon, text }, j) => (
          <View key={j} style={s.trait}>
            <View style={s.iconBox}>
              <Icon size={16} color="#241e1e" strokeWidth={1.75} />
            </View>
            <Text style={s.small} numberOfLines={1}>
              {text}
            </Text>
          </View>
        ))}
      </View>

      <View style={s.actionCol}>
        {/* ✓ = apply: moves the pet to Applications */}
        <Pressable
          style={[s.btn, { borderColor: "#86EFAC" }]}
          onPress={() => setStage(pet.id, 1)}
        >
          <Check size={22} color="#6EE08F" strokeWidth={2} />
        </Pressable>
        {/* ✕ = remove from matches (and from saved favorites) */}
        <Pressable
          style={[s.btn, { borderColor: "#D32F2F" }]}
          onPress={() => removeMatch(pet.id)}
        >
          <X size={20} color="#D32F2F" strokeWidth={2} />
        </Pressable>
      </View>
    </LinearGradient>
  );

  if (!fontsLoaded) return null;

  return (
    <View style={s.outer}>
      <Tabs.Screen options={{ headerShown: false, tabBarStyle: { display: "none" } }} />

      <SafeAreaView style={s.container} edges={["top"]}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {paws.map((p, i) => (
            <Image
              key={i}
              source={paw}
              style={[
                s.paw,
                {
                  top: p.top,
                  left: p.left,
                  width: p.size,
                  height: p.size,
                  transform: [{ rotate: p.rotate }],
                  tintColor: i % 2 === 1 ? PAW_BLUE : PAW_PEACH,
                },
              ]}
            />
          ))}
        </View>
        <View style={s.headerRow}>
          <Pressable
            style={s.backButton}
            onPress={() => router.navigate("/homepages/PreHomepage" as any)}
          >
            <ChevronLeft size={24} color="#222" strokeWidth={2.5} />
          </Pressable>
          <Text style={s.heading}>MATCHES</Text>
          <View style={s.headerSpacer} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          {matches.length === 0 && (
            <View style={s.emptyBox}>
              <Text style={s.empty}>No matches yet</Text>
            </View>
          )}

          {quizMatches.length > 0 && (
            <>
              <View style={s.sectionHead}>
                <View style={s.sectionRow}>
                  <PawPrint size={18} color={QUIZ_PEACH} fill={QUIZ_PEACH} strokeWidth={2} />
                  <Text style={s.sectionText}>From your quiz</Text>
                </View>
              </View>
              {quizMatches.map((pet) => renderCard(pet, PEACH_CARD))}
            </>
          )}

          {favorites.length > 0 && (
            <>
              <Pressable
                style={[s.sectionHead, s.sectionToggle, quizMatches.length > 0 && s.sectionGap]}
                onPress={() => setShowFavorites((v) => !v)}
              >
                <View style={s.sectionRow}>
                  <Heart size={18} color={FAV_BLUE} fill={FAV_BLUE} strokeWidth={2} />
                  <Text style={s.sectionText}>Favorites</Text>
                  <Text style={s.sectionCount}>({favorites.length})</Text>
                </View>
                {showFavorites ? (
                  <ChevronUp size={22} color="#1a1a1a" />
                ) : (
                  <ChevronDown size={22} color="#1a1a1a" />
                )}
              </Pressable>
              {showFavorites && favorites.map((pet) => renderCard(pet, BLUE_CARD))}
            </>
          )}

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
  outer: { flex: 1, backgroundColor: "#F3EDE8", alignItems: "center" },

  container: { flex: 1, width: "100%", maxWidth: 380, backgroundColor: "#F3EDE8", overflow: "hidden" },
  paw: { position: "absolute", resizeMode: "contain", opacity: 0.2 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginTop: 20,
    marginBottom: 16,
  },
  headerSpacer: { width: 38 },
  heading: {
    flex: 1,
    fontFamily: "HeadingFont",
    fontSize: 38,
    color: "#1a1a1a",
    textAlign: "center",
  },
  emptyBox: { alignItems: "center", marginTop: 40, gap: 14 },
  empty: { fontFamily: FONT, textAlign: "center", fontSize: 14, color: "#555" },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionToggle: { paddingVertical: 2 },
  sectionGap: { marginTop: 6 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionText: { fontFamily: FONT, fontSize: 15, fontWeight: "600", color: "#241e1e" },
  sectionCount: { fontFamily: FONT, fontSize: 13, fontWeight: "600", color: "#6b5d58" },

  match: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  photo: { width: 100, height: 100, borderRadius: 20 },
  info: { flex: 1, marginLeft: 14, justifyContent: "center" },
  name: {
    fontSize: 22,
    lineHeight: 28,
    color: "#000000",
    fontWeight: "700",
    marginBottom: 4,
  },
  trait: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  iconBox: { width: 22, height: 22, marginRight: 6, alignItems: "center", justifyContent: "center" },
  small: { fontFamily: FONT, fontSize: 13, fontWeight: "400", color: "#241e1e" },

  actionCol: { gap: 8, marginRight: 2, marginLeft: 6 },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
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