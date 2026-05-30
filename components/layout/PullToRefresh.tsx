"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

const PULL_THRESHOLD = 80; // px needed to trigger refresh

export function PullToRefresh() {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  // Use refs so event handlers registered once can always read current values
  const pullDistanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY === 0) {
        startYRef.current = e.touches[0].clientY;
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (startYRef.current === null) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta > 0 && window.scrollY === 0) {
        const dist = Math.min(delta * 0.4, PULL_THRESHOLD + 20);
        pullDistanceRef.current = dist;
        setPullDistance(dist);
      }
    }

    async function onTouchEnd() {
      if (pullDistanceRef.current >= PULL_THRESHOLD && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPullDistance(0);
        pullDistanceRef.current = 0;
        router.refresh();
        await new Promise(r => setTimeout(r, 800));
        setRefreshing(false);
        refreshingRef.current = false;
      } else {
        setPullDistance(0);
        pullDistanceRef.current = 0;
      }
      startYRef.current = null;
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isVisible = pullDistance > 10 || refreshing;
  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const triggered = pullDistance >= PULL_THRESHOLD || refreshing;

  if (!isVisible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{ transform: `translateY(${refreshing ? 48 : pullDistance - 20}px)`, transition: refreshing ? "transform 0.2s" : "none" }}
    >
      <div className={`flex items-center justify-center w-10 h-10 rounded-full shadow-md transition-colors duration-200 ${
        triggered ? "bg-primary" : "bg-background border border-border"
      }`}>
        <RefreshCw
          className={`h-4 w-4 transition-colors duration-200 ${triggered ? "text-primary-foreground" : "text-muted-foreground"} ${refreshing ? "animate-spin" : ""}`}
          style={{ transform: refreshing ? undefined : `rotate(${progress * 360}deg)` }}
        />
      </div>
    </div>
  );
}
