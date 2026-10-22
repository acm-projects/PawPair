
import { useCallback, useEffect, useState } from "react";

import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity
} from "react-native";

import { useFocusEffect } from "expo-router";

import {
  getAuth,
  onAuthStateChanged
} from "firebase/auth";

import { app } from "../../firebase.js";

import {
  getAnimals
} from "../../services/animalServices";

import {
  addFavorite,
  getFavorites
} from "../../services/favoriteServices";

// Structure of each pet
type Pet = {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  size: string;
  description: string;
  adoptionStatus: string;
};

export default function DiscoverScreen() {

  // Store animals from Firestore
  const [animals, setAnimals] = useState<Pet[]>([]);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Store favorite pet IDs
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  // Track the pet currently being saved
  const [savingPetId, setSavingPetId] = useState<string | null>(null);

  // Display confirmation messages
  const [message, setMessage] = useState("");

  // STEP 1: Retrieve animals from Firestore
  useEffect(() => {
    let active = true;

    async function loadAnimals() {
      try {
        const data = await getAnimals();

        if (active) {
          setAnimals(data as Pet[]);
          console.log("Animals retrieved:", data);
          console.log("Total animals:", data.length);
        }

      } catch (err) {
        console.error("Error retrieving animals:", err);

        if (active) {
          setError("Could not load animals.");
        }

      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAnimals();

    return () => {
      active = false;
    };
  }, []);

  // STEP 2: Refresh favorites every time Discover opens
  useFocusEffect(
    useCallback(() => {
      let active = true;

      const auth = getAuth(app);

      const unsubscribe = onAuthStateChanged(
        auth,
        async (user) => {

          if (!user) {
            if (active) {
              setFavoriteIds([]);
            }
            return;
          }

          try {
            // Get updated favorites from Firestore
            const updatedFavorites = await getFavorites(
              user.uid
            );

            if (active) {
              setFavoriteIds(updatedFavorites);
            }

            console.log(
              "Updated favorites:",
              updatedFavorites
            );

          } catch (err) {
            console.error(
              "Error refreshing favorites:",
              err
            );

            if (active) {
              setMessage(
                "Could not refresh favorites."
              );
            }
          }
        }
      );

      return () => {
        active = false;
        unsubscribe();
      };

    }, [])
  );

  // STEP 3: Add a pet to favorites
  async function handleFavorite(petId: string) {

    const auth = getAuth(app);
    const uid = auth.currentUser?.uid;

    if (!uid) {
      setMessage("Please log in to save pets.");
      return;
    }

    // Prevent duplicate favorites
    if (favoriteIds.includes(petId)) {
      return;
    }

    // Prevent multiple simultaneous saves
    if (savingPetId !== null) {
      return;
    }

    setSavingPetId(petId);
    setMessage("");

    try {
      // Save the favorite in Firestore
      await addFavorite(uid, petId);

      // Update button immediately
      setFavoriteIds(previous =>
        previous.includes(petId)
          ? previous
          : [...previous, petId]
      );

      const pet = animals.find(
        item => item.id === petId
      );

      setMessage(
        `${pet?.name || "Pet"} added to favorites!`
      );

      console.log("Favorite saved:", petId);

    } catch (err) {
      console.error("Error saving favorite:", err);

      setMessage(
        "Could not save favorite. Please try again."
      );

    } finally {
      setSavingPetId(null);
    }
  }

  // STEP 4: Loading screen
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="teal"
        />
        <Text>Loading available pets...</Text>
      </View>
    );
  }

  // STEP 5: Display Discover screen
  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        Discover Pets
      </Text>

      <Text style={styles.subtitle}>
        Find your perfect companion!
      </Text>

      {message !== "" && (
        <Text style={styles.message}>
          {message}
        </Text>
      )}

      {error !== "" ? (
        <Text style={styles.error}>
          {error}
        </Text>

      ) : animals.length === 0 ? (
        <Text>No available pets found.</Text>

      ) : (
        <FlatList
          data={animals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}

          renderItem={({ item }) => {

            const isFavorite = favoriteIds.includes(
              item.id
            );

            const isSaving = savingPetId === item.id;

            return (
              <View style={styles.card}>

                <Text style={styles.name}>
                  {item.name}
                </Text>

                <Text>
                  Species: {item.species}
                </Text>

                <Text>
                  Breed: {item.breed}
                </Text>

                <Text>
                  Age: {item.age} years
                </Text>

                <Text>
                  Size: {item.size}
                </Text>

                <Text>
                  Status: {item.adoptionStatus}
                </Text>

                <Text style={styles.description}>
                  {item.description}
                </Text>

                {/* Add to Favorites button */}
                <TouchableOpacity
                  style={[
                    styles.favoriteButton,
                    isFavorite && styles.savedButton
                  ]}
                  onPress={() => handleFavorite(item.id)}
                  disabled={
                    isFavorite ||
                    savingPetId !== null
                  }
                >

                  {isSaving ? (
                    <ActivityIndicator color="white" />

                  ) : (
                    <Text style={styles.favoriteText}>
                      {isFavorite
                        ? "♥ Added to Favorites"
                        : "♡ Add to Favorites"}
                    </Text>
                  )}

                </TouchableOpacity>

              </View>
            );
          }}
        />
      )}

    </View>
  );
}

// STYLING
const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff"
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 8
  },

  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20
  },

  list: {
    paddingBottom: 20
  },

  card: {
    padding: 18,
    marginBottom: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 10
  },

  name: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8
  },

  description: {
    marginTop: 10,
    color: "#555",
    lineHeight: 20
  },

  favoriteButton: {
    backgroundColor: "teal",
    padding: 12,
    marginTop: 15,
    borderRadius: 6,
    alignItems: "center"
  },

  savedButton: {
    backgroundColor: "#508C65"
  },

  favoriteText: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold"
  },

  message: {
    color: "teal",
    fontSize: 14,
    marginBottom: 12
  },

  error: {
    color: "red",
    fontSize: 14
  }

});
