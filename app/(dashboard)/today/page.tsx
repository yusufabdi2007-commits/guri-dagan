import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { TodayClient } from "@/components/today/TodayClient";
import { redirect } from "next/navigation";
import { seedFirstWeek } from "@/lib/seed-first-week";

// User timezone — set USER_TIMEZONE env var to override (e.g. "America/New_York").
// Defaults to Europe/London (UK). Ensures correct date even when Vercel server runs UTC.
const TZ = process.env.USER_TIMEZONE || "Europe/London";

// Returns "YYYY-MM-DD" in the user's local timezone (never UTC offset bugs).
function toLocalDate(d: Date): string {
  // en-CA locale formats as "YYYY-MM-DD" natively
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

// Returns the most recent Monday (or today if today is Monday) in the user's timezone.
function getWeekStart(): string {
  const now = new Date();
  const todayStr = toLocalDate(now);
  // Build a noon-UTC anchor for the local date so getDay() is unambiguous
  const noon = new Date(todayStr + "T12:00:00");
  const dow = noon.getDay(); // 0=Sun..6=Sat
  const daysBack = (dow + 6) % 7; // 0 on Mon, 1 on Tue, ... 6 on Sun
  noon.setDate(noon.getDate() - daysBack);
  return toLocalDate(noon);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return toLocalDate(d);
}

export default async function TodayPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Auto-seed first week of content if user has no batches yet.
  seedFirstWeek(supabase, user.id).catch(() => {});

  const now = new Date();
  const todayStr = toLocalDate(now);
  // Compute day-of-week from the local date string (noon UTC = correct day)
  const dayOfWeek = new Date(todayStr + "T12:00:00").getDay(); // 0=Sun, 1=Mon, 2=Tue, ..., 6=Sat

  // week_start = most recent Monday (the first posting day of the batch)
  // Batch spans Monday–Sunday: Mon×TikTok#1, Tue×TikTok#2, Wed×TikTok#3+YouTube,
  //   Thu×TikTok#4, Fri×TikTok#5, Sat×TikTok#6, Sun×TikTok#7.
  const weekStart = getWeekStart();
  const weekEnd = addDays(weekStart, 6);    // Sunday
  const nextWeekStart = addDays(weekStart, 7); // next Monday

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
    // All unposted batch posts for today (can be multiple on Wednesday: TikTok + YouTube)
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
    // All posts in this week's batch (Monday–Sunday) for progress counting
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

  // Monday recording mode: find next week's batch then fetch all its posts by ID
  // (Monday is posting day + recording day for NEXT week)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recordingPostsRaw: any[] = [];
  if (dayOfWeek === 1) {
    const { data: upcomingBatch } = await supabase
      .from("weekly_batches")
      .select("id, week_start")
      .eq("user_id", user.id)
      .gte("week_start", addDays(weekStart, 7)) // next Monday or later
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

  const hour = parseInt(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", hour12: false }).format(now)
  );
  const greeting =
    hour < 12 ? "Subax wanaagsan" : hour < 17 ? "Galab wanaagsan" : "Habeyn wanaagsan";

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Today's Post"
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
        dayOfWeek={dayOfWeek}
        recordingPosts={recordingPostsRaw ?? []}
        nextWeekStart={nextWeekStart}
      />
    </div>
  );
}
