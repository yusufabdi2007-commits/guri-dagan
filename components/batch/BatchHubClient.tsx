"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  CalendarDays, Youtube, Video, CheckCircle2, Clock,
  AlertCircle, Mic2, Sparkles, ArrowRight, Circle,
  PlayCircle, Edit3, Zap, Camera
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WeeklyBatch {
  id: string;
  week_start: string;
  theme: string;
  youtube_title: string | null;
  youtube_notes: string | null;
  status: "planned" | "recording" | "editing" | "live";
  recording_completed: boolean;
}

interface BatchPost {
  id: string;
  batch_id: string;
  scheduled_date: string;
  platform: "youtube" | "tiktok";
  title: string;
  sort_order: number;
  status: "scheduled" | "editing" | "ready" | "posted" | "overdue";
  posted_at: string | null;
}

interface Props {
  batch: WeeklyBatch | null;
  posts: BatchPost[];
  todayStr: string;
  userId: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_CONFIG = {
  scheduled: { label: "Scheduled", color: "text-muted-foreground", bg: "bg-muted/60", icon: Clock },
  editing:   { label: "Editing",   color: "text-amber-600",        bg: "bg-amber-50 dark:bg-amber-900/20", icon: Edit3 },
  ready:     { label: "Ready",     color: "text-blue-600",         bg: "bg-blue-50 dark:bg-blue-900/20",  icon: Zap },
  posted:    { label: "Posted",    color: "text-green-600",        bg: "bg-green-50 dark:bg-green-900/20", icon: CheckCircle2 },
  overdue:   { label: "Overdue",   color: "text-red-500",          bg: "bg-red-50 dark:bg-red-900/20",    icon: AlertCircle },
};

const BATCH_STATUS_BADGE = {
  planned:   { label: "Planned",   class: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  recording: { label: "Recording", class: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  editing:   { label: "Editing",   class: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  live:      { label: "Live",      class: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
};

function getWeekDates(weekStart: string): string[] {
  // 7-day batch: Sunday (week_start) through Saturday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + "T12:00:00");
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

export function BatchHubClient({ batch, posts, todayStr, userId }: Props) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const weekDates = batch ? getWeekDates(batch.week_start) : [];
  const todayPost = posts.find(p => p.scheduled_date === todayStr);
  const postedCount = posts.filter(p => p.status === "posted").length;
  const remainingCount = posts.filter(p => p.status !== "posted").length;

  async function updatePostStatus(postId: string, status: BatchPost["status"]) {
    setUpdatingId(postId);
    const supabase = createClient();
    const { error } = await supabase
      .from("batch_posts")
      .update({ status, posted_at: status === "posted" ? new Date().toISOString() : null })
      .eq("id", postId);
    if (error) {
      toast({ title: "Could not update status", variant: "destructive" as never });
    } else {
      router.refresh();
    }
    setUpdatingId(null);
  }

  // Empty state: no batch this week
  if (!batch) {
    return (
      <div className="p-4 md:p-6 space-y-5 animate-fade-in">
        <Card className="border-2 border-dashed border-primary/20 bg-primary/5">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-bold text-lg text-foreground mb-2">No batch planned this week</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto leading-relaxed">
              Record once. Post all week. Plan your weekly theme and let the system schedule everything automatically.
            </p>
            <Link href="/batch/plan">
              <Button className="h-12 px-8 rounded-2xl font-semibold tap-scale">
                <Sparkles className="h-4 w-4 mr-2" />
                Plan This Week
              </Button>
            </Link>
          </CardContent>
        </Card>

        <PastBatchesNote />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* This Week Banner */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-primary/90 to-primary overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", BATCH_STATUS_BADGE[batch.status].class)}>
                  {BATCH_STATUS_BADGE[batch.status].label}
                </span>
                {batch.recording_completed && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Recorded
                  </span>
                )}
              </div>
              <h2 className="text-white font-bold text-base leading-tight mt-1">This Week&apos;s Theme</h2>
              <p className="text-white/90 text-sm font-medium mt-0.5 leading-snug max-w-[220px]">{batch.theme}</p>
            </div>
            <div className="text-right text-white/80 shrink-0">
              <div className="text-xs mb-0.5">Progress</div>
              <div className="text-2xl font-bold text-white">{postedCount}/{posts.length}</div>
              <div className="text-xs opacity-70">posted</div>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            {!batch.recording_completed ? (
              <Link href="/batch/record" className="flex-1">
                <Button variant="secondary" className="w-full h-10 rounded-xl font-semibold text-sm bg-white/20 hover:bg-white/30 text-white border-0">
                  <Mic2 className="h-4 w-4 mr-1.5" />
                  Start Recording
                </Button>
              </Link>
            ) : (
              <div className="flex-1 flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-white" />
                <span className="text-white text-sm font-medium">Recording done — just post!</span>
              </div>
            )}
            <Link href="/batch/plan">
              <Button variant="secondary" className="h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white border-0 px-3">
                <Edit3 className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Today's Post */}
      {todayPost ? (
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Today&apos;s Post</h3>
          <TodayPostCard post={todayPost} updatingId={updatingId} onStatusChange={updatePostStatus} />
        </div>
      ) : (
        <Card className="bg-muted/30">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <p className="text-sm text-muted-foreground">No post scheduled for today — rest day.</p>
          </CardContent>
        </Card>
      )}

      {/* Week Grid */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">This Week</h3>
          <span className="text-xs text-muted-foreground">{remainingCount} remaining</span>
        </div>
        <div className="space-y-2">
          {weekDates.map((date, i) => {
            const dayPosts = posts.filter(p => p.scheduled_date === date);
            const isToday = date === todayStr;
            const isPast = date < todayStr;
            return (
              <div
                key={date}
                className={cn(
                  "rounded-2xl border transition-all",
                  isToday ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                )}
              >
                <div className="flex items-center gap-3 p-3">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex flex-col items-center justify-center shrink-0 text-center",
                    isToday ? "bg-primary text-white" : isPast ? "bg-muted text-muted-foreground" : "bg-muted/50 text-foreground"
                  )}>
                    <span className="text-[9px] font-semibold leading-none">{DAYS[i]}</span>
                    <span className="text-sm font-bold leading-none mt-0.5">
                      {new Date(date + "T12:00:00").getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {dayPosts.length === 0 ? (
                      i === 1 ? (
                        <div className="flex items-center gap-1.5">
                          <Camera className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Recording Day</span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No post scheduled</p>
                      )
                    ) : (
                      <div className="space-y-1.5">
                        {dayPosts.map(post => (
                          <DayPostRow
                            key={post.id}
                            post={post}
                            updatingId={updatingId}
                            onStatusChange={updatePostStatus}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TodayPostCard({
  post, updatingId, onStatusChange
}: {
  post: BatchPost;
  updatingId: string | null;
  onStatusChange: (id: string, status: BatchPost["status"]) => void;
}) {
  const cfg = STATUS_CONFIG[post.status];
  const StatusIcon = cfg.icon;
  const isPosted = post.status === "posted";

  return (
    <Card className={cn("border-2", isPosted ? "border-green-200 dark:border-green-800" : "border-primary/30")}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
            post.platform === "youtube" ? "bg-red-100 dark:bg-red-900/30" : "bg-slate-100 dark:bg-slate-800"
          )}>
            {post.platform === "youtube"
              ? <Youtube className="h-4 w-4 text-red-500" />
              : <Video className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-0.5 capitalize">{post.platform}</p>
            <p className="text-sm font-semibold text-foreground leading-snug">{post.title}</p>
          </div>
          <span className={cn("text-xs font-semibold px-2 py-1 rounded-lg shrink-0", cfg.bg, cfg.color)}>
            <StatusIcon className="h-3 w-3 inline mr-1" />
            {cfg.label}
          </span>
        </div>
        {!isPosted && (
          <div className="flex gap-2 mt-3">
            {post.status !== "ready" && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-9 rounded-xl text-xs"
                disabled={updatingId === post.id}
                onClick={() => onStatusChange(post.id, "ready")}
              >
                <Zap className="h-3 w-3 mr-1" />
                Mark Ready
              </Button>
            )}
            <Button
              size="sm"
              className="flex-1 h-9 rounded-xl text-xs"
              disabled={updatingId === post.id}
              onClick={() => onStatusChange(post.id, "posted")}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {updatingId === post.id ? "Saving..." : "Mark Posted"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DayPostRow({
  post, updatingId, onStatusChange
}: {
  post: BatchPost;
  updatingId: string | null;
  onStatusChange: (id: string, status: BatchPost["status"]) => void;
}) {
  const cfg = STATUS_CONFIG[post.status];
  const StatusIcon = cfg.icon;

  return (
    <div className="flex items-center gap-2">
      {post.platform === "youtube"
        ? <Youtube className="h-3.5 w-3.5 text-red-500 shrink-0" />
        : <Video className="h-3.5 w-3.5 text-slate-500 shrink-0" />
      }
      <p className="text-xs text-foreground leading-snug flex-1 min-w-0 truncate">{post.title}</p>
      <button
        disabled={updatingId === post.id}
        onClick={() => {
          if (post.status === "posted") return;
          const next = post.status === "scheduled" ? "ready"
            : post.status === "ready" ? "posted"
            : post.status === "editing" ? "ready"
            : "posted";
          onStatusChange(post.id, next);
        }}
        className={cn(
          "shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-lg transition-all",
          cfg.bg, cfg.color,
          post.status !== "posted" && "hover:opacity-80 active:scale-95 cursor-pointer"
        )}
      >
        <StatusIcon className="h-2.5 w-2.5 inline mr-0.5" />
        {cfg.label}
      </button>
    </div>
  );
}

function PastBatchesNote() {
  return (
    <Card className="bg-muted/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <PlayCircle className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">How it works</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Plan a weekly theme → AI generates 1 YouTube + 7 TikTok topics → Record once → Post one per day. No daily recording needed.
            </p>
          </div>
          <Link href="/batch/plan" className="shrink-0">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
