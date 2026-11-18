import { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Image,
  Animated,
  Easing,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRouter, type Href } from "expo-router";
import { getAuth } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { app, db } from "../../firebase.js";
import { getAnimals } from "../../services/animalServices.js";
import { getVisibleQuestions } from "../../services/quizQuestions.js";
import { getQuizAnswers, saveQuizAnswers } from "../../services/quizService.js";
import { deriveZipFromDevice } from "../../services/locationService.js";
import { weightFor } from "../../services/quizWeights.js";
import { matchPets } from "../../services/matchingService.js";
import { refreshQuizAnswers } from "../../data/livePets";

const pawWatermark = require("../../../assets/images/paw-watermark.png");

const ROUTES = {
  swipe: "/swiping",
} as const;

const LEAVE_MS = 350;
const SKIP_H = 44; // height of the Skip Quiz bar
let enterPlayed = false;

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

type Answers = Record<string, any>;

type Question = {
  id: string;
  questionNum: number;
  question: string;
  options: string[];
  type?: "breeds" | "multi" | "restrictions" | "location";
  exclusive?: string;
  note?: string;
};

type QuizProps = {
  onFinish?: (answers: string[]) => void;
};

// Convert questions from quizQuestions.js
function toScreenQuestion(q: any): Question {
  return {
    id: q.id,
    questionNum: Number(q.id.slice(1)),
    question: q.title,
    options: q.options ?? [],
    type: q.type,
    exclusive: q.exclusive,
    note: q.note,
  };
}

// Validate answers before moving to the next question
function validate(question: Question, answers: Answers): string {
  const value = answers[question.id];

  if (question.type === "breeds") {
    if (!value?.mode) return "Choose a preferred breed or No preference.";
    if (value.mode !== "none" && !(value.breeds?.length || value.other?.trim())) {
      return "Choose or enter at least one breed.";
    }
    return "";
  }

  if (question.type === "multi") {
    return Array.isArray(value) && value.length > 0 ? "" : "Select at least one option.";
  }

  if (question.type === "restrictions") {
    if (!value?.choice) return "Select an option.";
    if (value.choice === "Size or weight limits" && !(Number(value.maxWeightLbs) > 0)) {
      return "Enter the maximum allowed weight (lb).";
    }
    if (value.choice === "Certain breeds or species" && !value.disallowedText?.trim()) {
      return "Enter prohibited breeds or species.";
    }
    return "";
  }

  if (question.type === "location") {
    return value?.choice && /^\d{5}$/.test(value.zip || "")
      ? ""
      : "Select a location option and provide a 5-digit ZIP code.";
  }

  return value ? "" : "Select an answer.";
}

// Convert complex answers to strings for onFinish
function displayAnswer(answer: any): string {
  if (Array.isArray(answer)) return answer.join(", ");
  if (typeof answer === "string") return answer;
  if (answer?.mode === "none") return "No preference";
  if (answer?.mode) return [...(answer.breeds ?? []), answer.other].filter(Boolean).join(", ");
  if (answer?.choice) return `${answer.choice}${answer.zip ? ` (${answer.zip})` : ""}`;
  return "";
}

// Original PawPair styling constants
const PINK = "#F5C0B3";
const CORAL = "#E98F78";
const CREAM = "#F5EFEB";
// Open Sans on web; system font on the phone
const FONT = Platform.OS === "web" ? "'Open Sans', system-ui, sans-serif" : undefined;

// Paw watermark
function Paw({ style }: { style?: ViewStyle }) {
  return (
    <Image
      source={pawWatermark}
      style={[s.paw, style as any]}
      resizeMode="contain"
      pointerEvents="none"
    />
  );
}

export default function Quiz({ onFinish = () => {} }: QuizProps) {
  const router = useRouter();

  // Quiz navigation and answers
  const [index, setIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Answers>({});

  // Firebase animal information
  const [availablePets, setAvailablePets] = useState<any[]>([]);
  const [petsLoaded, setPetsLoaded] = useState(false);

  // Loading and error states
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  // Animation states
  const [leaving, setLeaving] = useState(false);
  const [playEnter] = useState(() => !enterPlayed);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Screen enter/leave animation (opacity + slide)
  const screenAnim = useRef(new Animated.Value(playEnter ? 0 : 1)).current;
  // Question-to-question slide
  const questionAnim = useRef(new Animated.Value(1)).current;

  // Load font and play enter animation
  useEffect(() => {
    loadFont();
    enterPlayed = true;
    if (playEnter) {
      Animated.timing(screenAnim, {
        toValue: 1,
        duration: LEAVE_MS,
        easing: Easing.bezier(0.2, 0.8, 0.2, 1),
        useNativeDriver: true,
      }).start();
    }
    return () => clearTimeout(timer.current);
  }, []);

  // Slide each new question in (not the first one)
  useEffect(() => {
    if (index === 0) return;
    questionAnim.setValue(0);
    Animated.timing(questionAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [index]);

  // STEP 1: Load Firestore animals and saved quiz answers
  useEffect(() => {
    let active = true;

    async function initializeQuiz() {
      try {
        const auth = getAuth(app);
        await auth.authStateReady();
        const user = auth.currentUser;

        const [petsResult, savedResult] = await Promise.allSettled([
          getAnimals(),
          user ? getQuizAnswers(user.uid) : Promise.resolve(null),
        ]);

        if (!active) return;

        if (petsResult.status === "fulfilled") {
          setAvailablePets(petsResult.value);
          setPetsLoaded(true);
        } else {
          console.error("Couldn't load animals:", petsResult.reason);
          setError("Couldn't load available breeds. You can still answer the quiz.");
        }

        if (savedResult.status === "fulfilled") {
          if (savedResult.value) setQuizAnswers(savedResult.value);
        } else {
          console.error("Couldn't load previous answers:", savedResult.reason);
          setError("Couldn't retrieve saved answers. You can complete the quiz again.");
        }
      } catch (err) {
        console.error("Quiz initialization error:", err);
        if (active) setError("Couldn't initialize the quiz. Please try again.");
      } finally {
        if (active) setBusy(false);
      }
    }

    void initializeQuiz();
    return () => {
      active = false;
    };
  }, []);

  // STEP 2: Get applicable quiz questions
  const questions = useMemo(
    () => getVisibleQuestions(quizAnswers).map(toScreenQuestion),
    [quizAnswers]
  );

  const current = questions[Math.min(index, questions.length - 1)];
  const selected = current ? quizAnswers[current.id] : undefined;
  const isLast = index === questions.length - 1;
  const canNext = !!current && validate(current, quizAnswers) === "";

  // STEP 3: Retrieve available breeds
  const breeds = useMemo(() => {
    const type = quizAnswers.q1;

    const pets = availablePets.filter((pet) => {
      if (!type || type === "Not sure yet") return true;
      if (type.startsWith("Small animal")) {
        return ["small animal", "rabbit", "hamster", "guinea pig"].includes(
          String(pet.species).toLowerCase()
        );
      }
      return String(pet.species).toLowerCase() === type.toLowerCase();
    });

    return [...new Set(pets.map((pet) => pet.breed).filter(Boolean))].sort() as string[];
  }, [availablePets, quizAnswers.q1]);

  // STEP 4: Leave animation, then go to Swiping
  const goToSwipe = () => {
    if (leaving) return;
    enterPlayed = false;
    setLeaving(true);
    Animated.timing(screenAnim, {
      toValue: 2, // 2 = "leaving" position in the interpolations below
      duration: LEAVE_MS,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();
    timer.current = setTimeout(() => router.replace(ROUTES.swipe as Href), LEAVE_MS);
  };

  // STEP 5: Update a quiz answer
  function change(next: any) {
    setError("");
    setQuizAnswers((prev) => {
      const update: Answers = { ...prev, [current.id]: next };
      // Clear breed selection when species changes
      if (current.id === "q1" && prev.q1 !== next) delete update["q2"];
      return update;
    });
  }

  const choose = (option: string) => change(option);

  // STEP 6: Multi-select questions
  function chooseMulti(option: string) {
    const prior: string[] = Array.isArray(selected) ? selected : [];
    const next =
      option === current.exclusive
        ? [option]
        : prior.includes(option)
          ? prior.filter((item) => item !== option)
          : [...prior.filter((item) => item !== current.exclusive), option];
    change(next);
  }

  // STEP 7: ZIP-code or device-location question
  async function chooseLocation(option: string) {
    if (option === "Enter a ZIP code") {
      change({ choice: option, zip: selected?.zip ?? "" });
      return;
    }

    setBusy(true);
    try {
      const zip = await deriveZipFromDevice();
      change({ choice: option, zip });
    } catch (err: any) {
      setQuizAnswers((prev) => ({ ...prev, q19: { choice: "Enter a ZIP code", zip: "" } }));
      setError(err?.message ?? "Please enter your ZIP code manually.");
    } finally {
      setBusy(false);
    }
  }

  // STEP 8: Next question or Finish
  const next = async () => {
    if (busy || leaving) return;

    const problem = validate(current, quizAnswers);
    if (problem) {
      setError(problem);
      return;
    }

    if (isLast) {
      setBusy(true);
      try {
        const auth = getAuth(app);
        await auth.authStateReady();
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error("Please log in to save your PawPair quiz.");

        // Save answers to Firestore
        await saveQuizAnswers(uid, quizAnswers);
        // Let Matches, Applications and the homepage see the new answers right away
        void refreshQuizAnswers();

        // Apply weights and calculate matches
        if (petsLoaded) {
          try {
            const appliedWeights: Record<string, number> = {};
            for (const question of questions) {
              appliedWeights[question.id] = weightFor(question.id, quizAnswers[question.id]);
            }

            const ranking = matchPets(availablePets, quizAnswers, 5);
            const topFive = ranking.matches.map((item: any) => ({
              petId: item.pet.id,
              score: item.score ?? null,
              coverage: item.coverage,
              reasons: item.reasons ?? [],
            }));

            // Save recommendations to Firestore
            await setDoc(
              doc(db, "users", uid),
              {
                quizAnswerWeights: appliedWeights,
                quizMatchResults: topFive,
                quizMatchesUpdatedAt: serverTimestamp(),
              },
              { merge: true }
            );

            console.log("Top-five PawPair matches:", topFive);
          } catch (matchError) {
            console.warn("Quiz saved, but recommendations weren't cached:", matchError);
          }
        }

        onFinish(questions.map((question) => displayAnswer(quizAnswers[question.id])));
        goToSwipe();
      } catch (err: any) {
        console.error("Unable to save quiz:", err);
        setError(err?.message ?? "Could not save the quiz. Please try again.");
      } finally {
        setBusy(false);
      }
      return;
    }

    setIndex((i) => i + 1);
    setError("");
  };

  // STEP 9: Reusable pink/coral answer buttons
  const optionButton = (label: string, active: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      disabled={busy || leaving}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: busy || leaving }}
      style={({ pressed }) => [
        s.option,
        active ? s.optionActive : s.optionIdle,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={s.optionText}>{label}</Text>
    </Pressable>
  );

  if (!current) {
    return (
      <View style={[s.page, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={s.optionText}>{busy ? "Loading quiz..." : "No quiz questions were found."}</Text>
      </View>
    );
  }

  // Screen animation: 0 = entering, 1 = shown, 2 = leaving
  const screenStyle = {
    opacity: screenAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
    transform: [
      { translateY: screenAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [16, 0, -24] }) },
      { scale: screenAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 1, 0.97] }) },
    ],
  };
  const slideStyle = {
    opacity: questionAnim,
    transform: [
      { translateX: questionAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
    ],
  };

  const nextEnabled = canNext && !busy && !leaving;

  // STEP 10: PawPair design
  return (
    <View style={s.page}>
      <Animated.View
        style={[s.phone, screenStyle]}
        pointerEvents={leaving ? "none" : "auto"}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          {/* Header */}
          <LinearGradient colors={[PINK, CORAL]} style={s.header}>
            <View style={s.pill}>
              <Text style={s.pillText}>
                Question {index + 1} of {questions.length}
              </Text>
            </View>
            <Animated.Text key={current.id} style={[s.title, slideStyle]}>
              {current.question}
            </Animated.Text>
          </LinearGradient>

          {/* Card */}
          <KeyboardAvoidingView
            style={s.card}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Paw style={{ top: "3%", right: "14%" }} />
            <Paw style={{ top: "14%", right: -14, transform: [{ rotate: "25deg" }] }} />
            <Paw style={{ top: "38%", left: "34%", transform: [{ rotate: "-10deg" }] }} />
            <Paw style={{ bottom: "26%", left: -6, transform: [{ rotate: "-20deg" }] }} />
            <Paw style={{ bottom: "14%", right: "6%", transform: [{ rotate: "15deg" }] }} />

            <ScrollView
              style={s.content}
              contentContainerStyle={s.contentInner}
              keyboardShouldPersistTaps="handled"
            >
              {!!current.note && <Text style={s.note}>{current.note}</Text>}

              <Animated.View key={current.id} style={[s.options, slideStyle]}>
                {current.type === "breeds" ? (
                  <>
                    {optionButton("No preference", selected?.mode === "none", () =>
                      change({ mode: "none", breeds: [], other: "" })
                    )}

                    <Text style={s.subheading}>Preferred breeds (select multiple)</Text>

                    {breeds.map((breed) =>
                      optionButton(breed, (selected?.breeds ?? []).includes(breed), () => {
                        const previous: string[] = selected?.breeds ?? [];
                        change({
                          mode: "selected",
                          breeds: previous.includes(breed)
                            ? previous.filter((item) => item !== breed)
                            : [...previous, breed],
                          other: selected?.other ?? "",
                        });
                      })
                    )}

                    <TextInput
                      style={s.input}
                      accessibilityLabel="Other preferred breed"
                      placeholder="Other breed (optional)"
                      placeholderTextColor="#999"
                      value={selected?.other ?? ""}
                      onChangeText={(text) =>
                        change({ mode: "other", breeds: selected?.breeds ?? [], other: text })
                      }
                    />
                  </>
                ) : current.type === "restrictions" ? (
                  <>
                    {current.options.map((option) =>
                      optionButton(option, selected?.choice === option, () =>
                        change({ choice: option, maxWeightLbs: "", disallowedText: "" })
                      )
                    )}

                    {selected?.choice === "Size or weight limits" && (
                      <TextInput
                        style={s.input}
                        accessibilityLabel="Maximum allowed pet weight"
                        keyboardType="number-pad"
                        placeholder="Maximum pet weight (lb)"
                        placeholderTextColor="#999"
                        value={String(selected.maxWeightLbs ?? "")}
                        onChangeText={(text) =>
                          change({ ...selected, maxWeightLbs: text.replace(/[^\d.]/g, "") })
                        }
                      />
                    )}

                    {selected?.choice === "Certain breeds or species" && (
                      <TextInput
                        style={s.input}
                        accessibilityLabel="Prohibited breeds or species"
                        placeholder="Prohibited breeds/species, comma-separated"
                        placeholderTextColor="#999"
                        value={selected.disallowedText ?? ""}
                        onChangeText={(text) => change({ ...selected, disallowedText: text })}
                      />
                    )}
                  </>
                ) : current.type === "location" ? (
                  <>
                    {current.options.map((option) =>
                      optionButton(option, selected?.choice === option, () => {
                        void chooseLocation(option);
                      })
                    )}

                    {selected?.choice === "Enter a ZIP code" && (
                      <TextInput
                        style={s.input}
                        accessibilityLabel="Five-digit ZIP code"
                        placeholder="5-digit US ZIP code"
                        placeholderTextColor="#999"
                        keyboardType="number-pad"
                        maxLength={5}
                        value={selected.zip ?? ""}
                        onChangeText={(text) =>
                          change({ choice: "Enter a ZIP code", zip: text.replace(/\D/g, "") })
                        }
                      />
                    )}

                    {!!selected?.zip && (
                      <Text style={s.note}>ZIP: {selected.zip} (only ZIP saved)</Text>
                    )}
                  </>
                ) : current.type === "multi" ? (
                  <>
                    {current.options.map((option) =>
                      optionButton(option, (selected ?? []).includes(option), () =>
                        chooseMulti(option)
                      )
                    )}
                  </>
                ) : (
                  <>
                    {current.options.map((option) =>
                      optionButton(option, selected === option, () => choose(option))
                    )}
                  </>
                )}
              </Animated.View>

              {!!error && (
                <Text accessibilityRole="alert" style={s.error}>
                  {error}
                </Text>
              )}

              {/* Back and Next buttons: right under the answers */}
              <View style={s.nextWrap}>
                {index > 0 && (
                  <Pressable
                    disabled={busy || leaving}
                    onPress={() => {
                      setIndex((i) => i - 1);
                      setError("");
                    }}
                    style={s.back}
                  >
                    <Text style={s.btnText}>Back</Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => {
                    void next();
                  }}
                  disabled={!nextEnabled}
                  style={[s.next, { opacity: canNext && !busy ? 1 : 0.6 }]}
                >
                  <Text style={s.btnText}>{busy ? "Loading..." : isLast ? "Finish" : "Next"}</Text>
                </Pressable>
              </View>
            </ScrollView>

            {/* Empty space so the Skip Quiz bar never covers Back/Next */}
            <View style={{ height: SKIP_H }} />
          </KeyboardAvoidingView>
        </SafeAreaView>

        {/* Skip Quiz button */}
        <Pressable disabled={busy || leaving} onPress={goToSwipe} style={s.skipWrap}>
          <LinearGradient
            colors={[PINK, CORAL]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={s.skip}
          >
            <Text style={s.skipText}>Skip Quiz</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// Pink/coral design
const s = StyleSheet.create({
  page: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    backgroundColor: CREAM,
    overflow: "hidden",
  },
  phone: {
    flex: 1,
    width: "100%",
    maxWidth: 390,
    maxHeight: 844,
    overflow: "hidden",
    backgroundColor: CORAL,
  },
  header: {
    alignItems: "center",
    paddingTop: 18,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  pill: {
    backgroundColor: CREAM,
    paddingVertical: 8,
    paddingHorizontal: 40,
    borderRadius: 999,
  },
  pillText: { color: "#222", fontSize: 18, fontFamily: FONT },
  title: {
    marginTop: 14,
    maxWidth: 280,
    color: "#fff",
    fontSize: 24,
    fontWeight: "400",
    lineHeight: 31,
    textAlign: "center",
    fontFamily: FONT,
  },
  card: {
    flex: 1,
    backgroundColor: CREAM,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
  },
  paw: { position: "absolute", width: 64, height: 64 },
  content: { flex: 1, zIndex: 1 },
  // flexGrow + center: short questions sit in the middle of the card,
  // long ones (like the breed list) still scroll
  contentInner: {
    flexGrow: 1,
    justifyContent: "center",
    paddingTop: 24,
    paddingHorizontal: 40,
    paddingBottom: 24,
    gap: 14,
  },
  options: { gap: 14 },
  option: {
    minHeight: 38,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  optionIdle: {
    backgroundColor: PINK,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 1,
  },
  optionActive: {
    backgroundColor: CORAL,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.53)",
  },
  optionText: { fontSize: 14, color: "#222", textAlign: "center", fontFamily: FONT },
  nextWrap: {
    zIndex: 1,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  next: {
    backgroundColor: PINK,
    paddingVertical: 8,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 1,
  },
  back: {
    borderWidth: 1,
    borderColor: "#b76b5b",
    backgroundColor: CREAM,
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  btnText: { color: "#222", fontSize: 14, fontFamily: FONT },
  skipWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  skip: {
    height: SKIP_H,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 20,
  },
  skipText: { color: "#fff", fontSize: 14, fontWeight: "600", fontFamily: FONT },
  note: { marginBottom: 10, color: "#555", fontSize: 12, lineHeight: 17, fontFamily: FONT },
  subheading: { fontSize: 13, fontWeight: "600", marginTop: 8, color: "#222", fontFamily: FONT },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d2b9b3",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#222",
    fontFamily: FONT,
  },
  error: { color: "#a02323", fontSize: 12, lineHeight: 17, fontFamily: FONT },
});