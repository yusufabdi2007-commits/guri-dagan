import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { SuccessDashboardClient } from "@/components/success/SuccessDashboardClient";

export default async function SuccessPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [
    { data: children },
    { data: checkins },
    { data: milestones },
    { data: stories },
    { data: goals },
  ] = await Promise.all([
    supabase
      .from("child_profiles")
      .select("id, child_name, age, program, status, start_date, graduation_date, enrollment_id")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("progress_checkins")
      .select("id, child_id, week_number, confidence_score, resilience_score, emotional_regulation_score, communication_score, responsibility_score, leadership_score, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("milestones")
      .select("id, child_id, title, category, achieved_at")
      .eq("user_id", user!.id)
      .order("achieved_at", { ascending: false }),
    supabase
      .from("success_stories")
      .select("id, child_id, title, status")
      .eq("user_id", user!.id),
    supabase
      .from("child_goals")
      .select("id, child_id, goal_title, category, target_score, current_score, achieved")
      .eq("user_id", user!.id),
  ]);

  const allChildren = children || [];
  const allCheckins = checkins || [];
  const allMilestones = milestones || [];
  const allStories = stories || [];
  const allGoals = goals || [];

  // Compute per-child derived metrics
  type ChildSummary = {
    id: string;
    child_name: string;
    age: number | null;
    program: string | null;
    status: string;
    start_date: string;
    graduation_date: string | null;
    enrollment_id: string | null;
    milestoneCount: number;
    goalCount: number;
    achievedGoals: number;
    checkinCount: number;
    latestCheckinDate: string | null;
    progressPct: number;
    improvementPct: number;
    atRisk: boolean;
    atRiskReason: string | null;
    hasStory: boolean;
    storyStatus: string | null;
    readyForTestimonial: boolean;
  };

  function avgScores(c: { confidence_score?: number | null; resilience_score?: number | null; emotional_regulation_score?: number | null; communication_score?: number | null; responsibility_score?: number | null; leadership_score?: number | null }) {
    const vals = [c.confidence_score, c.resilience_score, c.emotional_regulation_score, c.communication_score, c.responsibility_score, c.leadership_score].filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }

  const childSummaries: ChildSummary[] = allChildren.map(child => {
    const childCheckins = allCheckins.filter(ch => ch.child_id === child.id);
    const childMilestones = allMilestones.filter(m => m.child_id === child.id);
    const childGoals = allGoals.filter(g => g.child_id === child.id);
    const story = allStories.find(s => s.child_id === child.id);

    const latest = childCheckins[childCheckins.length - 1] ?? null;
    const latestCheckinDate = latest?.created_at ?? null;

    // Improvement: first vs last avg score
    let improvementPct = 0;
    if (childCheckins.length >= 2) {
      const first = avgScores(childCheckins[0]);
      const last = avgScores(childCheckins[childCheckins.length - 1]);
      if (first > 0) improvementPct = Math.round(((last - first) / first) * 100);
    }

    // Progress % = achieved goals / total goals
    const progressPct = childGoals.length > 0 ? Math.round((childGoals.filter(g => g.achieved).length / childGoals.length) * 100) : 0;

    // At-risk detection
    let atRisk = false;
    let atRiskReason: string | null = null;

    if (child.status === "active") {
      // No check-in for 14+ days
      if (!latestCheckinDate || new Date(latestCheckinDate) < fourteenDaysAgo) {
        atRisk = true;
        atRiskReason = "No check-in for 14+ days";
      }
      // Declining scores 3 weeks in a row
      if (childCheckins.length >= 3) {
        const last3 = childCheckins.slice(-3);
        const scores = last3.map(c => avgScores(c));
        if (scores[0] > scores[1] && scores[1] > scores[2]) {
          atRisk = true;
          atRiskReason = "Declining scores 3 weeks in a row";
        }
      }
    }

    // Ready for testimonial: improvement ≥ 20% or multiple milestones or graduation
    const readyForTestimonial = (improvementPct >= 20 || childMilestones.length >= 3 || child.status === "graduated") && !story?.status?.includes("published");

    return {
      ...child,
      milestoneCount: childMilestones.length,
      goalCount: childGoals.length,
      achievedGoals: childGoals.filter(g => g.achieved).length,
      checkinCount: childCheckins.length,
      latestCheckinDate,
      progressPct,
      improvementPct,
      atRisk,
      atRiskReason,
      hasStory: !!story,
      storyStatus: story?.status ?? null,
      readyForTestimonial,
    };
  });

  const atRiskChildren = childSummaries.filter(c => c.atRisk && c.status === "active");
  const testimonialReady = childSummaries.filter(c => c.readyForTestimonial);

  // Overall improvement average
  const withImprovement = childSummaries.filter(c => c.checkinCount >= 2);
  const avgImprovement = withImprovement.length > 0
    ? Math.round(withImprovement.reduce((a, c) => a + c.improvementPct, 0) / withImprovement.length)
    : 0;

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Parent Success" subtitle="Track every child's transformation" />
      <SuccessDashboardClient
        childSummaries={childSummaries}
        atRiskChildren={atRiskChildren}
        testimonialReady={testimonialReady}
        avgImprovement={avgImprovement}
        totalMilestones={allMilestones.length}
        publishedStories={allStories.filter(s => s.status === "published").length}
      />
    </div>
  );
}
