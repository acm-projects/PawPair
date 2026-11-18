import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "../firebase.js";

type ListName = "matches";
type PetId = string | number;
type State = { matches: PetId[]; hydrated: boolean };

// Matches are saved on the phone separately for each account,
// so one user's matches never show up for another user.
const BASE_KEY = "pawpair-lists-v1";
let storageKey = `${BASE_KEY}:signed-out`;

let state: State = { matches: [], hydrated: false };
const listeners = new Set<() => void>();

const same = (a: PetId, b: PetId) => String(a) === String(b);

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
  if (state.hydrated) {
    AsyncStorage.setItem(storageKey, JSON.stringify({ matches: state.matches })).catch(() => {});
  }
}

let hydrating: Promise<void> | null = null;
export function hydrate() {
  startAuthWatch();
  if (!hydrating) {
    const key = storageKey;
    hydrating = AsyncStorage.getItem(key)
      .then((raw: string | null) => {
        if (key !== storageKey) return; // the user changed while loading
        const saved = raw ? JSON.parse(raw) : {};
        const merge = (a: PetId[] = [], b: PetId[] = []) => [
          ...a,
          ...b.filter((id) => !a.some((x) => same(x, id))),
        ];
        setState({
          matches: merge(saved.matches, state.matches),
          hydrated: true,
        });
      })
      .catch(() => setState({ hydrated: true }));
  }
  return hydrating;
}

// When a different user signs in (or signs out), switch to their own list.
let authWatching = false;
function startAuthWatch() {
  if (authWatching) return;
  authWatching = true;
  onAuthStateChanged(getAuth(app), (user) => {
    const nextKey = `${BASE_KEY}:${user?.uid ?? "signed-out"}`;
    if (nextKey === storageKey) return;
    storageKey = nextKey;
    state = { matches: [], hydrated: false };
    listeners.forEach((l) => l());
    hydrating = null;
    hydrate();
  });
}

function add(list: ListName, id: PetId) {
  if (state[list].some((x) => same(x, id))) return;
  setState({ [list]: [...state[list], id] } as Partial<State>);
}

export const matchPet = (id: PetId) => add("matches", id);

export const removePet = (list: ListName, id: PetId) =>
  setState({ [list]: state[list].filter((x) => !same(x, id)) } as Partial<State>);

export const clearList = (list: ListName) =>
  setState({ [list]: [] } as Partial<State>);

export function usePetLists() {
  useEffect(() => {
    hydrate();
  }, []);
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => state,
    () => state
  );
}