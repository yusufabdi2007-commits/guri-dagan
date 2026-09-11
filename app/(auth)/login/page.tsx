"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// This page must never be served from any cache — a stale cached /login has
// been the single longest-running bug in this app. Enforced via the
// no-store Cache-Control header on this route in next.config.ts.

// Sign-in/sign-up goes through /api/auth/login (server-side) rather than
// calling supabase-js directly from the browser. A direct browser call
// depends on that specific visitor's own network being able to reach
// *.supabase.co — if it can't (regional filtering, a flaky ISP, a
// mis-behaving extension), the request hangs with no way to diagnose it
// remotely. Going through our own domain means the visitor's browser only
// ever has to reach guri-dagan.vercel.app, and the Supabase call happens
// server-to-server instead.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("This is taking too long. Check your internet connection and try again."));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setSubmitting(true);
    try {
      const res = await withTimeout(
        fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: mode, email, password }),
        }),
        12000
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      if (mode === "signup" && !data.session) {
        setInfo("Account created. Check your email to confirm, then sign in.");
        setMode("signin");
        return;
      }

      router.push("/today");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-purple-950/20 dark:via-background dark:to-pink-950/20">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 gradient-primary rounded-3xl mb-4 shadow-lg">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Guri Dagan</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "signin" ? "Sign in to your dashboard" : "Create your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="h-12"
            />
          </div>

          {error && (
            <p className="text-sm px-4 py-3 rounded-xl bg-destructive/10 text-destructive">
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm px-4 py-3 rounded-xl bg-primary/10 text-primary">
              {info}
            </p>
          )}

          <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={submitting}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {mode === "signin" ? "Signing in..." : "Creating account..."} (up to 12s)
              </span>
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Sign Up"
            )}
          </Button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError("");
              setInfo("");
            }}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "No account yet? Sign up" : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
