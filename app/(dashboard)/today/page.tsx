import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { TodayClient } from "@/components/today/TodayClient";
import { redirect } from "next/navigation";

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + "T12:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0];
}

// Next Monday from today (even if today is Sunday → tomorrow)
function getNextWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const isSunday = today.getDay() === 0;
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd(weekStart);
  const nextWeekStart = getNextWeekStart();
  const nextWeekEnd = getWeekEnd(nextWeekStart);

  const [
    { data: batchPost },
    { data: calendarItems },
    { data: editedIdeas },
    { data: allCompletions },
    { data: weeklyBatch },
    { data: weekBatchPosts },
    { data: nextPostRaw },
    { data: recordingPostsRaw },
  ] = await Promise.all([
    supabase
      .from("batch_posts")
      .select("id, platform, title, angle_notes, status, batch_id")
      .eq("user_id", user.id)
      .eq("scheduled_date", todayStr)
      .neq("status", "posted")
      .limit(1)
      .maybeSingle(),
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
    supabase
      .from("weekly_batches")
      .select("theme, week_start")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .maybeSingle(),
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
    // Sunday recording mode: fetch next week's batch posts
    isSunday
      ? supabase
          .from("batch_posts")
          .select("id, platform, title, angle_notes, status, sort_order")
          .eq("user_id", user.id)
          .gte("scheduled_date", nextWeekStart)
          .lte("scheduled_date", nextWeekEnd)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

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
        title={isSunday ? "Recording Day" : "Today's Post"}
        subtitle={`${greeting} — ${dateLabel}`}
      />
      <TodayClient
        batchPost={batchPost ?? null}
        calendarItems={calendarItems ?? []}
        editedIdeas={editedIdeas ?? []}
        postedToday={postedToday}
        userId={user.id}
        todayStr={todayStr}
        weeklyTheme={weeklyBatch?.theme ?? null}
        weekProgress={weekProgress}
        nextPost={nextPostRaw ?? null}
        isSunday={isSunday}
        recordingPosts={recordingPostsRaw ?? []}
        nextWeekStart={nextWeekStart}
      />
    </div>
  );
}
