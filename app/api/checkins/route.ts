import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const childId = req.nextUrl.searchParams.get("child_id");
  let query = supabase
    .from("progress_checkins")
    .select("*, child_profiles(id, child_name, program)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (childId) query = query.eq("child_id", childId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  if (!rateLimit(req, { limit: 60, windowMs: 3600000 }).ok) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    child_id,
    week_number,
    attendance,
    confidence_score,
    resilience_score,
    emotional_regulation_score,
    communication_score,
    responsibility_score,
    leadership_score,
    parent_notes,
    coach_notes,
  } = body;

  if (!child_id) return NextResponse.json({ error: "child_id is required" }, { status: 400 });
  if (!week_number) return NextResponse.json({ error: "week_number is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("progress_checkins")
    .insert({
      user_id: user.id,
      child_id,
      week_number: parseInt(week_number),
      attendance: attendance || "attended",
      confidence_score: confidence_score ? parseInt(confidence_score) : null,
      resilience_score: resilience_score ? parseInt(resilience_score) : null,
      emotional_regulation_score: emotional_regulation_score ? parseInt(emotional_regulation_score) : null,
      communication_score: communication_score ? parseInt(communication_score) : null,
      responsibility_score: responsibility_score ? parseInt(responsibility_score) : null,
      leadership_score: leadership_score ? parseInt(leadership_score) : null,
      parent_notes: parent_notes || null,
      coach_notes: coach_notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update child_goals current_score based on latest check-in averages
  await updateGoalScores(supabase, user.id, child_id, {
    confidence_score,
    resilience_score,
    emotional_regulation_score,
    communication_score,
    responsibility_score,
    leadership_score,
  });

  return NextResponse.json({ checkin: data }, { status: 201 });
}

async function updateGoalScores(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string,
  childId: string,
  scores: Record<string, number | undefined>
) {
  const categoryMap: Record<string, string> = {
    confidence_score: "confidence",
    resilience_score: "resilience",
    emotional_regulation_score: "emotional_regulation",
    communication_score: "communication",
    responsibility_score: "responsibility",
    leadership_score: "leadership",
  };

  for (const [field, category] of Object.entries(categoryMap)) {
    const score = scores[field];
    if (!score) continue;
    // Update matching goals that aren't yet achieved
    const { data: goals } = await supabase
      .from("child_goals")
      .select("id, target_score")
      .eq("user_id", userId)
      .eq("child_id", childId)
      .eq("category", category)
      .eq("achieved", false);

    if (!goals?.length) continue;
    for (const goal of goals) {
      const achieved = score >= goal.target_score;
      await supabase
        .from("child_goals")
        .update({ current_score: score, achieved })
        .eq("id", goal.id);
    }
  }
}
