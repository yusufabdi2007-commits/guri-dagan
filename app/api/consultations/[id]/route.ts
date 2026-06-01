import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.scheduled_at !== undefined) updates.scheduled_at = body.scheduled_at;
  if (body.completed_at !== undefined) updates.completed_at = body.completed_at;
  if (body.outcome !== undefined) updates.outcome = body.outcome || null;
  if (body.notes !== undefined) updates.notes = body.notes || null;

  const { data, error } = await supabase
    .from("consultations")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*, leads(id, name, phone, email, program, source)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If outcome is set and linked to a lead, update lead stage
  if (body.outcome && data.lead_id) {
    const stageMap: Record<string, string> = {
      enrolled: "client",
      follow_up: "follow_up",
      not_interested: "closed",
      no_show: "follow_up",
    };
    const newStage = stageMap[body.outcome];
    if (newStage) {
      await supabase.from("leads").update({ stage: newStage }).eq("id", data.lead_id).eq("user_id", user.id);
      await supabase.from("lead_activity").insert({
        lead_id: data.lead_id,
        user_id: user.id,
        activity_type: "stage_changed",
        from_stage: null,
        to_stage: newStage,
        note: `Consultation outcome: ${body.outcome.replace("_", " ")}`,
      });
    }
  }

  return NextResponse.json({ consultation: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("consultations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
