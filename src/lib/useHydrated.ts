"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
/** Keep controlled inputs inactive until React can retain typed values. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
