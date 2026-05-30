"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, BatteryLow, Trophy, Clock, Heart, RefreshCw, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";

type Mode = "normal" | "low_energy" | "quick_win";

interface MomentumData {
  suggestion: string;
  insight: string;
  burnout_message: string | null;
  estimated_minutes: number;
}

interface Props {
  streak: number;
  totalPosts: number;
  postedToday: boolean;
  consistency: number;
  pendingIdeas: number;
  weeklyGoal: number;
  videosThisWeek: number;
  userId: string;
}

const MODES: { key: Mode; label: string; icon: React.ElementType; desc: string }[] = [
  { key: "normal",     label: "Ready",      icon: Zap,        desc: "Full focus" },
  { key: "low_energy", label: "Low Energy", icon: BatteryLow, desc: "5-10 min" },
  { key: "quick_win",  label: "Quick Win",  icon: Trophy,     desc: "High impact" },
];

const CACHE_KEY = "momentum_data";
const CACHE_AT_KEY = "momentum_cached_at";
const CACHE_TTL = 4 * 60 * 60 * 1000;

export function MomentumCard({
  streak, totalPosts, postedToday, consistency,
  pendingIdeas, weeklyGoal, videosThisWeek, userId,
}: Props) {
  const [mode, setMode] = useState<Mode>("normal");
  const [data, setData] = useState<MomentumData | null>(null);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

  async function fetchMomentum(m: Mode = mode, force = false) {
    if (!force) {
      try {
        const cached = sessionStorage.getItem(`${CACHE_KEY}_${m}`);
        const cachedAt = sessionStorage.getItem(`${CACHE_AT_KEY}_${m}`);
        if (cached && cachedAt && Date.now() - parseInt(cachedAt) < CACHE_TTL) {
          setData(JSON.parse(cached));
          return;
        }
      } catch {
        // sessionStorage unavailable or cache corrupt — proceed with fresh fetch
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/momentum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: m, streak, totalPosts, postedToday, consistency,
          pendingIdeas, weeklyGoal, videosThisWeek, dayOfWeek,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: MomentumData = await res.json();
      setData(json);
      try {
        sessionStorage.setItem(`${CACHE_KEY}_${m}`, JSON.stringify(json));
        sessionStorage.setItem(`${CACHE_AT_KEY}_${m}`, Date.now().toString());
      } catch {
        // Storage full or restricted — ignore
      }
    } catch {
      setData({
        suggestion: "Record one short video today on a parenting tip your audience needs.",
        insight: "Every video you share reaches a Somali family that needs it.",
        burnout_message: null,
        estimated_minutes: 20,
      });
    } finally {
      setLoading(false);
    }
  }

  async function markCompleted() {
    setCompleted(true);
    setJustCompleted(true);
    setTimeout(() => setJustCompleted(false), 2000);
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("momentum_logs").upsert(
      { user_id: userId, log_date: today, mode, suggestion: data?.suggestion || "", completed: true },
      { onConflict: "user_id,log_date" }
    );
    toast({
      title: "Momentum maintained!",
      description: "Great work — keep this energy going tomorrow.",
      variant: "success" as never,
    });
  }

  function switchMode(m: Mode) {
    setMode(m);
    fetchMomentum(m);
  }

  useEffect(() => {
    async function checkCompleted() {
      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];
      const { data: log } = await supabase
        .from("momentum_logs")
        .select("completed, mode")
        .eq("user_id", userId)
        .eq("log_date", today)
        .single();
      if (log?.completed) {
        setCompleted(true);
        if (log.mode) setMode(log.mode as Mode);
      }
    }

    fetchMomentum("normal"); // eslint-disable-line react-hooks/exhaustive-deps
    checkCompleted();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ActiveIcon = MODES.find(m => m.key === mode)?.icon || Zap;

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      {/* Header bar */}
      <div className="px-4 pt-4 pb-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 gradient-warm rounded-xl flex items-center justify-center">
              <ActiveIcon className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-foreground">Today&apos;s Focus</span>
          </div>
          <button
            onClick={() => fetchMomentum(mode, true)}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors tap-scale"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Mode selector */}
        <div className="flex gap-1.5">
          {MODES.map(({ key, label, icon: Icon, desc }) => (
            <button
              key={key}
              onClick={() => switchMode(key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl text-center transition-all duration-200 border tap-scale ${
                mode === key
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold leading-tight">{label}</span>
              <span className="text-[9px] opacity-70">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Burnout message */}
        <AnimatePresence>
          {data?.burnout_message && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
            >
              <Heart className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
                {data.burnout_message}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main suggestion */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              <div className="h-4 bg-muted rounded-lg shimmer" />
              <div className="h-4 bg-muted rounded-lg shimmer w-4/5" />
              <div className="h-4 bg-muted rounded-lg shimmer w-3/5" />
            </motion.div>
          ) : (
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="p-3 rounded-xl bg-muted/50 space-y-1">
                {data?.estimated_minutes && (
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground mb-2">
                    <Clock className="h-3 w-3" />
                    ~{data.estimated_minutes} min
                  </div>
                )}
                <p className="text-sm font-medium text-foreground leading-relaxed">
                  {data?.suggestion || "Loading your daily focus..."}
                </p>
              </div>

              {data?.insight && (
                <p className="text-xs text-muted-foreground leading-relaxed italic px-1 mt-2">
                  {data.insight}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Complete button */}
        <AnimatePresence mode="wait">
          {completed ? (
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className={`flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 ${justCompleted ? "success-glow" : ""}`}
            >
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                Momentum maintained — well done.
              </span>
            </motion.div>
          ) : (
            <motion.div key="action" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button
                onClick={markCompleted}
                disabled={loading || !data}
                className="w-full h-10 text-sm font-semibold gradient-warm border-0 text-white tap-scale btn-ripple"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark as Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
