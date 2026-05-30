"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Props {
  streak: number;
  totalPosts: number;
  postedToday: boolean;
  consistency: number;
  pendingIdeas: number;
  weeklyGoal: number;
}

export function CoachCard({ streak, totalPosts, postedToday, consistency, pendingIdeas, weeklyGoal }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [nextAction, setNextAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<"English" | "Somali">("English");

  async function fetchCoachMessage(lang?: "English" | "Somali") {
    setLoading(true);
    const activeLang = lang ?? language;
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streak, totalPosts, postedToday, consistency, pendingIdeas, weeklyGoal, language: activeLang }),
      });
      const data = await res.json();
      setMessage(data.message);
      setNextAction(data.next_action);

      // Cache with language key
      sessionStorage.setItem(`coach_message_${activeLang}`, data.message);
      sessionStorage.setItem(`coach_action_${activeLang}`, data.next_action || "");
      sessionStorage.setItem(`coach_cached_at_${activeLang}`, Date.now().toString());
    } catch {
      setMessage(activeLang === "Somali"
        ? "Xaaladaadu waxay u baahan tahay in aad sameyso mid ka dib mid. Sii wad."
        : "Your consistency is changing lives. Keep showing up for Somali families."
      );
      setNextAction(activeLang === "Somali"
        ? "Fur liistada fikradahaaga oo dooro mid maanta."
        : "Open your ideas list and pick one to record today."
      );
    } finally {
      setLoading(false);
    }
  }

  function switchLanguage(lang: "English" | "Somali") {
    setLanguage(lang);
    // Try cache first
    const cached = sessionStorage.getItem(`coach_message_${lang}`);
    const cachedAction = sessionStorage.getItem(`coach_action_${lang}`);
    const cachedAt = sessionStorage.getItem(`coach_cached_at_${lang}`);
    if (cached && cachedAt && (Date.now() - parseInt(cachedAt)) < 7200000) {
      setMessage(cached);
      setNextAction(cachedAction);
    } else {
      fetchCoachMessage(lang);
    }
  }

  useEffect(() => {
    const cached = sessionStorage.getItem("coach_message_English");
    const cachedAction = sessionStorage.getItem("coach_action_English");
    const cachedAt = sessionStorage.getItem("coach_cached_at_English");

    // Legacy cache fallback
    const legacyCached = sessionStorage.getItem("coach_message");
    const legacyCachedAt = sessionStorage.getItem("coach_cached_at");

    if (cached && cachedAt && (Date.now() - parseInt(cachedAt)) < 7200000) {
      setMessage(cached);
      setNextAction(cachedAction);
    } else if (legacyCached && legacyCachedAt && (Date.now() - parseInt(legacyCachedAt)) < 7200000) {
      setMessage(legacyCached);
      setNextAction(sessionStorage.getItem("coach_action"));
    } else {
      fetchCoachMessage("English");
    }
  }, []);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 gradient-primary rounded-xl flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">AI Coach</span>
                {/* Language toggle */}
                <div className="flex rounded-lg overflow-hidden border border-primary/20">
                  {(["English", "Somali"] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => switchLanguage(lang)}
                      className={`text-[9px] font-semibold px-2 py-0.5 transition-colors ${
                        language === lang
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {lang === "English" ? "EN" : "SO"}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => fetchCoachMessage()}
                disabled={loading}
                className="p-1 rounded-lg hover:bg-primary/10 transition-colors"
                title="Refresh message"
              >
                <RefreshCw className={`h-3 w-3 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {loading ? (
              <div className="space-y-2">
                <div className="h-4 bg-primary/10 rounded animate-pulse" />
                <div className="h-4 bg-primary/10 rounded animate-pulse w-3/4" />
              </div>
            ) : (
              <>
                <p className="text-sm text-foreground leading-relaxed mb-3">
                  {message || "Loading your coaching message..."}
                </p>
                {nextAction && (
                  <div className="bg-background/60 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      {language === "Somali" ? "Tallaabada Xigta" : "Best Next Action"}
                    </p>
                    <p className="text-xs text-foreground leading-relaxed">{nextAction}</p>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-2 mt-3">
              <Link href="/ideas" className="flex-1">
                <Button variant="outline" size="sm" className="w-full text-xs h-8 gap-1">
                  {language === "Somali" ? "Fikradaha" : "Ideas"} <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
              <Link href="/generator" className="flex-1">
                <Button size="sm" className="w-full text-xs h-8 gap-1">
                  {language === "Somali" ? "Samee" : "Generate"} <Sparkles className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
