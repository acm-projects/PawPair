// import { useState, useRef, useEffect, type CSSProperties } from "react";
// import { useRouter } from "expo-router";

// const pawWatermark = require("../../../assets/images/paw-watermark.png");

// const ROUTES = {
//   swipe: "/swiping",
// } as const;

// const LEAVE_MS = 350;

// let enterPlayed = false;

// function loadFont() {
//   if (typeof document === "undefined") return;
//   if (document.getElementById("open-sans-font")) return;
//   const link = document.createElement("link");
//   link.id = "open-sans-font";
//   link.rel = "stylesheet";
//   link.href = "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap";
//   document.head.appendChild(link);
// }

// type Question = {
//   questionNum: number;
//   question: string;
//   options: string[];
// };

// type QuizProps = {
//   onFinish?: (answers: string[]) => void;
// };

// const QUESTIONS: Question[] = [
//   {
//     questionNum: 1,
//     question: "What type of home do you live in?",
//     options: ["Townhouse", "Apartment", "House with no yard", "House with yard"],
//   },
//   {
//     questionNum: 2,
//     question: "How active is your lifestyle?",
//     options: ["Not active", "Fairly active", "Active", "Very active"],
//   },
//   {
//     questionNum: 3,
//     question: "How much time are you home each day?",
//     options: ["Less than 3 hours", "3 to 7 hours", "7 to 12 hours", "Almost always"],
//   },
//   {
//     questionNum: 4,
//     question: "Do you have any other pets at home?",
//     options: ["No pets", "Cats", "Dogs", "Other animals"],
//   },
// ];

// const PINK = "#F5C0B3";
// const CORAL = "#E98F78";
// const CREAM = "#F6F3F1";
// const FONT = "'Open Sans', system-ui, sans-serif";

// function Paw({ style }: { style?: CSSProperties }) {
//   return (
//     <img
//       src={pawWatermark}
//       alt=""
//       aria-hidden="true"
//       style={{ position: "absolute", width: 64, height: "auto", pointerEvents: "none", ...style }}
//     />
//   );
// }

// export default function Quiz({ onFinish = () => {} }: QuizProps) {
//   const router = useRouter();

//   const [index, setIndex] = useState(0);
//   const [answers, setAnswers] = useState<string[]>([]);
//   const [leaving, setLeaving] = useState(false);
//   const [playEnter] = useState(() => !enterPlayed);
//   const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

//   useEffect(() => {
//     loadFont();
//     enterPlayed = true;
//     return () => clearTimeout(timer.current);
//   }, []);

//   const current = QUESTIONS[index];
//   const selected = answers[index];
//   const isLast = index === QUESTIONS.length - 1;

//   // Play the exit animation, then navigate once it finishes.
//   const goToSwipe = () => {
//     if (leaving) return; // prevent double taps
//     enterPlayed = false; // let the fade-in play again next time the quiz opens
//     setLeaving(true);
//     timer.current = setTimeout(() => router.replace(ROUTES.swipe), LEAVE_MS);
//   };

//   const choose = (option: string) =>
//     setAnswers((prev) => {
//       const next = [...prev];
//       next[index] = option;
//       return next;
//     });

//   const next = () => {
//     if (isLast) {
//       onFinish(answers);
//       goToSwipe();
//       return;
//     }
//     setIndex((i) => i + 1);
//   };

//   // Only slide questions in after the first one (the screen fade-in covers question 1).
//   const slideClass = index > 0 ? "q-in" : undefined;

//   return (
//     <div style={styles.page}>
//       <style>{`
//         .quiz-btn:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }

//         /* screen enter / exit */
//         .phone-enter { animation: phoneIn ${LEAVE_MS}ms cubic-bezier(.2,.8,.2,1) both; }
//         .phone-leave { animation: phoneOut ${LEAVE_MS}ms cubic-bezier(.4,0,.2,1) forwards; }
//         @keyframes phoneIn  { from { opacity: 0; transform: translateY(16px); } }
//         @keyframes phoneOut { to   { opacity: 0; transform: translateY(-24px) scale(.97); } }

//         /* question-to-question slide */
//         .q-in { animation: qIn 260ms cubic-bezier(.2,.8,.2,1) both; }
//         @keyframes qIn { from { opacity: 0; transform: translateX(24px); } }

//         @media (prefers-reduced-motion: reduce) {
//           .phone-enter, .phone-leave, .q-in { animation-duration: 1ms; }
//         }
//       `}</style>

//       <div
//         className={leaving ? "phone-leave" : playEnter ? "phone-enter" : undefined}
//         style={{ ...styles.phone, pointerEvents: leaving ? "none" : "auto" }}
//       >
//         {/* Header */}
//         <div style={styles.header}>
//           <div style={styles.pill}>Question {current.questionNum}</div>
//           <h1 key={index} className={slideClass} style={styles.title}>
//             {current.question}
//           </h1>
//         </div>

//         {/* Card */}
//         <div style={styles.card}>
//           <Paw style={{ top: "3%", right: "14%" }} />
//           <Paw style={{ top: "14%", right: -14, transform: "rotate(25deg)" }} />
//           <Paw style={{ top: "38%", left: "34%", transform: "rotate(-10deg)" }} />
//           <Paw style={{ bottom: "26%", left: -6, transform: "rotate(-20deg)" }} />
//           <Paw style={{ bottom: "14%", right: "6%", transform: "rotate(15deg)" }} />

//           {/* Options (scrolls only if the window is very short) */}
//           <div style={styles.content}>
//             <div key={index} className={slideClass} style={styles.options}>
//               {current.options.map((option) => {
//                 const active = selected === option;
//                 return (
//                   <button
//                     key={option}
//                     className="quiz-btn"
//                     onClick={() => choose(option)}
//                     aria-pressed={active}
//                     style={{
//                       ...styles.option,
//                       background: active ? CORAL : PINK,
//                       boxShadow: active ? "inset 0 0 0 2px #ffffff88" : "0 2px 4px #00000012",
//                     }}
//                   >
//                     {option}
//                   </button>
//                 );
//               })}
//             </div>
//           </div>

//           {/* Next button (always visible) */}
//           <div style={styles.nextWrap}>
//             <button
//               className="quiz-btn"
//               onClick={next}
//               disabled={!selected}
//               style={{
//                 ...styles.next,
//                 opacity: selected ? 1 : 0.6,
//                 cursor: selected ? "pointer" : "default",
//               }}
//             >
//               {isLast ? "Finish" : "Next"}
//             </button>
//           </div>
//         </div>

//         {/* Footer */}
//         <button className="quiz-btn" onClick={goToSwipe} style={styles.skip}>
//           Skip Quiz
//         </button>
//       </div>
//     </div>
//   );
// }

// const styles: Record<string, CSSProperties> = {
//   page: {
//     flex: 1,
//     width: "100%",
//     height: "100%",
//     minHeight: 0,
//     display: "flex",
//     justifyContent: "center",
//     background: "#f2f2f2",
//     fontFamily: FONT,
//     overflow: "hidden",
//   },
//   phone: {
//     position: "relative",
//     width: "100%",
//     maxWidth: 390,
//     alignSelf: "stretch",
//     maxHeight: 844,
//     overflow: "hidden",
//     display: "flex",
//     flexDirection: "column",
//     background: CORAL,
//     boxSizing: "border-box",
//   },
//   header: {
//     flex: "0 0 auto",
//     textAlign: "center",
//     padding: "18px 24px 40px",
//     background: `linear-gradient(180deg, ${PINK} 0%, ${CORAL} 100%)`,
//   },
//   pill: {
//     display: "inline-block",
//     background: CREAM,
//     color: "#222",
//     fontSize: 18,
//     padding: "8px 40px",
//     borderRadius: 999,
//   },
//   title: {
//     margin: "14px auto 0",
//     maxWidth: "11.5em",
//     color: "#fff",
//     fontSize: 24,
//     fontWeight: 400,
//     lineHeight: 1.3,
//   },
//   card: {
//     position: "relative",
//     flex: 1,
//     minHeight: 0,
//     background: CREAM,
//     borderRadius: "30px 30px 0 0",
//     overflow: "hidden",
//     paddingBottom: 44,
//     display: "flex",
//     flexDirection: "column",
//   },
//   content: {
//     position: "relative",
//     zIndex: 1,
//     flex: 1,
//     minHeight: 0,
//     overflowY: "auto",
//     padding: "24px 40px 8px",
//     display: "flex",
//     flexDirection: "column",
//     gap: 14,
//   },
//   options: {
//     flex: 1,
//     minHeight: 0,
//     display: "flex",
//     flexDirection: "column",
//     gap: 14,
//   },
//   option: {
//     flex: "1 1 0",
//     minHeight: 30,
//     maxHeight: 38,
//     border: "none",
//     borderRadius: 14,
//     fontSize: 14,
//     fontFamily: FONT,
//     color: "#222",
//     cursor: "pointer",
//     transition: "background 0.15s",
//   },
//   nextWrap: {
//     position: "relative",
//     zIndex: 1,
//     flex: "0 0 auto",
//     padding: "8px 0 12px",
//     display: "flex",
//     justifyContent: "center",
//   },
//   next: {
//     border: "none",
//     background: PINK,
//     color: "#222",
//     fontFamily: FONT,
//     fontSize: 14,
//     padding: "8px 32px",
//     borderRadius: 12,
//     boxShadow: "0 2px 4px #00000012",
//   },
//   skip: {
//     position: "absolute",
//     left: 0,
//     right: 0,
//     bottom: 0,
//     height: 44,
//     zIndex: 2,
//     border: "none",
//     borderRadius: "16px 16px 0 0",
//     background: `linear-gradient(90deg, ${PINK}, ${CORAL})`,
//     color: "#fff",
//     fontFamily: FONT,
//     fontSize: 14,
//     fontWeight: 600,
//     textAlign: "right",
//     padding: "0 20px",
//     cursor: "pointer",
//   },
// };



import {
  useState,
  useRef,
  useEffect,
  useMemo,
  type CSSProperties
} from "react";

import { useRouter, type Href } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  doc,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

// FIX: Use Expo Asset instead of React Native Image
import { Asset } from "expo-asset";

import { app, db } from "../../firebase.js";
import { getAnimals } from "../../services/animalServices.js";
import { getVisibleQuestions } from "../../services/quizQuestions.js";

import {
  getQuizAnswers,
  saveQuizAnswers
} from "../../services/quizService.js";

import { deriveZipFromDevice } from "../../services/locationService.js";
import { weightFor } from "../../services/quizWeights.js";
import { matchPets } from "../../services/matchingService.js";

// FIXED PAW IMAGE
const pawWatermark = Asset.fromModule(
  require("../../../assets/images/paw-watermark.png")
).uri;

const ROUTES = {
  swipe: "/swiping",
} as const;

const LEAVE_MS = 350;
let enterPlayed = false;

function loadFont() {
  if (typeof document === "undefined") return;
  if (document.getElementById("open-sans-font")) return;

  const link = document.createElement("link");
  link.id = "open-sans-font";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap";

  document.head.appendChild(link);
}

type Answers = Record<string, any>;

type Question = {
  id: string;
  questionNum: number;
  question: string;
  options: string[];
  type?: "breeds" | "multi" | "restrictions" | "location";
  exclusive?: string;
  note?: string;
};

type QuizProps = {
  onFinish?: (answers: string[]) => void;
};

// Convert questions from quizQuestions.js
function toScreenQuestion(q: any): Question {
  return {
    id: q.id,
    questionNum: Number(q.id.slice(1)),
    question: q.title,
    options: q.options ?? [],
    type: q.type,
    exclusive: q.exclusive,
    note: q.note
  };
}

// Validate answers before moving to the next question
function validate(
  question: Question,
  answers: Answers
): string {
  const value = answers[question.id];

  if (question.type === "breeds") {
    if (!value?.mode) {
      return "Choose a preferred breed or No preference.";
    }

    if (
      value.mode !== "none" &&
      !(value.breeds?.length || value.other?.trim())
    ) {
      return "Choose or enter at least one breed.";
    }

    return "";
  }

  if (question.type === "multi") {
    return Array.isArray(value) && value.length > 0
      ? ""
      : "Select at least one option.";
  }

  if (question.type === "restrictions") {
    if (!value?.choice) {
      return "Select an option.";
    }

    if (
      value.choice === "Size or weight limits" &&
      !(Number(value.maxWeightLbs) > 0)
    ) {
      return "Enter the maximum allowed weight (lb).";
    }

    if (
      value.choice === "Certain breeds or species" &&
      !value.disallowedText?.trim()
    ) {
      return "Enter prohibited breeds or species.";
    }

    return "";
  }

  if (question.type === "location") {
    return value?.choice && /^\d{5}$/.test(value.zip || "")
      ? ""
      : "Select a location option and provide a 5-digit ZIP code.";
  }

  return value ? "" : "Select an answer.";
}

// Convert complex answers to strings for onFinish
function displayAnswer(answer: any): string {
  if (Array.isArray(answer)) {
    return answer.join(", ");
  }

  if (typeof answer === "string") {
    return answer;
  }

  if (answer?.mode === "none") {
    return "No preference";
  }

  if (answer?.mode) {
    return [
      ...(answer.breeds ?? []),
      answer.other
    ].filter(Boolean).join(", ");
  }

  if (answer?.choice) {
    return `${answer.choice}${
      answer.zip ? ` (${answer.zip})` : ""
    }`;
  }

  return "";
}

// Original PawPair styling constants
const PINK = "#F5C0B3";
const CORAL = "#E98F78";
const CREAM = "#F6F3F1";
const FONT = "'Open Sans', system-ui, sans-serif";

// Original paw component
function Paw({ style }: { style?: CSSProperties }) {
  return (
    <img
      src={pawWatermark}
      alt=""
      aria-hidden="true"
      style={{
        position: "absolute",
        width: 64,
        height: "auto",
        pointerEvents: "none",
        ...style
      }}
    />
  );
}

export default function Quiz({
  onFinish = () => {}
}: QuizProps) {
  const router = useRouter();

  // Quiz navigation and answers
  const [index, setIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Answers>({});

  // Firebase animal information
  const [availablePets, setAvailablePets] = useState<any[]>([]);
  const [petsLoaded, setPetsLoaded] = useState(false);

  // Loading and error states
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  // Original animation states
  const [leaving, setLeaving] = useState(false);
  const [playEnter] = useState(() => !enterPlayed);

  const timer = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);

  // Load font and initialize animation
  useEffect(() => {
    loadFont();
    enterPlayed = true;

    return () => clearTimeout(timer.current);
  }, []);

  // STEP 1: Load Firestore animals and saved quiz answers
  useEffect(() => {
    let active = true;

    async function initializeQuiz() {
      try {
        const auth = getAuth(app);
        await auth.authStateReady();

        const user = auth.currentUser;

        const [petsResult, savedResult] =
          await Promise.allSettled([
            getAnimals(),
            user
              ? getQuizAnswers(user.uid)
              : Promise.resolve(null)
          ]);

        if (!active) return;

        if (petsResult.status === "fulfilled") {
          setAvailablePets(petsResult.value);
          setPetsLoaded(true);
        } else {
          console.error(
            "Couldn't load animals:",
            petsResult.reason
          );

          setError(
            "Couldn't load available breeds. You can still answer the quiz."
          );
        }

        if (savedResult.status === "fulfilled") {
          if (savedResult.value) {
            setQuizAnswers(savedResult.value);
          }
        } else {
          console.error(
            "Couldn't load previous answers:",
            savedResult.reason
          );

          setError(
            "Couldn't retrieve saved answers. You can complete the quiz again."
          );
        }

      } catch (err) {
        console.error("Quiz initialization error:", err);

        if (active) {
          setError(
            "Couldn't initialize the quiz. Please try again."
          );
        }

      } finally {
        if (active) {
          setBusy(false);
        }
      }
    }

    void initializeQuiz();

    return () => {
      active = false;
    };
  }, []);

  // STEP 2: Get applicable quiz questions
  const questions = useMemo(
    () =>
      getVisibleQuestions(quizAnswers).map(
        toScreenQuestion
      ),
    [quizAnswers]
  );

  const current =
    questions[Math.min(index, questions.length - 1)];

  const selected = current
    ? quizAnswers[current.id]
    : undefined;

  const isLast = index === questions.length - 1;

  const canNext =
    !!current && validate(current, quizAnswers) === "";

  // STEP 3: Retrieve available breeds
  const breeds = useMemo(() => {
    const type = quizAnswers.q1;

    const pets = availablePets.filter(pet => {
      if (!type || type === "Not sure yet") {
        return true;
      }

      if (type.startsWith("Small animal")) {
        return [
          "small animal",
          "rabbit",
          "hamster",
          "guinea pig"
        ].includes(
          String(pet.species).toLowerCase()
        );
      }

      return (
        String(pet.species).toLowerCase() ===
        type.toLowerCase()
      );
    });

    return [
      ...new Set(
        pets.map(pet => pet.breed).filter(Boolean)
      )
    ].sort() as string[];

  }, [availablePets, quizAnswers.q1]);

  // STEP 4: Original transition to Swiping
  const goToSwipe = () => {
    if (leaving) return;

    enterPlayed = false;
    setLeaving(true);

    timer.current = setTimeout(
      () => router.replace(ROUTES.swipe as Href),
      LEAVE_MS
    );
  };

  // STEP 5: Update a quiz answer
  function change(next: any) {
    setError("");

    setQuizAnswers(prev => {
      const update: Answers = {
        ...prev,
        [current.id]: next
      };

      // Clear breed selection when species changes
      if (
        current.id === "q1" &&
        prev.q1 !== next
      ) {
        delete update["q2"];
      }

      return update;
    });
  }

  // Original choose function
  const choose = (option: string) => change(option);

  // STEP 6: Multi-select questions
  function chooseMulti(option: string) {
    const prior: string[] = Array.isArray(selected)
      ? selected
      : [];

    const next =
      option === current.exclusive
        ? [option]
        : prior.includes(option)
          ? prior.filter(
              item => item !== option
            )
          : [
              ...prior.filter(
                item => item !== current.exclusive
              ),
              option
            ];

    change(next);
  }

  // STEP 7: ZIP-code or device-location question
  async function chooseLocation(option: string) {
    if (option === "Enter a ZIP code") {
      change({
        choice: option,
        zip: selected?.zip ?? ""
      });

      return;
    }

    setBusy(true);

    try {
      const zip = await deriveZipFromDevice();

      change({
        choice: option,
        zip
      });

    } catch (err: any) {
      setQuizAnswers(prev => ({
        ...prev,
        q19: {
          choice: "Enter a ZIP code",
          zip: ""
        }
      }));

      setError(
        err?.message ??
          "Please enter your ZIP code manually."
      );

    } finally {
      setBusy(false);
    }
  }

  // STEP 8: Next question or Finish
  const next = async () => {
    if (busy || leaving) return;

    const problem = validate(current, quizAnswers);

    if (problem) {
      setError(problem);
      return;
    }

    if (isLast) {
      setBusy(true);

      try {
        const auth = getAuth(app);
        await auth.authStateReady();

        const uid = auth.currentUser?.uid;

        if (!uid) {
          throw new Error(
            "Please log in to save your PawPair quiz."
          );
        }

        // Save answers to Firestore
        await saveQuizAnswers(uid, quizAnswers);

        // Apply weights and calculate matches
        if (petsLoaded) {
          try {
            const appliedWeights: Record<string, number> = {};

            for (const question of questions) {
              appliedWeights[question.id] = weightFor(
                question.id,
                quizAnswers[question.id]
              );
            }

            const ranking = matchPets(
              availablePets,
              quizAnswers,
              5
            );

            const topFive = ranking.matches.map(
              (item: any) => ({
                petId: item.pet.id,
                score: item.score ?? null,
                coverage: item.coverage,
                reasons: item.reasons ?? []
              })
            );

            // Save recommendations to Firestore
            await setDoc(
              doc(db, "users", uid),
              {
                quizAnswerWeights: appliedWeights,
                quizMatchResults: topFive,
                quizMatchesUpdatedAt: serverTimestamp()
              },
              { merge: true }
            );

            console.log(
              "Top-five PawPair matches:",
              topFive
            );

          } catch (matchError) {
            console.warn(
              "Quiz saved, but recommendations weren't cached:",
              matchError
            );
          }
        }

        // Preserve original onFinish callback
        onFinish(
          questions.map(question =>
            displayAnswer(
              quizAnswers[question.id]
            )
          )
        );

        // Preserve original navigation
        goToSwipe();

      } catch (err: any) {
        console.error("Unable to save quiz:", err);

        setError(
          err?.message ??
            "Could not save the quiz. Please try again."
        );

      } finally {
        setBusy(false);
      }

      return;
    }

    setIndex(i => i + 1);
    setError("");
  };

  // STEP 9: Reusable pink/coral answer buttons
  const optionButton = (
    label: string,
    active: boolean,
    onClick: () => void
  ) => (
    <button
      key={label}
      type="button"
      className="quiz-btn"
      onClick={onClick}
      aria-pressed={active}
      disabled={busy || leaving}
      style={{
        ...styles.option,
        background: active ? CORAL : PINK,
        boxShadow: active
          ? "inset 0 0 0 2px #ffffff88"
          : "0 2px 4px #00000012"
      }}
    >
      {label}
    </button>
  );

  const slideClass = index > 0 ? "q-in" : undefined;

  if (!current) {
    return (
      <div style={styles.page}>
        No quiz questions were found.
      </div>
    );
  }

  // STEP 10: Preserve original PawPair design
  return (
    <div style={styles.page}>
      <style>{`
        .quiz-btn:focus-visible {
          outline: 3px solid #fff;
          outline-offset: 2px;
        }

        .phone-enter {
          animation: phoneIn ${LEAVE_MS}ms cubic-bezier(.2,.8,.2,1) both;
        }

        .phone-leave {
          animation: phoneOut ${LEAVE_MS}ms cubic-bezier(.4,0,.2,1) forwards;
        }

        @keyframes phoneIn {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
        }

        @keyframes phoneOut {
          to {
            opacity: 0;
            transform: translateY(-24px) scale(.97);
          }
        }

        .q-in {
          animation: qIn 260ms cubic-bezier(.2,.8,.2,1) both;
        }

        @keyframes qIn {
          from {
            opacity: 0;
            transform: translateX(24px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .phone-enter,
          .phone-leave,
          .q-in {
            animation-duration: 1ms;
          }
        }
      `}</style>

      <div
        className={
          leaving
            ? "phone-leave"
            : playEnter
              ? "phone-enter"
              : undefined
        }
        style={{
          ...styles.phone,
          pointerEvents: leaving ? "none" : "auto"
        }}
      >
        {/* Original header */}
        <div style={styles.header}>
          <div style={styles.pill}>
            Question {index + 1} of {questions.length}
          </div>

          <h1
            key={current.id}
            className={slideClass}
            style={styles.title}
          >
            {current.question}
          </h1>
        </div>

        {/* Original card */}
        <div style={styles.card}>
          <Paw style={{ top: "3%", right: "14%" }} />
          <Paw
            style={{
              top: "14%",
              right: -14,
              transform: "rotate(25deg)"
            }}
          />
          <Paw
            style={{
              top: "38%",
              left: "34%",
              transform: "rotate(-10deg)"
            }}
          />
          <Paw
            style={{
              bottom: "26%",
              left: -6,
              transform: "rotate(-20deg)"
            }}
          />
          <Paw
            style={{
              bottom: "14%",
              right: "6%",
              transform: "rotate(15deg)"
            }}
          />

          <div style={styles.content}>
            {!!current.note && (
              <p style={styles.note}>
                {current.note}
              </p>
            )}

            <div
              key={current.id}
              className={slideClass}
              style={styles.options}
            >
              {/* Breed preference question */}
              {current.type === "breeds" ? (
                <>
                  {optionButton(
                    "No preference",
                    selected?.mode === "none",
                    () =>
                      change({
                        mode: "none",
                        breeds: [],
                        other: ""
                      })
                  )}

                  <div style={styles.subheading}>
                    Preferred breeds (select multiple)
                  </div>

                  {breeds.map(breed =>
                    optionButton(
                      breed,
                      (selected?.breeds ?? []).includes(breed),
                      () => {
                        const previous: string[] =
                          selected?.breeds ?? [];

                        change({
                          mode: "selected",
                          breeds: previous.includes(breed)
                            ? previous.filter(
                                item => item !== breed
                              )
                            : [...previous, breed],
                          other: selected?.other ?? ""
                        });
                      }
                    )
                  )}

                  <input
                    style={styles.input}
                    aria-label="Other preferred breed"
                    placeholder="Other breed (optional)"
                    value={selected?.other ?? ""}
                    onChange={event =>
                      change({
                        mode: "other",
                        breeds: selected?.breeds ?? [],
                        other: event.target.value
                      })
                    }
                  />
                </>

              ) : current.type === "restrictions" ? (
                <>
                  {/* Landlord restrictions */}
                  {current.options.map(option =>
                    optionButton(
                      option,
                      selected?.choice === option,
                      () =>
                        change({
                          choice: option,
                          maxWeightLbs: "",
                          disallowedText: ""
                        })
                    )
                  )}

                  {selected?.choice ===
                    "Size or weight limits" && (
                    <input
                      style={styles.input}
                      aria-label="Maximum allowed pet weight"
                      type="number"
                      min="1"
                      placeholder="Maximum pet weight (lb)"
                      value={selected.maxWeightLbs ?? ""}
                      onChange={event =>
                        change({
                          ...selected,
                          maxWeightLbs: event.target.value
                        })
                      }
                    />
                  )}

                  {selected?.choice ===
                    "Certain breeds or species" && (
                    <input
                      style={styles.input}
                      aria-label="Prohibited breeds or species"
                      placeholder="Prohibited breeds/species, comma-separated"
                      value={selected.disallowedText ?? ""}
                      onChange={event =>
                        change({
                          ...selected,
                          disallowedText: event.target.value
                        })
                      }
                    />
                  )}
                </>

              ) : current.type === "location" ? (
                <>
                  {/* Location question */}
                  {current.options.map(option =>
                    optionButton(
                      option,
                      selected?.choice === option,
                      () => {
                        void chooseLocation(option);
                      }
                    )
                  )}

                  {selected?.choice ===
                    "Enter a ZIP code" && (
                    <input
                      style={styles.input}
                      aria-label="Five-digit ZIP code"
                      placeholder="5-digit US ZIP code"
                      inputMode="numeric"
                      maxLength={5}
                      value={selected.zip ?? ""}
                      onChange={event =>
                        change({
                          choice: "Enter a ZIP code",
                          zip: event.target.value.replace(
                            /\D/g,
                            ""
                          )
                        })
                      }
                    />
                  )}

                  {!!selected?.zip && (
                    <p style={styles.note}>
                      ZIP: {selected.zip} (only ZIP saved)
                    </p>
                  )}
                </>

              ) : current.type === "multi" ? (
                <>
                  {/* Multiple choice questions */}
                  {current.options.map(option =>
                    optionButton(
                      option,
                      (selected ?? []).includes(option),
                      () => chooseMulti(option)
                    )
                  )}
                </>

              ) : (
                <>
                  {/* Single choice questions */}
                  {current.options.map(option =>
                    optionButton(
                      option,
                      selected === option,
                      () => choose(option)
                    )
                  )}
                </>
              )}
            </div>

            {!!error && (
              <p role="alert" style={styles.error}>
                {error}
              </p>
            )}
          </div>

          {/* Back and Next buttons */}
          <div style={styles.nextWrap}>
            {index > 0 && (
              <button
                type="button"
                className="quiz-btn"
                disabled={busy || leaving}
                onClick={() => {
                  setIndex(i => i - 1);
                  setError("");
                }}
                style={styles.back}
              >
                Back
              </button>
            )}

            <button
              type="button"
              className="quiz-btn"
              onClick={() => {
                void next();
              }}
              disabled={!canNext || busy || leaving}
              style={{
                ...styles.next,
                opacity: canNext && !busy ? 1 : 0.6,
                cursor:
                  canNext && !busy
                    ? "pointer"
                    : "default"
              }}
            >
              {busy
                ? "Loading..."
                : isLast
                  ? "Finish"
                  : "Next"}
            </button>
          </div>
        </div>

        {/* Original Skip Quiz button */}
        <button
          type="button"
          className="quiz-btn"
          disabled={busy || leaving}
          onClick={goToSwipe}
          style={styles.skip}
        >
          Skip Quiz
        </button>
      </div>
    </div>
  );
}

// Original pink/coral design
const styles: Record<string, CSSProperties> = {
  page: {
    flex: 1,
    width: "100%",
    height: "100%",
    minHeight: 0,
    display: "flex",
    justifyContent: "center",
    background: "#f2f2f2",
    fontFamily: FONT,
    overflow: "hidden"
  },

  phone: {
    position: "relative",
    width: "100%",
    maxWidth: 390,
    alignSelf: "stretch",
    maxHeight: 844,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    background: CORAL,
    boxSizing: "border-box"
  },

  header: {
    flex: "0 0 auto",
    textAlign: "center",
    padding: "18px 24px 40px",
    background: `linear-gradient(180deg, ${PINK} 0%, ${CORAL} 100%)`
  },

  pill: {
    display: "inline-block",
    background: CREAM,
    color: "#222",
    fontSize: 18,
    padding: "8px 40px",
    borderRadius: 999
  },

  title: {
    margin: "14px auto 0",
    maxWidth: "11.5em",
    color: "#fff",
    fontSize: 24,
    fontWeight: 400,
    lineHeight: 1.3
  },

  card: {
    position: "relative",
    flex: 1,
    minHeight: 0,
    background: CREAM,
    borderRadius: "30px 30px 0 0",
    overflow: "hidden",
    paddingBottom: 44,
    display: "flex",
    flexDirection: "column"
  },

  content: {
    position: "relative",
    zIndex: 1,
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: "24px 40px 8px",
    display: "flex",
    flexDirection: "column",
    gap: 14
  },

  options: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    gap: 14
  },

  option: {
    flex: "1 1 0",
    minHeight: 30,
    maxHeight: 38,
    border: "none",
    borderRadius: 14,
    fontSize: 14,
    fontFamily: FONT,
    color: "#222",
    cursor: "pointer",
    transition: "background 0.15s"
  },

  nextWrap: {
    position: "relative",
    zIndex: 1,
    flex: "0 0 auto",
    padding: "8px 0 12px",
    display: "flex",
    justifyContent: "center",
    gap: 12
  },

  next: {
    border: "none",
    background: PINK,
    color: "#222",
    fontFamily: FONT,
    fontSize: 14,
    padding: "8px 32px",
    borderRadius: 12,
    boxShadow: "0 2px 4px #00000012"
  },

  back: {
    border: "1px solid #b76b5b",
    background: CREAM,
    color: "#222",
    fontFamily: FONT,
    fontSize: 14,
    padding: "8px 22px",
    borderRadius: 12
  },

  skip: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 44,
    zIndex: 2,
    border: "none",
    borderRadius: "16px 16px 0 0",
    background: `linear-gradient(90deg, ${PINK}, ${CORAL})`,
    color: "#fff",
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: 600,
    textAlign: "right",
    padding: "0 20px",
    cursor: "pointer"
  },

  note: {
    margin: "0 0 10px",
    color: "#555",
    fontSize: 12,
    lineHeight: 1.4
  },

  subheading: {
    fontSize: 13,
    fontWeight: 600,
    marginTop: 8
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d2b9b3",
    background: "#fff",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 14,
    fontFamily: FONT
  },

  error: {
    color: "#a02323",
    fontSize: 12,
    lineHeight: 1.4
  }
};
