"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  Mic2, Youtube, Video, CheckCircle2, Circle,
  ChevronLeft, Clock, Camera, Zap, ArrowRight, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WeeklyBatch {
  id: string;
  week_start: string;
  theme: string;
  youtube_title: string | null;
  youtube_notes: string | null;
  status: string;
  recording_completed: boolean;
}

interface BatchPost {
  id: string;
  platform: "youtube" | "tiktok";
  title: string;
  sort_order: number;
  status: string;
}

interface Props {
  batch: WeeklyBatch;
  posts: BatchPost[];
  userId: string;
}

const PREP_CHECKLIST = [
  { id: "camera", label: "Camera charged and stable" },
  { id: "lighting", label: "Lighting is on and positioned" },
  { id: "audio", label: "Microphone / phone audio checked" },
  { id: "background", label: "Background is clean" },
  { id: "water", label: "Water bottle nearby" },
  { id: "notes", label: "Talking points reviewed" },
];

export function BatchRecordClient({ batch, posts, userId }: Props) {
  const router = useRouter();
  const [checkedPrep, setCheckedPrep] = useState<Set<string>>(new Set());
  const [checkedClips, setCheckedClips] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const youtubePosts = posts.filter(p => p.platform === "youtube");
  const tiktokPosts = posts.filter(p => p.platform === "tiktok").sort((a, b) => a.sort_order - b.sort_order);

  const allPrepDone = checkedPrep.size === PREP_CHECKLIST.length;
  const clipsRecorded = checkedClips.size;
  const totalClips = youtubePosts.length + tiktokPosts.length;
  const allClipsDone = checkedClips.size === totalClips;

  function togglePrep(id: string) {
    setCheckedPrep(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function toggleClip(id: string) {
    setCheckedClips(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  async function handleCompleteRecording() {
    if (saving) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("weekly_batches")
      .update({ recording_completed: true, status: "editing" })
      .eq("id", batch.id)
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Could not save", description: "Please try again", variant: "destructive" as never });
      setSaving(false);
      return;
    }

    // Mark all batch_posts as editing
    await supabase
      .from("batch_posts")
      .update({ status: "editing" })
      .eq("batch_id", batch.id)
      .eq("status", "scheduled");

    toast({ title: "Recording complete!", description: "All clips marked as editing. Time to edit and post!", variant: "success" as never });
    router.push("/batch");
    router.refresh();
  }

  const estimatedMinutes = youtubePosts.length * 20 + tiktokPosts.length * 5;

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Back */}
      <Link href="/batch" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ChevronLeft className="h-4 w-4" />
        Back to Batch Hub
      </Link>

      {/* Session header */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-amber-500 to-orange-500">
        <CardContent className="p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Mic2 className="h-5 w-5" />
                <span className="text-sm font-semibold opacity-90">Recording Session</span>
              </div>
              <h2 className="font-bold text-base leading-snug max-w-[220px]">{batch.theme}</h2>
              <p className="text-xs opacity-80 mt-1">
                {youtubePosts.length} YouTube + {tiktokPosts.length} TikTok clips
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-white/80 mb-1">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs">Est. time</span>
              </div>
              <p className="text-2xl font-bold">{estimatedMinutes}</p>
              <p className="text-xs opacity-70">minutes</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs opacity-80 mb-1.5">
              <span>Clips recorded</span>
              <span>{clipsRecorded}/{totalClips}</span>
            </div>
            <div className="h-2 rounded-full bg-white/20">
              <div
                className="h-2 rounded-full bg-white transition-all duration-300"
                style={{ width: `${totalClips > 0 ? (clipsRecorded / totalClips) * 100 : 0}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prep checklist */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Before You Start</CardTitle>
            {allPrepDone && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {PREP_CHECKLIST.map(item => {
            const done = checkedPrep.has(item.id);
            return (
              <button
                key={item.id}
                onClick={() => togglePrep(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all tap-scale",
                  done ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20" : "border-border hover:border-primary/40"
                )}
              >
                {done
                  ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  : <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                }
                <span className={cn("text-sm font-medium", done ? "line-through text-muted-foreground" : "text-foreground")}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* YouTube clip */}
      {youtubePosts.map(post => (
        <Card key={post.id} className={cn(
          "border-2 transition-all",
          checkedClips.has(post.id) ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10" : "border-border"
        )}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <Youtube className="h-4 w-4 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">YouTube — Long Form</p>
                <p className="text-sm font-bold text-foreground leading-snug">{post.title}</p>
              </div>
            </div>
            {batch.youtube_notes && (
              <div className="bg-muted/40 rounded-xl p-3 mb-3">
                <p className="text-xs text-muted-foreground leading-relaxed">{batch.youtube_notes}</p>
              </div>
            )}
            <div className="bg-muted/30 rounded-xl p-3 mb-3 space-y-1.5">
              <p className="text-xs font-semibold text-foreground">Recording tips:</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Record the full lesson first. Aim for 8–15 minutes. Speak slowly and clearly. You can trim in editing.
              </p>
            </div>
            <button
              onClick={() => toggleClip(post.id)}
              className={cn(
                "w-full flex items-center justify-center gap-2 h-10 rounded-xl border-2 font-semibold text-sm transition-all tap-scale",
                checkedClips.has(post.id)
                  ? "border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                  : "border-border hover:border-primary/40 text-foreground"
              )}
            >
              {checkedClips.has(post.id) ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              {checkedClips.has(post.id) ? "Clip Recorded" : "Mark as Recorded"}
            </button>
          </CardContent>
        </Card>
      ))}

      {/* TikTok clips */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 px-1">
          <Video className="h-4 w-4 text-slate-500" />
          <p className="text-sm font-semibold text-foreground">TikTok Clips ({tiktokPosts.length})</p>
          <span className="text-xs text-muted-foreground ml-auto">~3–5 min each</span>
        </div>
        {tiktokPosts.map((post, i) => (
          <Card key={post.id} className={cn(
            "border-2 transition-all",
            checkedClips.has(post.id) ? "border-green-300 dark:border-green-800 opacity-70" : "border-border"
          )}>
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-snug">{post.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Talk directly to camera, keep it under 90 seconds</p>
                </div>
                <button
                  onClick={() => toggleClip(post.id)}
                  className="shrink-0 p-1.5 rounded-xl hover:bg-muted transition-colors"
                >
                  {checkedClips.has(post.id)
                    ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                    : <Circle className="h-5 w-5 text-muted-foreground" />
                  }
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Complete button */}
      {batch.recording_completed ? (
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">Recording already marked complete</p>
              <p className="text-xs text-muted-foreground">All clips are in editing status.</p>
            </div>
            <Link href="/batch" className="ml-auto">
              <Button size="sm" variant="outline" className="rounded-xl h-8">
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Button
          onClick={handleCompleteRecording}
          disabled={saving || !allPrepDone}
          className={cn(
            "w-full h-14 rounded-2xl font-bold text-base tap-scale",
            allClipsDone ? "gradient-primary" : ""
          )}
        >
          {saving ? (
            <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Saving...</>
          ) : (
            <><Zap className="h-5 w-5 mr-2" />Complete Recording Session</>
          )}
        </Button>
      )}
      {!allPrepDone && !batch.recording_completed && (
        <p className="text-xs text-muted-foreground text-center -mt-3 pb-2">
          Check all prep items to enable this button
        </p>
      )}
    </div>
  );
}
