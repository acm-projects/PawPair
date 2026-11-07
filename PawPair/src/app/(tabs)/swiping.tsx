import React, { useEffect, useMemo, useRef } from "react";
import { Text, View, StyleSheet, Image, ScrollView, Pressable, Animated, Dimensions, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PETS_DATA } from "../../data/pets";
import { matchPet } from "../../store/petLists";
import { markSwiped, useSwiped } from "../../store/swiped";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

const paw = require("../../../assets/images/paw-watermark.png");
const pepoGoat = require("../../../assets/images/pepo-goat.png");
const pawIcon = require("../../../assets/images/paw-icon.png");

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function Scrollview() {
  const busy = useRef(false);
  const router = useRouter();
  const swiped = useSwiped();
  const hop = useRef(new Animated.Value(0)).current;

  const sway = useRef(new Animated.Value(0)).current;

  const position = useMemo(() => new Animated.ValueXY({ x: 0, y: 0 }), []);
  // only pets that haven't been swiped yet; the first one is always on top
  const deck = PETS_DATA.filter((p) => !swiped.has(p.id));
  const currentPet = deck[0];
  useEffect(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(sway, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(sway, {
            toValue: -1,
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(sway, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }, [sway]);
  
    useEffect(() => {
      const jump = () =>
        Animated.sequence([
          Animated.timing(hop, {
            toValue: -16,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(hop, {
            toValue: 0,
            duration: 220,
            easing: Easing.bounce,
            useNativeDriver: true,
          }),
        ]);
      Animated.sequence([jump(), Animated.delay(80), jump()]).start();
    }, [hop]);
  
    const translateX = sway.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] });
    const rot = sway.interpolate({ inputRange: [-1, 1], outputRange: ["-5deg", "5deg"] });
  

  const handleAction = (actionType: "reject" | "match") => {
    if (busy.current || !currentPet) return;
    busy.current = true;

    const pet = currentPet;

    if (actionType === "match") matchPet(pet.id);
    const xTarget = actionType === "reject" ? -SCREEN_WIDTH * 1.2 : SCREEN_WIDTH * 1.2;

    Animated.timing(position, {
      toValue: { x: xTarget, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      markSwiped(pet.id); // remember it so it never shows again
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

  if (!currentPet) {
    return (
      <View style={[s.outer, s.emptyWrap]}>
        <View style={s.emptyGroup}>
          {/* paw prints placed around the content (ignore touches) */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Image source={paw} style={[s.paw, { top: -80, left: -20, transform: [{ rotate: "-12deg" }] }]} />
            <Image source={paw} style={[s.paw, { top: -120, right: -50, transform: [{ rotate: "10deg" }] }]} />
            <Image source={paw} style={[s.paw, { bottom: -90, left: -30, transform: [{ rotate: "-15deg" }] }]} />
            <Image source={paw} style={[s.paw, { bottom: -40, right: -20, transform: [{ rotate: "12deg" }] }]} />
          </View>

          <Animated.Image
            source={pepoGoat}
            style={[
              s.pepo,
              { transform: [{ translateY: hop }, { translateX }, { rotate: rot }] },
            ]}
          />
          <Text style={s.emptyText}>That's all the pets!</Text>
          <Pressable style={s.emptyBtn} onPress={() => router.replace("/homepage" as any)}>
            <Text style={s.emptyBtnText}>Home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.mainWrapper}>
      <ScrollView
        style={s.outer}
        contentContainerStyle={{ padding: 16, paddingTop: 12, alignItems: "center" }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[s.card, animatedCardStyle]}>
          <View style={s.imageContainer}>
            <Image source={{ uri: currentPet.image }} style={s.petImage} />

            <Pressable
              style={s.backButton}
              onPress={() => router.navigate("homepages/PreHomepage" as any)}
            >
              <ChevronLeft size={24} color="#222" strokeWidth={2.5} />
            </Pressable>
          </View>

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
              colors={["#F4BFB2", "#F3E6DF"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
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
                onPress={() => handleAction("match")}
                style={[s.btn, { borderColor: "#2E7D32", backgroundColor: "#EAF7EE" }]}
              >
                <Text style={[s.actionSymbol, { color: "#2E7D32" }]}>✓</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    backgroundColor: "#6b6b6b",
  },
  outer: {
    flex: 1,
    backgroundColor: "#F6F3EF",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyGroup: {
    width: 280,
    alignItems: "center",
    gap: 16,
  },
  emptyText: { color: "#000000", fontSize: 16 },
  emptyBtn: {
    paddingHorizontal: 22,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F4BFB2",
    alignItems: "center",
    justifyContent: "center",
  },
  pepo: { width: 52, height: 52, resizeMode: "contain" },
  emptyBtnText: { fontSize: 14, fontWeight: "600", color: "#000" },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#F6F3EF",
    overflow: "hidden",
    marginTop: 12,
    borderRadius: 10,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 285,
  },
  petImage: {
    width: "100%",
    height: "100%",
  },
  backButton: {
    position: "absolute",
    top: 14,
    left: 14,
    zIndex: 99,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(246, 243, 239, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  paw: { position: "absolute", width: 60, height: 60, resizeMode: "contain" },
  name: { fontSize: 22, fontWeight: "bold" },
  age: { fontSize: 17, marginLeft: 22 },
  trait: { flexDirection: "row", alignItems: "center", marginTop: 0},
  iconBox: { width: 24, height: 24, marginRight: 6, alignItems: "center", justifyContent: "center" },
  small: { fontSize: 11, color: "#222" },
  contact: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginTop: 9, padding: 10, width: 210, borderBottomWidth: 2, borderBottomColor: "#F3E6DF",  borderRadius: 5,},
  contactIcon: { width: 18, height: 18, marginRight: 8, resizeMode: "contain",},
  section: { padding: 16, borderTopWidth: 1, borderTopColor: "#BDB8B2" },
  title: { fontSize: 13, fontWeight: "bold", marginBottom: 8 },
  body: { fontSize: 12, lineHeight: 18, color: "#222" },
  pill: { backgroundColor: "#F4BFB2", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  pillText: { fontSize: 11, fontWeight: "600" },
  actions: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 24 },
  btn: { width: 54, height: 54, borderRadius: 27, borderWidth: 1, alignItems: "center", justifyContent: "center"},
  actionSymbol: { fontSize: 24, fontWeight: "700" },
});