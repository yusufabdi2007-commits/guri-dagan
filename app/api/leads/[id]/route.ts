import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: lead, error }, { data: activity }, { data: attribution }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).eq("user_id", user.id).single(),
    supabase.from("lead_activity").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("content_attribution").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
  ]);

  if (error || !lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lead, activity: activity || [], attribution: attribution || [] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const limit = rateLimit(req, { limit: 60, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, phone, email, source, stage, notes, attribution } = body;

  // Fetch current state to detect stage changes
  const { data: current } = await supabase.from("leads").select("stage").eq("id", id).eq("user_id", user.id).single();
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone || null;
  if (email !== undefined) updates.email = email || null;
  if (source !== undefined) updates.source = source;
  if (stage !== undefined) updates.stage = stage;
  if (notes !== undefined) updates.notes = notes || null;

  const { data: lead, error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log stage change
  if (stage && stage !== current.stage) {
    await supabase.from("lead_activity").insert({
      lead_id: id,
      user_id: user.id,
      activity_type: "stage_changed",
      from_stage: current.stage,
      to_stage: stage,
    });
  }

  // Upsert attribution if provided
  if (attribution) {
    const { content_category, youtube_video_id, video_title, tiktok_topic, attr_notes } = attribution;
    const { data: existing } = await supabase
      .from("content_attribution")
      .select("id")
      .eq("lead_id", id)
      .limit(1)
      .single();

    if (existing) {
      await supabase.from("content_attribution")
        .update({ content_category, youtube_video_id: youtube_video_id || null, video_title: video_title || null, tiktok_topic: tiktok_topic || null, notes: attr_notes || null })
        .eq("id", existing.id);
    } else {
      await supabase.from("content_attribution").insert({
        lead_id: id,
        user_id: user.id,
        content_category,
        youtube_video_id: youtube_video_id || null,
        video_title: video_title || null,
        tiktok_topic: tiktok_topic || null,
        notes: attr_notes || null,
      });
      await supabase.from("lead_activity").insert({
        lead_id: id,
        user_id: user.id,
        activity_type: "attributed",
        note: `Attributed to ${content_category || tiktok_topic || "content"}`,
      });
    }
  }

  return NextResponse.json({ lead });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("leads").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
