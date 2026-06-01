import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("child_profiles")
    .select(`
      *,
      child_goals(id, goal_title, category, target_score, current_score, achieved),
      progress_checkins(id, week_number, confidence_score, resilience_score, emotional_regulation_score, communication_score, created_at),
      milestones(id, title, category, achieved_at),
      success_stories(id, title, status)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(ip, 60, 3600)) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { enrollment_id, child_name, age, program, start_date } = body;

  if (!child_name?.trim()) {
    return NextResponse.json({ error: "child_name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("child_profiles")
    .insert({
      user_id: user.id,
      enrollment_id: enrollment_id || null,
      child_name: child_name.trim(),
      age: age ? parseInt(age) : null,
      program: program || null,
      start_date: start_date || new Date().toISOString().split("T")[0],
      status: "active",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ child: data }, { status: 201 });
}
