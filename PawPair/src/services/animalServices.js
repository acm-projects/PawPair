
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where
} from "firebase/firestore";

import { db } from "../firebase.js";

// Get all available animals
export async function getAnimals() {
  const animalsQuery = query(
    collection(db, "animals"),
    where("adoptionStatus", "==", "available")
  );

  const snapshot = await getDocs(animalsQuery);

  return snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));
}

// Get a specific animal by ID
export async function getAnimalById(id) {
  const snapshot = await getDoc(
    doc(db, "animals", id)
  );

  if (snapshot.exists()) {
    return {
      id: snapshot.id,
      ...snapshot.data()
    };
  }

  return null;
}
