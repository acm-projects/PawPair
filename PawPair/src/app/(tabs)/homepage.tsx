import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { useEffect } from "react";
import { collection, addDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import PawNavBar from "@/components/PawNavBar";

//use a useState in ts to go to the specific homepage based on the current state it's on
export default function Homepage() {
 
  const router = useRouter();
    
  return (
    <View>
        <Text>homepage</Text>
        <PawNavBar active="/homepage" />
        
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