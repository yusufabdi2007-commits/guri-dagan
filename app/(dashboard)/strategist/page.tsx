import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { StrategistClient } from "@/components/strategist/StrategistClient";

export default async function StrategistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayOfWeek = days[today.getDay()];

  const [
    { data: allCompletions },
    { data: todayCompletions },
    { data: weekCompletions },
    { data: ideas },
    { data: profile },
    { data: recentVideos },
    { data: tiktokPosts },
    { data: contentMemory },
    { data: hookScores },
    { data: categoryPerf },
    { data: leadsData },
    { data: attributionData },
  ] = await Promise.all([
    supabase
      .from("daily_completions")
      .select("completed_date")
      .eq("user_id", user!.id)
      .order("completed_date", { ascending: false }),
    supabase
      .from("daily_completions")
      .select("id")
      .eq("user_id", user!.id)
      .eq("completed_date", todayStr),
    supabase
      .from("daily_completions")
      .select("completed_date")
      .eq("user_id", user!.id)
      .gte("completed_date", weekStartStr),
    supabase
      .from("content_ideas")
      .select("category, status")
      .eq("user_id", user!.id),
    supabase
      .from("profiles")
      .select("weekly_goal")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("videos")
      .select("title, platform, emotional_tags, views, likes, posted_at")
      .eq("user_id", user!.id)
      .not("posted_at", "is", null)
      .order("posted_at", { ascending: false })
      .limit(15),
    supabase
      .from("tiktok_posts")
      .select("hook_text, emotional_tag, views, likes, completion_rate, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("content_memory")
      .select("topic, avg_views, avg_engagement, emotional_style, best_performing")
      .eq("user_id", user!.id)
      .order("avg_views", { ascending: false })
      .limit(15),
    supabase
      .from("hook_scores")
      .select("hook_text, total_score")
      .eq("user_id", user!.id)
      .order("total_score", { ascending: false })
      .limit(5),
    supabase
      .from("content_performance")
      .select("category, views, likes, published_at")
      .eq("user_id", user!.id)
      .eq("platform", "youtube")
      .order("published_at", { ascending: false }),
    supabase
      .from("leads")
      .select("stage, source, created_at")
      .eq("user_id", user!.id),
    supabase
      .from("content_attribution")
      .select("content_category, lead_id")
      .eq("user_id", user!.id),
  ]);

  // Calculate streak
  let streak = 0;
  if (allCompletions && allCompletions.length > 0) {
    const dates = [
      ...new Set(allCompletions.map((c) => c.completed_date.split("T")[0])),
    ]
      .sort()
      .reverse();
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (dates[0] === todayStr || dates[0] === yesterdayStr) {
      streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const diff =
          (new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) /
          86400000;
        if (diff === 1) streak++;
        else break;
      }
    }
  }

  // Calculate missed days in last 14 days
  let missedDays = 0;
  if (allCompletions) {
    const postedDates = new Set(
      allCompletions.map((c) => c.completed_date.split("T")[0])
    );
    for (let i = 1; i <= 14; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      if (!postedDates.has(d)) missedDays++;
    }
  }

  // Calculate consistency (last 30 days)
  const postedDates30 = new Set(
    (allCompletions || [])
      .map((c) => c.completed_date.split("T")[0])
      .filter((d) => {
        const diff = (Date.now() - new Date(d).getTime()) / 86400000;
        return diff <= 30;
      })
  );
  const consistency = Math.round((postedDates30.size / 30) * 100);

  // Top categories
  const categoryCounts: Record<string, number> = {};
  (ideas || []).forEach((i) => {
    if (i.category) categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const pendingIdeas =
    (ideas || []).filter((i) => ["Idea", "Recorded", "Edited"].includes(i.status)).length;

  // Build category performance summary for the strategist
  const catMap: Record<string, { totalViews: number; count: number; recentViews: number }> = {};
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  for (const row of categoryPerf || []) {
    if (!catMap[row.category]) catMap[row.category] = { totalViews: 0, count: 0, recentViews: 0 };
    catMap[row.category].totalViews += row.views;
    catMap[row.category].count += 1;
    if (row.published_at && new Date(row.published_at) >= thirtyDaysAgo) {
      catMap[row.category].recentViews += row.views;
    }
  }
  const categoryInsights = Object.entries(catMap)
    .map(([category, s]) => ({
      category,
      avgViews: s.count > 0 ? Math.round(s.totalViews / s.count) : 0,
      count: s.count,
      recentViews: s.recentViews,
    }))
    .sort((a, b) => b.avgViews - a.avgViews)
    .slice(0, 7);

  // Lead + conversion data for strategist
  const totalLeads = (leadsData || []).length;
  const clientLeadIds = new Set(
    (leadsData || []).filter(l => l.stage === "client").map((_, i) => i) // just count
  );
  const clientCount = (leadsData || []).filter(l => l.stage === "client").length;
  const callCount = (leadsData || []).filter(l => l.stage === "call_scheduled" || l.stage === "call_completed").length;
  const conversionRate = totalLeads > 0 ? Math.round((clientCount / totalLeads) * 100) : 0;

  // Top lead-generating categories
  const leadCatMap: Record<string, number> = {};
  (attributionData || []).forEach(a => {
    if (a.content_category) leadCatMap[a.content_category] = (leadCatMap[a.content_category] || 0) + 1;
  });
  const topLeadCategories = Object.entries(leadCatMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, leads]) => ({ category, leads }));

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="AI Strategist"
        subtitle="Your intelligent content companion"
      />
      <StrategistClient
        streak={streak}
        totalPosts={allCompletions?.length || 0}
        postedToday={(todayCompletions?.length || 0) > 0}
        consistency={consistency}
        weeklyGoal={profile?.weekly_goal ?? 5}
        videosThisWeek={weekCompletions?.length || 0}
        dayOfWeek={dayOfWeek}
        pendingIdeas={pendingIdeas}
        missedDays={missedDays}
        recentVideos={recentVideos || []}
        tiktokPosts={tiktokPosts || []}
        contentMemory={contentMemory || []}
        topCategories={topCategories}
        bestHooks={hookScores || []}
        categoryInsights={categoryInsights}
        totalLeads={totalLeads}
        clientCount={clientCount}
        callCount={callCount}
        conversionRate={conversionRate}
        topLeadCategories={topLeadCategories}
        userId={user!.id}
      />
    </div>
  );
}
