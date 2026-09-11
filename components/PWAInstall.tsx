"use client";

import { useEffect } from "react";

// Sessions can otherwise get stuck for days on an old cached service worker
// (browsers only check for a new sw.js roughly once every 24h by default).
// This forces an immediate check on every page load and, if a newer worker
// takes over, does a single automatic reload so the user always ends up on
// the current build without having to manually clear any cache.
const RELOAD_GUARD_KEY = "sw-reloaded-once";

export function PWAInstall() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.update().catch(() => {});
      })
      .catch((err) => console.log("SW registration failed:", err));

    let reloading = false;
    function handleControllerChange() {
      if (reloading) return;
      // Guard against a reload loop if something keeps re-activating.
      if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;
      sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
      reloading = true;
      window.location.reload();
    }
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}
