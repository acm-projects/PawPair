// Updated landing page

import { Link, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  Easing,
  useWindowDimensions,
} from "react-native";
import { useFonts } from "expo-font";

const paw = require("../../assets/images/paw-watermark.png");
const pepoGoat = require("../../assets/images/pepo-goat.png");

const FONT = "'Open Sans', system-ui, sans-serif";

const PAW_PEACH = "#F2C4B8";
const PAW_BLUE = "#AFC0E3";
const PAW_OPACITY = 0.3;

const PETS_WIDTH = 0.8;
const PETS_SINK = 0.08; 
const PETS_SHIFT_X = 0.04; 

function loadFont() {
  if (typeof document === "undefined") return;
  if (document.getElementById("open-sans-font")) return;
  const link = document.createElement("link");
  link.id = "open-sans-font";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap";
  document.head.appendChild(link);
}


const topPaws = [
  { top: "12%", left: "6%", size: 56, rotate: "-12deg" },
  { top: "8%", left: "44%", size: 52, rotate: "14deg" },
  { top: "18%", left: "80%", size: 58, rotate: "18deg" },
  { top: "52%", left: "22%", size: 50, rotate: "-8deg" },
  { top: "48%", left: "64%", size: 54, rotate: "10deg" },
] as const;


const sidePaws = [
  { top: "-6%", left: "5%", size: 44, rotate: "-14deg" },
  { top: "58%", left: "17%", size: 40, rotate: "10deg" },
  { top: "4%", right: "16%", size: 40, rotate: "16deg" },
  { top: "64%", right: "4%", size: 44, rotate: "-10deg" },
] as const;

const bottomPaws = [
  { top: "14%", left: "10%", size: 54, rotate: "-16deg" },
  { top: "10%", left: "70%", size: 56, rotate: "12deg" },
  { top: "42%", left: "40%", size: 52, rotate: "8deg" },
  { top: "62%", left: "4%", size: 58, rotate: "-18deg" },
  { top: "60%", left: "80%", size: 56, rotate: "14deg" },
] as const;

export default function Index() {
  const router = useRouter();
  const sway = useRef(new Animated.Value(0)).current;
  const { width: screenW } = useWindowDimensions();

  const colW = Math.min(screenW, 380);
  const petW = colW * PETS_WIDTH;
  const goatSize = colW * 0.36; 

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

  const [fontsLoaded] = useFonts({
    HeadingFont: require("../../assets/Fonts/Matcha Style.ttf"),
    NameFont: require("../../assets/Fonts/NameFont.otf"),
  });

  const translateX = sway.interpolate({
    inputRange: [-1, 1],
    outputRange: [-15, 15],
  });

  const rotate = sway.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-4deg", "4deg"],
  });

  useEffect(() => {
    loadFont();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.outer}>
      <View style={styles.container}>
        {/* empty space ABOVE the content, paws go here */}
        <View style={styles.pawZone}>{renderPaws(topPaws, 0)}</View>

        {/* goat + title + buttons, centered as one group */}
        <View style={styles.centerGroup}>
          {/* goat row: side paws + goat circle */}
          <View style={styles.goatRow}>
            {renderPaws(sidePaws, 1)}

            {/* goat circle (circle stays still, goat sways) */}
            <View
              style={[styles.goatCircle, { width: goatSize, height: goatSize }]}
            >
              <Animated.Image
                source={pepoGoat}
                style={{
                  width: "100%",
                  height: "100%",
                  resizeMode: "contain",
                  transform: [{ translateX }, { rotate }],
                }}
              />
            </View>
          </View>

          {/* logo + tagline */}
          <View style={styles.header}>
            <Text style={styles.title}>PAWPAIR</Text>
            <Text style={styles.tagline}>From First Match to Forever Home</Text>
          </View>

          {/* signup button + login button */}
          <View style={styles.actions}>
              <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push("/signup")}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Sign up</Text>
            </Pressable>
          
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.secondaryPressed,
              ]}
              onPress={() => router.push("/login")}
            >
              <Text style={styles.buttonText}>Log in</Text>
            </Pressable>

          </View>
        </View>

        {/* empty space BELOW the content, paws go here */}
        <View style={styles.pawZone}>{renderPaws(bottomPaws, 1)}</View>
      </View>
    </View>
  );
}

type PawSpot = {
  top: string;
  left?: string;
  right?: string;
  size: number;
  rotate: string;
};

function renderPaws(list: readonly PawSpot[], offset: number) {
  return list.map((p, i) => (
    <Image
      key={i}
      source={paw}
      style={[
        styles.paw,
        {
          top: p.top as any,
          left: p.left as any,
          right: p.right as any,
          width: p.size,
          height: p.size,
          transform: [{ rotate: p.rotate }],
          tintColor: (i + offset) % 2 === 1 ? PAW_BLUE : PAW_PEACH,
        },
      ]}
    />
  ));
}

export const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: "#F5EFEB",
    alignItems: "center",
  },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#F5EFEB",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  pawZone: {
    flex: 1,
    width: "100%",
    overflow: "hidden",
  },
  paw: {
    position: "absolute",
    resizeMode: "contain",
    opacity: PAW_OPACITY,
  },
  centerGroup: {
    width: "100%",
    alignItems: "center",
    gap: 28, 
  },
  goatRow: {
    width: "100%",
    alignItems: "center",
  },
  goatCircle: {
    borderRadius: 999,
    backgroundColor: "#BFCBEC",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    width: "100%",
    alignItems: "center",
  },
  title: {
    fontFamily: "HeadingFont",
    fontSize: 72,
    color: "#1c1c1c",
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 20,
    color: "#5C514A",
    marginTop: 10,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "400",
    color: "#1c1c1c",
    marginTop: 4,
    fontFamily: FONT,
  },
  actions: {
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  button: {
    width: "78%",
    height: 50,
    borderRadius: 15,
    backgroundColor: "#F7BEB0",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonPressed: {
    backgroundColor: "#BFCBEC",
    opacity: 0.8,
  },
  buttonText: {
    fontFamily: FONT,
    fontSize: 20,
    color: "#1c1c1c",
  },
  secondaryButton: {
    width: "78%",
    height: 50,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#F7BEB0",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryPressed: {
    backgroundColor: "#F7BEB0",
    opacity: 0.8,
  },
  secondaryText: {
    fontFamily: FONT,
    fontSize: 20,
    color: "#C2654F",
  },
});