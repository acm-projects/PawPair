import React, { useState, useMemo, useRef } from "react";
import { Text, View, StyleSheet, Image, ScrollView, Pressable, Animated, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PETS_DATA } from "../../data/pets";
import { matchPet, starPet } from "../../store/petLists";
import { useRouter } from "expo-router";

const paw = require("../../../assets/images/paw-watermark.png");
const pawIcon = require("../../../assets/images/paw-icon.png");

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function Scrollview() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const busy = useRef(false); 
  const router = useRouter();


  const position = useMemo(() => new Animated.ValueXY({ x: 0, y: 0 }), []);

  const handleAction = (actionType: "reject" | "star" | "match") => {
    if (busy.current) return;
    busy.current = true;

    const pet = PETS_DATA[currentIndex];

    if (actionType === "match") matchPet(pet.id);
    if (actionType === "star") starPet(pet.id);

    const xTarget = actionType === "reject" ? -SCREEN_WIDTH * 1.2 : SCREEN_WIDTH * 1.2;

    Animated.timing(position, {
      toValue: { x: xTarget, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      setCurrentIndex((prev) => prev + 1);
      position.setValue({ x: 0, y: 0 });
      busy.current = false;
    });
  };

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ["-10deg", "0deg", "10deg"],
  });

  const animatedCardStyle = {
    transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }],
  };

  if (currentIndex >= PETS_DATA.length) {
    router.replace("/homepage");
    // return (
    //   <View style={[s.outer, { justifyContent: "center", alignItems: "center" }]}>
    //     <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>All caught up on reccs :)!</Text>
    //   </View>
    // );
  }

  const currentPet = PETS_DATA[currentIndex];

  return (
    <ScrollView style={s.outer} contentContainerStyle={{ padding: 16, alignItems: "center" }}>
      <Animated.View style={[s.card, animatedCardStyle]}>
        <Image source={{ uri: currentPet.image }} style={{ width: "100%", height: 285 }} />

        <View style={{ padding: 16 }}>
          <Image source={paw} style={[s.paw, { top: 35, right: 20 }]} />

          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text style={s.name}>{currentPet.name}</Text>
            <Text style={s.age}>{currentPet.age}</Text>
          </View>

          {currentPet.traits.map((t, i) => (
            <View key={i} style={s.trait}>
              <View style={s.iconBox}>
                <Image source={t.icon} style={{ width: t.size, height: t.size }} />
              </View>
              <Text style={s.small}>{t.text}</Text>
            </View>
          ))}

          <LinearGradient
            colors={["#F5C0B8", "#F6C69F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.contact}
          >
            <Image source={pawIcon} style={s.contactIcon} />
            <View>
              <Text style={s.small}>You can contact me at:</Text>
              <Text style={[s.small, { fontWeight: "bold" }]}>{currentPet.email}</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={s.section}>
          <Text style={s.title}>About me</Text>
          <Text style={s.body}>{currentPet.about}</Text>
        </View>

        <View style={s.section}>
          <Image source={paw} style={[s.paw, { bottom: 70, right: 20 }]} />

          <Text style={s.title}>Loves:</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {currentPet.loves.map((l, i) => (
              <View key={i} style={s.pill}>
                <Text style={s.pillText}>{l}</Text>
              </View>
            ))}
          </View>

          <View style={s.actions}>
            <Pressable
              onPress={() => handleAction("reject")}
              style={[s.btn, { borderColor: "#D32F2F", backgroundColor: "#FBEFEF" }]}
            >
              <Text style={[s.actionSymbol, { color: "#D32F2F" }]}>✕</Text>
            </Pressable>

            <Pressable
              onPress={() => handleAction("star")}
              style={[s.btn, { borderColor: "#6366F1", backgroundColor: "#ECEBFA" }]}
            >
              <Text style={[s.actionSymbol, { color: "#6366F1" }]}>★</Text>
            </Pressable>

            <Pressable
              onPress={() => handleAction("match")}
              style={[s.btn, { borderColor: "#2E7D32", backgroundColor: "#EAF7EE" }]}
            >
              <Text style={[s.actionSymbol, { color: "#2E7D32" }]}>✓</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1, backgroundColor: "#6b6b6b" },
  card: { width: "100%", maxWidth: 340, backgroundColor: "#F6F3EF", overflow: "hidden" },
  paw: { position: "absolute", width: 60, height: 60, resizeMode: "contain" },
  name: { fontSize: 22, fontWeight: "bold" },
  age: { fontSize: 17, marginLeft: 22 },
  trait: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  iconBox: { width: 24, height: 24, marginRight: 6, alignItems: "center", justifyContent: "center" },
  small: { fontSize: 11, color: "#222" },
  contact: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginTop: 14, padding: 10, width: 210, borderBottomWidth: 2, borderBottomColor: "#E0B4A8" },
  contactIcon: { width: 18, height: 18, marginRight: 8, resizeMode: "contain" },
  section: { padding: 16, borderTopWidth: 1, borderTopColor: "#BDB8B2" },
  title: { fontSize: 13, fontWeight: "bold", marginBottom: 8 },
  body: { fontSize: 12, lineHeight: 18, color: "#222" },
  pill: { backgroundColor: "#F5B8C4", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  pillText: { fontSize: 11, fontWeight: "600" },
  actions: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 24 },
  btn: { width: 54, height: 54, borderRadius: 27, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  actionSymbol: { fontSize: 24, fontWeight: "700" },
});