import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const weekStart = getWeekStart();

  const [
    { data: completionsThisWeek },
    { data: pendingVideos },
    { data: recentIdeas },
    { data: allCompletions },
    { data: profile },
    { data: todayScheduled },
    { data: currentBatch },
  ] = await Promise.all([
    supabase
      .from("daily_completions")
      .select("*")
      .eq("user_id", user!.id)
      .gte("completed_date", weekStart),
    supabase
      .from("content_ideas")
      .select("*")
      .eq("user_id", user!.id)
      .in("status", ["Idea", "Recorded", "Edited"])
      .order("updated_at", { ascending: true })
      .limit(10),
    supabase
      .from("content_ideas")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("daily_completions")
      .select("completed_date")
      .eq("user_id", user!.id)
      .order("completed_date", { ascending: false }),
    supabase
      .from("profiles")
      .select("weekly_goal, preferred_platform, display_name")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("calendar_items")
      .select("id, title, platform, status")
      .eq("user_id", user!.id)
      .eq("scheduled_date", todayStr)
      .neq("status", "Posted"),
    supabase
      .from("weekly_batches")
      .select("id, theme, recording_completed, status")
      .eq("user_id", user!.id)
      .eq("week_start", weekStart)
      .maybeSingle(),
  ]);

  // Calculate streak
  let currentStreak = 0;
  let longestStreak = 0;
  if (allCompletions && allCompletions.length > 0) {
    const dates = [...new Set(allCompletions.map(c => c.completed_date.split("T")[0]))].sort().reverse();
    const todayStr = new Date().toISOString().split("T")[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    if (dates[0] === todayStr || dates[0] === yesterdayStr) {
      currentStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diff = (prev.getTime() - curr.getTime()) / 86400000;
        if (diff === 1) currentStreak++;
        else break;
      }
    }

    let temp = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (diff === 1) { temp++; longestStreak = Math.max(longestStreak, temp); }
      else temp = 1;
    }
    longestStreak = Math.max(longestStreak, currentStreak, 1);
  }

  const todayCompletions = allCompletions?.filter(c => {
    const d = new Date(c.completed_date).toISOString().split("T")[0];
    return d === new Date().toISOString().split("T")[0];
  }) || [];

  const weeklyGoal = profile?.weekly_goal ?? 5;
  const videosThisWeek = completionsThisWeek?.length || 0;
  const stats = {
    videos_this_week: videosThisWeek,
    pending_videos: pendingVideos?.length || 0,
    current_streak: currentStreak,
    longest_streak: longestStreak,
    total_posts: allCompletions?.length || 0,
    posted_today: todayCompletions.length > 0,
    consistency_score: Math.min(100, Math.round((videosThisWeek / weeklyGoal) * 100)),
    weekly_goal: weeklyGoal,
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Subax wanaagsan" : hour < 17 ? "Galab wanaagsan" : "Habeyn wanaagsan";

  const recordedIdeas = (pendingVideos || []).filter(v => v.status === "Recorded");
  const editedIdeas = (pendingVideos || []).filter(v => v.status === "Edited");

  // Fetch today's batch post if there's a batch this week
  let todayBatchPost: { id: string; platform: string; title: string; status: string } | null = null;
  if (currentBatch?.id) {
    const { data: batchPostData } = await supabase
      .from("batch_posts")
      .select("id, platform, title, status")
      .eq("batch_id", currentBatch.id)
      .eq("scheduled_date", todayStr)
      .neq("status", "posted")
      .limit(1)
      .maybeSingle();
    todayBatchPost = batchPostData || null;
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Dashboard" subtitle={`${greeting} — ${today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`} />
      <DashboardClient
        stats={stats}
        recentIdeas={recentIdeas || []}
        userId={user!.id}
        pendingIdeas={pendingVideos?.length || 0}
        todayScheduled={todayScheduled || []}
        recordedIdeas={recordedIdeas}
        editedIdeas={editedIdeas}
        weeklyBatch={currentBatch ? {
          theme: currentBatch.theme,
          recording_completed: currentBatch.recording_completed,
          status: currentBatch.status,
        } : null}
        todayBatchPost={todayBatchPost}
      />
    </div>
  );
}
