import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { app, db } from "../firebase.js";

export const FINAL_POST_HOME = "/homepages/FinalPostHomepage";
export const PRE_HOME = "/homepages/PreHomepage";

// Used right after login: where should this user land?
export async function getHomeRouteForUser(uid: string, fallback: string) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const id = snap.data()?.adoptedPetId;
    if (typeof id === "string" && id.trim()) return FINAL_POST_HOME;
  } catch (e) {
    console.warn("Couldn't check adoption status:", e);
  }
  return fallback;
}

// Live check: has this user already adopted a pet (saved in Firestore)?
export function useSavedAdoption() {
  const [state, setState] = useState({ ready: false, adopted: false });

  useEffect(() => {
    let stopDoc: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(getAuth(app), (user) => {
      stopDoc?.();
      stopDoc = undefined;
      if (!user) {
        setState({ ready: true, adopted: false });
        return;
      }
      setState({ ready: false, adopted: false });
      stopDoc = onSnapshot(
        doc(db, "users", user.uid),
        (snap) => {
          const id = snap.data()?.adoptedPetId;
          setState({ ready: true, adopted: typeof id === "string" && id.trim() !== "" });
        },
        () => setState({ ready: true, adopted: false })
      );
    });
    return () => {
      stopDoc?.();
      stopAuth();
    };
  }, []);

  return state;
}