import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("client_enrollments")
    .select(`
      *,
      leads(id, name, phone, email, source, program),
      payments(id, amount, currency, payment_date, payment_status),
      testimonial_requests(id, status, requested_at, received_at)
    `)
    .eq("user_id", user.id)
    .order("enrollment_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  if (!rateLimit(req, { limit: 60, windowMs: 3600000 }).ok) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { lead_id, parent_name, child_name, program, enrollment_date, notes } = body;

  if (!parent_name?.trim()) {
    return NextResponse.json({ error: "parent_name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("client_enrollments")
    .insert({
      user_id: user.id,
      lead_id: lead_id || null,
      parent_name: parent_name.trim(),
      child_name: child_name?.trim() || null,
      program: program || null,
      enrollment_date: enrollment_date || new Date().toISOString().split("T")[0],
      notes: notes || null,
      status: "active",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If linked to a lead, update lead stage to 'client'
  if (lead_id) {
    await supabase.from("leads").update({ stage: "client" }).eq("id", lead_id).eq("user_id", user.id);
    await supabase.from("lead_activity").insert({
      lead_id,
      user_id: user.id,
      activity_type: "stage_changed",
      from_stage: null,
      to_stage: "client",
      note: `Enrolled in ${program || "program"}`,
    });
  }

  // Auto-create child profile if child_name provided
  if (child_name?.trim()) {
    const { data: childProfile } = await supabase
      .from("child_profiles")
      .insert({
        user_id: user.id,
        enrollment_id: data.id,
        child_name: child_name.trim(),
        program: program || null,
        start_date: enrollment_date || new Date().toISOString().split("T")[0],
        status: "active",
      })
      .select()
      .single();

    // Auto-create starter goals aligned to the program
    if (childProfile) {
      const starterGoals = [
        { category: "confidence", goal_title: "Build self-confidence and self-belief", target_score: 8 },
        { category: "communication", goal_title: "Improve communication with parents", target_score: 7 },
        { category: "emotional_regulation", goal_title: "Manage emotions in difficult situations", target_score: 7 },
        { category: "resilience", goal_title: "Bounce back from setbacks", target_score: 8 },
      ];
      await supabase.from("child_goals").insert(
        starterGoals.map(g => ({
          user_id: user.id,
          child_id: childProfile.id,
          ...g,
          current_score: 3,
          achieved: false,
        }))
      );
    }
  }

  return NextResponse.json({ enrollment: data }, { status: 201 });
}
