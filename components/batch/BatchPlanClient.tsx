"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  Sparkles, Youtube, Video, ArrowRight, Loader2,
  ChevronLeft, CheckCircle2, ChevronDown, ChevronUp, AlertTriangle, Zap, History, CheckCheck, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { getProgramBadgeClass, formatScriptNotes } from "@/lib/programs";

interface ScriptData {
  hookType: string;
  hook: string;
  problem: string;
  reframe: string;
  teaching: string;
  close: string;
  cta: string;
}

interface TikTokScript extends ScriptData {
  title: string;
  program: string;
  day: string;
}

interface BatchPlan {
  youtube_title: string;
  youtube_program: string;
  youtube_script: ScriptData;
  tiktok_scripts: TikTokScript[];
  is_fallback?: boolean;
}

interface PastBatch {
  id: string;
  week_start: string;
  theme: string | null;
  status: string | null;
  recording_completed: boolean | null;
  created_at: string;
}

interface Props {
  userId: string;
  existingBatchId: string | null;
  weekStart: string;
  pastBatches: PastBatch[];
}

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekStart(): string {
  // Most recent Monday (or today if Monday)
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toLocalDate(d);
}

function getNextWeekStart(): string {
  // Next Monday
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 7);
  return toLocalDate(d);
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + "T12:00:00");
  const end = new Date(weekStart + "T12:00:00");
  end.setDate(end.getDate() + 6); // Mon → Sun (7-day batch)
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

function ScriptPreview({ script, expanded, onToggle }: {
  script: ScriptData;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mt-2 border-t border-border/50 pt-2">
      {/* Hook always visible */}
      <div className="flex items-start gap-1.5 mb-1.5">
        <Zap className="h-3 w-3 text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-xs text-foreground leading-snug">{script.hook}</p>
      </div>
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {expanded ? "Hide" : "Show"} full script
      </button>
      {expanded && (
        <div className="mt-2 space-y-1.5">
          {[
            { label: "Problem", text: script.problem },
            { label: "Reframe", text: script.reframe },
            { label: "Teaching", text: script.teaching },
            { label: "Close", text: script.close },
            { label: "CTA", text: script.cta },
          ].map(({ label, text }) => (
            <div key={label} className="flex items-start gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground w-12 shrink-0 pt-0.5">{label}</span>
              <p className="text-xs text-muted-foreground leading-snug flex-1">{text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BatchPlanClient({ userId, existingBatchId, weekStart, pastBatches }: Props) {
  const router = useRouter();
  const [theme, setTheme] = useState("");
  const [selectedWeek, setSelectedWeek] = useState(weekStart);
  const [plan, setPlan] = useState<BatchPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [expandedYT, setExpandedYT] = useState(false);
  const [editingTitles, setEditingTitles] = useState<Record<number, string>>({});

  const thisWeek = getWeekStart();
  const nextWeek = getNextWeekStart();

  async function handleGenerate() {
    if (!theme.trim() || generating) return;
    setGenerating(true);
    setPlan(null);
    setExpandedIndex(null);
    setEditingTitles({});
    try {
      const res = await fetch("/api/batch-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: theme.trim(), userId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }
      const data = await res.json();
      setPlan(data);
    } catch (e) {
      toast({
        title: "Could not generate plan",
        description: e instanceof Error ? e.message : "Please try again",
        variant: "destructive",
      });
    }
    setGenerating(false);
  }

  function getTikTokTitle(index: number): string {
    if (editingTitles[index] !== undefined) return editingTitles[index];
    return plan?.tiktok_scripts[index]?.title ?? "";
  }

  function setTikTokTitle(index: number, value: string) {
    setEditingTitles(prev => ({ ...prev, [index]: value }));
  }

  async function handleSave() {
    if (!plan || saving) return;
    setSaving(true);

    const supabase = createClient();

    try {
      // Upsert the weekly batch
      const { data: batch, error: batchErr } = await supabase
        .from("weekly_batches")
        .upsert({
          user_id: userId,
          week_start: selectedWeek,
          theme: theme.trim(),
          youtube_title: plan.youtube_title,
          youtube_notes: plan.youtube_script.teaching,
          status: "planned",
          recording_completed: false,
        }, { onConflict: "user_id,week_start" })
        .select("id")
        .single();

      if (batchErr || !batch) throw new Error(batchErr?.message || "Failed to save batch");

      // Guard: never delete posts that have already been published
      const { count: postedCount } = await supabase
        .from("batch_posts")
        .select("id", { count: "exact", head: true })
        .eq("batch_id", batch.id)
        .eq("status", "posted");
      if ((postedCount ?? 0) > 0) {
        toast({
          title: "Can't replace — posts already published",
          description: `${postedCount} post${postedCount === 1 ? "" : "s"} from this week have been posted. Choose a different week to re-plan.`,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Delete existing posts for this batch (re-plan)
      await supabase.from("batch_posts").delete().eq("batch_id", batch.id);

      const weekBase = new Date(selectedWeek + "T12:00:00");

      // YouTube posts Wednesday (= week_start + 2). Recording happens Monday.
      const ytDate = new Date(weekBase);
      ytDate.setDate(ytDate.getDate() + 2); // Wednesday

      // Build structured angle_notes for YouTube
      const ytNotes = formatScriptNotes({
        program: plan.youtube_program,
        hookType: plan.youtube_script.hookType,
        hook: plan.youtube_script.hook,
        problem: plan.youtube_script.problem,
        reframe: plan.youtube_script.reframe,
        teaching: plan.youtube_script.teaching,
        close: plan.youtube_script.close,
        cta: plan.youtube_script.cta,
        extraNotes: "YouTube Long-form",
      });

      const posts = [
        // YouTube — Wednesday (week_start + 2), sort_order 8 (posts after TikTok #3 on same day)
        {
          batch_id: batch.id,
          user_id: userId,
          scheduled_date: `${ytDate.getFullYear()}-${String(ytDate.getMonth() + 1).padStart(2, "0")}-${String(ytDate.getDate()).padStart(2, "0")}`,
          platform: "youtube",
          title: plan.youtube_title,
          angle_notes: ytNotes,
          sort_order: 8,
          status: "scheduled",
        },
        // 7 TikToks: i=0→Mon(+0), i=1→Tue(+1), i=2→Wed(+2), i=3→Thu(+3),
        //            i=4→Fri(+4), i=5→Sat(+5), i=6→Sun(+6)
        ...plan.tiktok_scripts.map((script, i) => {
          const d = new Date(weekBase);
          const OFFSETS = [0, 1, 2, 3, 4, 5, 6];
          d.setDate(d.getDate() + OFFSETS[i]);
          const title = editingTitles[i] !== undefined ? editingTitles[i] : script.title;
          const notes = formatScriptNotes({
            program: script.program,
            hookType: script.hookType,
            hook: script.hook,
            problem: script.problem,
            reframe: script.reframe,
            teaching: script.teaching,
            close: script.close,
            cta: script.cta,
          });
          return {
            batch_id: batch.id,
            user_id: userId,
            scheduled_date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
            platform: "tiktok",
            title,
            angle_notes: notes,
            sort_order: i + 1,
            status: "scheduled",
          };
        }),
      ];

      const { error: postsErr } = await supabase.from("batch_posts").insert(posts);
      if (postsErr) throw new Error(postsErr.message);

      toast({
        title: "Week planned!",
        description: `${posts.length} posts scheduled with full scripts.`,
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

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Back */}
      <Link href="/batch" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ChevronLeft className="h-4 w-4" />
        Back to Batch Hub
      </Link>

      {/* Week selector */}
      <Card>
        <CardContent className="p-4 space-y-3">
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
                <p className="text-sm font-semibold leading-snug">{formatWeekLabel(w)}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Theme input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weekly Theme</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <Input
            value={theme}
            onChange={e => setTheme(e.target.value)}
            placeholder="e.g. Calm parenting communication"
            className="h-12 rounded-xl text-sm"
            onKeyDown={e => e.key === "Enter" && handleGenerate()}
          />
          <p className="text-xs text-muted-foreground">
            One focused topic. AI generates full scripts for 1 YouTube + 7 TikToks with program distribution.
          </p>
          <Button
            onClick={handleGenerate}
            disabled={!theme.trim() || generating}
            className="w-full h-12 rounded-xl font-semibold tap-scale"
          >
            {generating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating scripts...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" />Generate Weekly Plan</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated plan */}
      {plan && (
        <>

          {/* YouTube card */}
          <Card className="border-red-200 dark:border-red-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                  <Youtube className="h-4 w-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">YouTube</p>
                  <p className="text-[10px] text-muted-foreground">Wednesday — Long-form</p>
                </div>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0",
                  getProgramBadgeClass(plan.youtube_program)
                )}>
                  {plan.youtube_program}
                </span>
              </div>
              <p className="text-sm font-bold text-foreground leading-snug mb-1">{plan.youtube_title}</p>
              <ScriptPreview
                script={plan.youtube_script}
                expanded={expandedYT}
                onToggle={() => setExpandedYT(v => !v)}
              />
            </CardContent>
          </Card>

          {/* TikTok scripts */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Video className="h-4 w-4 text-slate-500" />
              <p className="text-sm font-semibold text-foreground">7 TikTok Scripts</p>
              <span className="text-xs text-muted-foreground ml-auto">Mon · Tue · Wed · Thu · Fri · Sat · Sun</span>
            </div>
            {plan.tiktok_scripts.map((script, i) => {
              const d = new Date(selectedWeek + "T12:00:00");
              const OFFSETS = [0, 1, 2, 3, 4, 5, 6];
              d.setDate(d.getDate() + OFFSETS[i]); // match save logic
              const isExpanded = expandedIndex === i;
              return (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2.5 mb-2">
                      {/* Day badge */}
                      <div className="w-9 h-9 rounded-xl bg-muted flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-semibold text-muted-foreground leading-none">{script.day}</span>
                        <span className="text-xs font-bold text-foreground leading-none mt-0.5">{d.getDate()}</span>
                      </div>
                      {/* Title + program */}
                      <div className="flex-1 min-w-0">
                        <input
                          value={getTikTokTitle(i)}
                          onChange={e => setTikTokTitle(i, e.target.value)}
                          className="w-full text-sm font-medium text-foreground bg-transparent border-none outline-none leading-snug mb-1"
                        />
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded border",
                          getProgramBadgeClass(script.program)
                        )}>
                          {script.program}
                        </span>
                      </div>
                    </div>
                    <ScriptPreview
                      script={script}
                      expanded={isExpanded}
                      onToggle={() => setExpandedIndex(isExpanded ? null : i)}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-14 rounded-2xl font-bold text-base tap-scale"
          >
            {saving ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Saving schedule...</>
            ) : (
              <><CheckCircle2 className="h-5 w-5 mr-2" />Save & Schedule Week<ArrowRight className="h-4 w-4 ml-2" /></>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center pb-2">
            Schedules 8 posts with full scripts across {formatWeekLabel(selectedWeek)}.
          </p>
        </>
      )}

      {/* ── HISTORY ── */}
      {pastBatches.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center gap-2 px-1 mb-3">
            <History className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Past Plans</p>
            <span className="text-xs text-muted-foreground ml-auto">{pastBatches.length} weeks</span>
          </div>
          <div className="space-y-2">
            {pastBatches.map(b => {
              const isThisWeek = b.week_start === thisWeek;
              return (
                <div
                  key={b.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl border",
                    isThisWeek ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                  )}
                >
                  {/* Status icon */}
                  <div className="shrink-0">
                    {b.recording_completed ? (
                      <CheckCheck className="h-4 w-4 text-emerald-500" />
                    ) : b.status === "planned" ? (
                      <Clock className="h-4 w-4 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  {/* Week + theme */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-foreground">{formatWeekLabel(b.week_start)}</p>
                      {isThisWeek && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">THIS WEEK</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {b.theme || <span className="italic">No theme set</span>}
                    </p>
                  </div>
                  {/* Status badge */}
                  <span className={cn(
                    "text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0",
                    b.recording_completed
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  )}>
                    {b.recording_completed ? "Recorded" : "Planned"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
