import { useRouter } from "expo-router";
import { Text, View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useEffect, useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db, app } from "../firebase.js";

import {getAuth,signInWithEmailAndPassword,createUserWithEmailAndPassword} from 'firebase/auth'

export default function Index() {
    const router = useRouter();
    
  return (
    <View style={styles.container}>

      <TouchableOpacity onPress={() => router.push('/login')}>
        <Text style={{ color: 'teal', marginTop: 10 }}>login</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/signup' as any)}>
        <Text style={{ color: 'teal', marginTop: 10 }}>sign up</Text>
      </TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  button: {
    width: "90%",
    height: 45,
    backgroundColor: 'teal',
    borderRadius: 6,
    marginTop: 10,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    height: 45,
    borderRadius: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f5f5f5',
    width: "90%",
    alignSelf: "center",
  }
});