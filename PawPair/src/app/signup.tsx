import { Text, View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useEffect, useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase.js";

import { app } from "../firebase.js";

import {getAuth,signInWithEmailAndPassword,createUserWithEmailAndPassword} from 'firebase/auth'

export default function Signup() {
    const [loading, setLoading] = useState(false)

    const [email,setEmail] = useState('');
    const [password,setPassword] = useState('');

    async function registerAndLogin() {
      setLoading(true);
      try {
        const auth = getAuth(app);
        await createUserWithEmailAndPassword(auth, email, password);
        const response = await signInWithEmailAndPassword(auth, email, password);
        setLoading(false);
        Alert.alert('Success', response.user.uid);
        return;

      } catch (error) {
        setLoading(false);
        Alert.alert('Oops', 'something went wrong');
      }
    }

    useEffect(() => {
      async function testFirestore() {
        try {
          const docRef = await addDoc(collection(db, "users"), {
            first: "Ariyan",
            last: "Biswas",
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
      <TextInput style={styles.input} placeholder="Email"
        onChangeText={setEmail}
      />
      <TextInput 
        style={[styles.input, {marginTop: 15}]}
        placeholder="Password"
        onChangeText={setPassword}
        />

      <TouchableOpacity style={styles.button} onPress={registerAndLogin}>
        { loading ? (
        <ActivityIndicator 
          size={"small"} 
          color={"white"} 
          animating={loading}
         /> 
        ) : (
          <Text style={{ color: 'white' }}>Login</Text>
        )}
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