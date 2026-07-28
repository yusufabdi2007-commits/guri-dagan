import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { BatchPlanClient } from "@/components/batch/BatchPlanClient";

export const dynamic = "force-dynamic";

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekStart(): string {
  // Monday-based week start — must match client formula everywhere
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toLocalDate(d);
}

export default async function BatchPlanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const weekStart = getWeekStart();

  const [{ data: existingBatch }, { data: pastBatches }, { data: recentPosts }] = await Promise.all([
    supabase
      .from("weekly_batches")
      .select("id")
      .eq("user_id", user!.id)
      .eq("week_start", weekStart)
      .maybeSingle(),
    supabase
      .from("weekly_batches")
      .select("id, week_start, theme, status, recording_completed, created_at")
      .eq("user_id", user!.id)
      .order("week_start", { ascending: false })
      .limit(10),
    supabase
      .from("batch_posts")
      .select("title, scheduled_date")
      .eq("user_id", user!.id)
      .order("scheduled_date", { ascending: false })
      .limit(40),
  ]);

  const recentTitles = (recentPosts ?? [])
    .map((p) => p.title as string)
    .filter(Boolean);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Plan Your Week" subtitle="One theme. One session. All week covered." />
      <BatchPlanClient
        userId={user!.id}
        existingBatchId={existingBatch?.id || null}
        weekStart={weekStart}
        pastBatches={pastBatches || []}
        recentTitles={recentTitles}
      />
    </div>
  );
}
