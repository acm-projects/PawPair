import { useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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

// 1) COLORS + DATA ----------------------------------------------------------

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


const PET = {
  name: "Barley",
  age: "4 yrs",
  breed: "Corgi",
  photo: "https://placedog.net/500/400?id=237",
};

type Task = {
  id: string;
  title: string;
  points: number;
  detail?: string; // a single line under the title
  subItems?: string[]; // or several small checkboxes under the title
};

const TASKS: Task[] = [
  { id: "routine", title: "Pet Routine", subItems: ["Feeding", "Walk"], points: 20 },
  { id: "training", title: "Training", detail: "Sit Command", points: 15 },
  { id: "health", title: "Health", detail: "Medication", points: 10 },
];

const TRACKERS = [
  { label: "Activity", Icon: TreePine },
  { label: "Mood", Icon: Smile },
  { label: "Appetite", Icon: Utensils },
];

const TIPS = [
  { id: "1", label: "CALM & COMFORT", title: "How to help a nervous dog" },
  { id: "2", label: "TIPS OF THE DAY", title: "Crate Training & Anxiety" },
];

const NAV_ITEMS = [
  { href: "/profile", label: "Profile", Icon: User },
  { href: "/homepage", label: "Homepage", Icon: House },
  { href: "/scrollview", label: "Scrollview", Icon: Dog },
  { href: "/camera", label: "Camera", Icon: CameraIcon },
] as const;

// 2) SMALL REUSABLE PIECE ---------------------------------------------------
// One checkbox, used for the big task boxes and the tiny sub-task boxes.
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

// 3) THE SCREEN -------------------------------------------------------------
export default function Homepage() {
  const router = useRouter();

  // "State": React remembers these and redraws the screen when they change.
  // done = which tasks are ticked, e.g. { routine: true, health: true }
  const [done, setDone] = useState<Record<string, boolean>>({
    routine: true,
    health: true,
  });
  const [question, setQuestion] = useState("");

  // Tap a task -> flip its value between true and false.
  const toggle = (id: string) => setDone((prev) => ({ ...prev, [id]: !prev[id] }));

  // The Pawtnership bar fills up as you tick tasks.
  const totalPoints = TASKS.reduce((sum, t) => sum + t.points, 0);
  const earnedPoints = TASKS.reduce((sum, t) => sum + (done[t.id] ? t.points : 0), 0);
  const progress = earnedPoints / totalPoints; // 0 to 1

  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <View style={styles.screen}>
      {/* Peach gradient behind everything */}
      <LinearGradient
        colors={[COLORS.peachLight, COLORS.peach]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Pet photo, then the name tab overlapping its bottom edge */}
        <Image source={{ uri: PET.photo }} style={styles.heroPhoto} />
        <View style={styles.nameTab}>
          <Text style={styles.petName}>{PET.name}</Text>
          <ChevronDown size={26} color={COLORS.text} />
        </View>

        {/* The big cream sheet that holds all the cards */}
        <View style={styles.sheet}>
          <Text style={styles.petMeta}>
            {PET.age} -- {PET.breed}
          </Text>

          {/* Daily Paw-gress */}
          <LinearGradient colors={["#C5CDF0", COLORS.cream]} style={styles.dailyOuter}>
            <View style={styles.dailyInner}>
              <Text style={styles.dailyTitle}>{today} - Daily Paw-gress</Text>

              {TASKS.map((task) => (
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

          {/* Activity / Mood / Appetite trackers */}
          <View style={styles.trackerRow}>
            {TRACKERS.map(({ label, Icon }) => (
              <TouchableOpacity key={label} style={styles.trackerTile}>
                <Icon size={44} color={COLORS.cream} strokeWidth={1.75} />
                <Text style={styles.trackerLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Pawtnership Points */}
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

          {/* Quick Tips & Articles */}
          <LinearGradient colors={["#EDBDB0", COLORS.cream]} style={styles.tipsCard}>
            <Text style={styles.sectionTitle}>Quick Tips & Articles</Text>
            {TIPS.map((tip) => (
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

          {/* Ask Pepo */}
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

      {/* Bottom nav */}
      <View style={styles.navBarBackground}>
        <SafeAreaView style={styles.navBar} edges={["bottom"]}>
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const isActive = href === "/homepage";
            return (
              <TouchableOpacity
                key={href}
                accessibilityLabel={label}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => router.navigate(href)}
              >
                <Icon size={32} color="white" strokeWidth={isActive ? 2.25 : 1.75} />
              </TouchableOpacity>
            );
          })}
        </SafeAreaView>
      </View>
    </View>
  );
}

// 4) STYLES -----------------------------------------------------------------
const NAV_RADIUS = 20;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.peach },
  scrollContent: { alignItems: "center", paddingTop: 56, paddingBottom: 40 },

  // Photo + name tab + sheet
  heroPhoto: {
    width: 230,
    height: 190,
    borderTopLeftRadius: 115, // arch shape; remove these two lines if you
    borderTopRightRadius: 115, // use a transparent cut-out PNG of the dog
    backgroundColor: "#eee",
  },
  nameTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -26, // pulls the tab up over the bottom of the photo
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 10,
  },
  petName: { fontSize: 40, fontWeight: "800", color: COLORS.text },
  sheet: {
    alignSelf: "stretch", // fill the full width
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 44,
    borderTopRightRadius: 44,
    padding: 16,
    gap: 16,
  },
  petMeta: { textAlign: "center", fontSize: 15, color: COLORS.text },

  // Daily Paw-gress card
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

  // Trackers
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

  // Pawtnership Points
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

  // Quick Tips
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

  // Ask Pepo
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

  // Bottom nav
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
