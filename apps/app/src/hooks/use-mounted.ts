import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// false during SSR and hydration, true after: for UI that depends on client-only state (theme, localStorage).
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
