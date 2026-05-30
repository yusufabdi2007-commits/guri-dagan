"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  Sparkles, Youtube, Video, ArrowRight, Loader2,
  ChevronLeft, CheckCircle2, Edit3
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface BatchPlan {
  youtube_title: string;
  youtube_notes: string;
  tiktok_angles: string[];
}

interface Props {
  userId: string;
  existingBatchId: string | null;
  weekStart: string; // current Monday YYYY-MM-DD
}

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function getNextWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + "T12:00:00");
  const end = new Date(weekStart + "T12:00:00");
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

export function BatchPlanClient({ userId, existingBatchId, weekStart }: Props) {
  const router = useRouter();
  const [theme, setTheme] = useState("");
  const [selectedWeek, setSelectedWeek] = useState(weekStart);
  const [plan, setPlan] = useState<BatchPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingYTTitle, setEditingYTTitle] = useState(false);

  const thisWeek = getWeekStart();
  const nextWeek = getNextWeekStart();

  async function handleGenerate() {
    if (!theme.trim() || generating) return;
    setGenerating(true);
    setPlan(null);
    try {
      const res = await fetch("/api/batch-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: theme.trim() }),
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
        variant: "destructive" as never,
      });
    }
    setGenerating(false);
  }

  function updateAngle(index: number, value: string) {
    if (!plan) return;
    const updated = [...plan.tiktok_angles];
    updated[index] = value;
    setPlan({ ...plan, tiktok_angles: updated });
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
          youtube_notes: plan.youtube_notes,
          status: "planned",
          recording_completed: false,
        }, { onConflict: "user_id,week_start" })
        .select("id")
        .single();

      if (batchErr || !batch) throw new Error(batchErr?.message || "Failed to save batch");

      // Delete existing posts for this batch (re-plan case)
      await supabase.from("batch_posts").delete().eq("batch_id", batch.id);

      // Build posts: YouTube on Monday, TikTok #1-7 Mon-Sun
      const weekBase = new Date(selectedWeek + "T12:00:00");
      const posts = [
        // YouTube — Monday
        {
          batch_id: batch.id,
          user_id: userId,
          scheduled_date: selectedWeek,
          platform: "youtube",
          title: plan.youtube_title,
          angle_notes: plan.youtube_notes,
          sort_order: 0,
          status: "scheduled",
        },
        // 7 TikToks — Mon to Sun
        ...plan.tiktok_angles.map((angle, i) => {
          const d = new Date(weekBase);
          d.setDate(d.getDate() + i);
          return {
            batch_id: batch.id,
            user_id: userId,
            scheduled_date: d.toISOString().split("T")[0],
            platform: "tiktok",
            title: angle,
            sort_order: i + 1,
            status: "scheduled",
          };
        }),
      ];

      const { error: postsErr } = await supabase.from("batch_posts").insert(posts);
      if (postsErr) throw new Error(postsErr.message);

      toast({ title: "Week planned!", description: `${posts.length} posts scheduled across the week.`, variant: "success" as never });
      router.push("/batch");
      router.refresh();
    } catch (e) {
      toast({
        title: "Could not save plan",
        description: e instanceof Error ? e.message : "Please try again",
        variant: "destructive" as never,
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
            One focused topic. The AI will generate 1 YouTube + 7 TikTok angles from it.
          </p>
          <Button
            onClick={handleGenerate}
            disabled={!theme.trim() || generating}
            className="w-full h-12 rounded-xl font-semibold tap-scale"
          >
            {generating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating plan...</>
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
                <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Youtube className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">YouTube</p>
                  <p className="text-[10px] text-muted-foreground">Monday — Long-form</p>
                </div>
                <button onClick={() => setEditingYTTitle(!editingYTTitle)} className="ml-auto p-1.5 rounded-lg hover:bg-muted">
                  <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
              {editingYTTitle ? (
                <Input
                  value={plan.youtube_title}
                  onChange={e => setPlan({ ...plan, youtube_title: e.target.value })}
                  className="text-sm font-semibold h-10 rounded-xl mb-2"
                />
              ) : (
                <p className="text-sm font-bold text-foreground mb-2 leading-snug">{plan.youtube_title}</p>
              )}
              <p className="text-xs text-muted-foreground leading-relaxed">{plan.youtube_notes}</p>
            </CardContent>
          </Card>

          {/* TikTok angles */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 px-1">
              <Video className="h-4 w-4 text-slate-500" />
              <p className="text-sm font-semibold text-foreground">7 TikTok Angles</p>
              <span className="text-xs text-muted-foreground ml-auto">Mon → Sun</span>
            </div>
            {plan.tiktok_angles.map((angle, i) => {
              const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
              const d = new Date(selectedWeek + "T12:00:00");
              d.setDate(d.getDate() + i);
              const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              return (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-muted flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-semibold text-muted-foreground leading-none">{dayNames[i]}</span>
                        <span className="text-xs font-bold text-foreground leading-none mt-0.5">{d.getDate()}</span>
                      </div>
                      <input
                        value={angle}
                        onChange={e => updateAngle(i, e.target.value)}
                        className="flex-1 text-sm font-medium text-foreground bg-transparent border-none outline-none min-w-0 leading-snug"
                      />
                    </div>
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
            This will schedule 8 posts (1 YouTube + 7 TikToks) across {formatWeekLabel(selectedWeek)}.
          </p>
        </>
      )}
    </div>
  );
}
