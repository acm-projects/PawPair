import { Text, View, StyleSheet } from "react-native";
import { useEffect } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase.js";

export default function Index() {
 
    useEffect(() => {
      async function testFirestore() {
        try {
          const docRef = await addDoc(collection(db, "users"), {
            first: "Sanskriti",
            last: "Agarwal",
            born: 1815
          });
          console.log("Document written with ID: ", docRef.id);
        } catch (e) {
          console.error("Error adding document: ", e);
        }
      }
      testFirestore();
    }, []);
    
  return (
    <View style={styles.container}>
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