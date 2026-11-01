import { useEffect, useRef } from "react";
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  Image,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { useFonts } from "expo-font";

const pepoGoat = require("../../assets/images/pepo-goat.png");
const paw = require("../../assets/images/paw-watermark.png");

const FONT = "'Open Sans', system-ui, sans-serif";

function loadFont() {
  if (typeof document === "undefined") return;
  if (document.getElementById("open-sans-font")) return;
  const link = document.createElement("link");
  link.id = "open-sans-font";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap";
  document.head.appendChild(link);
}

const paws = [
  { top: "10%", left: "12%" },
  { top: "6%", left: "78%" },
  { top: "35%", left: "82%" },
  { top: "62%", left: "8%" },
  { top: "78%", left: "80%" },
  { top: "86%", left: "20%" },
] as const;

export default function Index() {
  const router = useRouter();

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
  }, [sway]);

  const translateX = sway.interpolate({
    inputRange: [-1, 1],
    outputRange: [-15, 15],
  });

  const rotate = sway.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-4deg", "4deg"],
  });

  const [fontsLoaded] = useFonts({
    HeadingFont: require("../../assets/Fonts/Matcha Style.ttf"),
    NameFont: require("../../assets/Fonts/NameFont.otf"),
  });

  useEffect(() => {
    loadFont();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.outer}>
      <View style={styles.container}>
        {paws.map((position, index) => (
          <Image key={index} source={paw} style={[styles.paw, position]} />
        ))}

        <View style={styles.heroSection}>
          <Text style={styles.title}>PawPair</Text>
          <Text style={styles.subtitle}>Find your perfect companion</Text>
        </View>

        <View style={styles.mascotContainer}>
          <Animated.Image
            source={pepoGoat}
            style={[
              styles.mascot,
              { transform: [{ translateX }, { rotate }] },
            ]}
          />
        </View>

        <View style={styles.actionSection}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.primaryButtonText}>Log In</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
            ]}
            onPress={() => router.push("/signup")}
          >
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: "#F3EDE8",
    alignItems: "center",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#F3EDE8",
    paddingTop: 80,
    paddingBottom: 50,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  paw: {
    position: "absolute",
    width: 52,
    height: 52,
    resizeMode: "contain",
    opacity: 0.18,
  },
  heroSection: {
    alignItems: "center",
    marginTop: 20,
    gap: 8,
  },
  title: {
    fontSize: 54,
    fontWeight: "bold",
    fontFamily: "HeadingFont",
    color: "#1A1A1A",
    textAlign: "center",
  },
  subtitle: {
    fontFamily: FONT,
    fontSize: 16,
    color: "#786862",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  mascotContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  mascot: {
    width: 140,
    height: 140,
    resizeMode: "contain",
  },
  actionSection: {
    width: "100%",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  primaryButton: {
    width: "90%",
    height: 50,
    backgroundColor: "#F4BFB2",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#E98F78",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonPressed: {
    backgroundColor: "#f4af9d",
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    fontFamily: FONT,
    fontSize: 17,
    fontWeight: "600",
    color: "white",
  },
  secondaryButton: {
    width: "90%",
    height: 50,
    backgroundColor: "#EEF0FB",
    borderWidth: 1.5,
    borderColor: "#C5CDF0",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonPressed: {
    backgroundColor: "#BFCBEC",
    transform: [{ scale: 0.98 }],
  },
  secondaryButtonText: {
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
});
