
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase.js";

// Save completed quiz answers
export async function saveQuizAnswers(uid, answers) {
  if (!uid) {
    throw new Error("Login required");
  }

  await setDoc(
    doc(db, "users", uid),
    {
      quizAnswers: answers,
      quizCompleted: true,
      quizUpdatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

// Retrieve a user's saved quiz answers
export async function getQuizAnswers(uid) {
  if (!uid) {
    throw new Error("Login required");
  }

  const snapshot = await getDoc(
    doc(db, "users", uid)
  );

  if (snapshot.exists()) {
    return snapshot.data().quizAnswers ?? null;
  }

  return null;
}
