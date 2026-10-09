import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { useEffect } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { useRouter } from "expo-router";
import { Button } from "expo-router/build/react-navigation/index.js";

export default function Index() {
 
  const router = useRouter();
    
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.navigate('/camera')}>
        <Text>Go to Camera</Text>
      </TouchableOpacity>
      <Text>Edit src/app/index.tsx to edit this screen. hi</Text>
    </View>
  );



}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});