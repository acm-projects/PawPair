import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { useEffect } from "react";
import { collection, addDoc } from "firebase/firestore";
import { useRouter } from "expo-router";

export default function Camera() {
 
  const router = useRouter();
    
  return (
    <View>
        <Text>camera page</Text>
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