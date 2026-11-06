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

const petDuo = require("../../assets/images/pet-duo.png");
const paw = require("../../assets/images/paw-watermark.png");
const pepoGoat = require("../../assets/images/pepo-goat.png");

const FONT = "'Open Sans', system-ui, sans-serif";

// ---------- DOG + CAT TUNING (only change these) ----------
const IMG_W = 515; // pet-duo.png real width in pixels
const IMG_H = 485; // pet-duo.png real height in pixels
const PETS_WIDTH = 0.8; // fraction of the screen width
const PETS_SINK = 0.08; // how much of the image's HEIGHT to push below the bottom edge.
                        // Still floating? raise it (0.12, 0.16, 0.2...). Cut off? lower it.
const PETS_SHIFT_X = 0.04; // nudges left to cancel uneven side padding. 0 = no nudge
// ----------------------------------------------------------

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

const paws = [
  { top: "4%", left: "8%", size: 54, rotate: "-12deg" },
  { top: "35%", left: "84%", size: 54, rotate: "10deg" },
  { top: "52%", left: "4%", size: 54, rotate: "-10deg" },
  { top: "54%", left: "86%", size: 54, rotate: "12deg" },
  { top: "90%", left: "2%", size: 54, rotate: "-15deg" },
  { top: "88%", left: "88%", size: 54, rotate: "12deg" },
] as const;

export default function Index() {
  const router = useRouter();
  const sway = useRef(new Animated.Value(0)).current;
  const { width: screenW } = useWindowDimensions();

  const colW = Math.min(screenW, 380);
  const petW = colW * PETS_WIDTH;
  const petH = petW * (IMG_H / IMG_W);

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
        {/* paw watermarks */}
        {paws.map((p, i) => (
          <Image
            key={i}
            source={paw}
            style={[
              styles.paw,
              {
                top: p.top,
                left: p.left,
                width: p.size,
                height: p.size,
                transform: [{ rotate: p.rotate }],
              },
            ]}
          />
        ))}

        {/* goat circle (circle stays still, goat sways) */}
        <View style={styles.goatCircle}>
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

        {/* logo + tagline */}
        <View style={styles.header}>
          <Text style={styles.title}>PAWPAIR</Text>
          <Text style={styles.tagline}>Find your paw-tner</Text>
        </View>

        {/* login button + signup link */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.buttonText}>Login</Text>
          </Pressable>

          <Text style={styles.signupText}>
            Don't have an account?{" "}
            <Link href="/signup" style={styles.link}>
              Sign up.
            </Link>
          </Text>
        </View>

        {/* dog + cat: original uncropped image, sunk to the bottom edge */}
        <Image
          source={petDuo}
          style={{
            position: "absolute",
            bottom: -petH * PETS_SINK,
            alignSelf: "center",
            width: petW,
            height: petH,
            resizeMode: "contain",
            transform: [{ translateX: -petW * PETS_SHIFT_X }],
          }}
        />
      </View>
    </View>
  );
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
  },
  paw: {
    position: "absolute",
    resizeMode: "contain",
    opacity: 1,
  },
  goatCircle: {
    position: "absolute",
    top: "2%",
    left: "32%",
    width: "36%",
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: "#BFCBEC",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    position: "absolute",
    top: "23%",
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
    fontFamily: "NameFont",
    fontSize: 26,
    color: "#1c1c1c",
    marginTop: 4,
  },
  actions: {
    position: "absolute",
    top: "42%",
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  button: {
    width: "78%",
    height: 60,
    borderRadius: 20,
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
  signupText: {
    fontFamily: FONT,
    fontSize: 13,
    color: "#1c1c1c",
  },
  link: {
    fontFamily: FONT,
    fontSize: 13,
    color: "#1c1c1c",
    textDecorationLine: "underline",
  },
});