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
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BatchPost {
  id: string;
  platform: "youtube" | "tiktok";
  title: string;
  angle_notes: string | null;
  status: string;
  batch_id: string;
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

interface Props {
  batchPost: BatchPost | null;
  calendarItems: CalendarItem[];
  editedIdeas: EditedIdea[];
  postedToday: boolean;
  userId: string;
  todayStr: string;
}

const TIKTOK_CHECKLIST = [
  { id: "edit", label: "Edit the clip" },
  { id: "captions", label: "Add captions" },
  { id: "hook", label: "Write hook text overlay" },
  { id: "upload", label: "Upload to TikTok" },
  { id: "hashtags", label: "Add 3–5 hashtags" },
];

const YOUTUBE_CHECKLIST = [
  { id: "edit", label: "Edit the video" },
  { id: "captions", label: "Add subtitles/captions" },
  { id: "thumbnail", label: "Create thumbnail" },
  { id: "upload", label: "Upload to YouTube" },
  { id: "tags", label: "Add title, description, tags" },
];

const LOW_ENERGY_TIPS = [
  "A simple post keeps momentum alive.",
  "Consistency matters more than perfection.",
  "Small actions still move the mission forward.",
  "Done is better than perfect. Post anyway.",
];

export function TodayClient({
  batchPost, calendarItems, editedIdeas, postedToday, userId, todayStr,
}: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);
  const [showLowEnergy, setShowLowEnergy] = useState(false);
  const [done, setDone] = useState(postedToday);
  const router = useRouter();

  const tip = LOW_ENERGY_TIPS[new Date().getDay() % LOW_ENERGY_TIPS.length];

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleMarkPosted(platform: string) {
    if (marking) return;
    setMarking(true);
    const supabase = createClient();

    // If from batch, mark batch_post as posted
    if (batchPost) {
      await supabase
        .from("batch_posts")
        .update({ status: "posted", posted_at: new Date().toISOString() })
        .eq("id", batchPost.id);
    }

    // Log daily completion
    const { error } = await supabase.from("daily_completions").insert({
      user_id: userId,
      completed_date: todayStr,
      platform: platform || "TikTok",
    });

    if (error && error.code !== "23505") {
      // 23505 = unique violation (already posted today), not an error
      toast({
        title: "Could not save — please try again",
        variant: "destructive" as never,
      });
    } else {
      setDone(true);
      toast({
        title: "Posted today!",
        description: "Momentum is building. Great work.",
        variant: "success" as never,
      });
      router.refresh();
    }
    setMarking(false);
  }

  // --- Already posted today ---
  if (done) {
    return (
      <div className="p-4 md:p-6 space-y-4 animate-fade-in">
        <div className="rounded-2xl gradient-primary p-5 text-white text-center shadow-lg">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-90" />
          <p className="text-lg font-bold mb-1">You showed up today.</p>
          <p className="text-sm opacity-80">Momentum is building. See you tomorrow.</p>
        </div>
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
      </div>
    );
  }

  // --- Today's batch post ---
  if (batchPost) {
    const checklist = batchPost.platform === "youtube" ? YOUTUBE_CHECKLIST : TIKTOK_CHECKLIST;
    const allChecked = checklist.every(item => checked.has(item.id));
    const PlatformIcon = batchPost.platform === "youtube" ? Youtube : Video;
    const platformLabel = batchPost.platform === "youtube" ? "YouTube" : "TikTok";
    const platformColor = batchPost.platform === "youtube" ? "text-red-500" : "text-slate-500";

    return (
      <div className="p-4 md:p-6 space-y-4 animate-fade-in">
        {/* Hero card */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="gradient-primary p-4">
            <div className="flex items-center gap-2 mb-2">
              <PlatformIcon className="h-4 w-4 text-white/90" />
              <span className="text-xs font-semibold text-white/90 uppercase tracking-wide">
                Today&apos;s {platformLabel} Post
              </span>
            </div>
            <p className="text-white font-bold text-lg leading-snug">{batchPost.title}</p>
          </div>
          {batchPost.angle_notes && (
            <CardContent className="p-4 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Your angle
              </p>
              <p className="text-sm text-foreground leading-relaxed">{batchPost.angle_notes}</p>
            </CardContent>
          )}
        </Card>

        {/* Checklist */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-foreground mb-3">Posting checklist</p>
            <div className="space-y-3">
              {checklist.map(item => {
                const isChecked = checked.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className="w-full flex items-center gap-3 text-left tap-scale"
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                      isChecked
                        ? "bg-primary border-primary"
                        : "border-border"
                    )}>
                      {isChecked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <span className={cn(
                      "text-sm transition-colors",
                      isChecked ? "line-through text-muted-foreground" : "text-foreground font-medium"
                    )}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${(checked.size / checklist.length) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {checked.size}/{checklist.length} steps done
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mark Posted */}
        <Button
          onClick={() => handleMarkPosted(platformLabel)}
          disabled={marking}
          className="w-full h-14 text-base font-bold rounded-2xl gradient-primary text-white shadow-lg tap-scale"
        >
          <CheckCircle2 className="h-5 w-5 mr-2" />
          {marking ? "Saving..." : "Mark as Posted"}
        </Button>

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
                <Link href="/ideas" className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 hover:underline">
                  <ArrowRight className="h-3.5 w-3.5" />
                  Browse ready-to-post ideas
                </Link>
                <Link href="/generator" className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 hover:underline">
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

  // --- Calendar items (no batch post) ---
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
          onClick={() => handleMarkPosted(calendarItems[0]?.platform || "TikTok")}
          disabled={marking}
          className="w-full h-14 text-base font-bold rounded-2xl gradient-primary text-white shadow-lg tap-scale"
        >
          <CheckCircle2 className="h-5 w-5 mr-2" />
          {marking ? "Saving..." : "Mark as Posted"}
        </Button>
      </div>
    );
  }

  // --- Edited ideas ready to post ---
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
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{idea.hook}</p>
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
          onClick={() => handleMarkPosted("TikTok")}
          disabled={marking}
          className="w-full h-14 text-base font-bold rounded-2xl gradient-primary text-white shadow-lg tap-scale"
        >
          <CheckCircle2 className="h-5 w-5 mr-2" />
          {marking ? "Saving..." : "Mark Posted Today"}
        </Button>
      </div>
    );
  }

  // --- Nothing scheduled ---
  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      <Card className="border-0 shadow-md">
        <CardContent className="p-6 text-center">
          <Flame className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground mb-1">No post scheduled today</p>
          <p className="text-xs text-muted-foreground mb-4">
            Use this time to plan ahead or capture ideas.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/batch/plan">
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-all tap-scale">
                <Calendar className="h-4 w-4 text-primary mx-auto mb-1" />
                <p className="text-xs font-semibold text-primary">Plan Week</p>
              </div>
            </Link>
            <Link href="/generator">
              <div className="p-3 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-all tap-scale">
                <Sparkles className="h-4 w-4 text-primary mx-auto mb-1" />
                <p className="text-xs font-semibold text-foreground">Generate Idea</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      <button
        onClick={() => handleMarkPosted("TikTok")}
        disabled={marking}
        className="w-full py-3 text-sm text-muted-foreground hover:text-foreground border border-border rounded-2xl transition-colors tap-scale"
      >
        <CheckCircle2 className="h-4 w-4 inline mr-2" />
        {marking ? "Saving..." : "I posted something today"}
      </button>

      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Low energy day?</p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mb-3">{tip}</p>
          <Link href="/inbox" className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 hover:underline">
            <MessageSquare className="h-3.5 w-3.5" />
            Answer a question from your audience
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
