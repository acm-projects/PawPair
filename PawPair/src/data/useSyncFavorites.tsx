import { useEffect, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "../firebase.js";
import { getFavorites } from "../services/favoriteServices";
import { matchPet, usePetLists } from "../store/petLists";

let loadedFor: string | null = null; // only load once per signed-in user

export function useSyncFavorites() {
  const { matches } = usePetLists();
  const matchesRef = useRef<any[]>(matches as any[]);
  matchesRef.current = matches as any[];

  useEffect(() => {
    return onAuthStateChanged(getAuth(app), async (user) => {
      if (!user || loadedFor === user.uid) return;
      loadedFor = user.uid;
      try {
        const ids: string[] = await getFavorites(user.uid);
        ids.forEach((id) => {
          const already = matchesRef.current.some((m) => String(m) === String(id));
          if (!already) matchPet(id as any);
        });
      } catch (e) {
        loadedFor = null; // allow a retry
        console.warn("Couldn't load favorites:", e);
      }
    });
  }, []);
}