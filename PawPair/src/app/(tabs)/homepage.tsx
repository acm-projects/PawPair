import { Text, View, StyleSheet } from "react-native";
import { useEffect, useState } from "react"; // 👑 Added useState
import { collection, addDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import PawNavBar from "@/components/PawNavBar";

export default function Homepage() {
  const router = useRouter();
  
  const [homepageVersion, setHomepageVersion] = useState<"pre" | "post">("pre");

  
  useEffect(() => {
    if (homepageVersion === "post") {
      router.replace("/homepages/PostHomepage");
    } else {
      router.replace("/homepages/PreHomepage");
    }
  }, [homepageVersion]);
    
  return (
    <View style={styles.container}>
      <Text>Loading your homepage setup...</Text>
      <PawNavBar active="/homepage" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3EDE8",
  },
});
