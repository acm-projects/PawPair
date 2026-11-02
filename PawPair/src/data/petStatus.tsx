import { useSyncExternalStore } from "react";

export const STAGES = [
  "Matched",
  "Applied",
  "Meet & Greet",
  "Home Visit",
  "Approved",
  "Adopted",
] as const;

export type PetStatus = {
  stage: number; // index into STAGES
  dates: Record<number, string>; // stage index -> "10/5/26"
};

// Pet ids can be numbers or strings
type PetId = string | number;

let state: Record<string, PetStatus> = {};
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
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
  state = { ...state, [key]: { stage, dates } };
  emit();
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