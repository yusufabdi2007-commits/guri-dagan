"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Brain,
  Battery,
  TrendingUp,
  Layers,
  Zap,
  RefreshCw,
  Loader2,
  Play,
  Plus,
  CalendarDays,
  Bookmark,
  TrendingDown,
  AlertTriangle,
  Info,
  CheckCircle2,
  Flame,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type Mode = "normal" | "low_energy" | "growth" | "deep_impact" | "batch";

interface Recommendation {
  type: string;
  title: string;
  description: string;
  action: string;
  urgency: "high" | "medium" | "low";
}

interface PerformanceInsight {
  icon_type: "up" | "down" | "warning" | "info";
  insight: string;
}

interface RoadmapDay {
  day: string;
  energy: "high" | "medium" | "low";
  task: string;
  type: "record" | "repurpose" | "engage" | "rest";
}

interface StrategyData {
  today_move: string;
  confidence: number;
  reasoning: string;
  estimated_impact: string;
  action_type: "record" | "repurpose" | "schedule" | "engage" | "plan";
  creator_mode_detected: "strong" | "building" | "low" | "recovery";
  momentum_note: string;
  recommendations: Recommendation[];
  performance_insights: PerformanceInsight[];
  weekly_roadmap: RoadmapDay[];
}

interface StrategistClientProps {
  streak: number;
  totalPosts: number;
  postedToday: boolean;
  consistency: number;
  weeklyGoal: number;
  videosThisWeek: number;
  dayOfWeek: string;
  pendingIdeas: number;
  missedDays: number;
  recentVideos: Array<{
    title: string;
    platform: string;
    emotional_tags?: string[];
    views?: number;
    likes?: number;
  }>;
  tiktokPosts: Array<{
    hook_text?: string;
    emotional_tag?: string;
    views?: number;
    likes?: number;
    completion_rate?: number;
  }>;
  contentMemory: Array<{
    topic?: string;
    avg_views?: number;
    emotional_style?: string;
    best_performing?: boolean;
  }>;
  topCategories: Array<{ category: string; count: number }>;
  bestHooks: Array<{ hook_text?: string; total_score?: number }>;
  categoryInsights?: Array<{ category: string; avgViews: number; count: number; recentViews: number }>;
  totalLeads?: number;
  clientCount?: number;
  callCount?: number;
  conversionRate?: number;
  topLeadCategories?: Array<{ category: string; leads: number }>;
  userId: string;
}

// ─── Mode Config ──────────────────────────────────────────────────────────────

const MODES: {
  id: Mode;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}[] = [
  {
    id: "normal",
    label: "Today",
    icon: Brain,
    description: "Best move for today",
    color: "text-primary",
  },
  {
    id: "low_energy",
    label: "Low Energy",
    icon: Battery,
    description: "Small wins only",
    color: "text-amber-500",
  },
  {
    id: "growth",
    label: "Growth",
    icon: TrendingUp,
    description: "High-impact content",
    color: "text-emerald-500",
  },
  {
    id: "deep_impact",
    label: "Deep Impact",
    icon: Sparkles,
    description: "Meaningful storytelling",
    color: "text-violet-500",
  },
  {
    id: "batch",
    label: "Batch",
    icon: Layers,
    description: "Record multiple today",
    color: "text-sky-500",
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function ConfidenceRing({ value }: { value: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value / 100);
  const color =
    value >= 75 ? "#22c55e" : value >= 50 ? "#f59e0b" : "#94a3b8";

  return (
    <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-border" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <span className="absolute text-sm font-bold text-foreground">{value}</span>
    </div>
  );
}

function MomentumBadge({ state }: { state: StrategyData["creator_mode_detected"] }) {
  const config = {
    strong: { label: "Momentum: Strong", color: "bg-emerald-500/15 text-emerald-600 border-emerald-200/50" },
    building: { label: "Momentum: Building", color: "bg-blue-500/15 text-blue-600 border-blue-200/50" },
    low: { label: "Momentum: Low", color: "bg-amber-500/15 text-amber-600 border-amber-200/50" },
    recovery: { label: "Recovery Mode", color: "bg-rose-500/15 text-rose-600 border-rose-200/50" },
  }[state];

  return (
    <span className={cn("text-[10px] font-semibold px-2.5 py-1 rounded-full border", config.color)}>
      {config.label}
    </span>
  );
}

function InsightIcon({ type }: { type: PerformanceInsight["icon_type"] }) {
  const config = {
    up: { icon: TrendingUp, color: "text-emerald-500 bg-emerald-500/10" },
    down: { icon: TrendingDown, color: "text-rose-500 bg-rose-500/10" },
    warning: { icon: AlertTriangle, color: "text-amber-500 bg-amber-500/10" },
    info: { icon: Info, color: "text-blue-500 bg-blue-500/10" },
  }[type];
  const Icon = config.icon;
  return (
    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", config.color)}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

function UrgencyDot({ urgency }: { urgency: Recommendation["urgency"] }) {
  const color = { high: "bg-rose-500", medium: "bg-amber-400", low: "bg-emerald-400" }[urgency];
  return <span className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", color)} />;
}

function RoadmapTypeIcon({ type }: { type: RoadmapDay["type"] }) {
  const config = {
    record: { icon: Play, color: "bg-primary/10 text-primary" },
    repurpose: { icon: Layers, color: "bg-violet-500/10 text-violet-500" },
    engage: { icon: Zap, color: "bg-amber-500/10 text-amber-500" },
    rest: { icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-500" },
  }[type];
  const Icon = config.icon;
  return (
    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", config.color)}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

const ACTION_LINKS: Record<string, string> = {
  record: "/queue",
  repurpose: "/repurpose",
  schedule: "/calendar",
  engage: "/ideas",
  plan: "/ideas",
};

const CACHE_KEY = "strategist_cache";
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

// ─── Main Component ───────────────────────────────────────────────────────────

export function StrategistClient(props: StrategistClientProps) {
  const [mode, setMode] = useState<Mode>("normal");
  const [data, setData] = useState<StrategyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<Mode>("normal");

  const payload = {
    mode,
    streak: props.streak,
    totalPosts: props.totalPosts,
    postedToday: props.postedToday,
    consistency: props.consistency,
    weeklyGoal: props.weeklyGoal,
    videosThisWeek: props.videosThisWeek,
    dayOfWeek: props.dayOfWeek,
    pendingIdeas: props.pendingIdeas,
    missedDays: props.missedDays,
    recentVideos: props.recentVideos,
    tiktokPosts: props.tiktokPosts,
    contentMemory: props.contentMemory,
    topCategories: props.topCategories,
    bestHooks: props.bestHooks,
    categoryInsights: props.categoryInsights ?? [],
    totalLeads: props.totalLeads ?? 0,
    clientCount: props.clientCount ?? 0,
    callCount: props.callCount ?? 0,
    conversionRate: props.conversionRate ?? 0,
    topLeadCategories: props.topLeadCategories ?? [],
  };

  const fetchStrategy = useCallback(
    async (selectedMode: Mode, force = false) => {
      const cacheKey = `${CACHE_KEY}_${selectedMode}`;
      if (!force) {
        try {
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            const { data: cachedData, ts } = JSON.parse(cached);
            if (Date.now() - ts < CACHE_TTL) {
              setData(cachedData);
              setActiveMode(selectedMode);
              return;
            }
          }
        } catch {}
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/strategist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, mode: selectedMode }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to generate strategy");
        }

        const result: StrategyData = await res.json();
        setData(result);
        setActiveMode(selectedMode);

        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ data: result, ts: Date.now() }));
        } catch {}
      } catch (e: any) {
        setError(e.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, props.userId]
  );

  useEffect(() => {
    fetchStrategy("normal");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleModeSelect(m: Mode) {
    setMode(m);
    fetchStrategy(m);
  }

  const currentModeConfig = MODES.find((m) => m.id === activeMode) || MODES[0];

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">

        {/* Mode Selector */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleModeSelect(m.id)}
                disabled={loading}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-2xl text-sm font-medium whitespace-nowrap transition-all duration-200 border shrink-0",
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 gap-4"
            >
              <div className="w-14 h-14 gradient-primary rounded-3xl flex items-center justify-center">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">Analyzing your content data</p>
                <p className="text-sm text-muted-foreground mt-1">Building your strategy...</p>
              </div>
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            </motion.div>
          )}

          {error && !loading && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-destructive/10 border border-destructive/20 rounded-2xl p-5 text-center"
            >
              <p className="text-sm text-destructive font-medium">{error}</p>
              <button
                onClick={() => fetchStrategy(mode, true)}
                className="mt-3 text-sm text-primary underline"
              >
                Try again
              </button>
            </motion.div>
          )}

          {data && !loading && (
            <motion.div
              key={activeMode}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="space-y-5"
            >
              {/* ── Today's Best Move ── */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 via-primary to-primary/80 p-6 text-primary-foreground shadow-lg">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12)_0%,transparent_60%)]" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/70">
                          {props.dayOfWeek} · Best Move
                        </span>
                        <MomentumBadge state={data.creator_mode_detected} />
                      </div>
                      <p className="text-lg font-semibold leading-snug text-primary-foreground">
                        {data.today_move}
                      </p>
                      <p className="mt-2.5 text-sm text-primary-foreground/75 leading-relaxed">
                        {data.reasoning}
                      </p>
                      <p className="mt-2 text-xs text-primary-foreground/60 italic">
                        {data.estimated_impact}
                      </p>
                    </div>
                    <ConfidenceRing value={data.confidence} />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 mt-5">
                    <Link
                      href="/generator"
                      className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-primary-foreground text-xs font-medium px-3 py-2 rounded-xl transition-colors"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Generate Script
                    </Link>
                    <Link
                      href="/queue"
                      className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-primary-foreground text-xs font-medium px-3 py-2 rounded-xl transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add to Queue
                    </Link>
                    <Link
                      href="/calendar"
                      className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-primary-foreground text-xs font-medium px-3 py-2 rounded-xl transition-colors"
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      Schedule
                    </Link>
                    <Link
                      href="/ideas"
                      className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-primary-foreground text-xs font-medium px-3 py-2 rounded-xl transition-colors"
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      Save Idea
                    </Link>
                  </div>
                </div>
              </div>

              {/* Momentum Note */}
              <div className="flex items-start gap-3 bg-muted/40 rounded-2xl px-4 py-3.5 border border-border/50">
                <Flame className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">{data.momentum_note}</p>
                <button
                  onClick={() => fetchStrategy(mode, true)}
                  title="Refresh strategy"
                  className="ml-auto text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              {/* Creator Stats Strip */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Streak", value: `${props.streak}d`, icon: Flame, color: "text-amber-500" },
                  { label: "This Week", value: `${props.videosThisWeek}/${props.weeklyGoal}`, icon: CheckCircle2, color: "text-emerald-500" },
                  { label: "Consistency", value: `${props.consistency}%`, icon: TrendingUp, color: "text-primary" },
                  { label: "Ideas Ready", value: String(props.pendingIdeas), icon: Zap, color: "text-violet-500" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-muted/40 rounded-2xl p-3 text-center border border-border/50">
                    <Icon className={cn("h-4 w-4 mx-auto mb-1", color)} />
                    <p className="font-bold text-base text-foreground leading-none">{value}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {/* ── Recommendations ── */}
              <section>
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Recommendations
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.recommendations.map((rec, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={cn(
                        "bg-card rounded-2xl p-4 border border-border/60 flex flex-col gap-2",
                        rec.urgency === "high" && "border-l-2 border-l-rose-400",
                        rec.urgency === "medium" && "border-l-2 border-l-amber-400",
                        rec.urgency === "low" && "border-l-2 border-l-emerald-400"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <UrgencyDot urgency={rec.urgency} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                            {rec.type}
                          </p>
                          <p className="font-semibold text-sm text-foreground leading-tight mt-0.5">
                            {rec.title}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-4">
                        {rec.description}
                      </p>
                      <Link
                        href={
                          rec.action.toLowerCase().includes("script")
                            ? "/generator"
                            : rec.action.toLowerCase().includes("repurpose")
                            ? "/repurpose"
                            : rec.action.toLowerCase().includes("calendar") || rec.action.toLowerCase().includes("schedule")
                            ? "/calendar"
                            : rec.action.toLowerCase().includes("hook") || rec.action.toLowerCase().includes("score")
                            ? "/hook-scorer"
                            : rec.action.toLowerCase().includes("queue")
                            ? "/queue"
                            : "/ideas"
                        }
                        className="flex items-center gap-1 text-xs text-primary font-medium mt-auto pt-1 hover:gap-2 transition-all"
                      >
                        {rec.action}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* ── Performance Intelligence ── */}
              <section>
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Performance Intelligence
                </h2>
                <div className="space-y-2.5">
                  {data.performance_insights.map((insight, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.07 }}
                      className="flex items-start gap-3 bg-muted/30 rounded-2xl px-4 py-3.5 border border-border/40"
                    >
                      <InsightIcon type={insight.icon_type} />
                      <p className="text-sm text-foreground leading-relaxed">{insight.insight}</p>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* ── Weekly Roadmap ── */}
              <section>
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Weekly Roadmap
                </h2>
                <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2">
                  {data.weekly_roadmap.map((day, i) => {
                    const isToday = day.day.toLowerCase() === props.dayOfWeek.slice(0, 3).toLowerCase();
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 + i * 0.05 }}
                        className={cn(
                          "flex-none w-32 rounded-2xl p-3.5 border flex flex-col gap-2.5 transition-all",
                          isToday
                            ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20"
                            : "bg-muted/30 border-border/40"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "text-xs font-bold",
                              isToday ? "text-primary" : "text-muted-foreground"
                            )}
                          >
                            {day.day}
                            {isToday && (
                              <span className="ml-1 text-[9px] text-primary/70 font-medium">Today</span>
                            )}
                          </span>
                          <span
                            className={cn(
                              "text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                              day.energy === "high"
                                ? "bg-primary/10 text-primary"
                                : day.energy === "medium"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {day.energy}
                          </span>
                        </div>
                        <RoadmapTypeIcon type={day.type} />
                        <p className="text-xs text-foreground leading-snug font-medium">{day.task}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </section>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
