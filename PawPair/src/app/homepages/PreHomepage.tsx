import { useEffect, useRef } from "react";
import { Text, View, StyleSheet, Image, Pressable, TouchableOpacity, ImageStyle, ViewStyle } from "react-native";
import { User, House, Dog, Camera as CameraIcon, Star, MoveRight, Check } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Tabs, router } from "expo-router";
import { useFonts } from "expo-font";
import { Animated, Easing } from "react-native";
const pepoGoat = require("../../../assets/images/pepo-goat.png");
import PawNavBar from "@/components/PawNavBar";

const paw = require("../../../assets/images/paw-watermark.png");

const CURRENT_HREF: string = "/homepage";
const FONT = "'Open Sans', system-ui, sans-serif";

function loadFont() {
  if (typeof document === "undefined") return;
  if (document.getElementById("open-sans-font")) return;
  const link = document.createElement("link");
  link.id = "open-sans-font";
  link.rel = "stylesheet";
  link.href = "https://googleapis.com";
  document.head.appendChild(link);
}

const paws = [
  { top: 0, left: "75%" },
  
  { top: "38%", left: "55%" },
  { top: "79%", left: "15%" },
  { top: "78%", left: "73%" },
] as const;

const NAV_ITEMS = [
  { href: "/profile", label: "Profile", Icon: User },
  { href: "/homepage", label: "Homepage", Icon: House },
  { href: "/scrollview", label: "Scrollview", Icon: Dog },
  { href: "/camera", label: "Camera", Icon: CameraIcon },
] as const;

type CardData = {
  label: string;
  href: string;
  accessory?: "arrow" | "check";
  paws: ImageStyle[];
  stars?: ViewStyle[];
};

const CARDS: CardData[] = [
  {
    label: "Start Swiping",
    href: "/swiping",
    accessory: "arrow",
    paws: [
      { top: 10, right: 22, transform: [{ rotate: "15deg" }] },
      { bottom: 12, left: 34, transform: [{ rotate: "-15deg" }] },
    ],
  },
  {
    label: "See Starred",
    href: "/starred",
    paws: [
      { bottom: 10, left: 46, transform: [{ rotate: "-15deg" }] },
      { top: 8, right: 18, transform: [{ rotate: "15deg" }] },
    ],
    stars: [
      { top: 18, left: 18 },
      { bottom: 14, right: 28 },
    ],
  },
  {
    label: "See Matches",
    href: "/matches",
    accessory: "check",
    paws: [
      { top: 10, right: 40, transform: [{ rotate: "10deg" }] },
      { bottom: 12, left: 28, transform: [{ rotate: "-10deg" }] },
    ],
  },
];

export default function Homepage() {
  const sway = useRef(new Animated.Value(0)).current;

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
  }, []);

  const translateX = sway.interpolate({
    inputRange: [-1, 1],
    outputRange: [-10, 10],
  });

  const rotate = sway.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-4deg", "4deg"],
  });
  const [fontsLoaded] = useFonts({
    HeadingFont: require("../../../assets/Fonts/Matcha Style.ttf"),
    NameFont: require("../../../assets/Fonts/NameFont.otf"),
  });

  useEffect(() => {
    loadFont();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <View style={s.outer}>
      <Tabs.Screen options={{ headerShown: false, tabBarStyle: { display: "none" } }} />

      <SafeAreaView style={s.container} edges={["top"]}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {paws.map((p, i) => (
            <Image key={i} source={paw} style={[s.paw, p]} />
          ))}
        </View>

        <View style={s.header}>
          <Text style={s.hello}>Welcome!</Text>
          <Animated.Image
            source={pepoGoat}
            style={[
              s.avatarImg, 
              {
                position: "absolute",
                bottom: -12,
                alignSelf: "center",
                transform: [
                  { translateX: 120 }, 
                  { translateY: -10 },
                  { translateX: translateX }, 
                  { rotate: rotate },
                ],
              }
            ]}
          />
        </View>

        <View style={s.list}>
          {CARDS.map((c) => (
            <LinearGradient
              key={c.href}
              colors={["#F4BFB2", "#F3E6DF"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={s.card}
            >
              {c.paws.map((p, i) => (
                <Image key={`p${i}`} source={paw} style={[s.cardPaw, p]} />
              ))}

              {c.stars?.map((st, i) => (
                <View key={`s${i}`} style={[s.abs, st]}>
                  <Star size={18} color="#6B6BFF" fill="#6B6BFF" strokeWidth={1.5} />
                </View>
              ))}

              <Pressable style={s.cardPress} onPress={() => router.navigate(c.href as any)}>
                <Text style={s.cardText}>{c.label}</Text>
                {c.accessory === "arrow" && <MoveRight size={40} color="#000" strokeWidth={1.25} />}
                {c.accessory === "check" && <Check size={28} color="#6EE08F" strokeWidth={2.25} />}
              </Pressable>
            </LinearGradient>
          ))}
        </View>

        <Text style={s.tagline}>Find your paw-tner</Text>

        <View style={s.navWrapper}>
          <PawNavBar active="/homepage" />
        </View>
      </SafeAreaView>
    </View>
  );
}

const NAV_RADIUS = 20;
const CARD_HEIGHT = 120;

const s = StyleSheet.create({
  outer: { flex: 1, backgroundColor: "#6b6b6b", alignItems: "center" },
  container: { 
    flex: 1, 
    width: "100%", 
    maxWidth: 380, 
    backgroundColor: "#F3EDE8", 
    overflow: "hidden",
    paddingBottom: 80, 
    paddingTop: 24, 
  },
  paw: { position: "absolute", width: 52, height: 52, resizeMode: "contain", opacity: 1.4},

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    marginTop: 16, 
    marginBottom: 16,
  },
  hello: { fontFamily: FONT, fontSize: 26, fontWeight: "700", color: "#1F1F1F" },
  avatarImg: { width: 54, height: 54, resizeMode: "contain" },

  list: {
    flex: 1,
    paddingHorizontal: 18,
    gap: 18,
  },
  card: {
    flex: 1,
    maxHeight: CARD_HEIGHT,
    minHeight: 70,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  cardPress: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  cardPaw: { position: "absolute", width: 32, height: 32, resizeMode: "contain", opacity: 0.55 },
  abs: { position: "absolute" },
  cardText: { fontFamily: "NameFont", fontSize: 32, lineHeight: 38, color: "#000" },

  tagline: {
    fontFamily: "NameFont",
    fontSize: 23,
    textAlign: "center",
    paddingTop: 14,
    paddingBottom: 18,
    color: "#000",
    transform: [{ translateY: -2}],
  },
  navWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  }
});
