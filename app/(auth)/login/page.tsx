import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// This page must never be served from any cache — a stale cached /login has
// been the single longest-running bug in this app. Enforced via the
// no-store Cache-Control header on this route in next.config.ts.
//
// Deliberately a Server Component with a plain HTML <form> — no client-side
// JS, no fetch(), no custom async/timeout logic. The form POSTs directly to
// /api/auth/login, which redirects back here with ?error=... on failure or
// straight to /today on success. This is the simplest mechanism the
// platform offers and has nothing left in it that a browser extension, a
// service worker, or a hung fetch() could interfere with.

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; info?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const mode = params.mode === "signup" ? "signup" : "signin";
  const error = params.error;
  const info = params.info;

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

        <form
          method="POST"
          action="/api/auth/login"
          className="space-y-4 bg-card border border-border rounded-2xl p-6 shadow-sm"
        >
          <input type="hidden" name="action" value={mode} />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
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

          <Button type="submit" className="h-12 w-full text-base font-semibold">
            {mode === "signin" ? "Sign In" : "Sign Up"}
          </Button>

          <Link
            href={mode === "signin" ? "/login?mode=signup" : "/login?mode=signin"}
            className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "No account yet? Sign up" : "Already have an account? Sign in"}
          </Link>
        </form>
      </div>
    </div>
  );
}
