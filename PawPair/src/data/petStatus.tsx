import { useSyncExternalStore } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { app, db } from "../firebase.js";

export const STAGES = [
  "Matched",
  "Applied",
  "Approved",
  "Adopted",
] as const;

export type PetStatus = {
  stage: number; // index into STAGES
  dates: Record<number, string>; // stage index -> "10/5/26"
};

// Pet ids can be numbers or strings
type PetId = string | number;

// Statuses are saved per user in Firestore:
//   users/{uid}/petStatus/{petId} -> { stage, dates, updatedAt }
// so application progress survives app restarts and stays with the account.
let state: Record<string, PetStatus> = {};
let uid: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

let started = false;
let stopSnapshot: (() => void) | undefined;

function start() {
  if (started) return;
  started = true;
  onAuthStateChanged(getAuth(app), (user) => {
    stopSnapshot?.();
    stopSnapshot = undefined;
    state = {};
    uid = user?.uid ?? null;
    emit();
    if (!user) return;

    stopSnapshot = onSnapshot(
      collection(db, "users", user.uid, "petStatus"),
      (snap) => {
        const next: Record<string, PetStatus> = {};
        snap.forEach((d) => {
          const data = d.data();
          next[d.id] = {
            stage: typeof data.stage === "number" ? data.stage : 0,
            dates: (data.dates as Record<number, string>) ?? {},
          };
        });
        state = next;
        emit();
      },
      (error) => console.warn("Couldn't load application statuses:", error)
    );
  });
}

function subscribe(l: () => void) {
  start();
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function today() {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
}

// Sets the current stage. Keeps existing dates, stamps new ones,
// and clears dates for any stages after the new one.
export function setStage(petId: PetId, stage: number) {
  const key = String(petId);
  const prev = state[key]?.dates ?? {};
  const dates: Record<number, string> = {};
  for (let i = 0; i <= stage; i++) {
    dates[i] = prev[i] ?? today();
  }

  // Update the screen right away; Firestore confirms a moment later.
  state = { ...state, [key]: { stage, dates } };
  emit();

  if (!uid) return;
  setDoc(
    doc(db, "users", uid, "petStatus", key),
    { stage, dates, updatedAt: serverTimestamp() },
    { merge: false }
  ).catch((error) => console.error("Couldn't save application status:", error));
}

export function useStatuses() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state
  );
}

export function statusFor(
  statuses: Record<string, PetStatus>,
  petId: PetId
): PetStatus {
  return statuses[String(petId)] ?? { stage: 0, dates: {} };
}