"use client";

import { useEffect } from "react";

// Sessions can otherwise get stuck for days on an old cached service worker
// (browsers only check for a new sw.js roughly once every 24h by default).
// This forces an immediate check on every page load and, if a newer worker
// REPLACES an already-active one, does a single automatic reload so the
// user always ends up on the current build without manually clearing cache.
//
// IMPORTANT: `controllerchange` also fires the very first time a service
// worker ever claims an uncontrolled page (via clients.claim() in sw.js) —
// not just on genuine updates. Reloading unconditionally on that event
// caused the page to silently reload itself mid-interaction on every
// first-ever visit (e.g. wiping an in-progress login). Only treat it as a
// real update — and reload — if this page was already being controlled by
// a service worker when it loaded.
const RELOAD_GUARD_KEY = "sw-reloaded-once";

export function PWAInstall() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const hadControllerOnLoad = !!navigator.serviceWorker.controller;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.update().catch(() => {});
      })
      .catch((err) => console.log("SW registration failed:", err));

    let reloading = false;
    function handleControllerChange() {
      if (!hadControllerOnLoad) return; // first-ever install, not an update
      if (reloading) return;
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
