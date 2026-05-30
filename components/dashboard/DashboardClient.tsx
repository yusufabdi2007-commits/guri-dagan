"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Flame, TrendingUp, Video, Lightbulb, CheckCircle2,
  Sparkles, Plus, ArrowRight, Trophy, Target, CalendarRange, Youtube, Mic2
} from "lucide-react";
import { getStreakMessage, getStatusColor, getPlatformColor } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { ContentIdea } from "@/types";
import Link from "next/link";
import { ContinueWorking } from "@/components/dashboard/ContinueWorking";

// Lazy-load AI cards — they fire API calls on mount so defer until after
// the critical dashboard content is painted
const CoachCard = dynamic(
  () => import("@/components/dashboard/CoachCard").then(m => ({ default: m.CoachCard })),
  { ssr: false, loading: () => <div className="h-36 rounded-2xl bg-muted/40 animate-pulse" /> }
);
const MomentumCard = dynamic(
  () => import("@/components/dashboard/MomentumCard").then(m => ({ default: m.MomentumCard })),
  { ssr: false, loading: () => <div className="h-48 rounded-2xl bg-muted/40 animate-pulse" /> }
);

interface Stats {
  videos_this_week: number;
  pending_videos: number;
  current_streak: number;
  longest_streak: number;
  total_posts: number;
  posted_today: boolean;
  consistency_score: number;
  weekly_goal: number;
}

interface CalendarItem {
  id: string;
  title: string;
  platform: string;
  status: string;
}

interface WorkIdea {
  id: string;
  title: string;
  platform: string;
  status: string;
}

interface WeeklyBatchSummary {
  theme: string;
  recording_completed: boolean;
  status: string;
}

interface TodayBatchPost {
  id: string;
  platform: string;
  title: string;
  status: string;
}

interface Props {
  stats: Stats;
  recentIdeas: ContentIdea[];
  userId: string;
  pendingIdeas?: number;
  todayScheduled?: CalendarItem[];
  recordedIdeas?: WorkIdea[];
  editedIdeas?: WorkIdea[];
  weeklyBatch?: WeeklyBatchSummary | null;
  todayBatchPost?: TodayBatchPost | null;
}

export function DashboardClient({
  stats, recentIdeas, userId, pendingIdeas = 0,
  todayScheduled = [], recordedIdeas = [], editedIdeas = [],
  weeklyBatch = null, todayBatchPost = null,
}: Props) {
  const [postedToday, setPostedToday] = useState(stats.posted_today);
  const [currentStreak, setCurrentStreak] = useState(stats.current_streak);
  const [marking, setMarking] = useState(false);
  const router = useRouter();

  async function handleMarkPosted() {
    if (postedToday || marking) return;
    setMarking(true);

    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    const { error } = await supabase.from("daily_completions").insert({
      user_id: userId,
      completed_date: today,
      platform: "TikTok",
    });

    if (error) {
      toast({
        title: "Could not save — please try again",
        description: "Your streak wasn't recorded. Check your connection.",
        variant: "destructive" as never,
      });
    } else {
      setPostedToday(true);
      setCurrentStreak(prev => prev + 1);
      toast({
        title: "Posted today!",
        description: getStreakMessage(currentStreak + 1),
        variant: "success" as never,
      });
      router.refresh();
    }
    setMarking(false);
  }

  const streakMessage = getStreakMessage(currentStreak);

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Streak Hero Card */}
      <Card className={`relative overflow-hidden border-0 shadow-lg ${
        postedToday ? "gradient-primary" : "gradient-warm"
      }`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="text-white">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="h-5 w-5" />
                <span className="text-sm font-medium opacity-90">Current Streak</span>
              </div>
              <div className="text-5xl font-bold mb-1">{currentStreak}</div>
              <div className="text-sm font-medium opacity-90 mb-1">
                {currentStreak === 1 ? "day" : "days"} consistent
              </div>
              <p className="text-xs opacity-80 max-w-[200px] leading-relaxed">
                {streakMessage}
              </p>
            </div>
            <div className="text-right text-white">
              <div className="text-xs opacity-80 mb-1">Best</div>
              <div className="text-2xl font-bold">{stats.longest_streak}</div>
              <Trophy className="h-5 w-5 opacity-80 ml-auto mt-1" />
            </div>
          </div>

          {/* Post today button */}
          <div className="mt-4">
            {postedToday ? (
              <div className="flex items-center gap-2 bg-white/20 rounded-xl px-4 py-3 success-glow spring-in">
                <CheckCircle2 className="h-5 w-5 text-white" />
                <div>
                  <span className="text-white font-semibold text-sm block">You showed up today.</span>
                  <span className="text-white/70 text-xs">Momentum is building.</span>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleMarkPosted}
                disabled={marking}
                className="w-full bg-white text-purple-700 hover:bg-white/90 h-12 font-bold rounded-xl shadow-lg tap-scale btn-ripple"
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                {marking ? "Marking..." : "Mark Posted Today"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Continue Working */}
      <ContinueWorking
        todayScheduled={todayScheduled}
        recordedIdeas={recordedIdeas}
        editedIdeas={editedIdeas}
        postedToday={postedToday}
      />

      {/* Weekly Batch — today's specific post */}
      {(weeklyBatch || todayBatchPost) && (
        <Link href="/batch">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 tap-scale transition-all hover:bg-primary/10">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CalendarRange className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                {todayBatchPost ? (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground mb-0.5">
                      Today&apos;s scheduled post
                    </p>
                    <p className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                      {todayBatchPost.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {todayBatchPost.platform === "youtube"
                        ? <Youtube className="h-3 w-3 text-red-500" />
                        : <Video className="h-3 w-3 text-slate-500" />
                      }
                      <span className="text-xs text-muted-foreground capitalize">{todayBatchPost.platform}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground mb-0.5">This week&apos;s theme</p>
                    <p className="text-sm font-bold text-foreground leading-snug line-clamp-1">{weeklyBatch!.theme}</p>
                    {!weeklyBatch!.recording_completed && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Mic2 className="h-3 w-3 text-amber-500" />
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Recording not yet done</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
            </div>
          </div>
        </Link>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Video className="h-5 w-5 text-blue-500" />}
          label="This Week"
          value={stats.videos_this_week}
          suffix="posts"
          color="blue"
        />
        <StatCard
          icon={<Lightbulb className="h-5 w-5 text-yellow-500" />}
          label="Pending"
          value={stats.pending_videos}
          suffix="ideas"
          color="yellow"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-green-500" />}
          label="Total Posts"
          value={stats.total_posts}
          suffix="all time"
          color="green"
        />
        <StatCard
          icon={<Target className="h-5 w-5 text-purple-500" />}
          label="Consistency"
          value={stats.consistency_score}
          suffix="%"
          color="purple"
          isScore
        />
      </div>

      {/* Consistency Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Weekly Goal ({stats.weekly_goal} posts)</span>
            <span className="text-sm font-bold text-primary">{stats.videos_this_week}/{stats.weekly_goal}</span>
          </div>
          <Progress value={stats.consistency_score} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            {stats.consistency_score >= 100
              ? "Goal achieved this week! Amazing work."
              : `${stats.weekly_goal - stats.videos_this_week} more posts to hit your weekly goal`}
          </p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/generator">
          <button className="w-full h-14 flex flex-col items-center justify-center gap-1 text-xs font-semibold rounded-2xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-all duration-200 tap-scale">
            <Sparkles className="h-5 w-5" />
            Generate Content
          </button>
        </Link>
        <Link href="/ideas">
          <button className="w-full h-14 flex flex-col items-center justify-center gap-1 text-xs font-semibold rounded-2xl border-2 border-border bg-muted/30 hover:bg-muted text-foreground transition-all duration-200 tap-scale">
            <Plus className="h-5 w-5 text-primary" />
            Add New Idea
          </button>
        </Link>
      </div>

      {/* Recent Ideas */}
      {recentIdeas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Ideas</CardTitle>
              <Link href="/ideas" className="text-xs text-primary flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {recentIdeas.map((idea) => (
              <div key={idea.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-1">{idea.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{idea.hook}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${getStatusColor(idea.status)}`}>
                    {idea.status}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${getPlatformColor(idea.platform)}`}>
                    {idea.platform}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Daily Momentum Card */}
      <MomentumCard
        streak={currentStreak}
        totalPosts={stats.total_posts}
        postedToday={postedToday}
        consistency={stats.consistency_score}
        pendingIdeas={pendingIdeas}
        weeklyGoal={stats.weekly_goal}
        videosThisWeek={stats.videos_this_week}
        userId={userId}
      />

      {/* AI Coach Card */}
      <CoachCard
        streak={currentStreak}
        totalPosts={stats.total_posts}
        postedToday={postedToday}
        consistency={stats.consistency_score}
        pendingIdeas={stats.pending_videos}
        weeklyGoal={stats.weekly_goal}
      />
    </div>
  );
}

function StatCard({
  icon, label, value, suffix, color, isScore
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix: string;
  color: string;
  isScore?: boolean;
}) {
  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground">{value}</span>
          <span className="text-xs text-muted-foreground">{suffix}</span>
        </div>
      </CardContent>
    </Card>
  );
}
