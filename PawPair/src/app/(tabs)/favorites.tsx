
import { useCallback, useState } from "react";

import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator
} from "react-native";

import { useFocusEffect } from "expo-router";

import {
  getAuth,
  onAuthStateChanged
} from "firebase/auth";

import { app } from "../../firebase.js";

import {
  getFavorites,
  removeFavorite
} from "../../services/favoriteServices";

import {
  getAnimalById
} from "../../services/animalServices";

// Structure of a pet
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

export default function FavoritesScreen() {

  const [favorites, setFavorites] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Load favorites whenever the user opens this screen
  useFocusEffect(
    useCallback(() => {
      let active = true;

      setLoading(true);
      setError("");
      setFavorites([]);

      const auth = getAuth(app);

      const unsubscribe = onAuthStateChanged(
        auth,
        async (user) => {

          if (!user) {
            if (active) {
              setError("Please log in to view favorites.");
              setLoading(false);
            }
            return;
          }

          try {
            // Step 1: Get user's favorite pet IDs
            const favoriteIds = await getFavorites(user.uid);

            console.log("Favorite IDs:", favoriteIds);

            // Step 2: Retrieve each animal's information
            const petData = await Promise.all(
              favoriteIds.map(id => getAnimalById(id))
            );

            // Step 3: Remove any missing animal records
            const validPets = petData.filter(
              (pet): pet is NonNullable<typeof pet> =>
                pet !== null
            );

            if (active) {
              setFavorites(validPets as Pet[]);
            }

          } catch (err) {
            console.error("Error loading favorites:", err);

            if (active) {
              setError("Unable to load favorites.");
            }

          } finally {
            if (active) {
              setLoading(false);
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

  // Remove an animal from favorites
  async function handleRemoveFavorite(petId: string) {

    const auth = getAuth(app);
    const uid = auth.currentUser?.uid;

    if (!uid) {
      setError("Please log in first.");
      return;
    }

    setRemovingId(petId);
    setError("");

    try {
      // Delete favorite from Firestore
      await removeFavorite(uid, petId);

      // Update the screen
      setFavorites(previous =>
        previous.filter(pet => pet.id !== petId)
      );

      console.log("Favorite removed:", petId);

    } catch (err) {
      console.error("Error removing favorite:", err);
      setError("Unable to remove favorite.");

    } finally {
      setRemovingId(null);
    }
  }

  // Loading screen
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="teal" />
        <Text>Loading favorites...</Text>
      </View>
    );
  }

  // Main Favorites screen
  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        My Favorite Pets
      </Text>

      {error !== "" ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}

          ListEmptyComponent={
            <Text style={styles.emptyText}>
              You haven't added any favorite pets yet.
            </Text>
          }

          renderItem={({ item }) => (
            <View style={styles.card}>

              <Text style={styles.name}>
                {item.name}
              </Text>

              <Text>Species: {item.species}</Text>

              <Text>Breed: {item.breed}</Text>

              <Text>Age: {item.age} years</Text>

              <Text>Size: {item.size}</Text>

              <Text style={styles.description}>
                {item.description}
              </Text>

              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveFavorite(item.id)}
                disabled={removingId !== null}
              >
                {removingId === item.id ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>
                    ♥ Remove from Favorites
                  </Text>
                )}
              </TouchableOpacity>

            </View>
          )}
        />
      )}

    </View>
  );
}

// Styling
const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff"
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20
  },

  list: {
    paddingBottom: 20
  },

  card: {
    padding: 18,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    marginBottom: 15
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

  removeButton: {
    backgroundColor: "#c74b4b",
    padding: 12,
    borderRadius: 6,
    marginTop: 15,
    alignItems: "center"
  },

  buttonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold"
  },

  emptyText: {
    color: "#777",
    fontSize: 16,
    textAlign: "center",
    marginTop: 40
  },

  error: {
    color: "red",
    marginBottom: 15
  }

});
