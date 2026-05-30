import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { BatchRecordClient } from "@/components/batch/BatchRecordClient";
import { redirect } from "next/navigation";

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

export default async function BatchRecordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const weekStart = getWeekStart();

  const { data: batch } = await supabase
    .from("weekly_batches")
    .select("*")
    .eq("user_id", user!.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (!batch) redirect("/batch/plan");

  const { data: posts } = await supabase
    .from("batch_posts")
    .select("id, platform, title, sort_order, status")
    .eq("batch_id", batch.id)
    .order("sort_order", { ascending: true });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Recording Session" subtitle="Sit down once. Record everything." />
      <BatchRecordClient
        batch={batch}
        posts={posts || []}
        userId={user!.id}
      />
    </div>
  );
}
