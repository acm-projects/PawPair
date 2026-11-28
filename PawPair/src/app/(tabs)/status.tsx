import { useLayoutEffect, useState } from "react";
import { Text, View, StyleSheet, Image, Pressable, ScrollView } from "react-native";
import { Check, ChevronDown, ChevronLeft, ChevronUp } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useNavigation } from "expo-router";
import { useFonts } from "expo-font";
import { STAGES, setStage, statusFor, useStatuses } from "../../data/petStatus";
import { useMatchedPets } from "@/data/livePets";
import { usePetLists } from "../../store/petLists";
import PawNavBar from "@/components/PawNavBar";

const paw = require("../../../assets/images/paw-watermark.png");

const PLACEHOLDERS: Record<string, number> = {
  dog: require("../../../assets/images/dog.jpg"),
  cat: require("../../../assets/images/cat.jpg"),
  bird: require("../../../assets/images/bird.jpg"),
  small_animal: require("../../../assets/images/small_animal.jpg"),
};
const DEFAULT_PHOTO = require("../../../assets/images/pet-duo.png");

const speciesKey = (s?: string) => (s ?? "").toLowerCase().trim().replace(/\s+/g, "_");

function photoFor(pet: any) {
  const url = pet.photoUrl ?? pet.image;
  if (url) return { uri: url };
  return PLACEHOLDERS[speciesKey(pet.species)] ?? DEFAULT_PHOTO;
}

const PAW_PEACH = "#F2C4B8";
const PAW_BLUE = "#AFC0E3";

const THEMES = [
  { colors: ["#F4BFB2", "#F3E6DF"] as const, accent: "#E98F78", track: "#e3d6ce" },
  { colors: ["#B3C1E6", "#D5DCF0"] as const, accent: "#7F93CC", track: "#d6dcec" },
];

const paws = [
  { top: "30%", left: "80%", size: 52, rotate: "14deg" },
  { top: "48%", left: "6%", size: 56, rotate: "-12deg" },
  { top: "64%", left: "74%", size: 50, rotate: "18deg" },
  { top: "80%", left: "12%", size: 54, rotate: "-16deg" },
] as const;

export default function Status() {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      tabBarStyle: { display: "none" },
    });
  }, [navigation]);

  const [fontsLoaded] = useFonts({
    HeadingFont: require("../../../assets/Fonts/Matcha Style.ttf"),
    NameFont: require("../../../assets/Fonts/NameFont.otf"),
  });

  const statuses = useStatuses();
  const allMatches = useMatchedPets();
  const { favorites: favoriteIds } = usePetLists();
  // only pets that have been applied to (stage 1+); the rest live on Matches
  const pets = allMatches.filter((p) => statusFor(statuses, p.id).stage >= 1);

  const [openIds, setOpenIds] = useState<string[]>([]);
  const toggleOpen = (id: string | number) => {
    const key = String(id);
    setOpenIds((prev) =>
      (prev ?? []).includes(key)
        ? (prev ?? []).filter((x) => x !== key)
        : [...(prev ?? []), key]
    );
  };
  if (!fontsLoaded) return null;

  return (
    <View style={s.outer}>
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
          <Text style={s.heading}>applications</Text>
          <View style={s.headerSpacer} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          {pets.length === 0 && (
            <View style={s.emptyBox}>
              <Text style={s.empty}>No applications yet</Text>
              <Pressable style={s.emptyBtn} onPress={() => router.navigate("/matches" as any)}>
                <Text style={s.emptyBtnText}>Go to Matches</Text>
              </Pressable>
            </View>
          )}

          {pets.map((pet) => {
            const status = statusFor(statuses, pet.id);
            const open = (openIds ?? []).includes(String(pet.id));
            const isFavorite = (favoriteIds ?? []).some((f) => String(f) === String(pet.id));
            const theme = isFavorite ? THEMES[1] : THEMES[0];
            return (
              <View key={String(pet.id)} style={s.cardShadow}>
                <LinearGradient
                  colors={theme.colors}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={s.card}
                >
                  <Pressable
                    style={s.cardHeader}
                    onPress={() => toggleOpen(pet.id)}
                  >
                    <Image source={photoFor(pet)} style={s.photo} />
                    <View style={s.headerText}>
                      <Text style={s.name}>{pet.name}</Text>
                      <View style={s.pill}>
                        <Text style={[s.pillText, { color: theme.accent }]}>{STAGES[status.stage]}</Text>
                      </View>
                      {status.stage < STAGES.length - 1 && (
                        <Text style={s.progress}>
                          Step {status.stage + 1} of {STAGES.length}
                        </Text>
                      )}
                    </View>
                    {open ? (
                      <ChevronUp size={26} color="#1a1a1a" />
                    ) : (
                      <ChevronDown size={26} color="#1a1a1a" />
                    )}
                  </Pressable>

                  {open && (
                    <View style={s.timeline}>
                      <Text style={s.hint}>Tap a step to update {pet.name}'s status</Text>
                      {STAGES.map((label, i) => {
                        const done = i <= status.stage;
                        const current = i === status.stage;
                        const date = status.dates[i];
                        return (
                          <Pressable
                            key={label}
                            style={s.row}
                            onPress={() => setStage(pet.id, i)}
                          >
                            <View style={s.rail}>
                              <View
                                style={[
                                  s.dot,
                                  { backgroundColor: theme.track },
                                  done && { backgroundColor: theme.accent },
                                  current && s.dotCurrent,
                                ]}
                              >
                                {done && <Check size={11} color="#fff" strokeWidth={3} />}
                              </View>
                              {i < STAGES.length - 1 && (
                                <View
                                  style={[
                                    s.line,
                                    { backgroundColor: i < status.stage ? theme.accent : theme.track },
                                  ]}
                                />
                              )}
                            </View>
                            <View style={s.rowText}>
                              <Text style={[s.stage, current && s.stageCurrent, !done && s.stageTodo]}>
                                {label}
                              </Text>
                              {date && <Text style={s.date}>{date}</Text>}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </LinearGradient>
              </View>
            );
          })}
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
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#F3EDE8",
    overflow: "hidden",
  },
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
    fontSize: 34,
    textAlign: "center",
    letterSpacing: 1,
  },

  cardShadow: {
    borderRadius: 20,
    marginBottom: 16,
    backgroundColor: "#F3EDE8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  card: { borderRadius: 20, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", padding: 10, gap: 12 },
  photo: { width: 84, height: 84, borderRadius: 18 },
  headerText: { flex: 1, gap: 4 },
  name: { fontWeight: "700", fontSize: 22, lineHeight: 34, color: "#000" },
  pill: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  pillText: { fontSize: 12, fontWeight: "700", color: "#E98F78" },
  progress: { fontSize: 12, color: "#4a3f3b" },

  timeline: { paddingHorizontal: 16, paddingBottom: 14 },
  hint: { fontSize: 12, color: "#6b5d58", marginBottom: 8 },
  row: { flexDirection: "row", gap: 12 },
  rail: { alignItems: "center", width: 20 },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#e3d6ce",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  dotCurrent: { borderWidth: 3, borderColor: "#fff" },
  line: { flex: 1, width: 2, backgroundColor: "#e3d6ce", marginTop: 2 },
  rowText: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    minHeight: 40,
  },
  stage: { fontSize: 15, fontWeight: "500", color: "#1a1a1a" },
  stageCurrent: { fontWeight: "700" },
  stageTodo: { color: "#8a7d77", fontWeight: "500" },
  date: { fontSize: 12, color: "#6b5d58" },

  emptyBox: { alignItems: "center", marginTop: 40, gap: 14 },
  empty: { textAlign: "center", fontSize: 14, color: "#555" },
  emptyBtn: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 22,
    borderWidth: 1.5,
    borderColor: "#F4BFB2",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBtnText: { fontSize: 14, fontWeight: "600", color: "#f2b3a3" },

  navWrapper: { position: "absolute", bottom: 0, left: 0, right: 0 },
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