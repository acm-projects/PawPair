
import { useEffect, useMemo, useState } from "react";

import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet
} from "react-native";

import {
  useRouter,
  type Href
} from "expo-router";

import { getAuth } from "firebase/auth";

import { app } from "../firebase.js";
import { getAnimals } from "../services/animalServices";

import {
  getVisibleQuestions
} from "../services/quizQuestions";

import {
  getQuizAnswers,
  saveQuizAnswers
} from "../services/quizService";

import {
  deriveZipFromDevice
} from "../services/locationService";

type Answers = Record<string, any>;

// Validate an answer before continuing
function validate(q: any, a: Answers): string {
  const v = a[q.id];

  if (q.type === "breeds") {
    if (!v?.mode) {
      return "Choose preferred breeds or No preference.";
    }

    if (
      v.mode !== "none" &&
      !(v.breeds?.length || v.other?.trim())
    ) {
      return "Choose or enter at least one breed.";
    }

    return "";
  }

  if (q.type === "multi") {
    return Array.isArray(v) && v.length
      ? ""
      : "Select at least one option.";
  }

  if (q.type === "restrictions") {
    if (!v?.choice) {
      return "Select an option.";
    }

    if (
      v.choice === "Size or weight limits" &&
      !(Number(v.maxWeightLbs) > 0)
    ) {
      return "Enter the maximum allowed weight in pounds.";
    }

    if (
      v.choice === "Certain breeds or species" &&
      !v.disallowedText?.trim()
    ) {
      return "Enter prohibited breeds/species, separated by commas.";
    }

    return "";
  }

  if (q.type === "location") {
    return v?.choice && /^\d{5}$/.test(v.zip || "")
      ? ""
      : "Select a location option and provide a 5-digit ZIP code.";
  }

  return v ? "" : "Select an answer.";
}

export default function QuizScreen() {
  const router = useRouter();

  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);

  const [availablePets, setAvailablePets] =
    useState<any[]>([]);

  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  // Get the questions applicable to the user
  const questions = useMemo(
    () => getVisibleQuestions(answers),
    [answers]
  );

  // Get available breeds from Firestore
  const breeds = useMemo(() => {
    const type = answers.q1;

    const pets = availablePets.filter(
      p =>
        !type ||
        type === "Not sure yet" ||
        (
          type.startsWith("Small animal")
            ? [
                "small animal",
                "rabbit",
                "hamster",
                "guinea pig"
              ].includes(
                String(p.species).toLowerCase()
              )
            : p.species === type
        )
    );

    return [
      ...new Set(
        pets.map(p => p.breed).filter(Boolean)
      )
    ].sort() as string[];

  }, [availablePets, answers.q1]);

  const q: any =
    questions[Math.min(step, questions.length - 1)];

  const value = answers[q.id];

  // Retrieve animals and saved answers
  useEffect(() => {
    let active = true;

    async function initializeQuiz() {
      try {
        const auth = getAuth(app);

        await auth.authStateReady();

        const user = auth.currentUser;

        const [pets, saved] = await Promise.all([
          getAnimals(),
          user
            ? getQuizAnswers(user.uid)
            : Promise.resolve(null)
        ]);

        if (!active) return;

        setAvailablePets(pets);

        if (saved) {
          setAnswers(saved);
        }

      } catch (e) {
        console.error("Quiz setup failed:", e);

        if (active) {
          setError(
            "Could not load saved quiz answers or available breeds."
          );
        }

      } finally {
        if (active) {
          setBusy(false);
        }
      }
    }

    initializeQuiz();

    return () => {
      active = false;
    };
  }, []);

  // Update the answer for the current question
  
    function change(next: any) {
    setError("");

    setAnswers(prev => {
        const update: Answers = {
        ...prev,
        [q.id]: next
        };

        // Clear previous breed preferences if pet type changes
        if (
        q.id === "q1" &&
        prev.q1 !== next
        ) {
        delete update["q2"];
        }

        return update;
    });
    }


  // Handle questions with multiple choices
  function chooseMulti(choice: string) {
    const previous = Array.isArray(value)
      ? value
      : [];

    const next = choice === q.exclusive
      ? [choice]
      : previous.includes(choice)
        ? previous.filter(
            (x: string) => x !== choice
          )
        : [
            ...previous.filter(
              (x: string) => x !== q.exclusive
            ),
            choice
          ];

    change(next);
  }

  // Get location or ask user to enter ZIP code
  async function chooseLocation(choice: string) {
    if (choice === "Enter a ZIP code") {
      change({
        choice,
        zip: value?.zip ?? ""
      });
      return;
    }

    setBusy(true);

    try {
      const zip = await deriveZipFromDevice();

      change({
        choice,
        zip
      });

    } catch (e: any) {
      setAnswers(prev => ({
        ...prev,
        q19: {
          choice: "Enter a ZIP code",
          zip: ""
        }
      }));

      setError(
        e?.message ?? "Please enter a ZIP code instead."
      );

    } finally {
      setBusy(false);
    }
  }

  // Go to next question or submit quiz
  async function next() {
    const validation = validate(q, answers);

    if (validation) {
      setError(validation);
      return;
    }

    if (step < questions.length - 1) {
      setStep(x => x + 1);
      setError("");
      return;
    }

    // Last question: Save answers
    const auth = getAuth(app);

    await auth.authStateReady();

    const user = auth.currentUser;

    if (!user) {
      setError(
        "Please log in before saving your quiz."
      );
      return;
    }

    setBusy(true);

    try {
      await saveQuizAnswers(
        user.uid,
        answers
      );

      router.push("/matches" as Href);

    } catch (e) {
      console.error("Could not save quiz:", e);

      setError(
        "Saving quiz failed. Confirm your Firestore rules allow you to update your own profile."
      );

    } finally {
      setBusy(false);
    }
  }

  // Reusable answer button
  function optionButton(
    label: string,
    selected: boolean,
    onPress: () => void
  ) {
    return (
      <TouchableOpacity
        key={label}
        onPress={onPress}
        style={[
          styles.option,
          selected && styles.selected
        ]}
      >
        <Text
          style={[
            styles.optionText,
            selected && styles.selectedText
          ]}
        >
          {selected ? "✓  " : ""}
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  // Show loading indicator
  if (busy) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="teal"
        />
        <Text>Loading...</Text>
      </View>
    );
  }

  // Quiz user interface
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >

      <Text style={styles.heading}>
        Find your PawPair
      </Text>

      <Text style={styles.progress}>
        Question {step + 1} of {questions.length}
      </Text>

      <Text style={styles.question}>
        {q.title}
      </Text>

      {!!q.note && (
        <Text style={styles.note}>
          {q.note}
        </Text>
      )}

      {/* Question about preferred breeds */}
      {q.type === "breeds" ? (
        <View>

          {optionButton(
            "No preference",
            value?.mode === "none",
            () => change({
              mode: "none",
              breeds: [],
              other: ""
            })
          )}

          <Text style={styles.subheading}>
            Preferred breeds (choose multiple)
          </Text>

          {breeds.map(b =>
            optionButton(
              b,
              (value?.breeds ?? []).includes(b),
              () => {
                const old = value?.breeds ?? [];

                change({
                  mode: "selected",
                  breeds: old.includes(b)
                    ? old.filter(
                        (x: string) => x !== b
                      )
                    : [...old, b],
                  other: value?.other ?? ""
                });
              }
            )
          )}

          <Text style={styles.subheading}>
            Other breed (optional)
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter another breed"
            value={value?.other ?? ""}
            onChangeText={other =>
              change({
                mode: "other",
                breeds: value?.breeds ?? [],
                other
              })
            }
          />
        </View>

      ) : q.type === "restrictions" ? (
        <View>

          {q.options.map((x: string) =>
            optionButton(
              x,
              value?.choice === x,
              () => change({
                choice: x,
                maxWeightLbs: "",
                disallowedText: ""
              })
            )
          )}

          {value?.choice === "Size or weight limits" && (
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="Maximum pet weight (lb)"
              value={value.maxWeightLbs ?? ""}
              onChangeText={maxWeightLbs =>
                change({
                  ...value,
                  maxWeightLbs
                })
              }
            />
          )}

          {value?.choice === "Certain breeds or species" && (
            <TextInput
              style={styles.input}
              placeholder="Prohibited breeds/species, comma-separated"
              value={value.disallowedText ?? ""}
              onChangeText={disallowedText =>
                change({
                  ...value,
                  disallowedText
                })
              }
            />
          )}
        </View>

      ) : q.type === "location" ? (
        <View>

          {q.options.map((x: string) =>
            optionButton(
              x,
              value?.choice === x,
              () => {
                void chooseLocation(x);
              }
            )
          )}

          {value?.choice === "Enter a ZIP code" && (
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={5}
              placeholder="5-digit U.S. ZIP code"
              value={value?.zip ?? ""}
              onChangeText={zip =>
                change({
                  choice: "Enter a ZIP code",
                  zip: zip.replace(/\D/g, "")
                })
              }
            />
          )}

          {!!value?.zip && (
            <Text style={styles.note}>
              ZIP: {value.zip} (only ZIP saved)
            </Text>
          )}
        </View>

      ) : q.type === "multi" ? (
        <View>
          {q.options.map((x: string) =>
            optionButton(
              x,
              (value ?? []).includes(x),
              () => chooseMulti(x)
            )
          )}
        </View>

      ) : (
        <View>
          {q.options.map((x: string) =>
            optionButton(
              x,
              value === x,
              () => change(x)
            )
          )}
        </View>
      )}

      {/* Validation error */}
      {!!error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}

      {/* Navigation buttons */}
      <View style={styles.navigation}>

        {step > 0 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setStep(x => x - 1);
              setError("");
            }}
          >
            <Text style={styles.backText}>
              Back
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => {
            void next();
          }}
        >
          <Text style={styles.nextText}>
            {step === questions.length - 1
              ? "See my matches"
              : "Next"}
          </Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

// Temporary styling until you apply the Figma designs
const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 80,
    backgroundColor: "white",
    flexGrow: 1
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12
  },

  heading: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#007f7a",
    marginBottom: 12
  },

  progress: {
    color: "#666",
    marginBottom: 15
  },

  question: {
    fontSize: 21,
    fontWeight: "600",
    marginBottom: 12
  },

  note: {
    color: "#666",
    marginBottom: 12
  },

  subheading: {
    fontWeight: "600",
    marginTop: 14,
    marginBottom: 8
  },

  option: {
    borderWidth: 1,
    borderColor: "#cccccc",
    borderRadius: 9,
    padding: 14,
    marginBottom: 10
  },

  selected: {
    borderColor: "#008080",
    backgroundColor: "#e0f4f2"
  },

  optionText: {
    fontSize: 15
  },

  selectedText: {
    color: "#005f5f",
    fontWeight: "600"
  },

  input: {
    backgroundColor: "#f6f6f6",
    padding: 14,
    borderRadius: 9,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#ddd"
  },

  navigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12
  },

  backButton: {
    padding: 13,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#008080",
    flex: 1,
    alignItems: "center"
  },

  backText: {
    color: "#008080",
    fontWeight: "600"
  },

  nextButton: {
    padding: 13,
    borderRadius: 8,
    backgroundColor: "#008080",
    flex: 2,
    alignItems: "center"
  },

  nextText: {
    color: "#fff",
    fontWeight: "600"
  },

  error: {
    color: "#b91c1c",
    marginTop: 8
  }
});
