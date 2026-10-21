import { createUserProfile } from "../../services/userServices";
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from "react-native";

import { useState } from "react";
import { app } from "../../firebase.js";

import {
  getAuth,
  createUserWithEmailAndPassword
} from "firebase/auth";

import { Link } from "expo-router";

export default function Signup() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create PawPair Account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: "white" }}>Sign Up</Text>
        )}
      </TouchableOpacity>

      <Link href="/login">
        Already have an account? Login
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 15
  },
  title: {
    fontSize: 24,
    fontWeight: "bold"
  },
  input: {
    height: 45,
    borderRadius: 6,
    paddingHorizontal: 10,
    backgroundColor: "#f5f5f5",
    width: "90%"
  },
  button: {
    width: "90%",
    height: 45,
    backgroundColor: "teal",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center"
  }
});
