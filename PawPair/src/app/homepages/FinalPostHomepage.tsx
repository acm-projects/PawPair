import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Modal, Platform, Pressable, KeyboardAvoidingView, } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { useNavigation, useRouter, type Href } from "expo-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  arrayUnion,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
  limitToLast,
} from "firebase/firestore";
import { app, db } from "../../firebase.js";
import { STAGES, statusFor, useStatuses } from "../../data/petStatus";
import { useMatchedPets } from "../../data/livePets";
import TrackerModal, { type TrackerKind } from "src/components/TrackerModal";
import PawNavBar from "@/components/PawNavBar";
import {
  ChevronDown,
  Check,
  TreePine,
  Smile,
  Utensils,
  Newspaper,
  Bookmark,
  PawPrint,
  X,
  ExternalLink,
  Gift,
  Ticket,
  Bath,
  Cookie,
  ShoppingBag,
  Scissors,
  Send,
  ChevronLeft,
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

const BLUE = "#9DB0E3";
const BLUE_DEEP = "#7F93CC";
const BLUE_LIGHT = "#E4E9F7";

const pepoGoat = require("../../../assets/images/pepo-goat.png");

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

// Pawtnership rewards: points from daily care tasks unlock coupons.
// These are SAMPLE rewards for the demo. Swap in real partner offers later.
type Reward = { id: string; title: string; detail: string; cost: number };
const REWARDS: Reward[] = [
  { id: "groom10", title: "10% off grooming", detail: "At a partner groomer", cost: 100 },
  { id: "bakery", title: "Free pet bakery treat", detail: "One snack from a partner pet bakery", cost: 150 },
  { id: "supplies15", title: "15% off pet supplies", detail: "Toys, beds, bowls and more", cost: 200 },
  { id: "nailtrim", title: "Free nail trim", detail: "At a partner groomer", cost: 250 },
];

const REWARD_ICONS: Record<string, typeof Gift> = {
  groom10: Bath,
  bakery: Cookie,
  supplies15: ShoppingBag,
  nailtrim: Scissors,
};

type Coupon = { id: string; rewardId: string; title: string; code: string; used?: boolean };

function makeCouponCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I mix-ups
  let code = "PAW-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function TicketDashes() {
  return (
    <View style={styles.ticketDivider}>
      {Array.from({ length: 7 }).map((_, i) => (
        <View key={i} style={styles.ticketDash} />
      ))}
    </View>
  );
}

function RewardsPopup({
  points,
  coupons,
  redeeming,
  message,
  onRedeem,
  onClose,
}: {
  points: number;
  coupons: Coupon[];
  redeeming: string | null;
  message: string;
  onRedeem: (r: Reward) => void;
  onClose: () => void;
}) {
  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <Pressable style={[styles.popup, { maxHeight: "88%" }]} onPress={() => {}}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={12}>
          <X size={20} color={COLORS.peach} />
        </TouchableOpacity>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          <Text style={styles.popupTitle}>PAWTNERSHIP REWARDS</Text>
          <Text style={styles.rewardsBalance}>{points} pts</Text>
          <Text style={styles.popupSource}>Earn points by finishing daily care tasks.</Text>

          {REWARDS.map((r) => {
            const canAfford = points >= r.cost;
            const Icon = REWARD_ICONS[r.id] ?? Gift;
            return (
              <View key={r.id} style={styles.ticket}>
                <View style={styles.ticketStub}>
                  <Icon size={26} color={BLUE_DEEP} />
                </View>
                <TicketDashes />
                <View style={styles.ticketBody}>
                  <Text style={styles.rewardTitle}>{r.title}</Text>
                  <Text style={styles.rewardDetail}>{r.detail}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.redeemButton, !canAfford && styles.redeemButtonOff]}
                  disabled={!canAfford || !!redeeming}
                  onPress={() => onRedeem(r)}
                >
                  {redeeming === r.id ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.redeemText}>{r.cost} pts</Text>
                  )}
                </TouchableOpacity>
                <View style={[styles.notch, styles.notchLeft]} />
                <View style={[styles.notch, styles.notchRight]} />
              </View>
            );
          })}

          {!!message && <Text style={styles.rewardMessage}>{message}</Text>}

          <Text style={[styles.popupSection, { marginTop: 6 }]}>My coupons</Text>
          {coupons.length === 0 ? (
            <Text style={styles.popupSource}>No coupons yet. Keep earning points!</Text>
          ) : (
            coupons.map((c) => {
              const Icon = REWARD_ICONS[c.rewardId] ?? Ticket;
              return (
                <View key={c.id} style={[styles.ticket, styles.ticketOwned]}>
                  <View style={styles.ticketStub}>
                    <Icon size={24} color={BLUE_DEEP} />
                  </View>
                  <TicketDashes />
                  <View style={styles.ticketBody}>
                    <Text style={styles.rewardTitle}>{c.title}</Text>
                    <Text style={styles.couponCode}>{c.code}</Text>
                  </View>
                  <View style={[styles.notch, styles.notchLeft]} />
                  <View style={[styles.notch, styles.notchRight]} />
                </View>
              );
            })
          )}
          <Text style={styles.popupNote}>Sample rewards for demo purposes. Show your code at checkout.</Text>
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

type Article = { id: string; label: string; title: string; source: string; url: string; tips: string[] };

// Real articles from trusted animal-welfare groups to help each pet settle in.
// The first two show on the homepage; "See More" shows the rest.
const ADOPTION_BASICS: Article = {
  id: "333",
  label: "THE 3-3-3 RULE",
  title: "What to expect in the first 3 days, 3 weeks & 3 months",
  source: "ASPCA",
  url: "https://www.aspca.org/adopt-pet/adoption-tips",
  tips: ["First 3 days: your pet may feel nervous and overwhelmed. Keep things quiet and give them space.", "First 3 weeks: they start learning your routine and feeling more settled.", "First 3 months: trust builds and their true personality starts to show."],
};

const ARTICLES: Record<string, Article[]> = {
  dog: [
    { id: "dog-new", label: "FIRST DAYS", title: "Tips for a new dog", source: "ASPCA",
      url: "https://www.aspca.org/pet-care/general-pet-care/tips-new-dog",
      tips: ["Try not to leave your new dog home alone for the first couple of days.", "Keep treats handy to reward good behavior as it happens.", "A predictable routine helps your dog feel safe and build trust."] },
    ADOPTION_BASICS,
    { id: "dog-intro", label: "MEETING OTHER PETS", title: "Introducing dogs to each other", source: "ASPCA",
      url: "https://www.aspca.org/pet-care/general-pet-care/introducing-dogs-each-other",
      tips: ["Put away food bowls, chews, toys and beds the dogs might not want to share.", "Let them meet on neutral ground, like a park, rather than at home.", "Introduce one dog at a time, and keep rewarding calm behavior."] },
    { id: "dog-home", label: "SETTLING IN", title: "Helpful hints for bringing your new dog home", source: "Ontario SPCA",
      url: "https://ontariospca.ca/blog/helpful-hints-for-bringing-your-new-dog-home/",
      tips: ["Have all the supplies ready before your dog comes home.", "Bring them home on a day you can spend with them.", "Wait to introduce lots of new people until your dog seems settled."] },
  ],
  cat: [
    { id: "cat-new", label: "FIRST DAYS", title: "Tips for a new cat", source: "ASPCA",
      url: "https://www.aspca.org/pet-care/general-pet-care/tips-new-cat",
      tips: ["Start your cat in one small, quiet room with the door closed.", "Let them explore the rest of the home slowly, once they seem confident.", "Most cats need a few days or more to settle, so be patient."] },
    ADOPTION_BASICS,
    { id: "cat-intro", label: "MEETING OTHER PETS", title: "Introducing your cat to a new cat", source: "ASPCA",
      url: "https://www.aspca.org/pet-care/general-pet-care/introducing-your-cat-new-cat",
      tips: ["Go slowly. Cat friendships can take a long time to form.", "If you have several cats, introduce each one to the newcomer separately.", "Patience matters more than speed."] },
  ],
  bird: [
    { id: "bird-new", label: "FIRST DAYS", title: "Congratulations! You've adopted a bird", source: "Ontario SPCA",
      url: "https://ontariospca.ca/blog/congratulations-youve-adopted-a-bird/",
      tips: ["Set up the cage before your bird comes home.", "Give them quiet time to adjust before lots of handling.", "Book a check-up with a bird-savvy (avian) vet."] },
    { id: "bird-expect", label: "SETTLING IN", title: "What to expect when adopting a bird", source: "Ontario SPCA",
      url: "https://ontariospca.ca/blog/what-to-expect-when-adopting-a-bird/",
      tips: ["Many birds are happiest with a compatible bird companion.", "Plan for a proper cage setup, a good diet and daily social time.", "Expect a settling-in period while your bird gets used to you."] },
    ADOPTION_BASICS,
    { id: "bird-vet", label: "CARE BASICS", title: "What to expect when adopting a new bird", source: "ZuPreem (Dr. Laurie Hess)",
      url: "https://zupreem.com/what-should-i-expect-when-adopting-a-new-bird/",
      tips: ["Research your bird's species and needs before bringing them home.", "Birds are long-term companions, so think about the commitment.", "Ask your vet about diet and care for your specific bird."] },
  ],
  small_animal: [
    { id: "rabbit-new", label: "FIRST DAYS", title: "Congratulations! You've adopted a rabbit", source: "Ontario SPCA",
      url: "https://ontariospca.ca/blog/congratulations-youve-adopted-a-rabbit/",
      tips: ["See a rabbit-savvy vet within the first week.", "Set up safe housing with room to move, plus hay and fresh water.", "Give them toys and chew items to keep them busy."] },
    { id: "rabbit-home", label: "SETTLING IN", title: "Bringing bunny home", source: "Humane Society of Sonoma County",
      url: "https://humanesocietysoco.org/adopt/welcoming-your-new-rabbit",
      tips: ["Start your bunny in a small space for the first few days.", "Imagine your home from a small rabbit's eye level and remove hazards.", "Don't force handling. Let them come to you."] },
    ADOPTION_BASICS,
    { id: "rabbit-expect", label: "CARE BASICS", title: "What to expect when adopting a rabbit", source: "Ontario SPCA",
      url: "https://ontariospca.ca/blog/what-to-expect-when-adopting-a-rabbit/",
      tips: ["Rabbits are social and often do best with a rabbit friend.", "Their diet, housing and care are more involved than many people expect.", "Regular vet check-ups help catch problems early."] },
  ],
};

const ARTICLE_KEYS: Record<string, string> = {
  rabbit: "small_animal",
  hamster: "small_animal",
  guinea_pig: "small_animal",
  small_animal: "small_animal",
};

function articlesFor(species?: string): Article[] {
  const key = speciesKey(species);
  return ARTICLES[ARTICLE_KEYS[key] ?? key] ?? [ADOPTION_BASICS];
}

function ArticlePopup({ article, onClose }: { article: Article; onClose: () => void }) {
  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <Pressable style={styles.popup} onPress={() => {}}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={12}>
          <X size={20} color={COLORS.peach} />
        </TouchableOpacity>

        <Text style={styles.popupLabel}>{article.label}</Text>
        <Text style={styles.popupTitle}>{article.title.toUpperCase()}</Text>
        <Text style={styles.popupSource}>From {article.source}</Text>

        <View style={styles.popupTips}>
          <Text style={styles.popupSection}>Key tips</Text>
          {article.tips.map((tip) => (
            <View key={tip} style={styles.popupTipRow}>
              <PawPrint size={14} color={COLORS.peach} style={{ marginTop: 3 }} />
              <Text style={styles.popupBody}>{tip}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.readButton} onPress={() => openArticle(article.url)}>
          <ExternalLink size={18} color="white" />
          <Text style={styles.readButtonText}>Read the full article</Text>
        </TouchableOpacity>
        <Text style={styles.popupNote}>General guidance, not veterinary advice.</Text>
      </Pressable>
    </Pressable>
  );
}

async function openArticle(url: string) {
  // On web, open a normal new browser tab (not a pop-up window).
  if (Platform.OS === "web") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  // On a phone, open it inside the app.
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    Linking.openURL(url).catch(() => {});
  }
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
  const [pawPoints, setPawPoints] = useState(0);
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
          const pts = snapshot.data()?.pawPoints;
          setPawPoints(typeof pts === "number" ? pts : 0);
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

  const tasks = useMemo(() => tasksFor(pet?.species), [pet?.species]);

  // Daily tasks are saved per pet, per day, in Firestore:
  //   users/{uid}/dailyTasks/{YYYY-MM-DD}_{petId} -> { done: { taskId: true } }
  // Checking a task adds its points to users/{uid}.pawPoints; unchecking removes them.
  const [done, setDone] = useState<Record<string, boolean>>({});
  const dayKey = todayKey();
  useEffect(() => {
    setDone({});
    if (!uid || !activePetId) return;
    return onSnapshot(
      doc(db, "users", uid, "dailyTasks", `${dayKey}_${activePetId}`),
      (snap) => setDone((snap.data()?.done as Record<string, boolean>) ?? {}),
      (error) => console.error("Could not load today's tasks:", error)
    );
  }, [uid, activePetId, dayKey]);

  const toggle = async (id: string) => {
    if (!uid || !activePetId) return;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const nowDone = !done[id];
    const next = { ...done, [id]: nowDone };
    setDone(next); // feels instant; Firestore confirms a moment later
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, "users", uid, "dailyTasks", `${dayKey}_${activePetId}`), { done: next, petId: activePetId, date: dayKey }, { merge: true });
      batch.set(doc(db, "users", uid), { pawPoints: increment(nowDone ? task.points : -task.points) }, { merge: true });
      await batch.commit();
    } catch (error) {
      console.error("Could not save task:", error);
      setDone(done); // undo on failure
    }
  };

  // Coupons the user has redeemed: users/{uid}/coupons
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  useEffect(() => {
    setCoupons([]);
    if (!uid) return;
    return onSnapshot(
      query(collection(db, "users", uid, "coupons"), orderBy("createdAt", "desc")),
      (snap) => setCoupons(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Coupon, "id">) }))),
      (error) => console.error("Could not load coupons:", error)
    );
  }, [uid]);

  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [rewardMessage, setRewardMessage] = useState("");

  async function redeem(reward: Reward) {
    if (!uid || redeeming) return;
    setRedeeming(reward.id);
    setRewardMessage("");
    try {
      const code = makeCouponCode();
      await runTransaction(db, async (tx) => {
        const userRef = doc(db, "users", uid);
        const current = (await tx.get(userRef)).data()?.pawPoints ?? 0;
        if (current < reward.cost) throw new Error("Not enough points yet.");
        tx.set(userRef, { pawPoints: current - reward.cost }, { merge: true });
        tx.set(doc(collection(db, "users", uid, "coupons")), {
          rewardId: reward.id,
          title: reward.title,
          code,
          used: false,
          createdAt: serverTimestamp(),
        });
      });
      setRewardMessage(`🎉 Redeemed! Your code: ${code}`);
    } catch (error: any) {
      console.error("Could not redeem reward:", error);
      setRewardMessage(error?.message === "Not enough points yet." ? error.message : "Could not redeem. Please try again.");
    } finally {
      setRedeeming(null);
    }
  }

  const [question, setQuestion] = useState("");

  // ---- Ask Pepo chat ----
  // Messages live in users/{uid}/pepoMessages. The worker answers anything with
  // status "pending" (see backend/ml-server/pepo.py) and adds Pepo's reply.
  type ChatMessage = { id: string; role: "user" | "pepo"; text: string; status?: string };
  // Each pet gets its own chat: users/{uid}/pepoChats/{petId}/messages
  const chatKey = activePetId ?? "general";
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");
const chatScrollRef = useRef<any>(null);
  useEffect(() => {
    setChat([]);
    if (!uid) return;
    return onSnapshot(
      query(collection(db, "users", uid, "pepoChats", chatKey, "messages"), orderBy("createdAt"), limitToLast(30)),
      (snap) => setChat(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, "id">) }))),
      (error) => console.error("Could not load Pepo chat:", error)
    );
  }, [uid, chatKey]);
  const pepoThinking = chat.some((m) => m.role === "user" && (m.status === "pending" || m.status === "answering"));

  async function askPepo(text?: string) {
    const q = (text ?? question).trim().slice(0, 1000);
    if (!q || sending) return;
    if (!uid) {
      setChatError("Please log in to chat with Pepo.");
      return;
    }
    setSending(true);
    setChatError("");
    try {
      const batch = writeBatch(db);
      batch.set(doc(collection(db, "users", uid, "pepoChats", chatKey, "messages")), {
        role: "user",
        text: q,
        status: "pending",
        petId: activePetId ?? null,
        createdAt: serverTimestamp(),
      });
      batch.set(
        doc(db, "users", uid),
        { pepoPending: true, pepoPendingChats: arrayUnion(chatKey) },
        { merge: true }
      );
      await batch.commit();
      setQuestion("");
    } catch (error: any) {
      console.error("Could not send question to Pepo:", error);
      setChatError(
        String(error?.code ?? "").includes("permission")
          ? "Pepo can't receive messages (Firestore permission denied)."
          : "Couldn't send your question. Check your connection and try again."
      );
    } finally {
      setSending(false);
    }
  }

  // "Ask Pepo" in the tracker pop-up jumps down to the Ask Pepo chat box here.
const scrollRef = useRef<any>(null);  // react-native's TextInput ref typing is stricter than the emitted component instance here.
  const pepoInputRef = useRef<any>(null);
  const sheetY = useRef(0);
  const pepoCardY = useRef(0);
  const goToPepo = () => {
    scrollRef.current?.scrollTo({ y: Math.max(sheetY.current + pepoCardY.current - 20, 0), animated: true });
    setTimeout(() => pepoInputRef.current?.focus(), 450);
  };
  const [tracker, setTracker] = useState<TrackerKind>("activity");
  const [trackerOpen, setTrackerOpen] = useState(false);
  const openTracker = (kind: TrackerKind) => {
    setTracker(kind);
    setTrackerOpen(true);
  };

  const articles = useMemo(() => articlesFor(pet?.species), [pet?.species]);
  const [showAllArticles, setShowAllArticles] = useState(false);
  const shownArticles = showAllArticles ? articles : articles.slice(0, 2);
  const [openArticleItem, setOpenArticleItem] = useState<Article | null>(null);
  const totalPoints = tasks.reduce((sum, task) => sum + task.points, 0);
  const earnedPoints = tasks.reduce(
    (sum, task) => sum + (done[task.id] ? task.points : 0),
    0
  );
  const progress = totalPoints ? earnedPoints / totalPoints : 0;
  // The cheapest reward the user can't afford yet is the "next" goal.
  const nextReward = REWARDS.find((r) => r.cost > pawPoints) ?? null;
  const rewardProgress = nextReward ? Math.min(pawPoints / nextReward.cost, 1) : 1;
  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Shared bottom navigation, visible in all states.
  const bottomNav = (
    <View style={styles.navOverlap}>
      <PawNavBar active="/homepage" />
    </View>
  );
    const backToPre = (
    <TouchableOpacity
      style={styles.backButton}
      onPress={() => router.replace("/homepages/PreHomepage" as Href)}
      accessibilityLabel="Back to pre-adoption homepage"
    >
      <ChevronLeft size={18} color={COLORS.peach} strokeWidth={2.5} />
      <Text style={styles.backText}>Pre-Adoption</Text>
    </TouchableOpacity>
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
        <PawBackground />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.text} />
          <Text style={styles.emptyText}>Loading your pet...</Text>
        </View>
        {backToPre}
        {bottomNav}
      </View>
    );
  }

  if (!uid || profileError || petError || !pet) {
    return (
      <View style={styles.screen}>
        <LinearGradient colors={[COLORS.peachLight, COLORS.peach, COLORS.peach]} locations={[0, 0.35, 0.6]} style={StyleSheet.absoluteFill} />
        <PawBackground />
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
        {backToPre}
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
      <LinearGradient
        colors={[COLORS.peachLight, COLORS.peach, COLORS.cream]}
        locations={[0, 0.35, 0.6]}
        style={StyleSheet.absoluteFill}
      />
      <PawBackground />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="never"
      >
        {/* The exact selected pet's Firestore photo and identity */}
        <Image source={photoFor(pet)} style={styles.heroPhoto} />
        <View style={styles.nameWrap}>
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
        </View>

        <View style={styles.sheet} onLayout={(e) => (sheetY.current = e.nativeEvent.layout.y)}>
          <Text style={styles.petMeta}>{meta || "Adopted companion"}</Text>

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

          <TouchableOpacity
            style={styles.pointsCard}
            activeOpacity={0.8}
            onPress={() => {
              setRewardMessage("");
              setRewardsOpen(true);
            }}
            accessibilityLabel="Open Pawtnership rewards"
          >
            <View style={styles.pointsLeft}>
              <Text style={styles.pointsTitle}>Pawtnership Points · {pawPoints} pts</Text>
              <View style={styles.pointsTrack}>
                <View style={[styles.pointsFill, { width: `${rewardProgress * 100}%` }]} />
              </View>
              <Text style={styles.pointsCaption}>
                {nextReward
                  ? `${nextReward.cost - pawPoints} pts until ${nextReward.title.toLowerCase()}. Tap for rewards!`
                  : "You can redeem any reward. Tap to choose!"}
              </Text>
            </View>
            <View style={styles.badge}>
              <Gift size={30} color="white" />
            </View>
          </TouchableOpacity>

          <LinearGradient colors={["#EDBDB0", COLORS.cream]} style={styles.tipsCard}>
            <Text style={styles.sectionTitle}>Quick Tips & Articles</Text>
            {shownArticles.map((article) => (
              <TouchableOpacity
                key={article.id}
                style={styles.tipRow}
                onPress={() => setOpenArticleItem(article)}
                accessibilityRole="button"
                accessibilityLabel={`${article.title}, from ${article.source}`}
              >
                <Newspaper size={36} color="#B9C3EC" strokeWidth={1.5} />
                <View style={styles.tipText}>
                  <Text style={styles.tipLabel}>{article.label}</Text>
                  <Text style={styles.tipTitle}>{article.title}</Text>
                  <Text style={styles.tipSource}>{article.source}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {articles.length > 2 && (
              <TouchableOpacity style={styles.seeMore} onPress={() => setShowAllArticles((v) => !v)}>
                <Text style={styles.seeMoreText}>{showAllArticles ? "Show Less" : "See More"}</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>

          <LinearGradient
            colors={[COLORS.periwinkle, COLORS.periwinkleLight]}
            style={styles.pepoCard}
            onLayout={(e) => (pepoCardY.current = e.nativeEvent.layout.y)}
          >
            <View style={styles.pepoHeader}>
              <View style={styles.pepoAvatar}>
                <Image source={pepoGoat} style={styles.pepoImage} />
              </View>
              <Text style={styles.pepoTitle}>Ask Pepo</Text>
              <TouchableOpacity style={styles.bookmarkButton}>
                <Bookmark size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView
              ref={chatScrollRef}
              style={styles.chatArea}
              contentContainerStyle={styles.chatContent}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
            >
              {chat.length === 0 ? (
                <View style={styles.chatEmpty}>
                  <Text style={styles.chatEmptyText}>
                    Hi! I'm Pepo 🐐 Ask me anything about caring for {pet?.name || "your pet"}.
                  </Text>
                  {[
                    `How can I help ${pet?.name || "my pet"} settle in?`,
                    "What should a daily routine look like?",
                    "What foods are dangerous for my pet?",
                  ].map((s) => (
                    <TouchableOpacity key={s} style={styles.chatChip} onPress={() => askPepo(s)}>
                      <Text style={styles.chatChipText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                chat.map((m) =>
                  m.role === "user" ? (
                    <View key={m.id} style={[styles.bubble, styles.bubbleUser]}>
                      <Text style={styles.bubbleText}>{m.text}</Text>
                    </View>
                  ) : (
                    <View key={m.id} style={styles.pepoRow}>
                      <View style={styles.bubbleAvatar}>
                        <Image source={pepoGoat} style={styles.bubbleAvatarImage} />
                      </View>
                      <View style={[styles.bubble, styles.bubblePepo]}>
                        <Text style={styles.bubbleText}>{m.text}</Text>
                      </View>
                    </View>
                  )
                )
              )}
              {pepoThinking && <Text style={styles.typing}>Pepo is typing…</Text>}
            </ScrollView>

            <View style={styles.pepoInputRow}>
              <TextInput
                ref={pepoInputRef}
                style={styles.pepoInput}
                placeholder="Ask a question"
                placeholderTextColor="#9AA6D6"
                value={question}
                onChangeText={setQuestion}
                onSubmitEditing={() => askPepo()}
                onFocus={() => {
                  setChatError("");
                  setTimeout(() => {
                    scrollRef.current?.scrollTo({
                      y: Math.max(sheetY.current + pepoCardY.current - 20, 0),
                      animated: true,
                    });
                  }, 250);
                }}
                returnKeyType="send"
                maxLength={1000}
              />
              <TouchableOpacity
                style={[styles.micButton, (!question.trim() || sending) && { opacity: 0.5 }]}
                onPress={() => askPepo()}
                disabled={!question.trim() || sending}
                accessibilityLabel="Send question to Pepo"
              >
                {sending ? <ActivityIndicator size="small" color="#8C99D6" /> : <Send size={18} color="#8C99D6" />}
              </TouchableOpacity>
            </View>
            {!!chatError && <Text style={styles.chatError}>{chatError}</Text>}
            <Text style={styles.chatNote}>Pepo gives general tips, not veterinary advice.</Text>
          </LinearGradient>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
      {backToPre}

      {bottomNav}

      <Modal
        visible={rewardsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRewardsOpen(false)}
      >
        <RewardsPopup
          points={pawPoints}
          coupons={coupons}
          redeeming={redeeming}
          message={rewardMessage}
          onRedeem={redeem}
          onClose={() => setRewardsOpen(false)}
        />
      </Modal>

      <Modal
        visible={!!openArticleItem}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenArticleItem(null)}
      >
        {openArticleItem && (
          <ArticlePopup article={openArticleItem} onClose={() => setOpenArticleItem(null)} />
        )}
      </Modal>

      <TrackerModal
        visible={trackerOpen}
        kind={tracker}
        onClose={() => setTrackerOpen(false)}
        onAskPepo={goToPepo}
      />
    </View>
  );
}

// Light paw prints drawn over the background gradient (not tappable)
function PawBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {PAWS.map(({ size, rotate, ...position }, i) => (
        <View key={i} style={{ position: "absolute", ...position, transform: [{ rotate }] }}>
          <PawPrint size={size} color="rgb(248, 231, 233)" strokeWidth={1.5} opacity={0.5} />
        </View>
      ))}
    </View>
  );
}

const PAWS = [
  { top: 6, left: 8, rotate: "-20deg", size: 45 },
  { top: 30, right: 10, rotate: "15deg", size: 45 },
  { top: "22%", left: 5, rotate: "25deg", size: 45 },
  { top: "45%", left: 6, rotate: "-15deg", size: 45 },
  { top: "66%", left: 5, rotate: "30deg", size: 45 },
  { top: "15%", right: 5, rotate: "-25deg", size: 45 },
  { top: "35%", right: 6, rotate: "10deg", size: 45 },
  { top: "56%", right: 5, rotate: "-30deg", size: 45 },
] as const;

const NAV_RADIUS = 20;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.cream },
  scrollContent: { flexGrow: 1, alignItems: "center", paddingTop: 56 },
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
    height: 190 + 32,
    borderTopLeftRadius: 115,
    borderTopRightRadius: 115,
    backgroundColor: "#eee",
  },
  // Holds the name tab and its dropdown. Sits above the cream card so the
  // dropdown can float over it.
  nameWrap: {
    alignItems: "center",
    marginTop: -26 - 32, // overlaps the bottom of the photo
    zIndex: 10,
    elevation: 10,
  },
  nameTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 10,
  },
  petName: { fontSize: 40, fontWeight: "800", color: COLORS.text },
  pickerPanel: {
    position: "absolute",
    top: "100%",
    marginTop: 6,
    alignSelf: "center",
    minWidth: 230,
    backgroundColor: "rgba(230, 232, 244, 0.95)",
    padding: 10,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  pickerOption: { flexDirection: "row", gap: 10, justifyContent: "space-between", padding: 10 },
  pickerText: { fontWeight: "700", color: COLORS.text },
  sheet: {
    alignSelf: "stretch",
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 44,
    borderTopRightRadius: 44,
    padding: 16,
    paddingBottom: NAV_RADIUS + 8,
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
    backButton: {
    position: Platform.OS === "web" ? ("fixed" as any) : "absolute",
    top: 25,
    left: 14,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 34,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 17,
    backgroundColor: "rgba(247, 241, 239, 0.95)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  backText: { fontSize: 12, fontWeight: "700", color: COLORS.peach },
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
    backgroundColor: COLORS.peachLight,
    borderWidth: 2,
    borderColor: "white",
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
  tipSource: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(60, 60, 60, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  popup: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: COLORS.cream,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: "#edab9b",
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    gap: 10,
  },
  closeButton: { position: "absolute", top: 14, right: 16, zIndex: 1 },
  popupLabel: { fontSize: 11, letterSpacing: 1, color: "#9AA6D6", textAlign: "center", fontWeight: "700" },
  popupTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
    textAlign: "center",
    textDecorationLine: "underline",
    paddingHorizontal: 12,
  },
  popupSource: { fontSize: 13, color: COLORS.muted, textAlign: "center" },
  popupTips: { backgroundColor: "white", borderRadius: 20, padding: 14, gap: 10, marginTop: 4 },
  popupSection: { fontSize: 15, fontWeight: "800", color: COLORS.peach },
  popupTipRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  popupBody: { flex: 1, fontSize: 15, lineHeight: 21, color: COLORS.text },
  readButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.peach,
    borderRadius: 18,
    paddingVertical: 13,
    marginTop: 6,
  },
  readButtonText: { color: "white", fontSize: 16, fontWeight: "700" },
  popupNote: { fontSize: 11, color: COLORS.muted, textAlign: "center" },
  rewardsBalance: { fontSize: 34, fontWeight: "900", color: COLORS.peach, textAlign: "center" },
  ticket: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 14,
    paddingRight: 22,
    minHeight: 76,
  },
  ticketOwned: { borderWidth: 1.5, borderColor: BLUE },
  ticketStub: {
    width: 64,
    alignSelf: "stretch",
    backgroundColor: BLUE_LIGHT,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketDivider: {
    alignSelf: "stretch",
    justifyContent: "space-evenly",
    paddingVertical: 8,
    marginRight: 12,
  },
  ticketDash: { width: 2, height: 5, borderRadius: 1, backgroundColor: BLUE },
  ticketBody: { flex: 1, paddingVertical: 12, paddingRight: 8 },
  notch: {
    position: "absolute",
    top: "50%",
    marginTop: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.cream,
  },
  notchLeft: { left: -9 },
  notchRight: { right: -9 },
  rewardTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  rewardDetail: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  redeemButton: {
    backgroundColor: BLUE,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 76,
    alignItems: "center",
  },
  redeemButtonOff: { backgroundColor: COLORS.peachLight },
  redeemText: { color: "white", fontWeight: "800", fontSize: 13 },
  rewardMessage: { textAlign: "center", fontSize: 14, fontWeight: "700", color: COLORS.text },
  couponCode: { fontSize: 16, fontWeight: "900", letterSpacing: 1.5, color: COLORS.text },
  seeMore: {
    alignSelf: "center",
    backgroundColor: COLORS.peachTile,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 6,
  },
  seeMoreText: { color: "white", fontWeight: "600" },
  pepoCard: { borderRadius: 22, padding: 16, minHeight: 240, justifyContent: "space-between", gap: 10 },
  chatArea: { maxHeight: 320, backgroundColor: "rgba(255,255,255,0.55)", borderRadius: 18 },
  chatContent: { padding: 10, gap: 8 },
  chatEmpty: { gap: 8 },
  chatEmptyText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  chatChip: {
    alignSelf: "flex-start",
    backgroundColor: "white",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#C5CEF0",
  },
  chatChipText: { fontSize: 13, color: COLORS.text },
  pepoRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, maxWidth: "88%" },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  bubbleAvatarImage: { width: 34, height: 34, resizeMode: "contain" },
  bubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, maxWidth: "88%" },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: COLORS.peachLight, borderBottomRightRadius: 4 },
  bubblePepo: { backgroundColor: "white", borderBottomLeftRadius: 4, flexShrink: 1 },
  bubbleText: { fontSize: 14, lineHeight: 20, color: COLORS.text },
  typing: { fontSize: 12, fontStyle: "italic", color: "#7C88C4", marginLeft: 34 },
  chatNote: { fontSize: 10, color: "#7C88C4", textAlign: "center" },
  chatError: { fontSize: 12, color: "#C0392B", textAlign: "center", fontWeight: "600" },
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
  pepoImage: {
  width: 65,
  height: 65,
  resizeMode: "contain",
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.peachLight,
    alignItems: "center",
    justifyContent: "center",
  },
  navOverlap: { marginTop: -NAV_RADIUS },
});