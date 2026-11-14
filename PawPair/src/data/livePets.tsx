import { useMemo, useSyncExternalStore } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "../firebase.js";
import { getAnimals } from "../services/animalServices";
import { getQuizAnswers } from "../services/quizService";
import { matchPets } from "../services/matchingService";
import { usePetLists } from "../store/petLists";
import { useSyncFavorites } from "./useSyncFavorites";

// Only pets scoring at least this % count as recommended (same rule as swiping)
export const MIN_MATCH = 85;

const childrenIcon = require("../../assets/images/children-icon.png");
const outdoorsIcon = require("../../assets/images/outdoors-icon.png");
const babyIcon = require("../../assets/images/baby.png");
const tentIcon = require("../../assets/images/tent.png");

export type PetTrait = { text: string; icon?: any; listIcon?: any; size?: number };

export type LivePet = {
  id: string | number;
  name: string;
  image?: string;
  about?: string;
  email?: string;
  age?: string | number;
  breed?: string;
  species?: string;
  loves?: string[];
  traits?: PetTrait[];
  matching?: Record<string, any>;
  [key: string]: any;
};

function buildTraits(d: any): PetTrait[] {
  const t: PetTrait[] = [];
  if (d.goodWithKids) t.push({ text: "Great with kids", icon: childrenIcon, listIcon: babyIcon, size: 14 });
  if (d.lovesOutdoors) t.push({ text: "Loves the outdoors", icon: outdoorsIcon, listIcon: tentIcon, size: 24 });
  if (d.goodWithDogs) t.push({ text: "Good with dogs" });
  if (d.goodWithCats) t.push({ text: "Good with cats" });
  if (d.temperament) t.push({ text: String(d.temperament) });
  if (t.length === 0 && d.breed) t.push({ text: String(d.breed) });
  return t.slice(0, 3);
}

function ageLabel(age: any): string | undefined {
  if (typeof age === "number") return `${age} ${age === 1 ? "year" : "years"}`;
  return age ? String(age) : undefined;
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/* ---------- pets (same source as the swiping page) ---------- */
let pets: LivePet[] = [];
let petsStarted = false;

async function startPets() {
  if (petsStarted) return;
  petsStarted = true;
  try {
    const list: any[] = await getAnimals();
    pets = list.map((data: any) => ({
      ...data,
      id: data.id,
      image: data.photoUrl ?? data.image,
      about: data.description ?? data.about,
      email: data.contactEmail ?? data.email,
      age: ageLabel(data.age),
      traits: data.traits ?? buildTraits(data),
      loves: data.loves ?? [],
    })) as LivePet[];
    emit();
  } catch (e) {
    console.warn("Couldn't load pets:", e);
    petsStarted = false; // allow a retry next time something subscribes
  }
}

/* ---------- quiz answers (same source as the swiping page) ---------- */
let answers: Record<string, any> | null = null;
let answersStarted = false;

function startAnswers() {
  if (answersStarted) return;
  answersStarted = true;
  onAuthStateChanged(getAuth(app), async (user) => {
    answers = null;
    emit();
    if (!user) return;
    try {
      const a = await getQuizAnswers(user.uid);
      answers = a ?? null;
    } catch (e) {
      console.warn("Couldn't load quiz answers:", e);
    }
    emit();
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  startPets();
  startAnswers();
  return () => {
    listeners.delete(cb);
  };
}

export function usePets() {
  return useSyncExternalStore(subscribe, () => pets, () => pets);
}

export function useQuizAnswers() {
  return useSyncExternalStore(subscribe, () => answers, () => answers);
}

/** Best matches first, excluded pets removed. No quiz taken = all pets. */
export function useRankedPets(): LivePet[] {
  const all = usePets();
  const a = useQuizAnswers();
  return useMemo(() => {
    if (!a || Object.keys(a).length === 0) return all;
    return matchPets(all, a, all.length).matches.map((m: any) => m.pet as LivePet);
  }, [all, a]);
}

/** Only pets the compatibility system actually recommends (score >= MIN_MATCH). */
export function useRecommendedPets(): LivePet[] {
  const all = usePets();
  const a = useQuizAnswers();
  return useMemo(() => {
    if (!a || Object.keys(a).length === 0) return [];
    return matchPets(all, a, all.length)
      .matches.filter((m: any) => m.score != null && m.score >= MIN_MATCH)
      .map((m: any) => m.pet as LivePet);
  }, [all, a]);
}

/** Pets this user matched with. A pet only shows if it is also a
 *  recommended pet, so never-recommended or stale ones are hidden. */
export function useMatchedPets(): LivePet[] {
  useSyncFavorites(); // loads saved favorites into the matches list
  const { matches: matchIds } = usePetLists();
  const recommended = useRecommendedPets();
  return (matchIds as (string | number)[])
    .map((id) => recommended.find((p) => String(p.id) === String(id)))
    .filter((p): p is LivePet => !!p);
}