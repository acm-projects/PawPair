import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  Image,
  Pressable,
  Animated,
  Dimensions,
  ActivityIndicator,
  Easing,
  PanResponder,
  Modal,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { markSwiped, useSwiped } from "../../store/swiped";
import { matchPet, removePet } from "../../store/petLists";
import { useRouter, useNavigation } from "expo-router";
import {
  PawPrint,
  Ruler,
  Zap,
  Users,
  Tent,
  Info,
  X,
} from "lucide-react-native";
import { getAuth } from "firebase/auth";

import { app } from "../../firebase.js";
import { getAnimals } from "../../services/animalServices";
import { addFavorite, removeFavorite } from "../../services/favoriteServices";
import { getQuizAnswers } from "../../services/quizService";
import { matchPets } from "../../services/matchingService";
import PawNavBar from "../../components/PawNavBar";

const paw = require("../../../assets/images/paw-watermark.png");
const pepoGoat = require("../../../assets/images/pepo-goat.png");
const pawIcon = require("../../../assets/images/paw-icon.png");

const PLACEHOLDERS: Record<string, number> = {
  dog: require("../../../assets/images/dog.jpg"),
  cat: require("../../../assets/images/cat.jpg"),
  bird: require("../../../assets/images/bird.jpg"),
  small_animal: require("../../../assets/images/small_animal.jpg"),
};
const DEFAULT_PHOTO = require("../../../assets/images/pet-duo.png");

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.16;
const VELOCITY_THRESHOLD = 0.35;
const MIN_MATCH = 85;

const CREAM = "#F5EFEB";
const PINK = "#F5C0B3";
const CORAL = "#E98F78";

const HEADER_PAWS = [
  { top: 16, left: 26, size: 32, rotate: "-18deg" },
  { top: -4, left: 108, size: 30, rotate: "16deg" },
  { top: 4, left: "48%", size: 28, rotate: "-10deg" },
  { top: -2, right: 24, size: 34, rotate: "20deg" },
  { bottom: 0, right: 175, size: 32, rotate: "18deg" },
] as const;

const cap = (s?: string) => (s ? s[0].toUpperCase() + s.slice(1) : "");
const speciesKey = (s?: string) => (s ?? "").toLowerCase().trim().replace(/\s+/g, "_");

function pickHighlightIcon(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("kid") || lower.includes("family") || lower.includes("child")) return Users;
  if (lower.includes("outdoor") || lower.includes("hike") || lower.includes("walk")) return Tent;
  if (lower.includes("energy") || lower.includes("play")) return Zap;
  if (lower.includes("size") || lower.includes("lb")) return Ruler;
  return PawPrint;
}

function toCard(pet: any, score: number | null) {
  const traits: { Icon: typeof PawPrint; text: string }[] = [];
  if (pet.breed) traits.push({ Icon: PawPrint, text: pet.breed });
  if (pet.size) traits.push({ Icon: Ruler, text: `${cap(pet.size)} size` });
  if (pet.energy) traits.push({ Icon: Zap, text: `${cap(pet.energy)} energy` });

  const loves = Array.isArray(pet.loves) ? pet.loves : [];

  const highlights: { Icon: typeof PawPrint; text: string }[] = [];
  if (pet.goodWithKids) {
    highlights.push({ Icon: Users, text: "Great with kids" });
  }
  for (const item of loves) {
    if (highlights.length >= 2) break;
    highlights.push({ Icon: pickHighlightIcon(item), text: item });
  }
  for (const t of traits) {
    if (highlights.length >= 2) break;
    if (!highlights.some((h) => h.text === t.text)) {
      highlights.push(t);
    }
  }

  return {
    id: pet.id,
    name: pet.name,
    ageShort: pet.age != null ? `${pet.age} ${pet.age === 1 ? "yr" : "yrs"}` : "",
    photo: pet.photoUrl
      ? { uri: pet.photoUrl }
      : PLACEHOLDERS[speciesKey(pet.species)] ?? DEFAULT_PHOTO,
    traits,
    highlights,
    email: pet.contactEmail ?? "",
    about: pet.description ?? "",
    loves,
    score,
  };
}

export default function SwipingScreen() {
  const busy = useRef(false);
  const dragDistance = useRef(0);
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const swiped = useSwiped();

  useEffect(() => {
    let parent = navigation.getParent();
    while (parent) {
      parent.setOptions({ gestureEnabled: false });
      parent = parent.getParent();
    }
    return () => {
      let p = navigation.getParent();
      while (p) {
        p.setOptions({ gestureEnabled: true });
        p = p.getParent();
      }
    };
  }, [navigation]);

  const [fontsLoaded] = useFonts({
    HeadingFont: require("../../../assets/Fonts/Matcha Style.ttf"),
  });

  const [cards, setCards] = useState<ReturnType<typeof toCard>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const position = useMemo(() => new Animated.ValueXY({ x: 0, y: 0 }), []);
  const sway = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function loadDeck() {
      try {
        const pets = await getAnimals();

        const auth = getAuth(app);
        await auth.authStateReady();
        const uid = auth.currentUser?.uid;
        const answers = uid ? await getQuizAnswers(uid) : null;

        if (!answers) {
          setError("Finish the quiz to see pets matched to you.");
          return;
        }

        const res = matchPets(pets, answers, pets.length);
        const strong = res.matches.filter((m: any) => m.score != null && m.score >= MIN_MATCH);
        setCards(strong.map((m: any) => toCard(m.pet, m.score)));
        if (strong.length === 0) {
          setError(`No pets are an ${MIN_MATCH}%+ match yet. Try updating your quiz answers!`);
        }
      } catch (e) {
        console.error("Error loading pets:", e);
        setError("Could not load pets.");
      } finally {
        setLoading(false);
      }
    }

    void loadDeck();
  }, []);

  const deck = cards.filter((p) => !swiped.has(p.id));
  const currentPet = deck[0];
  const nextPet = deck[1];

  const currentPetRef = useRef(currentPet);
  currentPetRef.current = currentPet;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(sway, {
          toValue: -1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(sway, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sway]);

  useEffect(() => {
    const jump = () =>
      Animated.sequence([
        Animated.timing(hop, {
          toValue: -16,
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
  }, [hop]);

  const translateX = sway.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] });
  const rot = sway.interpolate({ inputRange: [-1, 1], outputRange: ["-5deg", "5deg"] });

  const handleAction = (actionType: "reject" | "match") => {
    const pet = currentPetRef.current;
    if (busy.current || !pet) return;
    busy.current = true;
    setDetailsOpen(false);

    const uid = getAuth(app).currentUser?.uid;

    if (actionType === "match") {
      matchPet(pet.id as any);
      if (uid) addFavorite(uid, pet.id).catch((e: any) => console.error("Error saving match:", e));
    } else {
      removePet("matches", pet.id as any);
      if (uid) removeFavorite(uid, String(pet.id)).catch((e: any) => console.warn(e));
    }

    const xTarget = actionType === "reject" ? -SCREEN_WIDTH * 1.35 : SCREEN_WIDTH * 1.35;

    Animated.timing(position, {
      toValue: { x: xTarget, y: 18 },
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      markSwiped(pet.id);
      position.setValue({ x: 0, y: 0 });
      busy.current = false;
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !busy.current,
        onStartShouldSetPanResponderCapture: () => !busy.current,
        onMoveShouldSetPanResponder: () => !busy.current,
        onMoveShouldSetPanResponderCapture: () => !busy.current,
        onShouldBlockNativeResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          dragDistance.current = 0;
        },
        onPanResponderMove: (_, gesture) => {
          dragDistance.current = Math.hypot(gesture.dx, gesture.dy);
          position.setValue({ x: gesture.dx, y: gesture.dy * 0.25 });
        },
        onPanResponderRelease: (_, gesture) => {
          const moved = dragDistance.current;
          dragDistance.current = 0;

          if (moved < 8) {
            setDetailsOpen(true);
            return;
          }

          if (gesture.dx > SWIPE_THRESHOLD || gesture.vx > VELOCITY_THRESHOLD) {
            handleAction("match");
          } else if (gesture.dx < -SWIPE_THRESHOLD || gesture.vx < -VELOCITY_THRESHOLD) {
            handleAction("reject");
          } else {
            Animated.spring(position, {
              toValue: { x: 0, y: 0 },
              friction: 7,
              tension: 85,
              useNativeDriver: false,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          dragDistance.current = 0;
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 7,
            tension: 85,
            useNativeDriver: false,
          }).start();
        },
      }),
    [position]
  );

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ["-11deg", "0deg", "11deg"],
  });

  const greenTintOpacity = position.x.interpolate({
    inputRange: [0, 38],
    outputRange: [0, 0.78],
    extrapolate: "clamp",
  });

  const redTintOpacity = position.x.interpolate({
    inputRange: [-38, 0],
    outputRange: [0.78, 0],
    extrapolate: "clamp",
  });

  const nextCardScale = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: [1, 0.96, 1],
    extrapolate: "clamp",
  });

  const animatedCardStyle = {
    transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }],
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={[s.outer, s.emptyWrap]}>
        <View style={s.emptyGroup}>
          <ActivityIndicator size="large" color={CORAL} />
          <Text style={s.emptyText}>Finding pets for you...</Text>
        </View>
      </View>
    );
  }

  if (!currentPet) {
    return (
      <View style={[s.outer, s.emptyWrap]}>
        <View style={s.emptyGroup}>
          <Animated.Image
            source={pepoGoat}
            style={[
              s.pepo,
              { transform: [{ translateY: hop }, { translateX }, { rotate: rot }] },
            ]}
          />
          <Text style={[s.emptyText, { textAlign: "center" }]}>
            {error || "That's all the pets!"}
          </Text>
          <Pressable style={s.emptyBtn} onPress={() => router.replace("/homepage" as any)}>
            <Text style={s.emptyBtnText}>Home</Text>
          </Pressable>
        </View>
        <View style={s.navWrapper}>
          <PawNavBar />
        </View>
      </View>
    );
  }

  const topPad = Math.max(insets.top, 12) + 4;

  return (
    <View style={s.outer}>
      <View style={s.phone}>
        {/* Header with faint pink pawprints & PawPair brand wordmark */}
        <View style={[s.header, { paddingTop: topPad }]}>
          <View
            style={[StyleSheet.absoluteFill, { top: Math.max(insets.top, 12) - 4 }]}
            pointerEvents="none"
          >
            {HEADER_PAWS.map((p, i) => (
              <Image
                key={i}
                source={paw}
                style={[
                  s.headerPaw,
                  {
                    width: p.size,
                    height: p.size,
                    top: "top" in p ? p.top : undefined,
                    bottom: "bottom" in p ? p.bottom : undefined,
                    left: "left" in p ? p.left : undefined,
                    right: "right" in p ? p.right : undefined,
                    transform: [{ rotate: p.rotate }],
                  },
                ]}
              />
            ))}
          </View>

          <Text style={s.brandTitle}>PawPair</Text>
        </View>

        {/* Card Deck Area */}
        <View style={s.deckArea}>
          {nextPet && (
            <Animated.View
              style={[s.card, s.nextCard, { transform: [{ scale: nextCardScale }] }]}
              pointerEvents="none"
            >
              <Image source={nextPet.photo} style={s.cardPhoto} resizeMode="cover" />
            </Animated.View>
          )}

          <Animated.View
            {...panResponder.panHandlers}
            style={[s.card, animatedCardStyle]}
            accessibilityLabel={`${currentPet.name}, tap for details or swipe left to pass and right to match`}
          >
            <View style={s.cardInner}>
              <Image source={currentPet.photo} style={s.cardPhoto} resizeMode="cover" />

              {/* Green & red swipe wash overlays */}
              <Animated.View
                pointerEvents="none"
                style={[s.tintOverlay, s.greenTint, { opacity: greenTintOpacity }]}
              />
              <Animated.View
                pointerEvents="none"
                style={[s.tintOverlay, s.redTint, { opacity: redTintOpacity }]}
              />

              {currentPet.score != null && (
                <View style={s.scoreBadge}>
                  <Text style={s.scoreText}>{currentPet.score}% match</Text>
                </View>
              )}

              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.68)"]}
                style={s.bottomScrim}
              >
                <View style={s.overlayRow}>
                  <View style={s.overlayLeft}>
                    <View style={s.nameRow}>
                      <Text style={s.petName}>{currentPet.name},</Text>
                      {!!currentPet.ageShort && (
                        <Text style={s.petAge}>{currentPet.ageShort}</Text>
                      )}
                    </View>

                    <View style={s.highlightsList}>
                      {currentPet.highlights.map(({ Icon, text }, i) => (
                        <View key={i} style={s.highlightRow}>
                          <Icon size={15} color="#fff" strokeWidth={2} />
                          <Text style={s.highlightText}>{text}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={s.infoBtn}>
                    <Info size={18} color="#fff" strokeWidth={2.2} />
                  </View>
                </View>
              </LinearGradient>
            </View>
          </Animated.View>
        </View>

        <View style={s.navWrapper}>
          <PawNavBar />
        </View>
      </View>

      {/* Tap-to-Expand Full Pet Details Sheet */}
      <Modal
        visible={detailsOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailsOpen(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={[s.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            <View style={s.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                <Text style={s.modalName}>{currentPet.name}</Text>
                {!!currentPet.ageShort && (
                  <Text style={s.modalAge}>{currentPet.ageShort}</Text>
                )}
              </View>
              <Pressable onPress={() => setDetailsOpen(false)} style={s.closeBtn}>
                <X size={20} color="#222" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              <View style={{ gap: 8 }}>
                {currentPet.traits.map(({ Icon, text }, i) => (
                  <View key={i} style={s.modalTrait}>
                    <Icon size={17} color="#222" strokeWidth={1.85} />
                    <Text style={s.modalTraitText}>{text}</Text>
                  </View>
                ))}
              </View>

              {!!currentPet.about && (
                <View>
                  <Text style={s.modalSectionTitle}>About me</Text>
                  <Text style={s.modalBody}>{currentPet.about}</Text>
                </View>
              )}

              {currentPet.loves.length > 0 && (
                <View>
                  <Text style={s.modalSectionTitle}>Loves</Text>
                  <View style={s.pillsRow}>
                    {currentPet.loves.map((l: string, i: number) => (
                      <View key={i} style={s.pill}>
                        <Text style={s.pillText}>{l}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {!!currentPet.email && (
                <LinearGradient
                  colors={["#F5C0B8", "#F6C69F"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.contact}
                >
                  <Image source={pawIcon} style={s.contactIcon} />
                  <View>
                    <Text style={s.contactLabel}>You can contact me at:</Text>
                    <Text style={s.contactEmail}>{currentPet.email}</Text>
                  </View>
                </LinearGradient>
              )}
            </ScrollView>

            <View style={s.modalActions}>
              <Pressable
                onPress={() => handleAction("reject")}
                style={[s.actionBtn, { borderColor: "#D32F2F", backgroundColor: "#FBEFEF" }]}
              >
                <Text style={[s.actionSymbol, { color: "#D32F2F" }]}>✕</Text>
              </Pressable>
              <Pressable
                onPress={() => handleAction("match")}
                style={[s.actionBtn, { borderColor: "#2E7D32", backgroundColor: "#EAF7EE" }]}
              >
                <Text style={[s.actionSymbol, { color: "#2E7D32" }]}>✓</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: CREAM,
    alignItems: "center",
  },
  phone: {
    flex: 1,
    width: "100%",
    maxWidth: 420,
    backgroundColor: CREAM,
    paddingBottom: 74,
  },
  emptyWrap: {
    justifyContent: "center",
  },
  emptyGroup: {
    width: 280,
    alignItems: "center",
    gap: 16,
  },
  emptyText: { color: "#222", fontSize: 16 },
  emptyBtn: {
    paddingHorizontal: 24,
    height: 44,
    borderRadius: 22,
    backgroundColor: PINK,
    alignItems: "center",
    justifyContent: "center",
  },
  pepo: { width: 56, height: 56, resizeMode: "contain" },
  emptyBtnText: { fontSize: 15, fontWeight: "600", color: "#222" },
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 10,
    position: "relative",
    zIndex: 2,
  },
  headerPaw: {
    position: "absolute",
    tintColor: PINK,
    opacity: 0.6,
    resizeMode: "contain",
  },
  brandTitle: {
    fontFamily: "HeadingFont",
    fontSize: 30,
    letterSpacing: 1,
    color: "#111",
  },
  deckArea: {
    flex: 1,
    paddingHorizontal: 14,
    paddingBottom: 10,
    justifyContent: "center",
    overflow: "hidden",
    zIndex: 1,
  },
  card: {
    flex: 1,
    width: "100%",
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "#E5DDD5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 5,
  },
  nextCard: {
    position: "absolute",
    top: 0,
    bottom: 10,
    left: 14,
    right: 14,
  },
  cardInner: {
    flex: 1,
  },
  cardPhoto: {
    width: "100%",
    height: "100%",
  },
  tintOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
  greenTint: {
    backgroundColor: "rgba(46, 178, 86, 0.85)",
  },
  redTint: {
    backgroundColor: "rgba(220, 56, 56, 0.85)",
  },
  scoreBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(245, 239, 235, 0.92)",
  },
  scoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2E7D32",
  },
  bottomScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  overlayRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  overlayLeft: {
    flex: 1,
    paddingRight: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 6,
  },
  petName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
  },
  petAge: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
  },
  highlightsList: {
    gap: 4,
  },
  highlightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  highlightText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#fff",
  },
  infoBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  navWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "78%",
    backgroundColor: CREAM,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#222",
  },
  modalAge: {
    fontSize: 18,
    color: "#555",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E8E0D8",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTrait: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalTraitText: {
    fontSize: 14,
    color: "#222",
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
    marginBottom: 6,
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 20,
    color: "#333",
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    backgroundColor: PINK,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#222",
  },
  contact: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
  },
  contactIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
    resizeMode: "contain",
  },
  contactLabel: {
    fontSize: 12,
    color: "#222",
  },
  contactEmail: {
    fontSize: 13,
    fontWeight: "700",
    color: "#222",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    paddingTop: 14,
  },
  actionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  actionSymbol: {
    fontSize: 24,
    fontWeight: "700",
  },
});