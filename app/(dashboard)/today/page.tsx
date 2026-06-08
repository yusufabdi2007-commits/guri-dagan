import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { TodayClient } from "@/components/today/TodayClient";
import { redirect } from "next/navigation";
import { seedFirstWeek } from "@/lib/seed-first-week";

// Returns the most recent Sunday (or today if today is Sunday)
function getWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default async function TodayPage() {
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) redirect("/login");

  // Auto-seed first week of content if user has no batches yet.
  seedFirstWeek(supabase, user.id).catch(() => {});

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, 2=Tue, ..., 6=Sat

  // Monday = recording day. All other days (including Sunday) = posting day.
  const weekPhase: "recording" | "posting" = dayOfWeek === 1 ? "recording" : "posting";

  // week_start = most recent Sunday (the first posting day of the batch)
  // Batch spans Sunday–Saturday: 3 posts on Sunday, 1 each on Tue–Sat.
  const weekStart = getWeekStart();
  const weekEnd = addDays(weekStart, 6);   // Saturday
  const nextWeekStart = addDays(weekStart, 7); // next Sunday

  const [
    { data: batchPosts },
    { data: calendarItems },
    { data: editedIdeas },
    { data: allCompletions },
    { data: weeklyBatch },
    { data: weekBatchPosts },
    { data: nextPostRaw },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    { data: _unused },
  ] = await Promise.all([
    // All unposted batch posts for today (can be multiple on Sunday)
    supabase
      .from("batch_posts")
      .select("id, platform, title, angle_notes, status, batch_id")
      .eq("user_id", user.id)
      .eq("scheduled_date", todayStr)
      .neq("status", "posted")
      .order("sort_order", { ascending: true }),
    supabase
      .from("calendar_items")
      .select("id, title, platform, status")
      .eq("user_id", user.id)
      .eq("scheduled_date", todayStr)
      .neq("status", "Posted"),
    supabase
      .from("content_ideas")
      .select("id, title, hook, platform, status")
      .eq("user_id", user.id)
      .eq("status", "Edited")
      .order("updated_at", { ascending: true })
      .limit(3),
    supabase
      .from("daily_completions")
      .select("completed_date")
      .eq("user_id", user.id)
      .eq("completed_date", todayStr),
    // Find the active batch (week_start between today-7 and today, most recent first)
    supabase
      .from("weekly_batches")
      .select("theme, week_start")
      .eq("user_id", user.id)
      .gte("week_start", addDays(todayStr, -7))
      .lte("week_start", todayStr)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // All posts in this week's batch (Sunday–Saturday) for progress counting
    supabase
      .from("batch_posts")
      .select("status")
      .eq("user_id", user.id)
      .gte("scheduled_date", weekStart)
      .lte("scheduled_date", weekEnd),
    supabase
      .from("batch_posts")
      .select("title, platform, scheduled_date")
      .eq("user_id", user.id)
      .gt("scheduled_date", todayStr)
      .neq("status", "posted")
      .order("scheduled_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    // placeholder — recording posts fetched separately below by batch_id
    Promise.resolve({ data: [] }),
  ]);

  // Monday recording mode: find the nearest upcoming batch then fetch all its posts by ID
  // (querying by date range fails if user saved for "this week" vs "next week")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recordingPostsRaw: any[] = [];
  if (weekPhase === "recording") {
    const { data: upcomingBatch } = await supabase
      .from("weekly_batches")
      .select("id, week_start")
      .eq("user_id", user.id)
      .gte("week_start", weekStart) // this Sunday or later
      .order("week_start", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (upcomingBatch) {
      const { data: rp } = await supabase
        .from("batch_posts")
        .select("id, platform, title, angle_notes, status, sort_order, scheduled_date")
        .eq("user_id", user.id)
        .eq("batch_id", upcomingBatch.id)
        .order("sort_order", { ascending: true });
      recordingPostsRaw = rp ?? [];
    }
  }

  const postedToday = (allCompletions?.length ?? 0) > 0;

  const weekProgress = weekBatchPosts && weekBatchPosts.length > 0
    ? { posted: weekBatchPosts.filter(p => p.status === "posted").length, total: weekBatchPosts.length }
    : null;

  const hour = today.getHours();
  const greeting =
    hour < 12 ? "Subax wanaagsan" : hour < 17 ? "Galab wanaagsan" : "Habeyn wanaagsan";

  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title={weekPhase === "recording" ? "Recording Day" : "Today's Post"}
        subtitle={`${greeting} — ${dateLabel}`}
      />
      <TodayClient
        batchPosts={batchPosts ?? []}
        calendarItems={calendarItems ?? []}
        editedIdeas={editedIdeas ?? []}
        postedToday={postedToday}
        userId={user.id}
        todayStr={todayStr}
        weeklyTheme={weeklyBatch?.theme ?? null}
        weekProgress={weekProgress}
        nextPost={nextPostRaw ?? null}
        weekPhase={weekPhase}
        recordingPosts={recordingPostsRaw ?? []}
        nextWeekStart={nextWeekStart}
      />
    </div>
  );
}
