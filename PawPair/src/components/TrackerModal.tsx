import { useState } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { X, Check, PawPrint } from "lucide-react-native";

// One popup component that shows the Activity, Mood or Meal tracker,
// depending on the `kind` it is given.
export type TrackerKind = "activity" | "mood" | "meal";

const COLORS = {
  peach: "#E98F78",
  peachTile: "#EDB5A6",
  cream: "#F7F1EF",
  periwinkle: "#C3CBEF",
  chip: "#DFE3F5",
  text: "#1A1A1A",
};

const TITLES: Record<TrackerKind, string> = {
  activity: "Activity Tracker",
  mood: "Mood Tracker",
  meal: "Meal Tracker",
};

const ACTIVITIES = [
  "Food Puzzle Feeders",
  "Interactive Wand Toys",
  "Laser Pointers",
  "Vertical Climbing",
  "No Activity",
];

// Emoji stand in for your mood illustrations. To use diff pictures,
// replace the <Text> inside the blob with <Image source={require("...")} />.
const MOODS = [
  { id: "happy", emoji: "😊", color: "#F2C4D0" },
  { id: "stress", emoji: "😣", color: "#E0A59B" },
  { id: "sleepy", emoji: "😴", color: "#BFD3E6" },
  { id: "peaceful", emoji: "😌", color: "#B8D9BE" },
  { id: "normal", emoji: "😐", color: "#CFE3E3" },
  { id: "tired", emoji: "🥱", color: "#DADADA" },
  { id: "sad", emoji: "😢", color: "#9DB0E3" },
  { id: "anxiety", emoji: "😰", color: "#B9A8E0" },
  { id: "anger", emoji: "😠", color: "#E8909C" },
];

const WEEKDAYS = ["M", "T", "W", "Th", "F", "Sa", "S"];

// What we remember for ONE day.
type DayLog = { activities: string[]; mood: string | null; meals: string };
const EMPTY_LOG: DayLog = { activities: [], mood: null, meals: "" };

// 9 -> "9th", 1 -> "1st", 22 -> "22nd"
function ordinal(n: number) {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

// 1) THE CALENDAR -----------------------------------------------------------
function Calendar({
  selected,
  onSelect,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
}) {
  const year = selected.getFullYear();
  const month = selected.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // getDay() is 0 for Sunday. Our week starts on Monday, so shift by one.
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;

  // A flat list: empty cells for the days before the 1st, then 1..31.
  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // Cut the flat list into rows of 7.
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <LinearGradient colors={["#EEC3B7", COLORS.cream]} style={styles.calendar}>
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={styles.weekRow}>
          {row.map((day, c) => {
            if (day === null) return <View key={c} style={styles.dayCell} />;
            const isSelected = day === selected.getDate();
            return (
              <TouchableOpacity
                key={c}
                style={styles.dayCell}
                onPress={() => onSelect(new Date(year, month, day))}
              >
                <View style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}>
                  <Text style={styles.dayText}>{day}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </LinearGradient>
  );
}

// 2) THE POPUP --------------------------------------------------------------
export default function TrackerModal({
  visible,
  kind,
  onClose,
}: {
  visible: boolean;
  kind: TrackerKind;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(new Date());
  // All saved days, keyed by date, e.g. { "2026-10-9": { activities: [...], ... } }
  const [logs, setLogs] = useState<Record<string, DayLog>>({});

  const key = `${selected.getFullYear()}-${selected.getMonth() + 1}-${selected.getDate()}`;
  const log = logs[key] ?? EMPTY_LOG;

  // Change part of today's log and keep the rest as it was.
  const update = (patch: Partial<DayLog>) =>
    setLogs((prev) => ({ ...prev, [key]: { ...(prev[key] ?? EMPTY_LOG), ...patch } }));

  const toggleActivity = (name: string) => {
    let next: string[];
    if (name === "No Activity") {
      // "No Activity" cancels everything else
      next = log.activities.includes(name) ? [] : [name];
    } else {
      const others = log.activities.filter((a) => a !== "No Activity");
      next = others.includes(name) ? others.filter((a) => a !== name) : [...others, name];
    }
    update({ activities: next });
  };

  const hasEntry =
    log.activities.length > 0 || log.mood !== null || log.meals.trim().length > 0;

  const monthName = selected.toLocaleDateString("en-US", { month: "long" });
  const dateLabel = `Date - ${monthName} ${ordinal(selected.getDate())} ${selected.getFullYear()}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Tapping the dark area outside the card closes the popup */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Close"
          >
            <X size={22} color={COLORS.text} />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.cardContent}
          >
            <Text style={styles.title}>{TITLES[kind]}</Text>
            <Calendar selected={selected} onSelect={setSelected} />
            <Text style={styles.dateLabel}>{dateLabel}</Text>

            {/* ACTIVITY: a list of tappable options */}
            {kind === "activity" && (
              <View style={styles.activityList}>
                {ACTIVITIES.map((name) => {
                  const on = log.activities.includes(name);
                  return (
                    <TouchableOpacity
                      key={name}
                      style={styles.activityRow}
                      onPress={() => toggleActivity(name)}
                    >
                      <View style={[styles.activityDot, on && styles.activityDotOn]}>
                        {on && <Check size={18} color={COLORS.text} strokeWidth={3} />}
                      </View>
                      <Text style={styles.activityText}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* MOOD: a 3 x 3 grid, pick one */}
            {kind === "mood" && (
              <View style={styles.moodGrid}>
                {MOODS.map((m) => {
                  const on = log.mood === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={styles.moodCell}
                      onPress={() => update({ mood: on ? null : m.id })}
                    >
                      <View style={[styles.moodRing, on && styles.moodRingOn]}>
                        <View style={[styles.moodBlob, { backgroundColor: m.color }]}>
                          <Text style={styles.moodEmoji}>{m.emoji}</Text>
                        </View>
                      </View>
                      <Text style={styles.moodLabel}>{m.id}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* MEAL: a big text box */}
            {kind === "meal" && (
              <LinearGradient colors={["#C8D3F3", "#F2F2F2"]} style={styles.mealBox}>
                <TextInput
                  style={styles.mealInput}
                  multiline
                  textAlignVertical="top"
                  placeholder="Enter meals here"
                  placeholderTextColor="#A9B6E3"
                  value={log.meals}
                  onChangeText={(text) => update({ meals: text })}
                />
              </LinearGradient>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={[styles.saved, !hasEntry && styles.savedHidden]}>Log saved.</Text>
            <View style={styles.askPepo}>
              <Text style={styles.askPepoText}>Ask Pepo</Text>
              <View style={styles.askPepoAvatar}>
                <PawPrint size={20} color={COLORS.peach} />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// 3) STYLES -----------------------------------------------------------------
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "90%",
    maxWidth: 400,
    maxHeight: "88%",
    backgroundColor: COLORS.cream,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#EFB7A8",
    overflow: "hidden",
  },
  cardContent: { padding: 20, paddingTop: 22, gap: 18 },
  closeButton: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { textAlign: "center", fontSize: 32, fontWeight: "800", color: COLORS.text },
  dateLabel: { textAlign: "center", fontSize: 17, fontWeight: "700", color: COLORS.text },

  // Calendar
  calendar: { borderRadius: 18, padding: 6, paddingBottom: 12 },
  weekdayRow: {
    flexDirection: "row",
    backgroundColor: "#F3ECE8",
    borderRadius: 12,
    paddingVertical: 4,
    marginBottom: 6,
  },
  weekday: { flex: 1, textAlign: "center", fontSize: 14, color: COLORS.text },
  weekRow: { flexDirection: "row" },
  dayCell: { flex: 1, height: 38, alignItems: "center", justifyContent: "center" },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleSelected: { backgroundColor: "#D9DCF0" },
  dayText: { fontSize: 14, color: COLORS.text },

  // Activity
  activityList: { gap: 12 },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  activityDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.chip,
    alignItems: "center",
    justifyContent: "center",
  },
  activityDotOn: { backgroundColor: COLORS.peachTile },
  activityText: { fontSize: 17, color: COLORS.text },

  // Mood
  moodGrid: { flexDirection: "row", flexWrap: "wrap" },
  moodCell: { width: "33.333%", alignItems: "center", paddingVertical: 6 },
  moodRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  moodRingOn: { backgroundColor: "rgba(195,203,239,0.7)" },
  moodBlob: {
    width: 56,
    height: 50,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  moodEmoji: { fontSize: 26 },
  moodLabel: { fontSize: 12, color: COLORS.text, marginTop: 2 },

  // Meal
  mealBox: { borderRadius: 18, minHeight: 200 },
  mealInput: { minHeight: 200, padding: 16, fontSize: 17, color: COLORS.text },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  saved: { fontSize: 14, fontWeight: "600", color: COLORS.peachTile },
  savedHidden: { opacity: 0 }, // keeps the layout steady when nothing is saved yet
  askPepo: { flexDirection: "row", alignItems: "center", gap: 8 },
  askPepoText: { fontSize: 17, fontWeight: "700", color: "#B5C0EA" },
  askPepoAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E8F7",
    alignItems: "center",
    justifyContent: "center",
  },
});
