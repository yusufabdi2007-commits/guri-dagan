"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * usePersistentState
 * Drop-in replacement for useState that persists to localStorage.
 * SSR-safe: reads from localStorage only after mount.
 *
 * Usage:
 *   const [drafts, setDrafts] = usePersistentState("pipeline-draft", {})
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  // Read from localStorage after mount (SSR-safe)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        setState(JSON.parse(stored) as T);
      }
    } catch {
      // localStorage unavailable or corrupt — use initialValue
    }
    setHydrated(true);
  }, [key]);

  const setPersisted = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState(prev => {
        const next = typeof value === "function" ? (value as (p: T) => T)(prev) : value;
        if (hydrated) {
          try {
            window.localStorage.setItem(key, JSON.stringify(next));
          } catch {
            // Quota exceeded or private mode — silent fail
          }
        }
        return next;
      });
    },
    [key, hydrated]
  );

  return [state, setPersisted];
}

/**
 * clearPersistentState
 * Remove a key from localStorage (call on form submit / reset).
 */
export function clearPersistentState(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
