
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase.js";

// 1. Create a user profile
export async function createUserProfile(user) {
  await setDoc(doc(db, "users", user.uid), {
    email: user.email,
    name: user.displayName || "",
    preferences: {},
    createdAt: serverTimestamp()
  });
}

// 2. Retrieve a user's profile
export async function getUserProfile(uid) {
  const snapshot = await getDoc(
    doc(db, "users", uid)
  );

  if (snapshot.exists()) {
    return {
      id: snapshot.id,
      ...snapshot.data()
    };
  }

  return null;
}

// 3. Update a user's profile
export async function updateUserProfile(uid, data) {
  await updateDoc(
    doc(db, "users", uid),
    data
  );
}
