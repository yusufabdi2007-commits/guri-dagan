import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { BatchRecordClient } from "@/components/batch/BatchRecordClient";
import { redirect } from "next/navigation";

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekStart(): string {
  // Most recent Sunday (Sunday-based week — matches all batch week_start values in DB)
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return toLocalDate(d);
}

export default async function BatchRecordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
