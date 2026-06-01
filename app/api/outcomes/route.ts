import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PROGRAM_NAMES } from "@/lib/programs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    supabase.from("child_profiles").select("*").eq("user_id", user.id),
    supabase.from("progress_checkins").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
    supabase.from("milestones").select("*").eq("user_id", user.id),
    supabase.from("success_stories").select("*").eq("user_id", user.id),
    supabase.from("child_goals").select("*").eq("user_id", user.id),
    supabase.from("leads").select("program").eq("user_id", user.id),
    supabase.from("client_enrollments").select("program, status").eq("user_id", user.id),
    supabase.from("payments").select("amount, payment_status, client_enrollments(program)").eq("user_id", user.id).eq("payment_status", "paid"),
  ]);

  const allChildren = children || [];
  const allCheckins = checkins || [];
  const allMilestones = milestones || [];
  const allStories = stories || [];
  const allGoals = goals || [];

  // Build per-program outcome stats
  const programStats: Record<string, {
    program: string;
    activeChildren: number;
    graduates: number;
    avgImprovement: number;
    topOutcomes: string[];
    testimonialCount: number;
    totalLeads: number;
    totalClients: number;
    totalRevenue: number;
  }> = {};

  for (const prog of PROGRAM_NAMES) {
    const progChildren = allChildren.filter(c => c.program === prog);
    const active = progChildren.filter(c => c.status === "active").length;
    const graduated = progChildren.filter(c => c.status === "graduated").length;

    // Average improvement: compare first vs last check-in score for each child in this program
    let totalImprovements: number[] = [];
    for (const child of progChildren) {
      const childCheckins = allCheckins.filter(ch => ch.child_id === child.id);
      if (childCheckins.length < 2) continue;
      const first = childCheckins[0];
      const last = childCheckins[childCheckins.length - 1];
      const avgFirst = avg([first.confidence_score, first.resilience_score, first.emotional_regulation_score, first.communication_score]);
      const avgLast = avg([last.confidence_score, last.resilience_score, last.emotional_regulation_score, last.communication_score]);
      if (avgFirst > 0) totalImprovements.push(((avgLast - avgFirst) / avgFirst) * 100);
    }
    const avgImprovement = totalImprovements.length > 0
      ? Math.round(totalImprovements.reduce((a, b) => a + b, 0) / totalImprovements.length)
      : 0;

    // Top outcomes from milestone titles
    const progMilestones = allMilestones.filter(m => progChildren.some(c => c.id === m.child_id));
    const topOutcomes = [...new Set(progMilestones.map(m => m.title))].slice(0, 3);

    // Testimonials = published success stories
    const testimonialCount = allStories.filter(s => s.status === "published" && progChildren.some(c => c.id === s.child_id)).length;

    // Business data
    const totalLeads = (leads || []).filter(l => l.program === prog).length;
    const totalClients = (enrollments || []).filter(e => e.program === prog).length;
    const totalRevenue = (payments || [])
      .filter(p => (p.client_enrollments as { program?: string } | null)?.program === prog)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    programStats[prog] = { program: prog, activeChildren: active, graduates: graduated, avgImprovement, topOutcomes, testimonialCount, totalLeads, totalClients, totalRevenue };
  }

  // Overall stats
  const totalActive = allChildren.filter(c => c.status === "active").length;
  const totalGraduated = allChildren.filter(c => c.status === "graduated").length;
  const goalsAchieved = allGoals.filter(g => g.achieved).length;
  const totalGoals = allGoals.length;

  return NextResponse.json({
    programOutcomes: Object.values(programStats),
    overall: {
      totalChildren: allChildren.length,
      totalActive,
      totalGraduated,
      totalMilestones: allMilestones.length,
      totalStories: allStories.length,
      publishedStories: allStories.filter(s => s.status === "published").length,
      goalsAchieved,
      totalGoals,
    },
  });
}

function avg(values: (number | null | undefined)[]): number {
  const valid = values.filter((v): v is number => v != null && !isNaN(v));
  if (!valid.length) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}
