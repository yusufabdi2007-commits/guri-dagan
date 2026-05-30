import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { BatchHubClient } from "@/components/batch/BatchHubClient";

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

export default async function BatchPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const weekStart = getWeekStart();
  const todayStr = new Date().toISOString().split("T")[0];

  const { data: batch } = await supabase
    .from("weekly_batches")
    .select("*")
    .eq("user_id", user!.id)
    .eq("week_start", weekStart)
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
