import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";

type ListName = "matches" | "starred";
type State = { matches: number[]; starred: number[]; hydrated: boolean };

const KEY = "pawpair-lists-v1";

let state: State = { matches: [], starred: [], hydrated: false };
const listeners = new Set<() => void>();

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
  if (state.hydrated) {
    AsyncStorage.setItem(
      KEY,
      JSON.stringify({ matches: state.matches, starred: state.starred })
    ).catch(() => {});
  }
}

let hydrating: Promise<void> | null = null;
export function hydrate() {
  if (!hydrating) {
    hydrating = AsyncStorage.getItem(KEY)
      .then((raw: string | null) => {
        const saved = raw ? JSON.parse(raw) : {};
        const merge = (a: number[] = [], b: number[] = []) => [
          ...a,
          ...b.filter((id) => !a.includes(id)),
        ];
        setState({
          matches: merge(saved.matches, state.matches),
          starred: merge(saved.starred, state.starred),
          hydrated: true,
        });
      })
      .catch(() => setState({ hydrated: true }));
  }
  return hydrating;
}

function add(list: ListName, id: number) {
  if (state[list].includes(id)) return; 
  setState({ [list]: [...state[list], id] } as Partial<State>);
}

export const matchPet = (id: number) => add("matches", id);
export const starPet = (id: number) => add("starred", id);

export const removePet = (list: ListName, id: number) =>
  setState({ [list]: state[list].filter((x) => x !== id) } as Partial<State>);

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