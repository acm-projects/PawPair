
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
  signInWithEmailAndPassword
} from "firebase/auth";

import { Link } from "expo-router";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

      Alert.alert("Login Successful", response.user.email ?? "");

    } catch (error) {
      console.error(error);
      Alert.alert("Login Failed", "Check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login to PawPair</Text>

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

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: "white" }}>Login</Text>
        )}
      </TouchableOpacity>

      <Link href="/signup">
        Don't have an account? Sign up
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
