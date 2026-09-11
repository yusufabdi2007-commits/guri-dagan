import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { WeeklyAssignmentClient } from "@/components/weekly-assignment/WeeklyAssignmentClient";
import { redirect } from "next/navigation";

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getNextWeekStart(): string {
  // Next Monday — week_start is Monday-based everywhere else in the app
  // (batch/plan/page.tsx, lib/seed-first-week.ts). This used to compute the
  // next Sunday instead, so a plan saved here got keyed to the wrong
  // week_start and shifted the whole week's YouTube/TikTok slots by a day.
  const d = new Date();
  const daysUntilNextMonday = ((1 - d.getDay() + 7) % 7) || 7;
  d.setDate(d.getDate() + daysUntilNextMonday);
  return toLocalDate(d);
}

interface CategoryStat {
  category: string;
  totalViews: number;
  avgViews: number;
  count: number;
  totalLikes: number;
}

export default async function WeeklyAssignmentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nextWeekStart = getNextWeekStart();

  const [{ data: perfData }, { data: recentBatches }, { data: recentPosts }] = await Promise.all([
    supabase
      .from("content_performance")
      .select("category, views, likes")
      .eq("user_id", user.id),
    supabase
      .from("weekly_batches")
      .select("theme, week_start")
      .eq("user_id", user.id)
      .order("week_start", { ascending: false })
      .limit(6),
    // Every video that's actually been posted, all-time — not just a recent
    // window. Previously this only looked at the last 40 scheduled posts
    // regardless of status, so a topic could cycle back in after ~5 weeks
    // even though the original video was already recorded and posted. A
    // completed video's topic should never be reassigned, period.
    supabase
      .from("batch_posts")
      .select("title, scheduled_date")
      .eq("user_id", user.id)
      .eq("status", "posted")
      .order("scheduled_date", { ascending: false }),
  ]);

  // Aggregate content_performance by category
  const categoryMap = new Map<string, CategoryStat>();
  for (const item of perfData || []) {
    if (!item.category) continue;
    const cat = item.category as string;
    const existing = categoryMap.get(cat) ?? {
      category: cat,
      totalViews: 0,
      avgViews: 0,
      count: 0,
      totalLikes: 0,
    };
    existing.totalViews += (item.views as number) || 0;
    existing.totalLikes += (item.likes as number) || 0;
    existing.count += 1;
    categoryMap.set(cat, existing);
  }
  for (const stat of categoryMap.values()) {
    stat.avgViews = stat.count > 0 ? Math.round(stat.totalViews / stat.count) : 0;
  }

  const categories = Array.from(categoryMap.values()).sort(
    (a, b) => b.totalViews - a.totalViews
  );

  // Best performer = highest total views
  const topCategory = categories[0]?.category ?? null;

  // Growing = highest engagement ratio (likes / views)
  const growingCategory =
    categories
      .slice()
      .sort(
        (a, b) =>
          (b.totalViews > 0 ? b.totalLikes / b.totalViews : 0) -
          (a.totalViews > 0 ? a.totalLikes / a.totalViews : 0)
      )[0]?.category ?? null;

  // Underused = lowest views but has content (last in sorted list, only if ≥3 categories)
  const underusedCategory =
    categories.length >= 3 ? (categories[categories.length - 1]?.category ?? null) : null;

  const recentThemes = (recentBatches ?? [])
    .map((b) => b.theme as string)
    .filter(Boolean);

  const recentTitles = (recentPosts ?? [])
    .map((p) => p.title as string)
    .filter(Boolean);

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Weekly Assignment"
        subtitle="Your content coach assigns next week's plan"
      />
      <WeeklyAssignmentClient
        userId={user.id}
        nextWeekStart={nextWeekStart}
        topCategory={topCategory}
        growingCategory={growingCategory}
        underusedCategory={underusedCategory}
        categories={categories.slice(0, 5)}
        recentThemes={recentThemes}
        recentTitles={recentTitles}
      />
    </div>
  );
}
