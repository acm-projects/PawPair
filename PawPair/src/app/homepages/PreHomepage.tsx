import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  Image,
  Pressable,
  FlatList,
  Animated,
  Easing,
  useWindowDimensions,
} from "react-native";
import {
  Check,
  ClipboardList,
  Dog,
  Handshake,
  House,
  MoveRight,
  PartyPopper,
  Send,
  ThumbsUp,
  LucideIcon,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useNavigation } from "expo-router";
import { useFonts } from "expo-font";
import { getPet } from "../../data/pets";
import { statusFor, useStatuses } from "../../data/petStatus";
import { usePetLists } from "../../store/petLists";
import PawNavBar from "@/components/PawNavBar";

const pepoGoat = require("../../../assets/images/pepo-goat.png");
const paw = require("../../../assets/images/paw-watermark.png");

const CORAL = "#E98F78";
const GREEN = "#6EE08F";
const BG = "#F3EDE8";
const FONT = "'Open Sans', system-ui, sans-serif";
const OUTER = 64* 2 + 6;

function loadFont() {
  if (typeof document === "undefined") return;
  if (document.getElementById("open-sans-font")) return;
  const link = document.createElement("link");
  link.id = "open-sans-font";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap";
  document.head.appendChild(link);
}

const paws = [
  { top: 0, left: "80%" },
  {top: "10%", left: "60%" },
  { top: "85%", left: "85%" },
  { top: "82%", left: "10%" },
  { top: "78%", left: "73%" },
] as const;

const STAGE_ICONS = [Check, Send, Handshake, House, ThumbsUp, PartyPopper] as const;

type Pet = NonNullable<ReturnType<typeof getPet>>;

function useMatchedPets() {
  const { matches: matchIds } = usePetLists();
  return matchIds.map(getPet).filter((p): p is Pet => !!p);
}

const CIRCLE = 64;

function IconCircle({
  Icon,
  color,
  count,
  onPress,
}: {
  Icon: LucideIcon;
  color: string;
  count: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={s.circleWrap}>
      <View style={[s.circle, { borderColor: color }]}>
        <Icon size={28} color={color} strokeWidth={2} />
      </View>
      <View style={s.divider} />
      {count > 0 && (
        <View style={[s.count, { backgroundColor: color }]}>
          <Text style={s.countText}>{count > 9 ? "9+" : count}</Text>
        </View>
      )}
    </Pressable>
  );
}

function TopRow() {
  const statuses = useStatuses();
  const matches = useMatchedPets();
  const applied = matches.filter((p) => statusFor(statuses, p.id).stage >= 1);

  return (
    <View style={s.row}>
      <IconCircle
        Icon={Check}
        color={GREEN}
        count={matches.length}
        onPress={() => router.navigate("/matches" as any)}
      />
      <IconCircle
        Icon={ClipboardList}
        color={CORAL}
        count={applied.length}
        onPress={() => router.navigate("/status" as any)}
      />
    </View>
  );
}

function MatchesHero() {
  const { width: screenW } = useWindowDimensions();
  const matches = useMatchedPets();
  const statuses = useStatuses();
  const [index, setIndex] = useState(0);
  const [h, setH] = useState(0);

  const contentW = Math.min(screenW, 380);
  const GAP = 12;
  const SIDE = 18;
  const cardW = contentW - SIDE - 54;
  const step = cardW + GAP;
  const DOTS_H = 18;
  const cardH = Math.max(0, h - DOTS_H);

  useEffect(() => {
    if (index > matches.length - 1) setIndex(Math.max(0, matches.length - 1));
  }, [matches.length, index]);

  return (
    <View style={s.hero} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      {h > 0 && matches.length === 0 && (
        <Pressable
          style={{ marginHorizontal: SIDE, height: cardH }}
          onPress={() => router.navigate("/swiping" as any)}
        >
          <LinearGradient
            colors={["#F4BFB2", "#F3E6DF"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={s.emptyHero}
          >
            <Image source={paw} style={[s.heroPaw, { top: 24, right: 28 }]} />
            <Image source={paw} style={[s.heroPaw, { bottom: 28, left: 28 }]} />
            <Dog size={72} color={CORAL} strokeWidth={1.5} />
          </LinearGradient>
        </Pressable>
      )}

      {h > 0 && matches.length > 0 && (
        <>
          <FlatList
            data={matches}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(m) => String(m.id)}
            snapToInterval={step}
            decelerationRate="fast"
            contentContainerStyle={{ paddingLeft: SIDE, paddingRight: SIDE + 20 }}
            ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
            onScroll={(e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / step);
              if (i !== index) setIndex(i);
            }}
            scrollEventThrottle={16}
            style={{ height: cardH, flexGrow: 0 }}
            renderItem={({ item }) => {
              const stage = statusFor(statuses, item.id).stage;
              const Icon = STAGE_ICONS[stage];
              const trait = item.traits?.[0]?.text;
              return (
                <Pressable
                  style={[s.heroCard, { width: cardW, height: cardH }]}
                  onPress={() => router.navigate("/matches" as any)}
                >
                  <Image source={{ uri: item.image }} style={s.heroImg} />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.6)"]}
                    style={s.heroShade}
                  >
                    <Text style={s.heroName}>{item.name}</Text>
                    {!!trait && (
                      <Text style={s.heroTrait} numberOfLines={1}>
                        {trait}
                      </Text>
                    )}
                  </LinearGradient>
                  <View style={s.heroBadge}>
                    <Icon size={18} color={CORAL} strokeWidth={2.5} />
                  </View>
                </Pressable>
              );
            }}
          />

          <View style={s.dots} pointerEvents="none">
            {matches.length > 1 &&
              matches.map((m, i) => (
                <View key={String(m.id)} style={[s.dot, i === index && s.dotActive]} />
              ))}
          </View>
        </>
      )}
    </View>
  );
}

export default function Homepage() {
  const navigation = useNavigation();
  const matchCount = useMatchedPets().length;

  const sway = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    loadFont();
  }, []);

  const [fontsLoaded] = useFonts({
    HeadingFont: require("../../../assets/Fonts/Matcha Style.ttf"),
    NameFont: require("../../../assets/Fonts/NameFont.otf"),
  });

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
    if (matchCount === 0) return;
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
  }, [matchCount, hop]);

  const translateX = sway.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] });
  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: ["-5deg", "5deg"] });

  if (!fontsLoaded) return null;

  return (
    <View style={s.outer}>
      <SafeAreaView style={s.container} edges={["top"]}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {paws.map((p, i) => (
            <Image key={i} source={paw} style={[s.paw, p]} />
          ))}
        </View>

        <View style={s.header}>
          <View style={s.greeting}>
            <Image source={paw} style={s.headerPaw} />
            <Text style={s.hello}>WELCOME!</Text>
          </View>
          <Animated.Image
            source={pepoGoat}
            style={[
              s.pepo,
              { transform: [{ translateY: hop }, { translateX }, { rotate }] },
            ]}
          />
        </View>

        <TopRow />

        <MatchesHero />

        <View style={s.swipeWrap}>
          <LinearGradient
            colors={["#F4BFB2", "#F3E6DF"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={s.swipeBtn}
          >
            <Pressable
              style={s.swipePress}
              onPress={() => router.navigate("/swiping" as any)}
            >
              <Text style={s.swipeText}>Start Swiping</Text>
              <MoveRight size={34} color="#000" strokeWidth={1.25} />
            </Pressable>
          </LinearGradient>
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
    backgroundColor: BG,
    overflow: "hidden",
    paddingBottom: 80,
    paddingTop: 4,
  },
  paw: { position: "absolute", width: 52, height: 52, resizeMode: "contain" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 10,
    paddingRight: 22,
  },
  greeting: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerPaw: { width: 38, height: 38, resizeMode: "contain", opacity: 0.6 },
  hello: { position: "absolute", left:"55%", fontFamily: "HeadingFont", fontSize: 32, color: "#1F1F1F" },
  pepo: { width: 52, height: 52, resizeMode: "contain" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 18,
    height: CIRCLE + 12,
    marginBottom: 2,
  },
  circleWrap: { width: CIRCLE, height: CIRCLE },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { fontFamily: FONT, fontSize: 12, fontWeight: "600", color: "#fff" },

  hero: { flex: 1, marginTop: 2 },
  heroCard: {
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#ead9d1",
  },
  heroImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  heroShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 48,
    paddingBottom: 14,
  },
  heroName: { fontFamily: "NameFont", fontSize: 38, lineHeight: 42, color: "#fff" },
  heroTrait: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "400",
    color: "#ffffffee",
    marginTop: 2,
  },
  heroBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyHero: {
    flex: 1,
    borderRadius: 28,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  heroPaw: {
    position: "absolute",
    width: 48,
    height: 48,
    resizeMode: "contain",
    opacity: 0.55,
  },

  dots: {
    height: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#d8c9c0" },
  dotActive: { backgroundColor: CORAL, width: 16 },

  swipeWrap: { paddingHorizontal: 18, marginTop: 2, marginBottom: 8 },
  swipeBtn: {
    height: 64,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  swipePress: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  swipeText: { fontFamily: "NameFont", fontSize: 32, lineHeight: 38, color: "#000" },

  navWrapper: { position: "absolute", bottom: 0, left: 0, right: 0 },
  divider: {
    width: 2,
    height: "95%",
    borderRadius: 1,
    backgroundColor: "#EAD9D1",
    marginHorizontal: "-10%",
    position: "absolute",
    top: "5%",
  },
});