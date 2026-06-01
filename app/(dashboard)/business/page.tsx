import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { BusinessDashboardClient } from "@/components/business/BusinessDashboardClient";

export default async function BusinessPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: leads },
    { data: attribution },
    { data: performance },
    { data: consultations },
    { data: enrollments },
    { data: children },
    { data: checkins },
    { data: milestones },
    { data: payments },
  ] = await Promise.all([
    supabase.from("leads").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
    supabase.from("content_attribution").select("id, lead_id, content_category, youtube_video_id, video_title, tiktok_topic").eq("user_id", user!.id),
    supabase.from("content_performance").select("category, views, published_at").eq("user_id", user!.id).eq("platform", "youtube"),
    supabase.from("consultations").select("id, outcome").eq("user_id", user!.id),
    supabase.from("client_enrollments").select("id, program, status").eq("user_id", user!.id),
    supabase.from("child_profiles").select("id, program, status").eq("user_id", user!.id),
    supabase.from("progress_checkins").select("child_id, confidence_score, resilience_score, emotional_regulation_score, communication_score, created_at").eq("user_id", user!.id).order("created_at", { ascending: true }),
    supabase.from("milestones").select("child_id").eq("user_id", user!.id),
    supabase.from("payments").select("amount, payment_status, client_enrollments(program)").eq("user_id", user!.id).eq("payment_status", "paid"),
  ]);

  const allConsultations = consultations || [];
  const allEnrollments = enrollments || [];

  const consultationStats = {
    total: allConsultations.length,
    enrolled: allConsultations.filter(c => c.outcome === "enrolled").length,
    followUp: allConsultations.filter(c => c.outcome === "follow_up" || c.outcome === "no_show").length,
  };

  const clientsByProgram: Record<string, number> = {};
  for (const e of allEnrollments) {
    const prog = e.program ?? "Unknown";
    clientsByProgram[prog] = (clientsByProgram[prog] || 0) + 1;
  }

  // Program results: leads, clients, revenue, child outcomes per program
  function avgCheckin(c: { confidence_score?: number | null; resilience_score?: number | null; emotional_regulation_score?: number | null; communication_score?: number | null }) {
    const vals = [c.confidence_score, c.resilience_score, c.emotional_regulation_score, c.communication_score].filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }

  const programResultsMap: Record<string, { totalLeads: number; totalClients: number; totalRevenue: number; activeChildren: number; graduates: number; avgImprovement: number; milestoneCount: number }> = {};
  const allPrograms = new Set([
    ...(leads || []).map(l => l.program).filter(Boolean),
    ...(allEnrollments).map(e => e.program).filter(Boolean),
    ...(children || []).map(c => c.program).filter(Boolean),
  ]) as Set<string>;

  for (const prog of allPrograms) {
    const progLeads = (leads || []).filter(l => l.program === prog).length;
    const progClients = allEnrollments.filter(e => e.program === prog).length;
    const progRevenue = (payments || [])
      .filter(p => (p.client_enrollments as { program?: string } | null)?.program === prog)
      .reduce((s, p) => s + (p.amount || 0), 0);
    const progChildren = (children || []).filter(c => c.program === prog);
    const activeChildren = progChildren.filter(c => c.status === "active").length;
    const graduates = progChildren.filter(c => c.status === "graduated").length;
    const milestoneCount = (milestones || []).filter(m => progChildren.some(c => c.id === m.child_id)).length;

    // Avg improvement for this program's children
    let improvements: number[] = [];
    for (const child of progChildren) {
      const childCheckins = (checkins || []).filter(ch => ch.child_id === child.id);
      if (childCheckins.length < 2) continue;
      const first = avgCheckin(childCheckins[0]);
      const last = avgCheckin(childCheckins[childCheckins.length - 1]);
      if (first > 0) improvements.push(Math.round(((last - first) / first) * 100));
    }
    const avgImprovement = improvements.length > 0 ? Math.round(improvements.reduce((a, b) => a + b, 0) / improvements.length) : 0;

    programResultsMap[prog] = { totalLeads: progLeads, totalClients: progClients, totalRevenue: progRevenue, activeChildren, graduates, avgImprovement, milestoneCount };
  }

  const programResults = Object.entries(programResultsMap)
    .sort((a, b) => b[1].totalClients - a[1].totalClients)
    .map(([program, data]) => ({ program, ...data }));

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Business Intelligence" subtitle="Content that creates clients" />
      <BusinessDashboardClient
        leads={leads || []}
        attribution={attribution || []}
        performance={performance || []}
        consultationStats={consultationStats}
        clientsByProgram={clientsByProgram}
        totalEnrollments={allEnrollments.length}
        programResults={programResults}
      />
    </div>
  );
}
