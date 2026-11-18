
import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet
} from "react-native";

import { useLocalSearchParams } from "expo-router";

import {
  getAnimalById
} from "../../services/animalServices";

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

export default function PetDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPet() {
      setLoading(true);
      setError("");

      try {
        if (!id) {
          throw new Error("Missing pet ID");
        }

        const data = await getAnimalById(id);

        if (active) {
          setPet(data as Pet | null);
        }
      } catch (err) {
        console.error(err);

        if (active) {
          setError("Could not load pet details.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPet();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <ActivityIndicator size="large" color="teal" />;
  }

  if (error) {
    return <Text>{error}</Text>;
  }

  if (!pet) {
    return <Text>Pet not found.</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{pet.name}</Text>

      <Text>Species: {pet.species}</Text>
      <Text>Breed: {pet.breed}</Text>
      <Text>Age: {pet.age} years</Text>
      <Text>Size: {pet.size}</Text>
      <Text>Status: {pet.adoptionStatus}</Text>

      <Text style={styles.heading}>About {pet.name}</Text>
      <Text>{pet.description}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff"
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20
  },
  heading: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10
  }
});
