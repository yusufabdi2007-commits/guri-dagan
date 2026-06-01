import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { FollowupsClient } from "@/components/followups/FollowupsClient";

export default async function FollowupsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [
    { data: leads },
    { data: consultations },
    { data: enrollments },
    { data: payments },
    { data: testimonialRequests },
    { data: activeChildren },
    { data: recentCheckins },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id, name, phone, email, program, source, stage, created_at, notes")
      .eq("user_id", user!.id)
      .not("stage", "in", '("client","closed")')
      .order("created_at", { ascending: true }),
    supabase
      .from("consultations")
      .select("id, scheduled_at, outcome, notes, leads(id, name, phone, program)")
      .eq("user_id", user!.id)
      .in("outcome", ["follow_up", "no_show"]),
    supabase
      .from("client_enrollments")
      .select("id, parent_name, child_name, program, enrollment_date, status")
      .eq("user_id", user!.id)
      .eq("status", "paused"),
    supabase
      .from("payments")
      .select("id, amount, currency, payment_date, client_enrollments(id, parent_name, program)")
      .eq("user_id", user!.id)
      .eq("payment_status", "pending"),
    supabase
      .from("testimonial_requests")
      .select("id, requested_at, client_enrollments(id, parent_name, program)")
      .eq("user_id", user!.id)
      .eq("status", "pending"),
    supabase
      .from("child_profiles")
      .select("id, child_name, program, enrollment_id")
      .eq("user_id", user!.id)
      .eq("status", "active"),
    supabase
      .from("progress_checkins")
      .select("child_id, confidence_score, resilience_score, emotional_regulation_score, communication_score, responsibility_score, leadership_score, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true }),
  ]);

  // Filter leads not contacted for 7+ days
  const staleLeads = (leads || []).filter(l => new Date(l.created_at) <= sevenDaysAgo);

  // Detect at-risk children
  type AtRiskChild = { id: string; child_name: string; program: string | null; enrollment_id: string | null; reason: string };
  const atRiskChildren: AtRiskChild[] = [];

  for (const child of activeChildren || []) {
    const childCheckins = (recentCheckins || []).filter(c => c.child_id === child.id);

    // No check-in for 14+ days
    const latestCheckin = childCheckins[childCheckins.length - 1];
    if (!latestCheckin || new Date(latestCheckin.created_at) < fourteenDaysAgo) {
      atRiskChildren.push({ ...child, reason: "No check-in for 14+ days" });
      continue;
    }

    // Declining scores 3 weeks in a row
    if (childCheckins.length >= 3) {
      function avg(c: typeof childCheckins[0]) {
        const row = c as typeof c & { responsibility_score?: number | null; leadership_score?: number | null };
        const vals = [row.confidence_score, row.resilience_score, row.emotional_regulation_score, row.communication_score, row.responsibility_score, row.leadership_score].filter((v): v is number => v != null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      }
      const last3 = childCheckins.slice(-3).map(avg);
      if (last3[0] > last3[1] && last3[1] > last3[2]) {
        atRiskChildren.push({ ...child, reason: "Declining scores 3 weeks in a row" });
      }
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Follow-ups" subtitle="What needs attention today" />
      <FollowupsClient
        staleLeads={staleLeads}
        consultationsNeedingFollowup={consultations || []}
        pausedClients={enrollments || []}
        overduePayments={payments || []}
        outstandingTestimonials={testimonialRequests || []}
        atRiskChildren={atRiskChildren}
      />
    </div>
  );
}
