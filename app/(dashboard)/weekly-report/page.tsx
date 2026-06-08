import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { WeeklyReportClient } from "@/components/weekly-report/WeeklyReportClient";

export default async function WeeklyReportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: completions },
    { data: ideas },
    { data: allCompletions },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("daily_completions")
      .select("completed_date, platform")
      .eq("user_id", user!.id)
      .order("completed_date", { ascending: false }),
    supabase
      .from("content_ideas")
      .select("category, status")
      .eq("user_id", user!.id),
    supabase
      .from("daily_completions")
      .select("completed_date")
      .eq("user_id", user!.id)
      .order("completed_date", { ascending: false }),
    supabase
      .from("profiles")
      .select("weekly_goal")
      .eq("id", user!.id)
      .single(),
  ]);

  // Calculate current streak
  let streak = 0;
  if (allCompletions && allCompletions.length > 0) {
    const dates = [...new Set(allCompletions.map(c => c.completed_date.split("T")[0]))].sort().reverse();
    const todayStr = new Date().toISOString().split("T")[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (dates[0] === todayStr || dates[0] === yesterdayStr) {
      streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const diff = (new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) / 86400000;
        if (diff === 1) streak++;
        else break;
      }
    }
  }

  const pendingIdeas = ideas?.filter(i => ["Idea", "Recorded", "Edited"].includes(i.status)).length || 0;

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Weekly Report"
        subtitle="AI-powered creator intelligence"
      />
      <WeeklyReportClient
        completions={completions || []}
        ideas={ideas || []}
        streak={streak}
        totalPosts={allCompletions?.length || 0}
        weeklyGoal={profile?.weekly_goal ?? 5}
        pendingIdeas={pendingIdeas}
        userId={user!.id}
      />
    </div>
  );
}
