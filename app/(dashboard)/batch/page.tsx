import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { BatchHubClient } from "@/components/batch/BatchHubClient";

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default async function BatchPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const todayStr = new Date().toISOString().split("T")[0];

  // Find the active batch: week_start is the Sunday that started the current posting week.
  // Batch spans Sunday–Saturday (7 days). Search from up to 6 days ago to today.
  const { data: batch } = await supabase
    .from("weekly_batches")
    .select("*")
    .eq("user_id", user!.id)
    .gte("week_start", addDays(todayStr, -6))
    .lte("week_start", todayStr)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: posts } = batch
    ? await supabase
        .from("batch_posts")
        .select("id, batch_id, scheduled_date, platform, title, sort_order, status, posted_at")
        .eq("batch_id", batch.id)
        .order("scheduled_date", { ascending: true })
        .order("sort_order", { ascending: true })
    : { data: [] };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Weekly Batch" subtitle="Record once. Post all week." />
      <BatchHubClient
        batch={batch || null}
        posts={posts || []}
        todayStr={todayStr}
        userId={user!.id}
      />
    </div>
  );
}
