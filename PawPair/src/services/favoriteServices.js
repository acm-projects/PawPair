
import {
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase.js";

// Save an animal to favorites
export async function addFavorite(uid, petId) {
  await setDoc(
    doc(db, "users", uid, "favorites", petId),
    {
      petId: petId,
      savedAt: serverTimestamp()
    }
  );
}

// Remove an animal from favorites
export async function removeFavorite(uid, petId) {
  await deleteDoc(
    doc(db, "users", uid, "favorites", petId)
  );
}

// Retrieve user's favorite animal IDs
export async function getFavorites(uid) {
  const snapshot = await getDocs(
    collection(db, "users", uid, "favorites")
  );

  return snapshot.docs.map(item => item.id);
}
