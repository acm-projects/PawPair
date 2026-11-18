import { Text, View, StyleSheet } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import PawNavBar from "@/components/PawNavBar";
import useHadAdopted from "@/data/hadAdopted";
import { useSavedAdoption, FINAL_POST_HOME, PRE_HOME } from "@/data/adoptionRoute";

export default function Homepage() {
  const router = useRouter();
  const adoptedThisSession = useHadAdopted();
  const { ready, adopted } = useSavedAdoption();

  useEffect(() => {
    if (!ready) return; // wait for Firestore so there's no flash of the wrong page
    router.replace(((adopted || adoptedThisSession) ? FINAL_POST_HOME : PRE_HOME) as any);
  }, [ready, adopted, adoptedThisSession]);

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