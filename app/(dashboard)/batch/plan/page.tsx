import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { BatchPlanClient } from "@/components/batch/BatchPlanClient";

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

export default async function BatchPlanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const weekStart = getWeekStart();

  const { data: existingBatch } = await supabase
    .from("weekly_batches")
    .select("id")
    .eq("user_id", user!.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Plan Your Week" subtitle="One theme. One session. All week covered." />
      <BatchPlanClient
        userId={user!.id}
        existingBatchId={existingBatch?.id || null}
        weekStart={weekStart}
      />
    </div>
  );
}
