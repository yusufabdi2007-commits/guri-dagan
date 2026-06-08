import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { StrategistClient } from "@/components/strategist/StrategistClient";

export default async function StrategistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
    { data: enrollmentData },
    { data: paymentData },
    { data: childProfilesData },
    { data: checkinsData },
    { data: milestonesData },
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
    supabase
      .from("client_enrollments")
      .select("id, program, status")
      .eq("user_id", user!.id),
    supabase
      .from("payments")
      .select("amount, payment_status, client_enrollments(program)")
      .eq("user_id", user!.id)
      .eq("payment_status", "paid"),
    supabase
      .from("child_profiles")
      .select("id, program, status")
      .eq("user_id", user!.id),
    supabase
      .from("progress_checkins")
      .select("child_id, confidence_score, resilience_score, emotional_regulation_score, communication_score, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("milestones")
      .select("child_id")
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

  // Enrollment + revenue data for strategist
  const totalEnrollments = (enrollmentData || []).length;
  const activeEnrollments = (enrollmentData || []).filter(e => e.status === "active").length;

  const revenueByProgram: Record<string, number> = {};
  for (const p of paymentData || []) {
    const prog = (p.client_enrollments as { program?: string | null } | null)?.program ?? "Unknown";
    revenueByProgram[prog] = (revenueByProgram[prog] || 0) + p.amount;
  }
  const totalRevenue = Object.values(revenueByProgram).reduce((a, b) => a + b, 0);
  const topRevenueProgram = Object.entries(revenueByProgram).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const programRevenueSummary = Object.entries(revenueByProgram)
    .sort((a, b) => b[1] - a[1])
    .map(([prog, amt]) => ({ program: prog, revenue: amt }));

  // Child outcome data for AI Strategist
  function avgCheckinScore(c: { confidence_score?: number | null; resilience_score?: number | null; emotional_regulation_score?: number | null; communication_score?: number | null }) {
    const vals = [c.confidence_score, c.resilience_score, c.emotional_regulation_score, c.communication_score].filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }

  const totalChildren = (childProfilesData || []).length;
  const activeChildren = (childProfilesData || []).filter(c => c.status === "active").length;
  const graduatedChildren = (childProfilesData || []).filter(c => c.status === "graduated").length;
  const totalMilestones = (milestonesData || []).length;

  // Avg improvement across all children with 2+ check-ins
  let allImprovements: number[] = [];
  for (const child of childProfilesData || []) {
    const childCheckins = (checkinsData || []).filter(ch => ch.child_id === child.id);
    if (childCheckins.length < 2) continue;
    const first = avgCheckinScore(childCheckins[0]);
    const last = avgCheckinScore(childCheckins[childCheckins.length - 1]);
    if (first > 0) allImprovements.push(Math.round(((last - first) / first) * 100));
  }
  const avgChildImprovement = allImprovements.length > 0
    ? Math.round(allImprovements.reduce((a, b) => a + b, 0) / allImprovements.length)
    : 0;

  // Best performing program by avg improvement
  const programImprovements: Record<string, number[]> = {};
  for (const child of childProfilesData || []) {
    if (!child.program) continue;
    const childCheckins = (checkinsData || []).filter(ch => ch.child_id === child.id);
    if (childCheckins.length < 2) continue;
    const first = avgCheckinScore(childCheckins[0]);
    const last = avgCheckinScore(childCheckins[childCheckins.length - 1]);
    if (first > 0) {
      if (!programImprovements[child.program]) programImprovements[child.program] = [];
      programImprovements[child.program].push(Math.round(((last - first) / first) * 100));
    }
  }
  const bestImprovementProgram = Object.entries(programImprovements)
    .map(([prog, imps]) => ({ prog, avg: Math.round(imps.reduce((a, b) => a + b, 0) / imps.length) }))
    .sort((a, b) => b.avg - a.avg)[0]?.prog ?? null;

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
        totalEnrollments={totalEnrollments}
        activeEnrollments={activeEnrollments}
        totalRevenue={totalRevenue}
        topRevenueProgram={topRevenueProgram}
        programRevenueSummary={programRevenueSummary}
        totalChildren={totalChildren}
        activeChildren={activeChildren}
        graduatedChildren={graduatedChildren}
        avgChildImprovement={avgChildImprovement}
        totalMilestones={totalMilestones}
        bestImprovementProgram={bestImprovementProgram}
        userId={user!.id}
      />
    </div>
  );
}
