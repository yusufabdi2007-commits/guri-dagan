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

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const weekStart = getWeekStart();

  const [
    { data: batchPost },
    { data: calendarItems },
    { data: editedIdeas },
    { data: allCompletions },
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
  ]);

  const postedToday = (allCompletions?.length ?? 0) > 0;

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
      <Header title="Today's Post" subtitle={`${greeting} — ${dateLabel}`} />
      <TodayClient
        batchPost={batchPost ?? null}
        calendarItems={calendarItems ?? []}
        editedIdeas={editedIdeas ?? []}
        postedToday={postedToday}
        userId={user.id}
        todayStr={todayStr}
      />
    </div>
  );
}
