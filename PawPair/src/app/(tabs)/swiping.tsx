import { Text, View, StyleSheet, Image, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const paw = require("../../../assets/images/paw-watermark.png");
const pawIcon = require("../../../assets/images/paw-icon.png");

//array of traits for the pet
const traits = [
  { icon: require("../../../assets/images/children-icon.png"), text: "Great with kids", size: 14 },
  { icon: require("../../../assets/images/outdoors-icon.png"), text: "Loves the outdoors", size: 24 },
];

//array of things the pet loves
const loves = ["Peanut Butter", "Hugs & cuddles"];

//different symbol for buttons might import icons later on if needed
const actions = [
  { symbol: "✕", color: "#D32F2F", bg: "#FBEFEF" },
  { symbol: "★", color: "#6366F1", bg: "#ECEBFA" },
  { symbol: "✓", color: "#2E7D32", bg: "#EAF7EE" },
];

export default function Scrollview() {
  return (
    <ScrollView style={s.outer} contentContainerStyle={{ padding: 16, alignItems: "center" }}>
      <View style={s.card}>
        <Image
          source={{ uri: "https://i.pinimg.com/736x/65/cb/b0/65cbb0e43c50b5486da05e02e5c53172.jpg" }}
          style={{ width: "100%", height: 285 }}
        />

        <View style={{ padding: 16 }}>
          {/* Paw watermark (first child so everything else draws on top) */}
          <Image source={paw} style={[s.paw, { top: 35, right: 20 }]} />

          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text style={s.name}>Buddy</Text>
            <Text style={s.age}>2.5 years</Text>
          </View>

          {traits.map((t, i) => (
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
              <Text style={[s.small, { fontWeight: "bold" }]}>shelter@gmail.com</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={s.section}>
          <Text style={s.title}>About me</Text>
          <Text style={s.body}>
            I am a golden retriever who has a golden heart! I love to run, play, and eat tons of
            yummy, healthy meals! I love hugs & am very good with children and the great outdoors!
          </Text>
        </View>

        <View style={s.section}>
          {/* Paw watermark */}
          <Image source={paw} style={[s.paw, { bottom: 70, right: 20 }]} />

          <Text style={s.title}>Loves:</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {loves.map((l, i) => (
              <View key={i} style={s.pill}>
                <Text style={s.pillText}>{l}</Text>
              </View>
            ))}
          </View>

          <View style={s.actions}>
            {actions.map((a) => (
              <Pressable
                key={a.symbol}
                style={[s.btn, { borderColor: a.color, backgroundColor: a.bg }]}
              >
                <Text style={[s.actionSymbol, { color: a.color }]}>{a.symbol}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
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
  contact: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 14,
    padding: 10,
    width: 210,
    borderBottomWidth: 2,
    borderBottomColor: "#E0B4A8",
  },
  contactIcon: { width: 18, height: 18, marginRight: 8, resizeMode: "contain" },
  section: { padding: 16, borderTopWidth: 1, borderTopColor: "#BDB8B2" },
  title: { fontSize: 13, fontWeight: "bold", marginBottom: 8 },
  body: { fontSize: 12, lineHeight: 18, color: "#222" },
  pill: {
    backgroundColor: "#F5B8C4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pillText: { fontSize: 11, fontWeight: "600" },
  actions: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 24 },
  btn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionSymbol: { fontSize: 24, fontWeight: "700" },
});