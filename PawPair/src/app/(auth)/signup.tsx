// Updated Signup Page

import { createUserProfile } from "../../services/userServices";
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from "react-native";

import { useEffect, useRef, useState } from "react";
import { app } from "../../firebase.js";

import {
  getAuth,
  createUserWithEmailAndPassword
} from "firebase/auth";

import { Link, useRouter } from "expo-router";

import { useFonts } from "expo-font";
const FONT = "'Open Sans', system-ui, sans-serif";

function loadFont() {
  if (typeof document === "undefined") return;
  if (document.getElementById("open-sans-font")) return;
  const link = document.createElement("link");
  link.id = "open-sans-font";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap";
  document.head.appendChild(link);
}

const PAW_BLUE = "#C9D6EA";
const PAW_PEACH = "#F2C4B8";
const PAW_OPACITY = 0.5;

const pepoGoat = require("../../../assets/images/pepo-goat.png");
const PEPO_SIZE = 100;

export default function Signup() {
  const router = useRouter();
  const [focusedInput, setFocusedInput] = useState<"email" | "password" | "confirmPassword" | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const isEmailValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const isPasswordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword;
  const isFormValid = isEmailValid && isPasswordValid && passwordsMatch;
  const [fontsLoaded] = useFonts({
    HeadingFont: require("../../../assets/Fonts/Matcha Style.ttf"),
    NameFont: require("../../../assets/Fonts/NameFont.otf"),
  });
  useEffect(() => {
    loadFont();
  }, []);

  // Pepo animations; added ducking when user types password
  const sway = useRef(new Animated.Value(0)).current;
  const duck = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sway]);

  const typingPassword = focusedInput === "password" || focusedInput === "confirmPassword";
  useEffect(() => {
    Animated.spring(duck, {
      toValue: typingPassword ? 1 : 0,
      friction: 7,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [typingPassword, duck]);

  const pepoX = sway.interpolate({ inputRange: [-1, 1], outputRange: [-15, 15] });
  const pepoTilt = sway.interpolate({ inputRange: [-1, 1], outputRange: ["-4deg", "4deg"] });
  const pepoDrop = duck.interpolate({ inputRange: [0, 1], outputRange: [0, PEPO_SIZE + 20] });

  async function handleSignup() {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const auth = getAuth(app);

      // Step 1: Create Firebase Authentication account
      const response = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      console.log("Account created:", response.user.email);

      // Step 2: Create Firestore user profile
      try {
        await createUserProfile(response.user);

        console.log("Profile saved successfully!");

        router.replace("/quiz");
      } catch (profileError) {
        console.error("Profile creation failed:", profileError);

        Alert.alert(
          "Profile Error",
          "Your account was created, but we could not save your profile."
        );
      }

    } catch (error: any) {
      console.error("Signup failed:", error.code, error.message);

      Alert.alert(
        "Signup Failed",
        error.message
      );
    } finally {
      setLoading(false);
    }
  }

  if (!fontsLoaded) return null;

  return (
    <View style={styles.outer}>
      <View style={styles.container}>
        {/* paw watermarks */}
        {paws.map((p, i) => (
          <Image
            key={i}
            source={paw}
            pointerEvents="none"
            style={[
              styles.paw,
              { tintColor: i % 2 === 1 ? PAW_BLUE : PAW_PEACH },
              { top: p.top, left: p.left, width: p.size, height: p.size, transform: [{ rotate: p.rotate }] },
            ]}
          />
        ))}

        <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Create Account</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, focusedInput === "email" && styles.inputFocused]}
                placeholder="you@example.com"
                placeholderTextColor="#B5AAA4"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onFocus={() => setFocusedInput("email")}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, focusedInput === "password" && styles.inputFocused]}
                placeholder="Your password"
                placeholderTextColor="#B5AAA4"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                onFocus={() => setFocusedInput("password")}
                onBlur={() => setFocusedInput(null)}
              />
              {password.length > 0 && !isPasswordValid && (
                <Text style={styles.hintError}>At least 6 characters</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={[styles.input, focusedInput === "confirmPassword" && styles.inputFocused]}
                placeholder="Your password"
                placeholderTextColor="#B5AAA4"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="new-password"
                onFocus={() => setFocusedInput("confirmPassword")}
                onBlur={() => setFocusedInput(null)}
                onSubmitEditing={handleSignup}
                returnKeyType="go"
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <Text style={styles.hintError}>Passwords don't match yet</Text>
              )}
            </View>

            <Pressable
              style={({ pressed }) => [styles.button, !isFormValid && styles.buttonDim, pressed && styles.buttonPressed]}
              onPress={handleSignup}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? <ActivityIndicator color="#1c1c1c" /> : <Text style={styles.buttonText}>Sign up</Text>}
            </Pressable>

            <Text style={styles.linkLine}>
              Already have an account?{" "}
              <Link href="/login" style={styles.link}>
                Log in
              </Link>
            </Text>
          </ScrollView>

          <Animated.Image
            source={pepoGoat}
            pointerEvents="none"
            accessibilityLabel={typingPassword ? "Pepo is looking away while you type your password" : "Pepo"}
            style={[
              styles.pepo,
              { transform: [{ translateX: pepoX }, { translateY: pepoDrop }, { rotate: pepoTilt }] },
            ]}
          />
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const paw = require("../../../assets/images/paw-watermark.png");
const paws = [
  { top: "6%", left: "58%", size: 70, rotate: "-18deg" },
  { top: "19%", left: "34%", size: 72, rotate: "12deg" },
  { top: "21%", left: "78%", size: 70, rotate: "20deg" },
  { top: "27%", left: "4%", size: 66, rotate: "-10deg" },
  { top: "33%", left: "62%", size: 54, rotate: "8deg" },
  { top: "41%", left: "79%", size: 60, rotate: "-12deg" },
  { top: "46%", left: "30%", size: 56, rotate: "16deg" },
  { top: "52%", left: "2%", size: 60, rotate: "-20deg" },
  { top: "57%", left: "62%", size: 58, rotate: "10deg" },
  { top: "62%", left: "34%", size: 48, rotate: "-8deg" },
  { top: "70%", left: "2%", size: 66, rotate: "14deg" },
  { top: "75%", left: "74%", size: 68, rotate: "-16deg" },
  { top: "82%", left: "30%", size: 62, rotate: "12deg" },
  { top: "86%", left: "55%", size: 62, rotate: "-10deg" },
  { top: "92%", left: "6%", size: 64, rotate: "18deg" },
  { top: "93%", left: "76%", size: 62, rotate: "-14deg" },
] as const;

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: "#F3EDE8",
    alignItems: "center",
  },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#F3EDE8",
    overflow: "hidden",
  },
  paw: {
    position: "absolute",
    resizeMode: "contain",
    opacity: PAW_OPACITY,
  },
  kav: {
    flex: 1,
    overflow: "hidden",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: PEPO_SIZE + 30,
  },
  pepo: {
    position: "absolute",
    bottom: -12,
    alignSelf: "center",
    width: PEPO_SIZE,
    height: PEPO_SIZE,
    resizeMode: "contain",
  },
  title: {
    fontFamily: "HeadingFont",
    fontSize: 52,
    color: "#111111",
    textAlign: "center",
    marginBottom: 36,
  },
  field: { marginBottom: 18 },
  label: {
    fontFamily: FONT,
    fontSize: 16,
    color: "#1c1c1c",
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#C5D0EE",
    backgroundColor: "rgba(247, 241, 239, 0.85)",
    paddingHorizontal: 18,
    fontFamily: FONT,
    fontSize: 16,
    color: "#1c1c1c",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  inputFocused: {
    borderColor: "#C3D0F0",
    borderWidth: 2.5,
  },
  hintError: {
    fontFamily: FONT,
    fontSize: 13,
    color: "#C0392B",
    marginTop: 6,
    marginLeft: 4,
  },
  button: {
    height: 53,
    borderRadius: 18,
    backgroundColor: "#C3D0F0",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonDim: { opacity: 0.6 },
  buttonPressed: { opacity: 0.75 },
  buttonText: {
    fontFamily: FONT,
    fontSize: 20,
    color: "#1c1c1c",
  },
  linkLine: {
    fontFamily: FONT,
    fontSize: 14,
    color: "#5C514A",
    textAlign: "center",
    marginTop: 22,
  },
  link: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "700",
    color: "#C2654F",
    textDecorationLine: "underline",
  },

});