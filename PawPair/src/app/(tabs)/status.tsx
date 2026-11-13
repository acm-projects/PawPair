import { useLayoutEffect, useState } from "react";
import { Text, View, StyleSheet, Image, Pressable, ScrollView } from "react-native";
import { Check, ChevronDown, ChevronLeft, ChevronUp } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useNavigation } from "expo-router";
import { useFonts } from "expo-font";
import { getPet } from "../../data/pets";
import { usePetLists } from "../../store/petLists";
import { STAGES, setStage, statusFor, useStatuses } from "../../data/petStatus";
import PawNavBar from "@/components/PawNavBar";

const paw = require("../../../assets/images/paw-watermark.png");

type Pet = NonNullable<ReturnType<typeof getPet>>;

const paws = [
  { top: 0, left: "75%" },
  { top: "45%", left: "8%" },
  { top: "78%", left: "73%" },
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

  const { matches: matchIds } = usePetLists();
  const pets = matchIds.map(getPet).filter((p): p is Pet => !!p);
  const statuses = useStatuses();

const [openId, setOpenId] = useState<string | number | null>(null);
  if (!fontsLoaded) return null;

  return (
    <View style={s.outer}>
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

        <Text style={s.heading}>applications</Text>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          {pets.length === 0 && (
            <View style={s.emptyBox}>
              <Text style={s.empty}>No matches yet</Text>
              <Pressable style={s.emptyBtn} onPress={() => router.navigate("/swiping" as any)}>
                <Text style={s.emptyBtnText}>Swipe Now</Text>
              </Pressable>
            </View>
          )}

          {pets.map((pet) => {
            const status = statusFor(statuses, pet.id);
            const open = openId === pet.id;
            return (
              <LinearGradient
                key={pet.id}
                colors={["#F4BFB2", "#F3E6DF"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={s.card}
              >
                <Pressable
                  style={s.cardHeader}
                  onPress={() => setOpenId(open ? null : pet.id)}
                >
                  <Image source={{ uri: pet.image }} style={s.photo} />
                  <View style={s.headerText}>
                    <Text style={s.name}>{pet.name}</Text>
                    <View style={s.pill}>
                      <Text style={s.pillText}>{STAGES[status.stage]}</Text>
                    </View>
                    <Text style={s.progress}>
                      Step {status.stage + 1} of {STAGES.length}
                    </Text>
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
                              style={[s.dot, done && s.dotDone, current && s.dotCurrent]}
                            >
                              {done && <Check size={11} color="#fff" strokeWidth={3} />}
                            </View>
                            {i < STAGES.length - 1 && (
                              <View style={[s.line, i < status.stage && s.lineDone]} />
                            )}
                          </View>
                          <View style={s.rowText}>
                            <Text style={[s.stage, !done && s.stageTodo]}>{label}</Text>
                            {date && <Text style={s.date}>{date}</Text>}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </LinearGradient>
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
  outer: { flex: 1, backgroundColor: "#6b6b6b", alignItems: "center" },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#F3EDE8",
    overflow: "hidden",
  },
  paw: { position: "absolute", width: 52, height: 52, resizeMode: "contain" },
  heading: {
    fontFamily: "HeadingFont",
    fontSize: 36,
    textAlign: "center",
    marginTop: 24,
    marginBottom: 14,
    letterSpacing:1,
  },

  card: { borderRadius: 20, marginBottom: 12, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", padding: 10, gap: 12 },
  photo: { width: 84, height: 84, borderRadius: 18 },
  headerText: { flex: 1, gap: 4 },
  name: { fontFamily: "NameFont", fontSize: 30, lineHeight: 34, color: "#000" },
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
  dotDone: { backgroundColor: "#E98F78" },
  dotCurrent: { borderWidth: 3, borderColor: "#fff" },
  line: { flex: 1, width: 2, backgroundColor: "#e3d6ce", marginTop: 2 },
  lineDone: { backgroundColor: "#E98F78" },
  rowText: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    minHeight: 40,
  },
  stage: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  stageTodo: { color: "#8a7d77", fontWeight: "600" },
  date: { fontSize: 12, color: "#6b5d58" },

  emptyBox: { alignItems: "center", marginTop: 40, gap: 14 },
  empty: { textAlign: "center", fontSize: 14, color: "#555" },
  emptyBtn: {
    backgroundColor: "#E98F78",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  emptyBtnText: { color: "#fff", fontWeight: "500" },

  navWrapper: { position: "absolute", bottom: 0, left: 0, right: 0 },
  backButton: {
    position: "absolute",
    top: 23,
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