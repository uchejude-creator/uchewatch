"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
// Keep inputs disabled until their handlers are attached. This also prevents
// fast input on Safari or slow connections from being lost during hydration.
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
