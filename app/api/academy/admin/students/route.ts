import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trackId = req.nextUrl.searchParams.get("track_id");

  let query = supabase
    .from("academy_students")
    .select("*, academy_tracks(name, age_range, total_weeks, weeks_per_payment)")
    .eq("user_id", user.id)
    .order("enrolled_at", { ascending: false });

  if (trackId) query = query.eq("track_id", trackId);

  const { data: students, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // renewal_due_at: when the student's current 4-week block runs out and the
  // next payment is expected. Null if there's nothing left to pay for (course
  // finished) or they haven't paid at all yet.
  const withRenewal = (students || []).map(s => {
    const track = s.academy_tracks as { total_weeks: number; weeks_per_payment: number } | null;
    let renewal_due_at: string | null = null;
    if (s.status === "active" && s.last_payment_at && track && s.current_week < track.total_weeks) {
      renewal_due_at = new Date(
        new Date(s.last_payment_at).getTime() + (track.weeks_per_payment || 4) * 7 * 24 * 60 * 60 * 1000
      ).toISOString();
    }
    return { ...s, renewal_due_at };
  });

  return NextResponse.json({ students: withRenewal });
}
