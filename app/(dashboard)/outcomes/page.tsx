import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { OutcomesClient } from "@/components/outcomes/OutcomesClient";
import { PROGRAM_NAMES } from "@/lib/programs";

export default async function OutcomesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: children },
    { data: checkins },
    { data: milestones },
    { data: stories },
    { data: goals },
    { data: leads },
    { data: enrollments },
    { data: payments },
  ] = await Promise.all([
    supabase.from("child_profiles").select("*").eq("user_id", user!.id),
    supabase.from("progress_checkins").select("*").eq("user_id", user!.id).order("created_at", { ascending: true }),
    supabase.from("milestones").select("*").eq("user_id", user!.id),
    supabase.from("success_stories").select("*").eq("user_id", user!.id),
    supabase.from("child_goals").select("*").eq("user_id", user!.id),
    supabase.from("leads").select("program").eq("user_id", user!.id),
    supabase.from("client_enrollments").select("id, program, status").eq("user_id", user!.id),
    supabase.from("payments").select("amount, payment_status, client_enrollments(program)").eq("user_id", user!.id).eq("payment_status", "paid"),
  ]);

  const allChildren = children || [];
  const allCheckins = checkins || [];

  function avgScores(c: { confidence_score?: number | null; resilience_score?: number | null; emotional_regulation_score?: number | null; communication_score?: number | null }) {
    const vals = [c.confidence_score, c.resilience_score, c.emotional_regulation_score, c.communication_score].filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }

  const programOutcomes = PROGRAM_NAMES.map(prog => {
    const progChildren = allChildren.filter(c => c.program === prog);
    const active = progChildren.filter(c => c.status === "active").length;
    const graduated = progChildren.filter(c => c.status === "graduated").length;

    let improvements: number[] = [];
    for (const child of progChildren) {
      const childCheckins = allCheckins.filter(ch => ch.child_id === child.id);
      if (childCheckins.length < 2) continue;
      const first = avgScores(childCheckins[0]);
      const last = avgScores(childCheckins[childCheckins.length - 1]);
      if (first > 0) improvements.push(Math.round(((last - first) / first) * 100));
    }
    const avgImprovement = improvements.length > 0
      ? Math.round(improvements.reduce((a, b) => a + b, 0) / improvements.length)
      : 0;

    const progMilestones = (milestones || []).filter(m => progChildren.some(c => c.id === m.child_id));
    const topOutcomes = [...new Set(progMilestones.map((m: { title: string }) => m.title))].slice(0, 3) as string[];

    const testimonialCount = (stories || []).filter(s => s.status === "published" && progChildren.some(c => c.id === s.child_id)).length;
    const totalLeads = (leads || []).filter(l => l.program === prog).length;
    const totalClients = (enrollments || []).filter(e => e.program === prog).length;
    const totalRevenue = (payments || [])
      .filter(p => (p.client_enrollments as { program?: string } | null)?.program === prog)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // Goals achieved for this program's children
    const progGoals = (goals || []).filter(g => progChildren.some(c => c.id === g.child_id));
    const goalsAchieved = progGoals.filter(g => g.achieved).length;

    return {
      program: prog,
      activeChildren: active,
      graduates: graduated,
      avgImprovement,
      topOutcomes,
      testimonialCount,
      totalLeads,
      totalClients,
      totalRevenue,
      goalsAchieved,
      totalGoals: progGoals.length,
    };
  });

  const overall = {
    totalChildren: allChildren.length,
    totalActive: allChildren.filter(c => c.status === "active").length,
    totalGraduated: allChildren.filter(c => c.status === "graduated").length,
    totalMilestones: (milestones || []).length,
    publishedStories: (stories || []).filter(s => s.status === "published").length,
    goalsAchieved: (goals || []).filter(g => g.achieved).length,
    totalGoals: (goals || []).length,
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Program Outcomes" subtitle="Proven results per program" />
      <OutcomesClient programOutcomes={programOutcomes} overall={overall} />
    </div>
  );
}
