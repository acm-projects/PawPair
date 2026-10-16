
import { useEffect, useState } from "react";

import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator
} from "react-native";

import { getAnimals } from "../../services/animalServices";

// Define the structure of each pet
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

  const [animals, setAnimals] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Retrieve animals when screen loads
  useEffect(() => {

    async function loadAnimals() {
      try {
        const data = await getAnimals();

        setAnimals(data as Pet[]);

        console.log("Animals retrieved:", data);

      } catch (error) {
        console.error("Error retrieving animals:", error);
        setError("Could not load animals.");

      } finally {
        setLoading(false);
      }
    }

    loadAnimals();

  }, []);

  // Loading screen
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="teal" />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        Available Pets
      </Text>

      {error ? (
        <Text>{error}</Text>

      ) : animals.length === 0 ? (
        <Text>No available pets found.</Text>

      ) : (
        <FlatList
          data={animals}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>

              <Text style={styles.name}>
                {item.name}
              </Text>

              <Text>Species: {item.species}</Text>

              <Text>Breed: {item.breed}</Text>

              <Text>Age: {item.age} years</Text>

              <Text>Size: {item.size}</Text>

              <Text>Status: {item.adoptionStatus}</Text>

              <Text style={styles.description}>
                {item.description}
              </Text>

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
    backgroundColor: "#fff",
    justifyContent: "center"
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20
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
  }

});
