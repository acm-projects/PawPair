import { useState } from "react";
import {
  View,
  Text,
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
  ArrowLeft,
  SlidersHorizontal,
  Search,
  Activity,
  Bell,
  Shield,
  Heart,
  BookOpen,
  Trophy,
  Flag,
  LogOut,
} from "lucide-react-native";

// 1) COLORS + DATA ----------------------------------------------------------
const COLORS = {
  peach: "#E98F78",
  peachLight: "#F5C0B3",
  cream: "#F7F1EF",
  search: "#DDE4EE",
  row: "#EAEAEC",
  text: "#1A1A1A",
  muted: "#8A8F99",
};

// Each row in the list. `href` is the screen it opens (leave it out for
// "coming soon" rows). `action: "logout"` is handled separately below.
const MENU: {
  label: string;
  Icon: typeof User;
  href?: string;
  action?: "logout";
}[] = [
  { label: "Your Account", Icon: User },
  { label: "Your Activity", Icon: Activity },
  { label: "Notifications", Icon: Bell },
  { label: "Account Privacy", Icon: Shield },
  { label: "Matches", Icon: Heart, href: "/matches" },
  { label: "Wishlist", Icon: BookOpen, href: "/starred" },
  { label: "Quiz Results", Icon: Trophy, href: "/quiz" },
  { label: "Report a Problem", Icon: Flag },
  { label: "Logout", Icon: LogOut, action: "logout" },
];

const NAV_ITEMS = [
  { href: "/profile", label: "Profile", Icon: User },
  { href: "/homepage", label: "Homepage", Icon: House },
  { href: "/scrollview", label: "Scrollview", Icon: Dog },
  { href: "/camera", label: "Camera", Icon: CameraIcon },
] as const;

// 2) THE SCREEN -------------------------------------------------------------
export default function Settings() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Typing in the search box hides rows that don't match.
  const visibleRows = MENU.filter((item) =>
    item.label.toLowerCase().includes(search.trim().toLowerCase())
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.navigate("/homepage");
  };

  const onRowPress = (item: (typeof MENU)[number]) => {
    if (item.action === "logout") {
      // TODO: sign the user out of Firebase here first, e.g. signOut(auth),
      // then send them back to the start screen.
      router.replace("/");
      return;
    }
    // "as never" just calms TypeScript's strict route checking.
    if (item.href) router.navigate(item.href as never);
  };

  return (
    <View style={styles.screen}>
      {/* Light peach at the top fading to darker peach at the bottom */}
      <LinearGradient
        colors={[COLORS.peachLight, COLORS.peach]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBack}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={18} color={COLORS.text} strokeWidth={2.25} />
        </TouchableOpacity>

        {/* Avatar + title */}
        <View style={styles.avatar}>
          <User size={140} color={COLORS.text} strokeWidth={1.25} />
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Settings & Privacy</Text>
          <SlidersHorizontal size={26} color={COLORS.text} strokeWidth={1.75} />
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Search size={22} color={COLORS.text} strokeWidth={1.75} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor={COLORS.muted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
        </View>

        {/* The menu rows */}
        <View style={styles.list}>
          {visibleRows.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.row}
              onPress={() => onRowPress(item)}
              activeOpacity={0.7}
            >
              <item.Icon size={24} color={COLORS.text} strokeWidth={1.75} />
              <Text style={styles.rowText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
          {visibleRows.length === 0 && (
            <Text style={styles.empty}>No settings match "{search}"</Text>
          )}
        </View>
      </ScrollView>

      {/* Bottom nav (Profile is the highlighted tab on this screen) */}
      <View style={styles.navBarBackground}>
        <SafeAreaView style={styles.navBar} edges={["bottom"]}>
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const isActive = href === "/profile";
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

// 3) STYLES -----------------------------------------------------------------
const NAV_RADIUS = 20;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.peach },
  scrollContent: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 40 },

  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: COLORS.text,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    alignSelf: "center",
    marginTop: 4,
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 2,
    borderColor: COLORS.text,
    alignItems: "center",
    justifyContent: "flex-end", // keeps the person low in the circle
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 18,
    marginBottom: 18,
  },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.search,
    paddingHorizontal: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  searchInput: { flex: 1, fontSize: 20, fontWeight: "700", color: COLORS.text },

  list: { gap: 14, paddingHorizontal: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.row,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  rowText: { fontSize: 21, fontWeight: "800", color: COLORS.text },
  empty: { textAlign: "center", color: COLORS.text, marginTop: 8 },

  // Bottom nav (same as the other screens)
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
