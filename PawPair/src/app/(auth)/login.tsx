import { useRouter } from "expo-router";

import {
  Text,
  View,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Pressable,
  Image,
  Animated,
  Easing,
} from "react-native";
const pepoGoat = require("../../../assets/images/pepo-goat.png");

import { useEffect, useRef, useState } from "react";
import { app } from "../../firebase.js";

import {
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { Link } from "expo-router";
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

export default function Login() {
  const router = useRouter();
  const [focusedInput, setFocusedInput] = useState<"email" | "password" |null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
    outputRange: [-15, 15],
  });

  const rotate = sway.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-4deg", "4deg"],
  });

  const isEmailValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const isPasswordValid = password.length >= 6;
  const isFormValid = isEmailValid && isPasswordValid;
  const [fontsLoaded] = useFonts({
  HeadingFont: require("../../../assets/Fonts/Matcha Style.ttf"),
  NameFont: require("../../../assets/Fonts/NameFont.otf"),


});
useEffect(() => {
  loadFont();
}, []);


  
async function handleLogin() {
  if (!email.trim() || !password) {
    Alert.alert("Error", "Please enter your email and password.");
    return;
  }

  setLoading(true);

  try {
    const auth = getAuth(app);

    const response = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

    console.log("Login successful:", response.user.email);


    router.replace("/discover");

  } catch (error: any) {
    console.error("Login error:", error.code, error.message);

    Alert.alert(
      "Login Failed",
      "Check your email and password."
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
      <Animated.Image
        source={pepoGoat}
        style={{
          position: "absolute",
          bottom: -12,
          alignSelf: "center",
          width: 85,
          height: 85,
          resizeMode: "contain",
          transform: [{ translateX }, { rotate }],
        }}
      />
      <Text style={styles.title}>Login to PawPair</Text>

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

      <Pressable
        style={({ pressed }) => [styles.button, isFormValid && styles.buttonEnabled, pressed && isFormValid && styles.buttonPressed]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </Pressable>

      <Link href="/signup" style={styles.link}>
        Don't have an account? Sign up
      </Link>
    </View>
  </View>
);
}
const paw = require("../../../assets/images/paw-watermark.png");
const paws = [
  { top: "75%", left: "16%" },
  { top: "85%", left: "45%" },
  { top: "65%", left: "85%" },
  { top: "90%", left: "85%" },
  { top: "11%", left: "11%" },
  { top: "7%", left: "79%" },

] as const;



export const styles = StyleSheet.create({
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
    overflow: "hidden"
  },
  title: {
    fontSize: 38,
    fontWeight: "bold",
    fontFamily: "HeadingFont",
    transform: [{ translateY: -10 }]
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
