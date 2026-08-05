"use client";

import { useEffect, useState } from "react";
import { Loader2, Heart } from "lucide-react";

export default function LoginPage() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // No login form — the middleware silently signs in as the app owner.
    // Landing here means that silent sign-in didn't succeed yet; retry a
    // couple of times, then show a status message instead of a form.
    let attempts = 0;
    const retry = setInterval(() => {
      attempts += 1;
      if (attempts > 3) {
        clearInterval(retry);
        setFailed(true);
        return;
      }
      window.location.href = "/today";
    }, 2000);
    return () => clearInterval(retry);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-purple-950/20 dark:via-background dark:to-pink-950/20">
      <div className="w-full max-w-sm relative text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 gradient-primary rounded-3xl mb-4 shadow-lg">
          <Heart className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Guri Dagan</h1>
        {failed ? (
          <p className="text-muted-foreground mt-4 text-sm px-4 py-3 rounded-xl bg-destructive/10 text-destructive">
            Could not connect. Check that OWNER_EMAIL and SUPABASE_SERVICE_ROLE_KEY are set correctly, then refresh.
          </p>
        ) : (
          <p className="text-muted-foreground mt-4 text-sm flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Connecting...
          </p>
        )}
      </div>
    </div>
  );
}
