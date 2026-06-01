import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { ChildrenListClient } from "@/components/children/ChildrenListClient";

export default async function ChildrenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: children }, { data: checkins }, { data: goals }, { data: enrollments }] = await Promise.all([
    supabase
      .from("child_profiles")
      .select("id, child_name, age, program, status, start_date, graduation_date, enrollment_id")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("progress_checkins")
      .select("child_id, confidence_score, resilience_score, emotional_regulation_score, communication_score, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("child_goals")
      .select("child_id, achieved")
      .eq("user_id", user!.id),
    supabase
      .from("client_enrollments")
      .select("id, parent_name")
      .eq("user_id", user!.id),
  ]);

  // Compute progress % per child
  const goalsByChild: Record<string, { total: number; achieved: number }> = {};
  for (const g of goals || []) {
    if (!goalsByChild[g.child_id]) goalsByChild[g.child_id] = { total: 0, achieved: 0 };
    goalsByChild[g.child_id].total++;
    if (g.achieved) goalsByChild[g.child_id].achieved++;
  }

  // Latest check-in per child for avg score
  const latestCheckin: Record<string, { date: string; avgScore: number }> = {};
  for (const ch of checkins || []) {
    const vals = [ch.confidence_score, ch.resilience_score, ch.emotional_regulation_score, ch.communication_score].filter((v): v is number => v != null);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    latestCheckin[ch.child_id] = { date: ch.created_at, avgScore: Math.round(avg * 10) / 10 };
  }

  const enriched = (children || []).map(child => ({
    ...child,
    progressPct: goalsByChild[child.id]
      ? Math.round((goalsByChild[child.id].achieved / goalsByChild[child.id].total) * 100)
      : 0,
    latestScore: latestCheckin[child.id]?.avgScore ?? null,
    latestCheckinDate: latestCheckin[child.id]?.date ?? null,
    parentName: enrollments?.find(e => e.id === child.enrollment_id)?.parent_name ?? null,
  }));

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Children" subtitle="Every child you are transforming" />
      <ChildrenListClient children={enriched} />
    </div>
  );
}
