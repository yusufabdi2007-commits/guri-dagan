"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, Heart } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError("Check your email to confirm your account.");
        setLoading(false);
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/today");
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-purple-950/20 dark:via-background dark:to-pink-950/20">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-purple-200/30 dark:bg-purple-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-pink-200/30 dark:bg-pink-900/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo / Brand */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 gradient-primary rounded-3xl mb-4 shadow-lg">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Guri Dagan</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Nidaamka Ganacsiga Tababarka Waalidnimada
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm animate-fade-in">
          <CardHeader className="pb-4">
            <div className="flex rounded-xl bg-muted p-1 gap-1">
              <button
                onClick={() => setMode("signin")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  mode === "signin"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  mode === "signup"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign Up
              </button>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </div>

              {error && (
                <div className={`text-sm px-4 py-3 rounded-xl ${
                  error.includes("Check your email")
                    ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                    : "bg-destructive/10 text-destructive"
                }`}>
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-12" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Please wait...</>
                ) : mode === "signin" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-6">
              A mission-driven platform for Somali parenting coaches
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
