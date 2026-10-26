import { createUserProfile } from "../../services/userServices";
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
} from "react-native";

import { useEffect, useState } from "react";
import { app } from "../../firebase.js";

import {
  getAuth,
  createUserWithEmailAndPassword
} from "firebase/auth";

import { Link, router, useRouter } from "expo-router";

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

export default function Signup() {
  const router = useRouter();
  const [focusedInput, setFocusedInput] = useState<"email" | "password" | "confirmPassword" |null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const isEmailValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const isPasswordValid = password.length >= 6;
  const isFormValid = isEmailValid && isPasswordValid && password === confirmPassword;
  const [fontsLoaded] = useFonts({
  HeadingFont: require("../../../assets/Fonts/Matcha Style.ttf"),
  NameFont: require("../../../assets/Fonts/NameFont.otf"),


});
useEffect(() => {
  loadFont();
}, []);

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

    Alert.alert(
      "Success",
      "Your PawPair account and profile were created!"
    );

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
      {paws.map((position, index) => (
      <Image
          key={index}
          source={paw}
          style={[styles.paw, position]}
        />
      ))}
      <Text style={styles.title}>Create PawPair Account</Text>

      <TextInput
        style={[styles.input, focusedInput === "email" && styles.inputFocused]}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        onFocus={() => setFocusedInput("email")}
        onBlur={() => setFocusedInput(null)}
      />

      <TextInput
        style={[styles.input, focusedInput === "password" && styles.inputFocused]}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        onFocus={() => setFocusedInput("password")}
        onBlur={() => setFocusedInput(null)}
      />

      <TextInput
        style={[styles.input, focusedInput === "confirmPassword" && styles.inputFocused]}
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        onFocus={() => setFocusedInput("confirmPassword")}
        onBlur={() => setFocusedInput(null)}
      />

      <Pressable
        style={({ pressed }) => [styles.button, isFormValid && styles.buttonEnabled, pressed && isFormValid && styles.buttonPressed]}
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Sign Up</Text>
        )}
      </Pressable>

      <Link href="/login" style={styles.link}>
        Already have an account? Login
      </Link>
    </View>
    </View>
  );
}

const paw = require("../../../assets/images/paw-watermark.png");
const paws = [
  { top: "75%", left: "16%" },
  { top: "85%", left: "45%" },
  { top: "90%", left: "15%" },
  { top: "90%", left: "85%" },
  { top: "11%", left: "11%" },
  { top: "7%", left: "79%" },

] as const;

const styles = StyleSheet.create({
  outer: {
      flex: 1,
      backgroundColor: "#6b6b6b",
      alignItems: "center",
    },
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 15,
      width: "100%",            
      maxWidth: 380,            
      backgroundColor: "#F3EDE8", 
      overflow: "hidden",

    },
    title: {
      fontSize: 38,
      fontWeight: "bold",
      fontFamily: "HeadingFont",
      transform: [{ translateY: -10 }],
      textAlign: "center",
    },
    buttonEnabled: {
      backgroundColor: "#f4af9d",
      opacity: 1,
    },
    input: {
      height: 45,
      borderRadius: 6,
      paddingHorizontal: 10,
      backgroundColor: "#F4BFB2",
      opacity: 0.85,
      width: "85%",
      fontFamily: FONT,
    },
    paw: {
    position: "absolute",
    width: 52,
    height: 52,
    resizeMode: "contain",
    opacity: 1.5,
  },
    button: {
      width: "90%",
      height: 45,
      backgroundColor: "#F4BFB2",
      borderRadius: 25,
      opacity:.5,
      justifyContent: "center",
      alignItems: "center",
    },
    inputFocused: {
      backgroundColor: "#BFCBEC",
      opacity: .75,
  },
    buttonPressed: {
      backgroundColor: "#BFCBEC",
      opacity: .55,
  },
    buttonText:{
      fontFamily: FONT,
      color:"white",
    },
    link: {
      fontFamily: FONT,
      fontSize: 13,
      transform: [{ translateY: 20 }],
      color: "#8B1A1A",
      textDecorationLine: "underline",
    },
});
