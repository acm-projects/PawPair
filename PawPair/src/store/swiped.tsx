import { useSyncExternalStore } from "react";

let swiped = new Set<number>();
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function markSwiped(id: number) {
  if (swiped.has(id)) return;
  swiped = new Set(swiped).add(id);
  listeners.forEach((l) => l());
}

export function useSwiped() {
  return useSyncExternalStore(
    subscribe,
    () => swiped,
    () => swiped
  );
}