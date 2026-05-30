"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 text-center">
          <div className="w-14 h-14 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-lg font-bold mb-2">Page Error</h2>
          <p className="text-sm text-muted-foreground mb-6">
            This page ran into a problem. Your data is safe — try refreshing.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push("/dashboard")} className="flex-1 gap-2">
              <Home className="h-4 w-4" />
              Home
            </Button>
            <Button onClick={reset} className="flex-1 gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
