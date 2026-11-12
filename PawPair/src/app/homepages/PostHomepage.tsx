import { Text, View, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useNavigation } from "expo-router";
import { useLayoutEffect } from "react";
import PawNavBar from "@/components/PawNavBar";

export default function PostHomepage() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <View style={s.outer}>
      <SafeAreaView style={s.container} edges={["top"]}>
        <View style={s.center}>
          <Pressable
            style={({ pressed }) => [s.btn, pressed && s.btnPressed]}
            onPress={() => router.replace("/homepages/PreHomepage" as any)}
          >
            <Text style={s.btnText}>Switch to PreHomepage</Text>
          </Pressable>
        </View>

        <View style={s.navWrapper}>
          <PawNavBar active="/homepage" />
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1, backgroundColor: "#6b6b6b", alignItems: "center" },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#F3EDE8",
    overflow: "hidden",
    paddingBottom: 80,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  btn: {
    paddingHorizontal: 28,
    height: 56,
    borderRadius: 20,
    backgroundColor: "#F4BFB2",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  btnPressed: { backgroundColor: "#BFCBEC", opacity: 0.8 },
  btnText: { fontSize: 18, fontWeight: "600", color: "#000" },
  navWrapper: { position: "absolute", bottom: 0, left: 0, right: 0 },
});