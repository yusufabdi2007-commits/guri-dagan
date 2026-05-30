"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

export function PushNotificationButton() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PermissionState);
  }, []);

  async function subscribe() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);

      if (result !== "granted") {
        toast({ title: "Notifications blocked", description: "Enable notifications in your browser settings." });
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      // VAPID public key — replace with your own from web-push library
      // Generate with: npx web-push generate-vapid-keys
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        toast({ title: "Push not configured", description: "VAPID key missing." });
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
      });

      const sub = subscription.toJSON();
      await fetch("/api/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.keys,
        }),
      });

      toast({ title: "Notifications enabled!", description: "You will receive daily posting reminders." });
    } catch (err) {
      console.error("Push subscribe error:", err);
      toast({ title: "Could not enable notifications", variant: "destructive" as never });
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push-subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setPermission("default");
      toast({ title: "Notifications disabled" });
    } catch {
      toast({ title: "Could not disable notifications", variant: "destructive" as never });
    } finally {
      setLoading(false);
    }
  }

  if (permission === "unsupported") return null;

  if (permission === "granted") {
    return (
      <button
        onClick={unsubscribe}
        disabled={loading}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <BellRing className="h-4 w-4 text-primary" />
        <span>Notifications on</span>
      </button>
    );
  }

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BellOff className="h-4 w-4" />
        <span>Notifications blocked in browser</span>
      </div>
    );
  }

  return (
    <button
      onClick={subscribe}
      disabled={loading}
      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <Bell className="h-4 w-4" />
      <span>{loading ? "Enabling..." : "Enable reminders"}</span>
    </button>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}
