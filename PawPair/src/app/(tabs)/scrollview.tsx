// UI imports
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { User, House, Dog, Camera as CameraIcon } from "lucide-react-native";
import PawNavBar from "@/components/PawNavBar";


// backend imports
import { getAuth } from "firebase/auth";
import { app } from "../../firebase.js";
import { getAnimals } from "../../services/animalServices";
import { addFavorite, getFavorites } from "../../services/favoriteServices";
import { getQuizAnswers } from "../../services/quizService";
import { matchPets } from "../../services/matchingService";

// 1) THE DATA ---------------------------------------------------------------
type PhotoSource = number | { uri: string };

type Card = {
  id: string;
  name: string;
  species: string;
  speciesKey: string;
  age: string;
  size: string;
  energy: string;
  temperament: string;
  note: string;
  tags: string[];
  matchLabel: string;
  matchPercent: number;
  photo: PhotoSource;
};

const PLACEHOLDERS: Record<string, PhotoSource> = {
  dog: require("../../../assets/images/dog.jpg"),
  cat: require("../../../assets/images/cat.jpg"),
  bird: require("../../../assets/images/bird.jpg"),
  small_animal: require("../../../assets/images/small_animal.jpg"),
};
const DEFAULT_PHOTO: PhotoSource = require("../../../assets/images/pet-duo.png");

const SPECIES_FILTERS = ["all", "dog", "cat", "bird", "small_animal"];

const cap = (s?: string) => (s ? s[0].toUpperCase() + s.slice(1) : "—");
const speciesKey = (s?: string) => (s ?? "").toLowerCase().trim().replace(/\s+/g, "_");
const speciesLabel = (key: string) => (key === "all" ? "All" : cap(key.replace("_", " ")));

function labelFor(score: number) {
  if (score >= 85) return "Very High";
  if (score >= 70) return "High";
  if (score >= 50) return "Medium";
  return "Low";
}

// 2) ANIMAL CARDS -----------------------------------------------------------
function toCard(pet: any, score?: number, hasQuiz = false): Card {
  const tags: string[] = [];
  if (pet.houseTrained) tags.push("House Trained");
  if (pet.goodWithKids) tags.push("Good with Kids");
  if (pet.goodWithDogs) tags.push("Good with Dogs");
  if (pet.goodWithCats) tags.push("Good with Cats");

  const key = speciesKey(pet.species);

  return {
    id: pet.id,
    name: pet.name,
    species: speciesLabel(key),
    speciesKey: key,
    age: pet.age != null ? `${pet.age} ${pet.age === 1 ? "year" : "years"} old` : "",
    size: cap(pet.size),
    energy: cap(pet.energy),
    temperament: cap(Array.isArray(pet.temperament) ? pet.temperament[0] : pet.temperament),
    note: pet.previousOwnerNote || pet.description || "",
    tags,
    matchLabel: score != null ? labelFor(score) : hasQuiz ? "Not a match" : "Take the quiz",
    matchPercent: score == null ? 0 : score / 100,
    photo: pet.photoUrl ? { uri: pet.photoUrl } : PLACEHOLDERS[key] ?? DEFAULT_PHOTO,
  };
}

function getMatchColor(percent: number) {
  if (percent < 0.25) return "#D9534F";
  if (percent < 0.5) return "#F0C040";
  if (percent < 0.75) return "#9BD16B";
  return "#2E8B57";
}

function DogCard({
  dog,
  isFavorite,
  isSaving,
  onFavorite,
}: {
  dog: Card;
  isFavorite: boolean;
  isSaving: boolean;
  onFavorite: () => void;
}) {
  return (
    <View style={styles.card}>
      <View>
        <Image source={dog.photo} style={styles.photo} contentFit="cover" contentPosition="center" />
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
        <View style={styles.nameRow}>
          <View>
            <Text style={styles.name}>{dog.name}</Text>
            <Text style={styles.age}>
              {dog.species}
              {dog.age ? ` · ${dog.age}` : ""}
            </Text>
          </View>
          <TouchableOpacity onPress={onFavorite} disabled={isFavorite || isSaving} hitSlop={10}>
            {isSaving ? (
              <ActivityIndicator color="#E98F78" />
            ) : (
              <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={28} color="#E98F78" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.attrRow}>
          <Attribute icon="resize-outline" label="Size" value={dog.size} />
          <Attribute icon="flash-outline" label="Energy" value={dog.energy} />
          <Attribute icon="heart-outline" label="Temperament" value={dog.temperament} />
        </View>

        {!!dog.note && (
          <View style={styles.note}>
            <Text style={styles.noteText}>
              <Text style={styles.bold}>Previous Owner Note: </Text>"{dog.note}"
            </Text>
          </View>
        )}

        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${dog.matchPercent * 100}%`, backgroundColor: getMatchColor(dog.matchPercent) },
            ]}
          />
        </View>
        <View style={styles.matchRow}>
          <Text style={styles.matchText}>
            <Text style={styles.bold}>Matches: </Text>
            <Text style={styles.matchValue}>{dog.matchLabel}</Text>
          </Text>
          <Text style={styles.bold}>{Math.round(dog.matchPercent * 100)}%</Text>
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

const NAV_ITEMS = [
  { href: "/profile", label: "Profile", Icon: User },
  { href: "/homepage", label: "Homepage", Icon: House },
  { href: "/scrollview", label: "Scrollview", Icon: Dog },
  { href: "/camera", label: "Camera", Icon: CameraIcon },
] as const;

// 3) THE SCREEN -------------------------------------------------------------
export default function Scrollview() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("all");

  const [animals, setAnimals] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [hasQuiz, setHasQuiz] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [savingPetId, setSavingPetId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAnimals() {
      try {
        const data = await getAnimals();
        setAnimals(data);

        const auth = getAuth(app);
        await auth.authStateReady();
        const uid = auth.currentUser?.uid;

        if (uid) {
          try {
            setFavoriteIds(await getFavorites(uid));
          } catch (e) {
            console.error("Error retrieving favorites:", e);
          }

          try {
            const answers = await getQuizAnswers(uid);
            if (answers) {
              setHasQuiz(true);
              const res = matchPets(data, answers, data.length);
              const map: Record<string, number> = {};
              res.matches.forEach((m: any) => {
                if (m.score != null) map[m.pet.id] = m.score;
              });
              setScores(map);
            }
          } catch (e) {
            console.error("Error calculating match scores:", e);
          }
        }
      } catch (e) {
        console.error("Error retrieving animals:", e);
        setError("Could not load animals.");
      } finally {
        setLoading(false);
      }
    }

    loadAnimals();
  }, []);

  async function handleFavorite(petId: string) {
    const uid = getAuth(app).currentUser?.uid;
    if (!uid) {
      setMessage("Please log in to save pets.");
      return;
    }
    if (favoriteIds.includes(petId)) return;

    setSavingPetId(petId);
    setMessage("");
    try {
      await addFavorite(uid, petId);
      setFavoriteIds((prev) => [...prev, petId]);
      const pet = animals.find((a) => a.id === petId);
      setMessage(`${pet?.name || "Pet"} added to favorites!`);
    } catch (e) {
      console.error("Error saving favorite:", e);
      setMessage("Could not save favorite. Please try again.");
    } finally {
      setSavingPetId(null);
    }
  }

  const visibleDogs = animals
    .map((pet) => toCard(pet, scores[pet.id], hasQuiz))
    .filter(
      (dog) =>
        dog.name.toLowerCase().includes(search.toLowerCase()) &&
        (speciesFilter === "all" || dog.speciesKey === speciesFilter)
    )
    .sort((a, b) => b.matchPercent - a.matchPercent);

  return (
    
    <LinearGradient colors={[ "#F5C0B3","#E98F78"]} style={styles.container}>
    
      {/* Search bar + filter button */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={22} color="#786862" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search animals"
            placeholderTextColor="#786862"
          />
        </View>
           <TouchableOpacity
            style={styles.filterButton}
            onPress={() => router.navigate("/settings")}
            accessibilityLabel="Open settings"
          >
            <Ionicons name="ellipsis-horizontal" size={22} color="#1a1a1a" />
          </TouchableOpacity>
      </View>

      {/* Species filter chips */}
      <View style={styles.chipRow}>
        {SPECIES_FILTERS.map((sp) => (
          <TouchableOpacity
            key={sp}
            style={[styles.chip, speciesFilter === sp && styles.chipActive]}
            onPress={() => setSpeciesFilter(sp)}
          >
            <Text style={styles.chipText}>{speciesLabel(sp)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {message !== "" && <Text style={styles.message}>{message}</Text>}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.statusText}>Loading available pets...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.statusText}>{error}</Text>
        </View>
      ) : visibleDogs.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.statusText}>No available pets found.</Text>
        </View>
      ) : (
        <FlatList
          data={visibleDogs}
          keyExtractor={(dog) => dog.id}
          renderItem={({ item }) => (
            <DogCard
              dog={item}
              isFavorite={favoriteIds.includes(item.id)}
              isSaving={savingPetId === item.id}
              onFavorite={() => handleFavorite(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <LinearGradient colors={["#F5C0B3", "#F5C0B3"]} style={styles.navBarBackground}>
        <SafeAreaView style={styles.navBar} edges={["bottom"]}>
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const isActive = href === "/scrollview";
            return (
              <TouchableOpacity key={href} style={styles.navItem} onPress={() => router.navigate(href)}>
                <Icon size={40} color="white" strokeWidth={isActive ? 2.25 : 1.75} />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </SafeAreaView>
      </LinearGradient>
    </LinearGradient>
  );
}


// 4) THE STYLES -------------------------------------------------------------
// Like CSS, but: camelCase names, numbers instead of "16px", and every View
// is already a flexbox that stacks its children top-to-bottom.
const NAV_RADIUS = 20;
const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56 },

  navBarBackground: {
    borderTopLeftRadius: NAV_RADIUS,
    borderTopRightRadius: NAV_RADIUS,
    overflow: "hidden",
    marginTop: -NAV_RADIUS,
  },
  navBar: { flexDirection: "row", paddingTop: 8 },
  navItem: { flex: 1, alignItems: "center", gap: 2, paddingBottom: 4 },
  navLabel: { color: "transparent", fontSize: 4 },
  navLabelActive: { fontWeight: "bold" },

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
    backgroundColor: "#fff",
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 24, marginBottom: 12 },
  chip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: "#fff" },
  chipActive: { backgroundColor: "#dbe5ed" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  statusText: { textAlign: "center", color: "#fff", fontSize: 15, marginTop: 20 },
  message: { textAlign: "center", color: "#fff", fontWeight: "600", marginBottom: 8 },

  list: { paddingHorizontal: 24, paddingBottom: 40, gap: 16 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden", // clips the photo to the rounded corners
  },
  photo: { width: "100%", aspectRatio: 4 / 3 },
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
  age: { fontSize: 15, fontWeight: "500", color: "#1a1a1a" },

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
  navWrapper: { position: "absolute", bottom: 0, left: 0, right: 0 },
});