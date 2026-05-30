import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_STATUSES = ["needs_review", "needs_fix", "approved", "high_retention_candidate", "ready_for_export"];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { videoId, review_status, reviewer_notes } = await req.json();
  if (!videoId) return NextResponse.json({ error: "Missing videoId" }, { status: 400 });

  const status = VALID_STATUSES.includes(review_status) ? review_status : "needs_review";
  const isCompleted = ["approved", "high_retention_candidate", "ready_for_export"].includes(status);

  const { data, error } = await supabase
    .from("video_reviews")
    .upsert({
      user_id: user.id,
      video_id: videoId,
      review_status: status,
      reviewer_notes: reviewer_notes ?? null,
      review_completed_at: isCompleted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "video_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({
      error: error.message,
      warning: "Run 011_review_schema.sql in Supabase to enable persistent review state.",
    }, { status: 500 });
  }

  return NextResponse.json({ review: data });
}
