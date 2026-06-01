import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("consultations")
    .select("*, leads(id, name, phone, email, program, source)")
    .eq("user_id", user.id)
    .order("scheduled_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  if (!rateLimit(req, { limit: 60, windowMs: 3600000 }).ok) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { lead_id, scheduled_at, notes } = body;

  if (!scheduled_at) {
    return NextResponse.json({ error: "scheduled_at is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("consultations")
    .insert({
      user_id: user.id,
      lead_id: lead_id || null,
      scheduled_at,
      notes: notes || null,
    })
    .select("*, leads(id, name, phone, email, program, source)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update lead stage to call_scheduled if linked
  if (lead_id) {
    await supabase.from("leads").update({ stage: "call_scheduled" }).eq("id", lead_id).eq("user_id", user.id);
    await supabase.from("lead_activity").insert({
      lead_id,
      user_id: user.id,
      activity_type: "stage_changed",
      from_stage: null,
      to_stage: "call_scheduled",
      note: `Consultation scheduled for ${new Date(scheduled_at).toLocaleDateString()}`,
    });
  }

  return NextResponse.json({ consultation: data }, { status: 201 });
}
