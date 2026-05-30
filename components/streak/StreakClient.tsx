"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Trophy, Star, Zap, Snowflake, Calendar } from "lucide-react";
import { getStreakMessage } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Platform, DailyCompletion } from "@/types";
import { format, subDays, isSameDay } from "date-fns";
import { ConfettiEffect } from "./ConfettiEffect";
import { StreakRing } from "./StreakRing";

interface Props {
  completions: DailyCompletion[];
  currentStreak: number;
  longestStreak: number;
  totalPosts: number;
  postedToday: boolean;
  userId: string;
  freezesAvailable: number;
}

const PLATFORMS: Platform[] = ["TikTok", "YouTube", "Instagram", "Facebook"];

const MOTIVATIONAL = [
  "Families are benefiting from your consistency.",
  "Your voice matters more than you know.",
  "Keep showing up — one post at a time.",
  "1 post closer to helping another parent.",
  "Your content is changing homes.",
  "Somali families need your wisdom.",
  "Every parent you reach is a child helped.",
  "Consistency is your superpower.",
  "You are building a parenting movement.",
  "What you share today echoes for years.",
  "You don't need perfection today. Just presence.",
  "Momentum is built one day at a time — and you're building it.",
  "A struggling parent somewhere needs to hear what you know.",
  "Your consistency teaches your children more than your words.",
  "Small acts of showing up create lasting impact.",
  "The families watching you are learning by your example.",
  "Rest if you need to. But don't stop.",
];

const MILESTONES = [
  { days: 3,   label: "Getting Started",    emoji: "🌱", color: "#10b981" },
  { days: 7,   label: "7 Day Warrior",      emoji: "⚡", color: "#7c3aed" },
  { days: 14,  label: "2 Week Champion",    emoji: "🏆", color: "#f59e0b" },
  { days: 21,  label: "Habit Builder",      emoji: "🔥", color: "#ef4444" },
  { days: 30,  label: "30 Day Legend",      emoji: "🌟", color: "#7c3aed" },
  { days: 60,  label: "60 Day Icon",        emoji: "💎", color: "#06b6d4" },
  { days: 100, label: "100 Day Master",     emoji: "👑", color: "#f59e0b" },
];

export function StreakClient({
  completions,
  currentStreak: initial,
  longestStreak,
  totalPosts,
  postedToday: initialPosted,
  userId,
  freezesAvailable,
}: Props) {
  const [postedToday, setPostedToday] = useState(initialPosted);
  const [currentStreak, setCurrentStreak] = useState(initial);
  const [streakBump, setStreakBump] = useState(false);
  const [platform, setPlatform] = useState<Platform>("TikTok");
  const [loading, setLoading] = useState(false);
  const [freezing, setFreezing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [milestoneConfetti, setMilestoneConfetti] = useState(false);
  const [freezeCount, setFreezeCount] = useState(freezesAvailable);
  const router = useRouter();

  // Use a ref so the realtime callback always reads current postedToday
  // without needing it in deps (which would recreate the channel on every post)
  const postedTodayRef = useRef(postedToday);
  useEffect(() => { postedTodayRef.current = postedToday; }, [postedToday]);

  // Supabase Realtime — live streak sync across devices
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("streak-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "daily_completions", filter: `user_id=eq.${userId}` },
        (payload) => {
          const today = new Date().toISOString().split("T")[0];
          const insertedDate = (payload.new as { completed_date: string }).completed_date?.split("T")[0];
          if (insertedDate === today && !postedTodayRef.current) {
            setPostedToday(true);
            setCurrentStreak(s => s + 1);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // Only recreate if userId changes — not on every post
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const last30Days = Array.from({ length: 30 }, (_, i) => subDays(new Date(), 29 - i));
  const postedDates = new Set(completions.map(c => c.completed_date.split("T")[0]));

  // Weekly consistency (last 7 days)
  const last7 = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
  const weeklyPosts = last7.filter(d => postedDates.has(d.toISOString().split("T")[0])).length;
  const weeklyPct = Math.round((weeklyPosts / 7) * 100);

  // Monthly momentum (last 30 days)
  const monthlyPosts = last30Days.filter(d => postedDates.has(d.toISOString().split("T")[0])).length;
  const monthlyPct = Math.round((monthlyPosts / 30) * 100);

  // Next milestone
  const nextMilestone = MILESTONES.find(m => m.days > currentStreak);
  const prevMilestone = [...MILESTONES].reverse().find(m => m.days <= currentStreak);
  const milestoneProgress = nextMilestone
    ? Math.round(((currentStreak - (prevMilestone?.days || 0)) / (nextMilestone.days - (prevMilestone?.days || 0))) * 100)
    : 100;

  // Pick a motivational message based on streak
  const motivMsg = MOTIVATIONAL[currentStreak % MOTIVATIONAL.length];
  const streakMessage = getStreakMessage(currentStreak);

  async function handlePost() {
    if (postedToday || loading) return;
    setLoading(true);

    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("daily_completions").insert({
      user_id: userId,
      completed_date: today,
      platform,
    });

    if (!error) {
      const newStreak = currentStreak + 1;
      setPostedToday(true);
      setCurrentStreak(newStreak);
      setStreakBump(true);
      setTimeout(() => setStreakBump(false), 1200);

      const isMilestone = MILESTONES.some(m => m.days === newStreak);
      if (isMilestone) {
        setMilestoneConfetti(true);
        toast({ title: `${MILESTONES.find(m => m.days === newStreak)?.emoji} Milestone!`, description: MILESTONES.find(m => m.days === newStreak)?.label });
      } else {
        setShowConfetti(true);
        toast({ title: "Posted today!", description: motivMsg });
      }
      router.refresh();
    } else {
      toast({ title: "Already marked or error occurred", variant: "destructive" as never });
    }
    setLoading(false);
  }

  async function handleFreeze() {
    if (freezeCount <= 0 || freezing) return;
    setFreezing(true);
    const supabase = createClient();
    const yesterday = subDays(new Date(), 1).toISOString().split("T")[0];
    const { error } = await supabase.from("streak_freezes").insert({ user_id: userId, freeze_date: yesterday });
    if (!error) {
      setFreezeCount(f => f - 1);
      toast({ title: "Streak freeze applied!", description: "Yesterday is covered. Keep going today." });
    }
    setFreezing(false);
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      <ConfettiEffect trigger={showConfetti} />
      <ConfettiEffect trigger={milestoneConfetti} milestone />

      {/* Hero — 3 rings */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 shadow-xl">
        <CardContent className="p-6">
          {/* Rings row */}
          <div className="flex items-center justify-around mb-5">
            <div className={`flex flex-col items-center gap-1 ${streakBump ? "heartbeat" : ""}`}>
              <StreakRing value={Math.min(100, (currentStreak / Math.max(longestStreak, 1)) * 100)} size={100} strokeWidth={9} label={String(currentStreak)} sublabel="streak" color="#ffffff" />
              <span className="text-white/70 text-[10px] font-medium">Current</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <StreakRing value={weeklyPct} size={84} strokeWidth={8} label={`${weeklyPct}%`} sublabel="weekly" color="#f9a8d4" />
              <span className="text-white/70 text-[10px] font-medium">This Week</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <StreakRing value={monthlyPct} size={84} strokeWidth={8} label={`${monthlyPct}%`} sublabel="monthly" color="#a5f3fc" />
              <span className="text-white/70 text-[10px] font-medium">This Month</span>
            </div>
          </div>

          {/* Message */}
          <p className="text-white/90 text-sm italic text-center mb-5 leading-relaxed">
            &ldquo;{motivMsg}&rdquo;
          </p>

          {/* Action */}
          {postedToday ? (
            <div className="bg-white/20 rounded-2xl p-4 flex items-center gap-3 success-glow spring-in">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">You showed up today.</p>
                <p className="text-white/80 text-xs mt-0.5 leading-relaxed">Streak is safe. Come back tomorrow — consistency compounds.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Select value={platform} onValueChange={v => setPlatform(v as Platform)}>
                <SelectTrigger className="bg-white/20 border-white/30 text-white [&>svg]:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                onClick={handlePost}
                disabled={loading}
                className="w-full h-13 bg-white text-purple-700 hover:bg-white/90 font-bold text-base rounded-xl shadow-lg tap-scale btn-ripple"
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                {loading ? "Marking..." : "I Posted Today!"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Star className="h-4 w-4 text-yellow-500" />, val: longestStreak, label: "Best Streak" },
          { icon: <Trophy className="h-4 w-4 text-purple-500" />, val: totalPosts, label: "Total Posts" },
          { icon: <Snowflake className="h-4 w-4 text-blue-400" />, val: freezeCount, label: "Freezes Left" },
        ].map(({ icon, val, label }) => (
          <Card key={label}>
            <CardContent className="p-3 text-center">
              <div className="flex justify-center mb-1">{icon}</div>
              <div className="text-xl font-bold text-foreground">{val}</div>
              <div className="text-[10px] text-muted-foreground font-medium">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Streak freeze */}
      {!postedToday && currentStreak > 0 && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center shrink-0">
              <Snowflake className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Streak Freeze</p>
              <p className="text-xs text-muted-foreground">Missed yesterday? Use a freeze to protect your streak.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFreeze}
              disabled={freezeCount <= 0 || freezing}
              className="border-blue-300 text-blue-600 hover:bg-blue-100 shrink-0"
            >
              {freezeCount > 0 ? `Use (${freezeCount})` : "None left"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Next milestone */}
      {nextMilestone && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{nextMilestone.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{nextMilestone.label}</p>
                  <p className="text-xs text-muted-foreground">{nextMilestone.days - currentStreak} days to go</p>
                </div>
              </div>
              <span className="text-sm font-bold" style={{ color: nextMilestone.color }}>{milestoneProgress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${milestoneProgress}%`, background: nextMilestone.color }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* All milestones */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Milestones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {MILESTONES.map(m => {
            const achieved = longestStreak >= m.days;
            return (
              <div key={m.days} className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all",
                achieved ? "bg-primary/8" : "bg-muted/30"
              )}>
                <span className={cn("text-xl", !achieved && "grayscale opacity-50")}>{m.emoji}</span>
                <div className="flex-1">
                  <p className={cn("text-sm font-semibold", achieved ? "text-foreground" : "text-muted-foreground")}>
                    {m.label} — {m.days} days
                  </p>
                  {achieved && <p className="text-[10px] text-green-600 dark:text-green-400 font-medium">Achieved!</p>}
                </div>
                {achieved && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 30-day heatmap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Last 30 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-10 gap-1.5">
            {last30Days.map((day, i) => {
              const dateStr = day.toISOString().split("T")[0];
              const posted = postedDates.has(dateStr);
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={i}
                  title={format(day, "MMM d")}
                  className={cn(
                    "aspect-square rounded-lg transition-all",
                    isToday && !posted ? "border-2 border-primary bg-primary/10" : "",
                    isToday && posted ? "gradient-primary ring-2 ring-primary/40" : "",
                    !isToday && posted ? "bg-primary" : "",
                    !isToday && !posted ? "bg-muted" : ""
                  )}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted inline-block" /> No post</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary inline-block" /> Posted</span>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">{monthlyPosts}/30 days</span>
          </div>
        </CardContent>
      </Card>

      {/* Recent posts */}
      {completions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {completions.slice(0, 7).map(c => (
              <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm text-foreground">{format(new Date(c.completed_date), "EEE, MMM d")}</span>
                </div>
                <span className="text-xs bg-muted px-2 py-1 rounded-lg font-medium">{c.platform}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
