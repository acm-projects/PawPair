import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { useEffect } from "react";
import { collection, addDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import PawNavBar from "@/components/PawNavBar";


export default function Profile() {
 
  const router = useRouter();
    
  return (
    <View>
        <Text>profile</Text>
        <PawNavBar active="/profile" />
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