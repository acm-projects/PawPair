
import { useCallback, useState } from "react";

import {
  View,
  ScrollView,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet
} from "react-native";

import {
  useFocusEffect,
  useRouter,
  type Href
} from "expo-router";

import { getAuth } from "firebase/auth";

import { app } from "../firebase.js";

import {
  getQuizAnswers
} from "../services/quizService";

import {
  getAnimals
} from "../services/animalServices";

import {
  matchPets
} from "../services/matchingService";

export default function MatchesScreen() {
  const router = useRouter();

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Retrieve and calculate matches when screen opens
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadMatches() {
        setLoading(true);
        setError("");

        try {
          const auth = getAuth(app);

          await auth.authStateReady();

          const uid = auth.currentUser?.uid;

          if (!uid) {
            throw new Error(
              "Please log in to see your matches."
            );
          }

          // Retrieve quiz answers and animal data
          const [answers, pets] = await Promise.all([
            getQuizAnswers(uid),
            getAnimals()
          ]);

          if (!answers) {
            throw new Error(
              "Finish the quiz before viewing matches."
            );
          }

          // Calculate the five best matches
          const matches = matchPets(
            pets,
            answers,
            5
          );

          if (active) {
            setResult(matches);
          }

        } catch (e: any) {
          if (active) {
            setError(
              e.message ?? "Unable to calculate matches."
            );
          }

        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      loadMatches();

      return () => {
        active = false;
      };
    }, [])
  );

  // Loading screen
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="teal"
        />
        <Text>Calculating matches...</Text>
      </View>
    );
  }

  // Display matching results
  return (
    <ScrollView contentContainerStyle={styles.container}>

      <Text style={styles.title}>
        Your top PawPair matches
      </Text>

      {!!error && (
        <Text style={styles.warning}>
          {error}
        </Text>
      )}

      {result && (
        <>
          {/* Important matching notices */}
          {result.notices.map(
            (note: string, i: number) => (
              <Text key={i} style={styles.warning}>
                • {note}
              </Text>
            )
          )}

          {/* No eligible pets */}
          {result.matches.length === 0 && (
            <Text style={styles.warning}>
              No pets currently pass the verified hard
              restrictions. Check the matching fields in
              Firestore or expand the available listings.
            </Text>
          )}

          {/* Display recommended pets */}
          {result.matches.map(
            (item: any, i: number) => (
              <View
                key={item.pet.id}
                style={styles.card}
              >

                <Text style={styles.petName}>
                  {i + 1}. {item.pet.name}
                </Text>

                <Text>
                  {item.pet.breed} · {item.pet.species}
                </Text>

                <Text style={styles.score}>
                  {item.score == null
                    ? "Not enough matching data"
                    : `${item.score}% provisional match`}
                </Text>

                <Text style={styles.coverage}>
                  Available score evidence: {item.coverage}%
                </Text>

                {item.coverage < 60 && (
                  <Text style={styles.warning}>
                    Low data coverage — this score
                    should not be treated as a reliable
                    recommendation yet.
                  </Text>
                )}

                {item.reasons.length ? (
                  <Text>
                    Matches your: {item.reasons.join(", ")}
                  </Text>
                ) : (
                  <Text>
                    Not enough verified traits to
                    explain this match yet.
                  </Text>
                )}

                {/* Open the selected pet's profile */}
                <TouchableOpacity
                  style={styles.button}
                  onPress={() =>
                    router.push(
                      {
                        pathname: "/pets/[id]",
                        params: { id: item.pet.id }
                      } as Href
                    )
                  }
                >
                  <Text style={styles.buttonText}>
                    View pet details
                  </Text>
                </TouchableOpacity>

              </View>
            )
          )}

          {/* Pets excluded by restrictions */}
          {!!result.excluded.length && (
            <View style={styles.card}>

              <Text style={styles.subheading}>
                Excluded or awaiting verification
              </Text>

              {result.excluded.map((x: any) => (
                <Text key={x.id}>
                  • {x.name}: {x.reason}
                </Text>
              ))}

            </View>
          )}
        </>
      )}

      {/* Return to questionnaire */}
      <TouchableOpacity
        style={styles.outline}
        onPress={() =>
          router.push("/quiz" as Href)
        }
      >
        <Text style={{ color: "#008080" }}>
          Edit my quiz answers
        </Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 80,
    backgroundColor: "#fff",
    flexGrow: 1
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },

  title: {
    fontSize: 25,
    fontWeight: "bold",
    marginBottom: 18
  },

  subheading: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 10
  },

  card: {
    borderRadius: 12,
    backgroundColor: "#f6f6f6",
    padding: 18,
    marginBottom: 15,
    gap: 7
  },

  petName: {
    fontSize: 20,
    fontWeight: "bold"
  },

  score: {
    fontSize: 18,
    color: "#008080",
    fontWeight: "600"
  },

  coverage: {
    color: "#555"
  },

  warning: {
    color: "#9a5305",
    marginBottom: 10,
    lineHeight: 20
  },

  button: {
    padding: 12,
    backgroundColor: "#008080",
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center"
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600"
  },

  outline: {
    borderColor: "#008080",
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10
  }
});
