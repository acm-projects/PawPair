import {
  View,
  Text,
  Image,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons"; // comes with Expo, no install needed

// 1) THE DATA ---------------------------------------------------------------
// Each dog is one object. Later you can replace this array with data from
// Firestore (that's what your firebase imports were for) and the screen
// below will not need to change.
type Dog = {
  id: string;
  name: string;
  age: string;
  size: string;
  energy: string;
  temperament: string;
  note: string;
  tags: string[];
  matchLabel: string;
  matchPercent: number; // 0 to 1
  points: number;
  photoUrl: string;
};

const DOGS: Dog[] = [
  {
    id: "1",
    name: "Buddy",
    age: "3 years old",
    size: "Medium",
    energy: "High-energy",
    temperament: "Friendly",
    note: "Buddy is a social butterfly! We'd recommend a home with lots of play.",
    tags: ["Verified Health Records", "Previous Owner Check", "Fully Vaccinated"],
    matchLabel: "Very High",
    matchPercent: 0.78,
    points: 20,
    // Placeholder photo. Swap for your own image later.
    photoUrl: "https://cdn.britannica.com/92/212692-050-D53981F5/labradoodle-dog-stick-running-grass.jpg",
  },
  {
    id: "2",
    name: "Luna",
    age: "2 years old",
    size: "Small",
    energy: "Calm",
    temperament: "Shy",
    note: "Luna warms up slowly but is very loyal once she trusts you.",
    tags: ["Verified Health Records", "Fully Vaccinated"],
    matchLabel: "High",
    matchPercent: 0.6,
    points: 15,
    photoUrl: "https://brownvethospital.com/wp-content/uploads/2024/02/when-do-dogs-stop-growing.jpg",
  },
  {
    id: "3",
    name: "Max",
    age: "4 years old",
    size: "Small",
    energy: "High-energy",
    temperament: "Playful",
    note: "Max is a friendly and energetic cat who loves to play!",
    tags: ["Verified Health Records", "Fully Vaccinated", "Neutered/Spayed"],
    matchLabel: "Medium",
    matchPercent: 0.5,
    points: 15,
    photoUrl: "https://hips.hearstapps.com/hmg-prod/images/cat-is-playing-with-a-toy-at-the-lucky-cat-house-pet-hotel-news-photo-1760987522.pjpeg?crop=0.668xw:1.00xh;0.243xw,0&resize=640:*",
  },
];

// 2) ONE DOG CARD -----------------------------------------------------------
// A "component" is a function that returns what to draw. We write the card
// once, then reuse it for every dog.
function DogCard({ dog }: { dog: Dog }) {
  return (
    <View style={styles.card}>
      {/* Photo with the tags sitting on top of it */}
      <View>
        <Image source={{ uri: dog.photoUrl }} style={styles.photo} />
        <View style={styles.tagsOverlay}>
          {dog.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Ionicons name="checkmark-circle" size={14} color="#3b78d0" />
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.details}>
        {/* Name on the left, age on the right */}
        <View style={styles.nameRow}>
          <Text style={styles.name}>{dog.name}</Text>
          <Text style={styles.age}>{dog.age}</Text>
        </View>

        {/* Three columns: Size, Energy, Temperament */}
        <View style={styles.attrRow}>
          <Attribute icon="resize-outline" label="Size" value={dog.size} />
          <Attribute icon="flash-outline" label="Energy" value={dog.energy} />
          <Attribute
            icon="heart-outline"
            label="Temperament"
            value={dog.temperament}
          />
        </View>

        {/* Beige note box */}
        <View style={styles.note}>
          <Text style={styles.noteText}>
            <Text style={styles.bold}>Previous Owner Note: </Text>"{dog.note}"
          </Text>
        </View>

        {/* Match bar: a grey track with a coloured bar on top of it */}
        <View style={styles.track}>
          <View
            style={[styles.fill, { width: `${dog.matchPercent * 100}%` }]}
          />
        </View>
        <View style={styles.matchRow}>
          <Text style={styles.matchText}>
            <Text style={styles.bold}>Matches: </Text>
            <Text style={styles.matchValue}>{dog.matchLabel}</Text>
          </Text>
          <Text style={styles.bold}>{dog.points} points</Text>
        </View>
      </View>
    </View>
  );
}

// Small helper so we don't repeat the icon + label + value three times.
function Attribute({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.attr}>
      <View style={styles.attrLine}>
        <Ionicons name={icon} size={16} color="#1a1a1a" />
        <Text style={styles.attrLabel}>{label}</Text>
      </View>
      <Text style={styles.attrValue}>{value}</Text>
    </View>
  );
}

// 3) THE SCREEN -------------------------------------------------------------
export default function Scrollview() {
  // "State" = a value React remembers. When it changes, the screen redraws.
  const [search, setSearch] = useState("");

  // Only keep dogs whose name contains what the user typed.
  const visibleDogs = DOGS.filter((dog) =>
    dog.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Search bar + filter button */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={22} color="#786862" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search dogs"
            placeholderTextColor="#786862"
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={22} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      {/* FlatList = the scrolling list. It draws one DogCard per dog. */}
      <FlatList
        data={visibleDogs}
        keyExtractor={(dog) => dog.id}
        renderItem={({ item }) => <DogCard dog={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// 4) THE STYLES -------------------------------------------------------------
// Like CSS, but: camelCase names, numbers instead of "16px", and every View
// is already a flexbox that stacks its children top-to-bottom.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2ede8", paddingTop: 56 },

  searchRow: {
    flexDirection: "row", // put children side by side
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 16,
  },
  searchBar: {
    flex: 1, // take all leftover width
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    borderRadius: 25,
    backgroundColor: "#dbe5ed",
    paddingHorizontal: 16,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16, color: "#1a1a1a" },
  filterButton: {
    width: 46,
    height: 60,
    borderRadius: 25,
    backgroundColor: "#dbe5ed",
    alignItems: "center",
    justifyContent: "center",
  },

  list: { paddingHorizontal: 24, paddingBottom: 40, gap: 16 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden", // clips the photo to the rounded corners
  },
  photo: { width: "100%", height: 200 },
  tagsOverlay: {
    position: "absolute", // float on top of the photo
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#dbe5ed",
    borderRadius: 14,
    paddingVertical: 4,
    paddingLeft: 6,
    paddingRight: 10,
  },
  tagText: { fontSize: 11, fontWeight: "600", color: "#1a1a1a" },

  details: { padding: 18, gap: 12 },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontSize: 26, fontWeight: "700", color: "#1a1a1a" },
  age: { fontSize: 17, fontWeight: "500", color: "#1a1a1a" },

  attrRow: { flexDirection: "row", justifyContent: "space-between" },
  attr: { gap: 8 },
  attrLine: { flexDirection: "row", alignItems: "center", gap: 5 },
  attrLabel: { fontSize: 14, fontWeight: "600", color: "#1a1a1a" },
  attrValue: { fontSize: 14, fontWeight: "500", color: "#1a1a1a" },

  note: { backgroundColor: "#efe7de", borderRadius: 16, padding: 14 },
  noteText: { fontSize: 14, lineHeight: 20, color: "#1a1a1a" },
  bold: { fontWeight: "600", color: "#1a1a1a" },

  track: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "#dbe5ed",
    overflow: "hidden",
  },
  fill: { height: 12, backgroundColor: "#5f9a68" },
  matchRow: { flexDirection: "row", justifyContent: "space-between" },
  matchText: { fontSize: 14 },
  matchValue: { color: "#4f9a5e", fontWeight: "500" },
});
