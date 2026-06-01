import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const limit = rateLimit(req, { limit: 60, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: leads, error } = await supabase
    .from("leads")
    .select("*, content_attribution(id, content_category, youtube_video_id, video_title, tiktok_topic)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: leads || [] });
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 60, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, phone, email, source = "other", stage = "new_lead", notes, program } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({ user_id: user.id, name: name.trim(), phone: phone || null, email: email || null, source, stage, notes: notes || null, program: program || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log creation activity
  await supabase.from("lead_activity").insert({
    lead_id: lead.id,
    user_id: user.id,
    activity_type: "created",
    to_stage: "new_lead",
    note: `Lead created from ${source}`,
  });

  return NextResponse.json({ lead }, { status: 201 });
}
