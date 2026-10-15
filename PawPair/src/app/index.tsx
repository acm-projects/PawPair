import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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