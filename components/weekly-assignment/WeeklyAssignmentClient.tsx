"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  Sparkles, Youtube, Loader2, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, Brain, TrendingUp,
  Calendar, ArrowRight, Star, Mic2, ChevronLeft, Battery, Video,
  Zap, Eye, Target, Heart, Shield,
} from "lucide-react";
import {
  PROGRAMS, DEFAULT_DISTRIBUTION, getProgramBadgeClass, formatScriptNotes,
} from "@/lib/programs";
import type { ProgramName } from "@/lib/programs";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TikTokPost {
  day: string;
  program: string;
  title: string;
  hook_type: string;
  hook: string;
  problem: string;
  reframe: string;
  teaching: string;
  action: string;
  close?: string;
  cta: string;
}

interface YoutubePost {
  program: string;
  title: string;
  hook_type: string;
  hook: string;
  problem: string;
  reframe: string;
  teaching: string;
  action: string;
  close?: string;
  notes: string;
  cta: string;
}

interface AssignmentPlan {
  theme: string;
  suggested_theme: boolean;
  category_used: string | null;
  youtube: YoutubePost;
  tiktoks: TikTokPost[];
  recording_checklist: string[];
  is_fallback: boolean;
  _error?: string;
}

interface CategoryStat {
  category: string;
  totalViews: number;
  avgViews: number;
  count: number;
  totalLikes: number;
}

interface Props {
  userId: string;
  nextWeekStart: string;
  topCategory: string | null;
  growingCategory: string | null;
  underusedCategory: string | null;
  categories: CategoryStat[];
  recentThemes: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekStart(): string {
  // Most recent Sunday (or today if today is Sunday)
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

function getNextWeekStart(): string {
  // Next Sunday
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 7);
  return d.toISOString().split("T")[0];
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + "T12:00:00");
  const end = new Date(weekStart + "T12:00:00");
  end.setDate(end.getDate() + 6); // Sun → Sat (7-day batch)
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

const DAY_COLORS: Record<string, string> = {
  Monday: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  Tuesday: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Wednesday: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  Thursday: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Friday: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Saturday: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Sunday: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

// 7-part script section config
const SCRIPT_SECTIONS = [
  { key: "hook", label: "Hook", time: "0–3s", icon: Zap, color: "text-yellow-500" },
  { key: "problem", label: "Problem", time: "3–10s", icon: Eye, color: "text-red-500" },
  { key: "reframe", label: "Reframe", time: "10–25s", icon: Brain, color: "text-violet-500" },
  { key: "teaching", label: "Teaching", time: "25–45s", icon: Target, color: "text-blue-500" },
  { key: "action", label: "Action", time: "45–60s", icon: Heart, color: "text-emerald-500" },
] as const;

// ─── Script Section Display ───────────────────────────────────────────────────

function ScriptSection({
  post,
}: {
  post: TikTokPost | YoutubePost;
}) {
  return (
    <div className="space-y-2 pt-2">
      {post.hook_type && (
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-0.5">
          Hook type: {post.hook_type}
        </p>
      )}
      {SCRIPT_SECTIONS.map(({ key, label, time, icon: Icon, color }) => {
        const text = post[key as keyof typeof post] as string;
        if (!text) return null;
        return (
          <div key={key} className="flex items-start gap-2.5">
            <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
              <Icon className={cn("h-3.5 w-3.5", color)} />
              <span className="text-[9px] text-muted-foreground/60 font-medium">{time}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                {label}
              </p>
              <p className="text-xs text-foreground leading-relaxed">{text}</p>
            </div>
          </div>
        );
      })}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/60 mt-1">
        <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">CTA:</span> {post.cta}
        </p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WeeklyAssignmentClient({
  userId,
  nextWeekStart,
  topCategory,
  growingCategory,
  underusedCategory,
  categories,
  recentThemes,
}: Props) {
  const router = useRouter();
  const thisWeek = getWeekStart();
  const nextWeek = nextWeekStart;

  const [theme, setTheme] = useState("");
  const [lowEnergy, setLowEnergy] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(nextWeek);
  const [plan, setPlan] = useState<AssignmentPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedTiktok, setExpandedTiktok] = useState<number | null>(null);
  const [showYTScript, setShowYTScript] = useState(false);
  const [showBrief, setShowBrief] = useState(false);

  const hasIntelligence = categories.length > 0;

  // ─── Generate ───────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    setPlan(null);
    setExpandedTiktok(null);
    setShowYTScript(false);
    setShowBrief(false);
    try {
      const res = await fetch("/api/weekly-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: theme.trim() || undefined,
          lowEnergy,
          topCategory,
          growingCategory,
          underusedCategory,
          recentThemes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }
      const data = await res.json();
      setPlan(data);
    } catch (e) {
      toast({
        title: "Could not generate assignment",
        description: e instanceof Error ? e.message : "Please try again",
        variant: "destructive",
      });
    }
    setGenerating(false);
  }

  // ─── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!plan || saving) return;
    setSaving(true);
    const supabase = createClient();

    try {
      const { data: batch, error: batchErr } = await supabase
        .from("weekly_batches")
        .upsert(
          {
            user_id: userId,
            week_start: selectedWeek,
            theme: plan.theme,
            youtube_title: plan.youtube.title,
            youtube_notes: plan.youtube.notes,
            status: "planned",
            recording_completed: false,
          },
          { onConflict: "user_id,week_start" }
        )
        .select("id")
        .single();

      if (batchErr || !batch) throw new Error(batchErr?.message || "Failed to save batch");

      await supabase.from("batch_posts").delete().eq("batch_id", batch.id);

      const weekBase = new Date(selectedWeek + "T12:00:00");

      // YouTube goes on Sunday (= week_start). Recording happens Monday.
      // TikToks: Tue(+2), Wed(+3), Thu(+4), Fri(+5), Sat(+6), Sun(+0), Sun(+0)
      const ytDate = new Date(weekBase); // Sunday (+0)

      const ytNotes = formatScriptNotes({
        program: plan.youtube.program,
        hookType: plan.youtube.hook_type,
        hook: plan.youtube.hook,
        problem: plan.youtube.problem,
        reframe: plan.youtube.reframe,
        teaching: plan.youtube.teaching,
        close: plan.youtube.close ?? plan.youtube.action ?? "",
        cta: plan.youtube.cta,
        extraNotes: plan.youtube.notes,
      });

      const posts = [
        {
          batch_id: batch.id,
          user_id: userId,
          scheduled_date: ytDate.toISOString().split("T")[0], // Tuesday
          platform: "youtube",
          title: plan.youtube.title,
          angle_notes: ytNotes,
          sort_order: 0,
          status: "scheduled",
        },
        ...plan.tiktoks.map((tt, i) => {
          const d = new Date(weekBase);
          // i=0 → Tue(+2), i=1 → Wed(+3), i=2 → Thu(+4), i=3 → Fri(+5),
          // i=4 → Sat(+6), i=5 → Sun(+0), i=6 → Sun(+0)
          d.setDate(d.getDate() + (i < 5 ? i + 2 : 0));
          const notes = formatScriptNotes({
            program: tt.program,
            hookType: tt.hook_type,
            hook: tt.hook,
            problem: tt.problem,
            reframe: tt.reframe,
            teaching: tt.teaching,
            close: tt.close ?? tt.action ?? "",
            cta: tt.cta,
          });
          return {
            batch_id: batch.id,
            user_id: userId,
            scheduled_date: d.toISOString().split("T")[0],
            platform: "tiktok",
            title: tt.title,
            angle_notes: notes,
            sort_order: i + 1,
            status: "scheduled",
          };
        }),
      ];

      const { error: postsErr } = await supabase.from("batch_posts").insert(posts);
      if (postsErr) throw new Error(postsErr.message);

      toast({
        title: "Week assigned!",
        description: `8 posts scheduled for ${formatWeekLabel(selectedWeek)}. Time to record.`,
        variant: "success",
      });
      router.push("/batch");
      router.refresh();
    } catch (e) {
      toast({
        title: "Could not save plan",
        description: e instanceof Error ? e.message : "Please try again",
        variant: "destructive",
      });
      setSaving(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in max-w-2xl mx-auto pb-24">
      {/* Back */}
      <Link
        href="/batch"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Batch Hub
      </Link>

      {/* Program Distribution Preview */}
      <Card className="border-0 bg-gradient-to-br from-primary/5 via-background to-background shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm font-semibold text-foreground">Program-First System</p>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Every video is assigned to a program. Every program leads to a transformation. Every transformation attracts a client.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_DISTRIBUTION.map(({ program, count }) => {
              const p = PROGRAMS[program as ProgramName];
              return (
                <span
                  key={program}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold border",
                    p.badgeClass
                  )}
                >
                  {program} ×{count}
                </span>
              );
            })}
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800">
              YouTube ×1
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Category Intelligence Panel */}
      {hasIntelligence && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm font-semibold text-foreground">What to create next</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {topCategory && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                  <Star className="h-3 w-3" />
                  Best: {topCategory}
                </span>
              )}
              {growingCategory && growingCategory !== topCategory && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  Growing: {growingCategory}
                </span>
              )}
              {underusedCategory && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400">
                  <Sparkles className="h-3 w-3" />
                  Opportunity: {underusedCategory}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              AI uses your performance data to pick the best theme for your programs.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Config Card */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Week selector */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Which week?</p>
            <div className="grid grid-cols-2 gap-2">
              {[thisWeek, nextWeek].map((w) => (
                <button
                  key={w}
                  onClick={() => setSelectedWeek(w)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left transition-all",
                    selectedWeek === w
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/40 text-foreground"
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                    {w === thisWeek ? "This week" : "Next week"}
                  </p>
                  <p className="text-sm font-semibold">{formatWeekLabel(w)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Theme input */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">
              Theme <span className="text-muted-foreground font-normal">(optional)</span>
            </p>
            <Input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder={
                hasIntelligence
                  ? "Leave blank — AI will suggest based on your data"
                  : "e.g. Building child confidence"
              }
              className="text-sm"
            />
          </div>

          {/* Low Energy toggle */}
          <button
            onClick={() => setLowEnergy(!lowEnergy)}
            className={cn(
              "flex items-center gap-3 w-full p-3 rounded-xl border-2 transition-all text-left",
              lowEnergy
                ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700"
                : "border-border hover:border-amber-300"
            )}
          >
            <Battery
              className={cn(
                "h-4 w-4 shrink-0",
                lowEnergy ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
              )}
            />
            <div className="flex-1">
              <p
                className={cn(
                  "text-sm font-semibold",
                  lowEnergy ? "text-amber-700 dark:text-amber-400" : "text-foreground"
                )}
              >
                Low Energy Week
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Simpler, story-based topics across all 5 programs
              </p>
            </div>
            <div
              className={cn(
                "w-9 h-5 rounded-full transition-colors relative shrink-0",
                lowEnergy ? "bg-amber-400 dark:bg-amber-600" : "bg-muted"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200",
                  lowEnergy ? "left-4" : "left-0.5"
                )}
              />
            </div>
          </button>

          {/* Generate button */}
          <Button onClick={handleGenerate} disabled={generating} className="w-full" size="lg">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning your programs...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {plan ? "Regenerate Plan" : "Generate This Week's Assignment"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── Generated Plan ───────────────────────────────────────────────────── */}
      {plan && (
        <div className="space-y-4">
          {/* AI unavailable warning */}
          {plan.is_fallback && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  Using preset scripts
                </p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
                  These scripts are marketing-ready and good to record. Tap &ldquo;Regenerate&rdquo; to get custom AI scripts, or edit them directly and save.
                </p>
                {plan._error && (
                  <p className="text-[10px] text-amber-500/70 mt-1 font-mono break-all">{plan._error}</p>
                )}
              </div>
            </div>
          )}

          {/* Theme header */}
          <div className="gradient-primary rounded-2xl p-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-widest opacity-70 mb-1">
              {plan.suggested_theme ? "AI Suggested Theme" : "Weekly Theme"} ·{" "}
              {formatWeekLabel(selectedWeek)}
            </p>
            <h2 className="text-xl font-bold leading-tight">{plan.theme}</h2>
            {plan.category_used && (
              <p className="text-[11px] mt-2 opacity-70">Based on: {plan.category_used}</p>
            )}
            <p className="text-[11px] mt-2 opacity-60">
              5 programs · 8 videos · 1 recording session
            </p>
          </div>

          {/* YouTube card */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-900/30">
                  <Youtube className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                  <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                    YouTube
                  </span>
                </div>
                {plan.youtube.program && (
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold border",
                      getProgramBadgeClass(plan.youtube.program)
                    )}
                  >
                    {plan.youtube.program}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">Sunday · Long-form</span>
              </div>

              <h3 className="text-base font-bold text-foreground leading-snug">
                {plan.youtube.title}
              </h3>

              {plan.youtube.notes && (
                <p className="text-xs text-muted-foreground leading-relaxed">{plan.youtube.notes}</p>
              )}

              {plan.youtube.program && (
                <p className="text-[11px] text-muted-foreground italic">
                  {PROGRAMS[plan.youtube.program as ProgramName]?.childTransformation}
                </p>
              )}

              <button
                onClick={() => setShowYTScript(!showYTScript)}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {showYTScript ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                {showYTScript ? "Hide" : "Show"} video script (7 parts)
              </button>

              {showYTScript && <ScriptSection post={plan.youtube} />}
            </CardContent>
          </Card>

          {/* TikTok cards */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              7 TikTok Videos — Program distribution
            </p>
            {plan.tiktoks.map((tt, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 mt-0.5",
                        DAY_COLORS[tt.day] ?? "bg-muted text-foreground"
                      )}
                    >
                      {tt.day.slice(0, 3)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Video className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-[10px] text-muted-foreground">TikTok</span>
                        {tt.program && (
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] font-bold border",
                              getProgramBadgeClass(tt.program)
                            )}
                          >
                            {tt.program}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground leading-snug">
                        {tt.title}
                      </p>
                      {tt.program && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 italic">
                          {PROGRAMS[tt.program as ProgramName]?.childTransformation}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setExpandedTiktok(expandedTiktok === i ? null : i)}
                      className="shrink-0 p-1 rounded-lg hover:bg-muted transition-colors"
                    >
                      {expandedTiktok === i ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>

                  {expandedTiktok === i && <ScriptSection post={tt} />}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recording Day Brief */}
          <Card>
            <CardContent className="p-0">
              <button
                onClick={() => setShowBrief(!showBrief)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-2.5">
                  <Mic2 className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Recording Day Brief</p>
                </div>
                {showBrief ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {showBrief && (
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  {/* Program grouping */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">Record by program</p>
                    {DEFAULT_DISTRIBUTION.map(({ program, count }) => {
                      const p = PROGRAMS[program as ProgramName];
                      const videos = plan.tiktoks.filter(t => t.program === program);
                      if (videos.length === 0) return null;
                      return (
                        <div
                          key={program}
                          className={cn(
                            "p-2.5 rounded-xl border",
                            p.badgeClass
                          )}
                        >
                          <p className="text-[11px] font-bold mb-1">
                            {program} · {count} video{count > 1 ? "s" : ""}
                          </p>
                          {videos.map((v, vi) => (
                            <p key={vi} className="text-[10px] opacity-80">
                              • {v.day}: {v.title}
                            </p>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/15">
                    <p className="text-xs font-semibold text-primary mb-1">Monday recording goal</p>
                    <p className="text-xs text-foreground">
                      Record YouTube first (most energy). Then record all 7 TikToks grouped by program for natural flow. YouTube + 2 TikToks post next Sunday. Remaining TikToks post Tue–Sat.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">Recording checklist</p>
                    {plan.recording_checklist.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-xs text-foreground">{item}</p>
                      </div>
                    ))}
                  </div>

                  <Link
                    href="/batch/record"
                    className="flex items-center justify-between p-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Mic2 className="h-4 w-4" />
                      <p className="text-sm font-semibold">Open Recording Session</p>
                    </div>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save CTA */}
          <div className="space-y-2">
            <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scheduling week...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule {selectedWeek === thisWeek ? "This" : "Next"} Week (8 posts)
                </>
              )}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Creates 8 scheduled posts with full program scripts. Opens batch hub.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
