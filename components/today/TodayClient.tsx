"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  CheckCircle2, Circle, Youtube, Video, Calendar,
  Upload, ArrowRight, Sparkles, Flame, Battery, Lightbulb,
  MessageSquare, TrendingUp, ChevronRight, ChevronDown, ChevronUp,
  Zap, Eye, Brain, Target, Heart, Shield, Camera, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseScriptNotes, getProgramBadgeClass, PROGRAMS } from "@/lib/programs";
import type { ProgramName } from "@/lib/programs";

interface BatchPost {
  id: string;
  platform: "youtube" | "tiktok";
  title: string;
  angle_notes: string | null;
  status: string;
  batch_id: string;
}

interface RecordingPost {
  id: string;
  platform: "youtube" | "tiktok";
  title: string;
  angle_notes: string | null;
  status: string;
  sort_order: number;
  scheduled_date: string;
}

interface CalendarItem {
  id: string;
  title: string;
  platform: string;
  status: string;
}

interface EditedIdea {
  id: string;
  title: string;
  hook: string | null;
  platform: string;
  status: string;
}

interface WeekProgress {
  posted: number;
  total: number;
}

interface NextPost {
  title: string;
  platform: string;
  scheduled_date: string;
}

interface Props {
  batchPosts: BatchPost[];
  calendarItems: CalendarItem[];
  editedIdeas: EditedIdea[];
  postedToday: boolean;
  userId: string;
  todayStr: string;
  weeklyTheme: string | null;
  weekProgress: WeekProgress | null;
  nextPost: NextPost | null;
  dayOfWeek: number; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  recordingPosts: RecordingPost[];
  nextWeekStart: string;
}

const TIKTOK_CHECKLIST = [
  { id: "edit", label: "Edit the clip" },
  { id: "captions", label: "Add captions" },
  { id: "hook", label: "Write hook text overlay" },
  { id: "upload", label: "Upload to TikTok" },
  { id: "hashtags", label: "Add 3–5 hashtags" },
];

const YOUTUBE_CHECKLIST = [
  { id: "thumbnail", label: "Create thumbnail" },
  { id: "edit", label: "Edit the video" },
  { id: "captions", label: "Add subtitles/captions" },
  { id: "upload", label: "Upload to YouTube" },
  { id: "tags", label: "Add title, description, tags" },
  { id: "chapters", label: "Add chapters" },
  { id: "endscreen", label: "Set up end screens & cards" },
];

const LOW_ENERGY_TIPS = [
  "A simple post keeps momentum alive.",
  "Consistency matters more than perfection.",
  "Small actions still move the mission forward.",
  "Done is better than perfect. Post anyway.",
];

const SCRIPT_SECTIONS = [
  { key: "hook", label: "Hook", time: "0–3s", icon: Zap, color: "text-yellow-500" },
  { key: "problem", label: "Problem", time: "3–10s", icon: Eye, color: "text-red-500" },
  { key: "reframe", label: "Reframe", time: "10–25s", icon: Brain, color: "text-violet-500" },
  { key: "teaching", label: "Teaching", time: "25–45s", icon: Target, color: "text-blue-500" },
  { key: "action", label: "Action", time: "45–60s", icon: Heart, color: "text-emerald-500" },
] as const;

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatNextDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// ─── Program Header ───────────────────────────────────────────────────────────

function ProgramHeader({ programName, platform }: { programName: string; platform: string }) {
  const p = PROGRAMS[programName as ProgramName];
  if (!p) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap mb-2">
      <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span
        className={cn(
          "px-2 py-0.5 rounded-md text-[10px] font-bold border",
          getProgramBadgeClass(programName)
        )}
      >
        {programName}
      </span>
      <span className="text-[10px] text-muted-foreground">
        {platform === "youtube" ? "YouTube" : "TikTok"} · {p.childTransformation}
      </span>
    </div>
  );
}

// ─── Script Guide ─────────────────────────────────────────────────────────────

function ScriptGuide({
  notes,
  expanded,
  onToggle,
}: {
  notes: string | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const script = parseScriptNotes(notes);
  if (!script.hasScript) return null;

  return (
    <div className="border-t border-border/50 pt-3 mt-1">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors mb-0"
      >
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {expanded ? "Hide" : "Show"} video script
      </button>

      {expanded && (
        <div className="space-y-3 pt-3">
          {script.hookType && (
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Hook type: {script.hookType}
            </p>
          )}
          {SCRIPT_SECTIONS.map(({ key, label, time, icon: Icon, color }) => {
            const text = script[key as keyof typeof script] as string | null;
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
          {script.cta && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/60">
              <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">CTA:</span> {script.cta}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tomorrow Card ────────────────────────────────────────────────────────────

function TomorrowCard({ dayOfWeek, nextPost }: { dayOfWeek: number; nextPost: NextPost | null }) {
  const tomorrow = (dayOfWeek + 1) % 7;
  const extras: { icon: React.ElementType; text: string }[] = [];
  if (tomorrow === 1) extras.push({ icon: Camera, text: "Record next week's videos" });
  if (tomorrow === 3) extras.push({ icon: Youtube, text: "Publish YouTube flagship" });
  if (tomorrow === 0) extras.push({ icon: Sparkles, text: "Plan next week" });

  return (
    <Card className="border-border/50 bg-muted/20">
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
          Tomorrow · {DAY_NAMES[tomorrow]}
        </p>
        <div className="space-y-2">
          {nextPost ? (
            <div className="flex items-center gap-2">
              <Video className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <p className="text-xs font-medium text-foreground truncate">{nextPost.title}</p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Video className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">TikTok post</p>
            </div>
          )}
          {extras.map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-primary/60 shrink-0" />
              <p className="text-xs text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Recording Section (Monday) ───────────────────────────────────────────────

function RecordingSection({
  posts,
  nextWeekStart,
}: {
  posts: RecordingPost[];
  nextWeekStart: string;
}) {
  const [recorded, setRecorded] = useState<Set<string>>(new Set(
    posts.filter(p => p.status === "recording" || p.status === "editing" || p.status === "posted").map(p => p.id)
  ));
  // Auto-expand only the first post — others collapsed by default to reduce visual noise
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(posts.length > 0 ? [posts[0].id] : []));
  const [saving, setSaving] = useState<string | null>(null);

  const supabase = createClient();

  async function toggleRecorded(postId: string) {
    if (saving) return;
    setSaving(postId);
    const wasRecorded = recorded.has(postId);
    const isNowRecorded = !wasRecorded;

    setRecorded(prev => {
      const next = new Set(prev);
      isNowRecorded ? next.add(postId) : next.delete(postId);
      return next;
    });

    const { error } = await supabase
      .from("batch_posts")
      .update({ status: isNowRecorded ? "recording" : "scheduled" })
      .eq("id", postId);

    if (error) {
      setRecorded(prev => {
        const reverted = new Set(prev);
        wasRecorded ? reverted.add(postId) : reverted.delete(postId);
        return reverted;
      });
      toast({ title: "Could not save — please try again", variant: "destructive" });
    }
    setSaving(null);
  }

  if (posts.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="p-6 text-center">
          <Camera className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground mb-1">No plan for next week yet</p>
          <p className="text-xs text-muted-foreground mb-4">
            Generate next week&apos;s scripts first, then come back Monday to record.
          </p>
          <Link href="/weekly-assignment">
            <Button className="w-full h-11 rounded-xl font-semibold">
              <Sparkles className="h-4 w-4 mr-2" />
              Plan Next Week
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const youtube = posts.find(p => p.platform === "youtube");
  const tiktoks = posts.filter(p => p.platform === "tiktok").sort((a, b) => a.sort_order - b.sort_order);
  const allPosts = youtube ? [youtube, ...tiktoks] : tiktoks;
  const recordedCount = allPosts.filter(p => recorded.has(p.id)).length;

  return (
    <div className="space-y-3">
      {/* Recording header */}
      <div className="rounded-2xl gradient-primary p-5 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
            <Camera className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Monday</p>
            <p className="text-lg font-bold text-white">Record Next Week</p>
          </div>
        </div>
        <p className="text-sm text-white/80 mb-3">
          Record all {allPosts.length} videos now. TikToks post Mon–Sun daily · YouTube publishes Wednesday.
        </p>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-white/70">
            <span>Progress</span>
            <span className="font-bold text-white">{recordedCount}/{allPosts.length} recorded</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${(recordedCount / allPosts.length) * 100}%` }}
            />
          </div>
        </div>
        {recordedCount === allPosts.length && (
          <p className="text-sm font-bold text-white mt-3">
            All recorded! TikToks post every day · YouTube publishes Wednesday.
          </p>
        )}
      </div>

      {/* Video cards */}
      {allPosts.map((post) => {
        const script = parseScriptNotes(post.angle_notes);
        const isRecorded = recorded.has(post.id);
        const isExpanded = expandedIds.has(post.id);
        const PlatformIcon = post.platform === "youtube" ? Youtube : Video;
        const platformLabel = post.platform === "youtube" ? "YouTube" : "TikTok";

        return (
          <Card
            key={post.id}
            className={cn(
              "overflow-hidden transition-all duration-200",
              isRecorded && "opacity-70"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleRecorded(post.id)}
                  disabled={saving === post.id}
                  className="shrink-0 mt-0.5"
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    saving === post.id && "opacity-50",
                    isRecorded
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-border hover:border-primary"
                  )}>
                    {saving === post.id
                      ? <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                      : isRecorded
                        ? <CheckCircle2 className="h-4 w-4 text-white" />
                        : null}
                  </div>
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <PlatformIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      {platformLabel}
                    </span>
                    {script.program && (
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded border",
                        getProgramBadgeClass(script.program)
                      )}>
                        {script.program}
                      </span>
                    )}
                    <span className="text-[9px] font-semibold text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
                      Posts {new Date(post.scheduled_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                  </div>

                  <p className={cn(
                    "text-sm font-semibold text-foreground leading-snug",
                    isRecorded && "line-through text-muted-foreground"
                  )}>
                    {post.title}
                  </p>

                  {script.hook && (
                    <p className="text-xs text-muted-foreground mt-1 leading-snug line-clamp-1">
                      <Zap className="h-3 w-3 text-yellow-500 inline mr-1" />
                      {script.hook}
                    </p>
                  )}

                  {script.hasScript && (
                    <button
                      onClick={() => {
                        const next = new Set(expandedIds);
                        isExpanded ? next.delete(post.id) : next.add(post.id);
                        setExpandedIds(next);
                      }}
                      className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {isExpanded ? "Hide script" : "View full script"}
                    </button>
                  )}

                  {isExpanded && script.hasScript && (
                    <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
                      {script.hookType && (
                        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                          Hook type: {script.hookType}
                        </p>
                      )}
                      {SCRIPT_SECTIONS.map(({ key, label, time, icon: Icon, color }) => {
                        const text = script[key as keyof typeof script] as string | null;
                        if (!text) return null;
                        return (
                          <div key={key} className="flex items-start gap-2">
                            <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                              <Icon className={cn("h-3 w-3", color)} />
                              <span className="text-[8px] text-muted-foreground/60">{time}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
                              <p className="text-xs text-foreground leading-relaxed">{text}</p>
                            </div>
                          </div>
                        );
                      })}
                      {script.cta && (
                        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-muted/60 mt-1">
                          <ArrowRight className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">CTA:</span> {script.cta}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="grid grid-cols-2 gap-3 pb-2">
        <Link href="/batch/plan">
          <div className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-border bg-muted/30 hover:bg-muted transition-all tap-scale">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-xs font-semibold text-foreground">Re-plan Week</span>
          </div>
        </Link>
        <Link href="/batch">
          <div className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-border bg-muted/30 hover:bg-muted transition-all tap-scale">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="text-xs font-semibold text-foreground">View Schedule</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TodayClient({
  batchPosts, calendarItems, editedIdeas, postedToday, userId, todayStr,
  weeklyTheme, weekProgress, nextPost, dayOfWeek, recordingPosts, nextWeekStart,
}: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);
  const [showLowEnergy, setShowLowEnergy] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const router = useRouter();

  const isSunday = dayOfWeek === 0;
  const isMonday = dayOfWeek === 1;

  // "done" = at least one post completed today AND nothing left to post
  const done = postedToday && batchPosts.length === 0;

  const tip = LOW_ENERGY_TIPS[new Date().getDay() % LOW_ENERGY_TIPS.length];

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleMarkPosted(post: BatchPost | null, platform: string) {
    if (marking) return;
    setMarking(true);
    const supabase = createClient();

    // Step 1: Mark the batch post as posted
    if (post) {
      const { error: updateErr } = await supabase
        .from("batch_posts")
        .update({ status: "posted", posted_at: new Date().toISOString() })
        .eq("id", post.id);

      if (updateErr) {
        toast({
          title: "Could not save — please try again",
          variant: "destructive",
        });
        setMarking(false);
        return;
      }
    }

    // Step 2: Record daily completion (streak tracking)
    const { error: completionErr } = await supabase.from("daily_completions").insert({
      user_id: userId,
      completed_date: todayStr,
      platform: platform || "TikTok",
    });

    if (completionErr && completionErr.code !== "23505") {
      // Rollback batch_posts so nothing is left in a partial state
      if (post) {
        await supabase
          .from("batch_posts")
          .update({ status: "scheduled", posted_at: null })
          .eq("id", post.id);
      }
      toast({
        title: "Could not save — please try again",
        variant: "destructive",
      });
      setMarking(false);
      return;
    }

    toast({
      title: "Posted!",
      description: batchPosts.length > 1 ? "Next post coming up." : "Momentum is building. Great work.",
      variant: "success",
    });
    router.refresh();
    setMarking(false);
  }

  // ─── Already posted today (all done) ─────────────────────────────────────

  if (done) {
    return (
      <div className="p-4 md:p-6 space-y-4 animate-fade-in">
        <div className="rounded-2xl gradient-primary p-6 text-white text-center shadow-lg success-glow">
          <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-9 w-9 text-white" />
          </div>
          <p className="text-xl font-bold mb-1">You showed up today.</p>
          <p className="text-sm opacity-75 leading-relaxed">Momentum is building.<br />See you tomorrow.</p>
          {nextPost && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-[11px] text-white/50 uppercase tracking-wider mb-1">Next up</p>
              <p className="text-sm font-semibold text-white/95 leading-snug">{nextPost.title}</p>
              <p className="text-xs text-white/55 mt-1 capitalize">
                {nextPost.platform} · {formatNextDate(nextPost.scheduled_date)}
              </p>
            </div>
          )}
        </div>

        {/* Monday: recording session */}
        {isMonday && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Next: Record Next Week
              </p>
            </div>
            <RecordingSection posts={recordingPosts} nextWeekStart={nextWeekStart} />
          </div>
        )}

        {/* Sunday: plan next week after all posts are done */}
        {isSunday && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground mb-0.5">Plan next week</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Week complete! Generate next week&apos;s scripts — YouTube publishes Wednesday, TikToks every day.
                  </p>
                  <Link href="/weekly-assignment">
                    <Button size="sm" className="rounded-xl h-8 text-xs w-full">
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Generate Next Week&apos;s Assignment
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isMonday && (
          <div className="grid grid-cols-2 gap-3">
            <Link href="/ideas">
              <div className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-border bg-muted/30 hover:bg-muted transition-all tap-scale">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                <span className="text-xs font-semibold text-foreground">Capture Idea</span>
              </div>
            </Link>
            <Link href="/batch">
              <div className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-border bg-muted/30 hover:bg-muted transition-all tap-scale">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="text-xs font-semibold text-foreground">This Week</span>
              </div>
            </Link>
          </div>
        )}

        {/* Always show tomorrow — even after today's work is done */}
        <TomorrowCard dayOfWeek={dayOfWeek} nextPost={nextPost} />
      </div>
    );
  }

  // ─── Today's batch post(s) ────────────────────────────────────────────────
  // batchPosts[0] is always the next unposted post (sorted by sort_order).
  // After marking it posted, the page refreshes and batchPosts[1] becomes [0].
  // Wednesday has 2 posts: TikTok #3 (sort 3) then YouTube (sort 8).

  if (batchPosts.length > 0) {
    const batchPost = batchPosts[0];
    const hasMoreAfter = batchPosts.length > 1;
    const checklist = batchPost.platform === "youtube" ? YOUTUBE_CHECKLIST : TIKTOK_CHECKLIST;
    const PlatformIcon = batchPost.platform === "youtube" ? Youtube : Video;
    const platformLabel = batchPost.platform === "youtube" ? "YouTube" : "TikTok";
    const script = parseScriptNotes(batchPost.angle_notes);

    return (
      <div className="p-4 md:p-6 space-y-4 animate-fade-in">
        {/* Multi-post indicator (Wednesday: TikTok + YouTube) */}
        {hasMoreAfter && (
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {batchPosts.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      i === 0 ? "w-6 bg-primary" : "w-4 bg-primary/25"
                    )}
                  />
                ))}
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                Post 1 of {batchPosts.length}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {batchPosts.slice(1).map(p => p.platform === "youtube" ? "YouTube" : "TikTok").join(" + ")} still to go
            </p>
          </div>
        )}

        {/* Hero card */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="gradient-primary p-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <PlatformIcon className="h-4 w-4 text-white/90" />
              <span className="text-xs font-semibold text-white/90 uppercase tracking-wide">
                Today&apos;s {platformLabel} Post
              </span>
              {script.program && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/20 text-white border border-white/30">
                  {script.program}
                </span>
              )}
            </div>
            <p className="text-white font-bold text-lg leading-snug">{batchPost.title}</p>
            {weeklyTheme && (
              <p className="text-white/60 text-xs mt-1.5">Week theme: {weeklyTheme}</p>
            )}
            {script.program && PROGRAMS[script.program as ProgramName] && (
              <p className="text-white/60 text-xs mt-0.5 italic">
                {PROGRAMS[script.program as ProgramName].childTransformation}
              </p>
            )}
          </div>

          {batchPost.angle_notes && (
            <CardContent className="p-4 border-t border-border/50">
              {script.hasScript ? (
                <>
                  {script.program && (
                    <ProgramHeader programName={script.program} platform={batchPost.platform} />
                  )}
                  {script.hook && (
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Zap className="h-3.5 w-3.5 text-yellow-500" />
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Hook · {script.hookType || "0–3s"}
                        </p>
                      </div>
                      <p className="text-sm text-foreground font-medium leading-snug">
                        {script.hook}
                      </p>
                    </div>
                  )}
                  <ScriptGuide
                    notes={batchPost.angle_notes}
                    expanded={showScript}
                    onToggle={() => setShowScript(v => !v)}
                  />
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Your angle
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{batchPost.angle_notes}</p>
                </>
              )}
            </CardContent>
          )}
        </Card>

        {/* Checklist */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-foreground">Before you post</p>
              {checked.size > 0 && (
                <span className="text-[11px] font-semibold text-primary">
                  {checked.size}/{checklist.length} done
                </span>
              )}
            </div>
            <div className="space-y-2.5">
              {checklist.map(item => {
                const isChecked = checked.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className="w-full flex items-center gap-3 text-left tap-scale py-0.5"
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200",
                        isChecked ? "bg-primary border-primary scale-110" : "border-border"
                      )}
                    >
                      {isChecked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <span
                      className={cn(
                        "text-sm transition-colors duration-200",
                        isChecked
                          ? "line-through text-muted-foreground"
                          : "text-foreground font-medium"
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 space-y-1.5">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(checked.size / checklist.length) * 100}%` }}
                />
              </div>
              {checked.size === checklist.length && (
                <p className="text-xs font-semibold text-primary text-center spring-in">
                  All done — ready to post!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mark Posted */}
        <Button
          onClick={() => handleMarkPosted(batchPost, platformLabel)}
          disabled={marking}
          className="w-full h-14 text-base font-bold rounded-2xl gradient-primary text-white shadow-lg tap-scale"
        >
          {marking
            ? <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            : <CheckCircle2 className="h-5 w-5 mr-2" />}
          {marking ? "Saving..." : hasMoreAfter ? `Mark ${platformLabel} Posted → Next` : "Mark as Posted"}
        </Button>

        {/* Week progress */}
        {weekProgress && weekProgress.total > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-semibold text-foreground">This week</p>
                </div>
                <span className="text-xs font-bold text-primary">
                  {weekProgress.posted}/{weekProgress.total} posted
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(weekProgress.posted / weekProgress.total) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tomorrow Card */}
        <TomorrowCard dayOfWeek={dayOfWeek} nextPost={nextPost} />

        {/* Low energy toggle */}
        <button
          onClick={() => setShowLowEnergy(v => !v)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Battery className="h-4 w-4" />
          Low energy today?
        </button>

        {showLowEnergy && (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 spring-in">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">
                Take it easy
              </p>
              <p className="text-sm text-amber-700/80 dark:text-amber-400/80 mb-3">{tip}</p>
              <div className="space-y-2">
                <Link
                  href="/ideas"
                  className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 hover:underline"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Browse ready-to-post ideas
                </Link>
                <Link
                  href="/generator"
                  className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 hover:underline"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate a quick idea
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ─── Calendar items (no batch post) ──────────────────────────────────────

  if (calendarItems.length > 0) {
    return (
      <div className="p-4 md:p-6 space-y-4 animate-fade-in">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-rose-500" />
              <span className="text-sm font-semibold text-foreground">Scheduled for today</span>
            </div>
            <div className="space-y-3">
              {calendarItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{item.platform}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={() => handleMarkPosted(null, calendarItems[0]?.platform || "TikTok")}
          disabled={marking}
          className="w-full h-14 text-base font-bold rounded-2xl gradient-primary text-white shadow-lg tap-scale"
        >
          {marking
            ? <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            : <CheckCircle2 className="h-5 w-5 mr-2" />}
          {marking ? "Saving..." : "Mark as Posted"}
        </Button>
      </div>
    );
  }

  // ─── Edited ideas ready to post ───────────────────────────────────────────

  if (editedIdeas.length > 0) {
    return (
      <div className="p-4 md:p-6 space-y-4 animate-fade-in">
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Upload className="h-4 w-4 text-green-500" />
              <span className="text-sm font-semibold text-foreground">Ready to post</span>
            </div>
            <div className="space-y-3">
              {editedIdeas.map(idea => (
                <Link key={idea.id} href="/ideas" className="block">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-1">{idea.title}</p>
                      {idea.hook && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {idea.hook}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={() => handleMarkPosted(null, "TikTok")}
          disabled={marking}
          className="w-full h-14 text-base font-bold rounded-2xl gradient-primary text-white shadow-lg tap-scale"
        >
          {marking
            ? <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            : <CheckCircle2 className="h-5 w-5 mr-2" />}
          {marking ? "Saving..." : "Mark Posted Today"}
        </Button>
      </div>
    );
  }

  // ─── Nothing scheduled ────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-7 w-7 text-primary/60" />
          </div>
          <p className="text-base font-semibold text-foreground mb-1">No post scheduled today</p>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            Good time to plan next week so you&apos;re never scrambling.
          </p>
          <Link href="/weekly-assignment">
            <Button className="w-full h-11 rounded-xl font-semibold tap-scale">
              <Sparkles className="h-4 w-4 mr-2" />
              Plan Next Week
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Monday with no scheduled post: still show recording section */}
      {isMonday && recordingPosts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Camera className="h-3.5 w-3.5 text-amber-500" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Record Next Week
            </p>
          </div>
          <RecordingSection posts={recordingPosts} nextWeekStart={nextWeekStart} />
        </div>
      )}

      <button
        onClick={() => handleMarkPosted(null, "TikTok")}
        disabled={marking}
        className="w-full py-3.5 text-sm text-muted-foreground hover:text-foreground border border-border/60 rounded-2xl transition-colors tap-scale flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {marking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Circle className="h-4 w-4" />}
        {marking ? "Saving..." : "I posted something outside the plan"}
      </button>

      <Card className="border-amber-200/70 dark:border-amber-800/50 bg-amber-50/40 dark:bg-amber-900/10">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
            Low energy today?
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mb-3 leading-relaxed">{tip}</p>
          <Link
            href="/inbox"
            className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 hover:underline font-medium"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Answer a question from your audience
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
