import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRouter, type Href } from "expo-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { app, db } from "../../firebase.js";
import { STAGES, statusFor, useStatuses } from "../../data/petStatus";
import { useMatchedPets } from "../../data/livePets";
import TrackerModal, { type TrackerKind } from "src/components/TrackerModal";
import {
  User,
  House,
  Dog,
  Camera as CameraIcon,
  ChevronDown,
  Check,
  TreePine,
  Smile,
  Utensils,
  Newspaper,
  Bookmark,
  Mic,
  PawPrint,
} from "lucide-react-native";

const COLORS = {
  peach: "#E98F78",
  peachLight: "#F5C0B3",
  peachTile: "#EDB5A6",
  cream: "#F7F1EF",
  periwinkle: "#C3CBEF",
  periwinkleLight: "#EEF0FB",
  text: "#1A1A1A",
  muted: "#786862",
};

// The last application stage is the completed-adoption stage in this app.
// If your STAGES array changes, adjust this threshold.
const ADOPTED_STAGE = STAGES.length - 1;

const PLACEHOLDERS: Record<string, number> = {
  dog: require("../../../assets/images/dog.jpg"),
  cat: require("../../../assets/images/cat.jpg"),
  bird: require("../../../assets/images/bird.jpg"),
  small_animal: require("../../../assets/images/small_animal.jpg"),
};
const DEFAULT_PHOTO = require("../../../assets/images/pet-duo.png");

type Pet = {
  id: string;
  name?: string;
  age?: number | string;
  breed?: string;
  species?: string;
  size?: string;
  energy?: string;
  temperament?: string | string[];
  description?: string;
  photoUrl?: string;
  imageUrl?: string;
  image?: string;
};

type Task = {
  id: string;
  title: string;
  points: number;
  detail?: string;
  subItems?: string[];
};

const TRACKERS: { label: string; Icon: typeof TreePine; kind: TrackerKind }[] = [
  { label: "Activity", Icon: TreePine, kind: "activity" },
  { label: "Mood", Icon: Smile, kind: "mood" },
  { label: "Appetite", Icon: Utensils, kind: "meal" },
];

const NAV_ITEMS = [
  { href: "/profile", label: "Profile", Icon: User },
  { href: "/homepage", label: "Homepage", Icon: House },
  { href: "/scrollview", label: "Scrollview", Icon: Dog },
  { href: "/camera", label: "Camera", Icon: CameraIcon },
] as const;

const speciesKey = (species?: string) =>
  (species ?? "").trim().toLowerCase().replace(/\s+/g, "_");

function photoFor(pet: Pet) {
  const url = pet.photoUrl || pet.imageUrl || pet.image;
  return typeof url === "string" && /^https?:\/\//i.test(url)
    ? { uri: url }
    : PLACEHOLDERS[speciesKey(pet.species)] ?? DEFAULT_PHOTO;
}

function ageFor(pet: Pet) {
  if (pet.age === undefined || pet.age === null || pet.age === "") return "";
  if (typeof pet.age === "number") {
    return `${pet.age} ${pet.age === 1 ? "yr" : "yrs"}`;
  }
  return String(pet.age);
}

function tasksFor(species?: string): Task[] {
  const key = speciesKey(species);
  const careActivity = key === "dog" ? "Walk" : key === "cat" ? "Playtime" : "Daily care";
  const enrichment = key === "dog" ? "Sit Command" : "Enrichment time";
  return [
    { id: "routine", title: "Pet Routine", subItems: ["Feeding", careActivity], points: 20 },
    { id: "training", title: key === "dog" ? "Training" : "Enrichment", detail: enrichment, points: 15 },
    { id: "health", title: "Health", detail: "Wellness check", points: 10 },
  ];
}

function tipsFor(species?: string) {
  const key = speciesKey(species);
  if (key === "dog") return [
    { id: "1", label: "CALM & COMFORT", title: "How to help a nervous dog" },
    { id: "2", label: "TIPS OF THE DAY", title: "Crate Training & Anxiety" },
  ];
  if (key === "cat") return [
    { id: "1", label: "CALM & COMFORT", title: "Helping your new cat settle in" },
    { id: "2", label: "TIPS OF THE DAY", title: "Litter boxes & enrichment" },
  ];
  return [
    { id: "1", label: "CALM & COMFORT", title: "Helping a new pet feel safe" },
    { id: "2", label: "TIPS OF THE DAY", title: "Building a consistent care routine" },
  ];
}

function CheckBox({ checked, size = 22 }: { checked: boolean; size?: number }) {
  return (
    <View
      style={[
        styles.checkbox,
        { width: size, height: size, borderRadius: size / 4 },
        checked && styles.checkboxChecked,
      ]}
    >
      {checked && <Check size={size - 6} color={COLORS.text} strokeWidth={3} />}
    </View>
  );
}

export default function PostHomepage() {
  const router = useRouter();
  const navigation = useNavigation();
  const statuses = useStatuses();
  const matchedPets = useMatchedPets();

  // A user can only pick a pet whose application reached the Adopted stage.
  const adoptedPets = useMemo(
    () => matchedPets.filter((pet) => statusFor(statuses, pet.id).stage >= ADOPTED_STAGE),
    [matchedPets, statuses]
  );

  const [uid, setUid] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [savedPetId, setSavedPetId] = useState<string | null>(null);
  const [profileError, setProfileError] = useState("");
  const [pet, setPet] = useState<Pet | null>(null);
  const [petLoading, setPetLoading] = useState(false);
  const [petError, setPetError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savingSelection, setSavingSelection] = useState(false);
  const autoSaveAttempt = useRef<string | null>(null);

  // Prioritize the user's saved choice. If exactly one pet is marked adopted
  // locally and no saved choice exists yet, use that pet automatically.
  // With multiple adopted pets and no saved choice, ask the user to select.
  const activePetId = savedPetId ??
    (adoptedPets.length === 1 ? String(adoptedPets[0].id) : null);

  // Live subscription to the user's selected adoptedPetId.
  useEffect(() => {
    const auth = getAuth(app);
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile?.();
      unsubscribeProfile = undefined;
      setUid(user?.uid ?? null);
      setAuthReady(true);
      setSavedPetId(null);
      setProfileError("");
      setProfileReady(!user);

      if (!user) return;

      setProfileReady(false);
      unsubscribeProfile = onSnapshot(
        doc(db, "users", user.uid),
        (snapshot) => {
          const stored = snapshot.data()?.adoptedPetId;
          setSavedPetId(typeof stored === "string" && stored.trim() ? stored : null);
          setProfileReady(true);
          setProfileError("");
        },
        (error) => {
          console.error("Could not read adopted pet selection:", error);
          setProfileError("Unable to load your adopted pet selection. Check Firestore permissions.");
          setProfileReady(true);
        }
      );
    });

    return () => {
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, []);

  // Automatically persist the one and only completed adoption, if necessary.
  useEffect(() => {
    if (!uid || !profileReady || profileError || savedPetId || adoptedPets.length !== 1) return;
    const id = String(adoptedPets[0].id);
    const key = `${uid}:${id}`;
    if (autoSaveAttempt.current === key) return;
    autoSaveAttempt.current = key;

    setDoc(
      doc(db, "users", uid),
      { adoptedPetId: id, adoptedPetSelectedAt: serverTimestamp() },
      { merge: true }
    ).catch((error) => {
      console.error("Could not save adopted pet:", error);
      setProfileError("Unable to save your adopted pet selection.");
    });
  }, [uid, profileReady, profileError, savedPetId, adoptedPets]);

  // Live subscription to the exact adopted pet's Firestore animal document.
  // Editing that animal's name, image, age, etc. updates this screen.
  useEffect(() => {
    setPet(null);
    setPetError("");
    if (!uid || !profileReady || !activePetId || profileError) {
      setPetLoading(false);
      return;
    }

    setPetLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, "animals", activePetId),
      (snapshot) => {
        if (snapshot.exists()) {
          setPet({ id: snapshot.id, ...(snapshot.data() as Omit<Pet, "id">) });
          setPetError("");
        } else {
          setPet(null);
          setPetError("This pet's record no longer exists in Firestore.");
        }
        setPetLoading(false);
      },
      (error) => {
        console.error("Error loading adopted animal:", error);
        setPet(null);
        setPetError("Could not load this pet's details from Firestore.");
        setPetLoading(false);
      }
    );
    return unsubscribe;
  }, [uid, profileReady, activePetId, profileError]);

  async function selectAdoptedPet(id: string) {
    if (!uid || savingSelection) return;
    setSavingSelection(true);
    setProfileError("");
    try {
      await setDoc(
        doc(db, "users", uid),
        { adoptedPetId: id, adoptedPetSelectedAt: serverTimestamp() },
        { merge: true }
      );
      setPickerOpen(false);
    } catch (error) {
      console.error("Could not change selected pet:", error);
      setProfileError("Could not update your selected pet. Please try again.");
    } finally {
      setSavingSelection(false);
    }
  }

  // Daily tasks are local UI state; clear them when switching pets so no pet
  // inherits another pet's checked tasks.
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => setDone({}), [activePetId]);
  const toggle = (id: string) => setDone((prev) => ({ ...prev, [id]: !prev[id] }));

  const [question, setQuestion] = useState("");
  const [tracker, setTracker] = useState<TrackerKind>("activity");
  const [trackerOpen, setTrackerOpen] = useState(false);
  const openTracker = (kind: TrackerKind) => {
    setTracker(kind);
    setTrackerOpen(true);
  };

  const tasks = useMemo(() => tasksFor(pet?.species), [pet?.species]);
  const tips = useMemo(() => tipsFor(pet?.species), [pet?.species]);
  const totalPoints = tasks.reduce((sum, task) => sum + task.points, 0);
  const earnedPoints = tasks.reduce(
    (sum, task) => sum + (done[task.id] ? task.points : 0),
    0
  );
  const progress = totalPoints ? earnedPoints / totalPoints : 0;
  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Keep the original bottom navigation visible in all states.
  const bottomNav = (
    <View style={styles.navBarBackground}>
      <SafeAreaView style={styles.navBar} edges={["bottom"]}>
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = href === "/homepage";
          return (
            <TouchableOpacity
              key={href}
              accessibilityLabel={label}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => router.navigate(href as Href)}
            >
              <Icon size={32} color="white" strokeWidth={isActive ? 2.25 : 1.75} />
            </TouchableOpacity>
          );
        })}
      </SafeAreaView>
    </View>
  );

  // Never briefly show the previous pet while a different ID loads.
  const loading =
    !authReady ||
    (!!uid && !profileReady) ||
    petLoading ||
    (!!uid && !!activePetId && pet?.id !== activePetId && !petError && !profileError);

  if (loading) {
    return (
      <View style={styles.screen}>
        <LinearGradient colors={[COLORS.peachLight, COLORS.peach]} style={StyleSheet.absoluteFill} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.text} />
          <Text style={styles.emptyText}>Loading your pet...</Text>
        </View>
        {bottomNav}
      </View>
    );
  }

  if (!uid || profileError || petError || !pet) {
    return (
      <View style={styles.screen}>
        <LinearGradient colors={[COLORS.peachLight, COLORS.peach]} style={StyleSheet.absoluteFill} />
        <View style={styles.center}>
          <PawPrint size={58} color={COLORS.cream} />
          <Text style={styles.emptyTitle}>
            {!uid ? "Log in to view your pet" : "Your post-adoption homepage"}
          </Text>
          <Text style={styles.emptyText}>
            {!uid
              ? "Your adopted pet is linked to your account."
              : profileError || petError ||
                (adoptedPets.length > 1
                  ? "More than one pet is marked adopted. Choose which pet to display."
                  : "No pet has been marked adopted yet. Complete the adoption stage in Applications.")}
          </Text>
          {!!uid && adoptedPets.length > 1 && !profileError && !petError &&
            adoptedPets.map((candidate) => (
              <TouchableOpacity
                key={String(candidate.id)}
                style={styles.chooseButton}
                disabled={savingSelection}
                onPress={() => selectAdoptedPet(String(candidate.id))}
              >
                <Text style={styles.chooseText}>{candidate.name}</Text>
              </TouchableOpacity>
            ))}
          {!!uid && (
            <TouchableOpacity
              style={styles.chooseButton}
              onPress={() => router.push("/status" as Href)}
            >
              <Text style={styles.chooseText}>View Applications</Text>
            </TouchableOpacity>
          )}
        </View>
        {bottomNav}
      </View>
    );
  }

  const age = ageFor(pet);
  const meta = [age, pet.breed, pet.species].filter(Boolean).join("  •  ");
  const temperament = Array.isArray(pet.temperament)
    ? pet.temperament.join(", ")
    : pet.temperament;

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[COLORS.peachLight, COLORS.peach]} style={StyleSheet.absoluteFill} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* The exact selected pet's Firestore photo and identity */}
        <Image source={photoFor(pet)} style={styles.heroPhoto} />
        <TouchableOpacity
          style={styles.nameTab}
          disabled={adoptedPets.length <= 1}
          onPress={() => setPickerOpen((open) => !open)}
          accessibilityLabel="Choose your adopted pet"
        >
          <Text style={styles.petName}>{pet.name || "Your pet"}</Text>
          {adoptedPets.length > 1 && <ChevronDown size={26} color={COLORS.text} />}
        </TouchableOpacity>

        {pickerOpen && adoptedPets.length > 1 && (
          <View style={styles.pickerPanel}>
            {adoptedPets.map((candidate) => (
              <TouchableOpacity
                key={String(candidate.id)}
                style={styles.pickerOption}
                disabled={savingSelection}
                onPress={() => selectAdoptedPet(String(candidate.id))}
              >
                <Text style={styles.pickerText}>{candidate.name}</Text>
                {String(candidate.id) === activePetId && <Check size={18} color={COLORS.text} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.sheet}>
          <Text style={styles.petMeta}>{meta || "Adopted companion"}</Text>

          {/* Individual Firestore pet details; nothing hardcoded as Barley */}
          {(pet.description || pet.size || pet.energy || temperament) && (
            <View style={styles.petDetailsCard}>
              <Text style={styles.petDetailsTitle}>About {pet.name || "your pet"}</Text>
              {!!pet.description && <Text style={styles.petDescription}>{pet.description}</Text>}
              {!!pet.size && <Text style={styles.petAttribute}>Size: {pet.size}</Text>}
              {!!pet.energy && <Text style={styles.petAttribute}>Energy: {pet.energy}</Text>}
              {!!temperament && <Text style={styles.petAttribute}>Temperament: {temperament}</Text>}
            </View>
          )}

          {/* Daily Paw-gress: tasks adapt to the pet's species */}
          <LinearGradient colors={["#C5CDF0", COLORS.cream]} style={styles.dailyOuter}>
            <View style={styles.dailyInner}>
              <Text style={styles.dailyTitle}>{today} - Daily Paw-gress</Text>
              {tasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={styles.taskRow}
                  onPress={() => toggle(task.id)}
                  activeOpacity={0.7}
                >
                  <CheckBox checked={!!done[task.id]} />
                  <View style={styles.taskBody}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <View style={styles.taskSubRow}>
                      {task.subItems ? (
                        <View style={styles.subItems}>
                          {task.subItems.map((item) => (
                            <View key={item} style={styles.subItem}>
                              <CheckBox checked={!!done[task.id]} size={14} />
                              <Text style={styles.taskDetail}>{item}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.taskDetail}>{task.detail}</Text>
                      )}
                      <Text style={styles.taskPoints}>{task.points} pts</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>

          <View style={styles.trackerRow}>
            {TRACKERS.map(({ label, Icon, kind }) => (
              <TouchableOpacity
                key={label}
                style={styles.trackerTile}
                onPress={() => openTracker(kind)}
              >
                <Icon size={44} color={COLORS.cream} strokeWidth={1.75} />
                <Text style={styles.trackerLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.pointsCard}>
            <View style={styles.pointsLeft}>
              <Text style={styles.pointsTitle}>Pawtnership Points</Text>
              <View style={styles.pointsTrack}>
                <View style={[styles.pointsFill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.pointsCaption}>Keep going for the next badge!</Text>
            </View>
            <View style={styles.badge}>
              <PawPrint size={30} color="white" />
            </View>
          </View>

          <LinearGradient colors={["#EDBDB0", COLORS.cream]} style={styles.tipsCard}>
            <Text style={styles.sectionTitle}>Quick Tips & Articles</Text>
            {tips.map((tip) => (
              <TouchableOpacity key={tip.id} style={styles.tipRow}>
                <Newspaper size={36} color="#B9C3EC" strokeWidth={1.5} />
                <View style={styles.tipText}>
                  <Text style={styles.tipLabel}>{tip.label}</Text>
                  <Text style={styles.tipTitle}>{tip.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.seeMore}>
              <Text style={styles.seeMoreText}>See More</Text>
            </TouchableOpacity>
          </LinearGradient>

          <LinearGradient
            colors={[COLORS.periwinkle, COLORS.periwinkleLight]}
            style={styles.pepoCard}
          >
            <View style={styles.pepoHeader}>
              <View style={styles.pepoAvatar}>
                <PawPrint size={26} color={COLORS.peach} />
              </View>
              <Text style={styles.pepoTitle}>Ask Pepo</Text>
              <TouchableOpacity style={styles.bookmarkButton}>
                <Bookmark size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.pepoInputRow}>
              <TextInput
                style={styles.pepoInput}
                placeholder="Ask a question"
                placeholderTextColor="#9AA6D6"
                value={question}
                onChangeText={setQuestion}
              />
              <TouchableOpacity style={styles.micButton}>
                <Mic size={18} color="#8C99D6" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>

      {bottomNav}

      <TrackerModal
        visible={trackerOpen}
        kind={tracker}
        onClose={() => setTrackerOpen(false)}
      />
    </View>
  );
}

const NAV_RADIUS = 20;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.peach },
  scrollContent: { alignItems: "center", paddingTop: 56, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    gap: 14,
  },
  emptyTitle: { fontSize: 23, fontWeight: "800", color: COLORS.text, textAlign: "center" },
  emptyText: { fontSize: 15, color: COLORS.text, textAlign: "center", lineHeight: 22 },
  chooseButton: {
    backgroundColor: COLORS.cream,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  chooseText: { color: COLORS.text, fontWeight: "700" },
  heroPhoto: {
    width: 230,
    height: 190,
    borderTopLeftRadius: 115,
    borderTopRightRadius: 115,
    backgroundColor: "#eee",
  },
  nameTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -26,
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 10,
  },
  petName: { fontSize: 40, fontWeight: "800", color: COLORS.text },
  pickerPanel: {
    alignSelf: "center",
    minWidth: 230,
    backgroundColor: COLORS.cream,
    padding: 10,
    borderRadius: 16,
    zIndex: 5,
  },
  pickerOption: { flexDirection: "row", gap: 10, justifyContent: "space-between", padding: 10 },
  pickerText: { fontWeight: "700", color: COLORS.text },
  sheet: {
    alignSelf: "stretch",
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 44,
    borderTopRightRadius: 44,
    padding: 16,
    gap: 16,
  },
  petMeta: { textAlign: "center", fontSize: 15, color: COLORS.text },
  petDetailsCard: { backgroundColor: "#FFF9F6", borderRadius: 18, padding: 14, gap: 7 },
  petDetailsTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  petDescription: { fontSize: 14, lineHeight: 21, color: COLORS.text },
  petAttribute: { fontSize: 13, color: COLORS.muted },
  dailyOuter: { borderRadius: 26, padding: 8 },
  dailyInner: {
    backgroundColor: COLORS.cream,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#C5CDF0",
    padding: 16,
    gap: 14,
  },
  dailyTitle: { textAlign: "center", fontSize: 18, fontWeight: "700", color: COLORS.text },
  taskRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  taskBody: { flex: 1 },
  taskTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  taskSubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  subItems: { flexDirection: "row", gap: 10 },
  subItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  taskDetail: { fontSize: 14, color: COLORS.text },
  taskPoints: { fontSize: 12, color: COLORS.muted },
  checkbox: {
    borderWidth: 1.5,
    borderColor: COLORS.text,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: COLORS.peachTile },
  trackerRow: { flexDirection: "row", gap: 12 },
  trackerTile: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: COLORS.peachTile,
    borderWidth: 1,
    borderColor: "#C5CDF0",
  },
  trackerLabel: { color: COLORS.cream, fontSize: 14, fontWeight: "600" },
  pointsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.periwinkle,
    borderRadius: 22,
    padding: 16,
  },
  pointsLeft: { flex: 1, gap: 8 },
  pointsTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  pointsTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: COLORS.text,
    overflow: "hidden",
  },
  pointsFill: { height: "100%", backgroundColor: COLORS.peachTile },
  pointsCaption: { fontSize: 12, color: COLORS.text },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#3E8FE0",
    alignItems: "center",
    justifyContent: "center",
  },
  tipsCard: { borderRadius: 22, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "white",
    borderRadius: 14,
    padding: 12,
  },
  tipText: { flex: 1 },
  tipLabel: { fontSize: 10, letterSpacing: 1, color: "#B0BAE6" },
  tipTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  seeMore: {
    alignSelf: "center",
    backgroundColor: COLORS.peachTile,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 6,
  },
  seeMoreText: { color: "white", fontWeight: "600" },
  pepoCard: { borderRadius: 22, padding: 16, minHeight: 240, justifyContent: "space-between" },
  pepoHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  pepoAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  pepoTitle: { flex: 1, fontSize: 22, fontWeight: "800", color: COLORS.text },
  bookmarkButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  pepoInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pepoInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#C5CEF0",
    paddingHorizontal: 16,
    color: COLORS.text,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#C5CEF0",
    alignItems: "center",
    justifyContent: "center",
  },
  navBarBackground: {
    backgroundColor: COLORS.peachLight,
    borderTopLeftRadius: NAV_RADIUS,
    borderTopRightRadius: NAV_RADIUS,
    overflow: "hidden",
    marginTop: -NAV_RADIUS,
  },
  navBar: { flexDirection: "row", justifyContent: "space-around", paddingTop: 8 },
  navItem: {
    width: 64,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  navItemActive: { backgroundColor: "rgba(255,255,255,0.28)" },
});
