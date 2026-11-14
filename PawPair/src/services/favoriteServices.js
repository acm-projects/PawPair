import {
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  getFirestore,
  serverTimestamp
} from "firebase/firestore";

import { app } from "../firebase.js";

const db = getFirestore(app);

// Save an animal to favorites
export async function addFavorite(uid, petId) {
  await setDoc(
    doc(db, "users", uid, "favorites", String(petId)),
    {
      petId: String(petId),
      savedAt: serverTimestamp()
    }
  );
}

// Remove an animal from favorites
export async function removeFavorite(uid, petId) {
  await deleteDoc(
    doc(db, "users", uid, "favorites", String(petId))
  );
}

// Retrieve user's favorite animal IDs
export async function getFavorites(uid) {
  const snapshot = await getDocs(
    collection(db, "users", uid, "favorites")
  );

  return snapshot.docs.map((item) => item.id);
}