import { Text, View, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import PawNavBar from "@/components/PawNavBar";
import useHadAdopted from "@/data/hadAdopted";

export default function Homepage() {
  const router = useRouter();
  const hasAdopted = useHadAdopted();

  const [homepageVersion, setHomepageVersion] = useState<"pre" | "post">(
    hasAdopted ? "post" : "pre"
  );

  // automatically flip pre/post when adoption status changes
  useEffect(() => {
    setHomepageVersion(hasAdopted ? "post" : "pre");
  }, [hasAdopted]);

  // go to the matching page
  useEffect(() => {
    if (homepageVersion === "post") {
      router.replace("/homepages/PostHomepage" as any);
    } else {
      router.replace("/homepages/PreHomepage" as any);
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