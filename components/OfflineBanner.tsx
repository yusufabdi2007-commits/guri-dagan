"use client";

import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    function handleOffline() {
      setIsOffline(true);
      setShowReconnected(false);
    }

    function handleOnline() {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }

    setIsOffline(!navigator.onLine);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all duration-500 ${
        isOffline
          ? "bg-zinc-900 text-zinc-300 border-b border-zinc-700"
          : "bg-emerald-600 text-white"
      }`}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-3.5 w-3.5 opacity-60" />
          <span>Connection interrupted — your work is saved locally. Reconnecting…</span>
        </>
      ) : (
        <>
          <Wifi className="h-3.5 w-3.5" />
          <span>Back online</span>
        </>
      )}
    </div>
  );
}
