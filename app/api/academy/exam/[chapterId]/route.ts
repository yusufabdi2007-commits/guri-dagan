import { NextRequest, NextResponse } from "next/server";
import { getStudentFromSession } from "@/lib/academy-auth";

// Returns exam questions for a chapter, WITHOUT correct_index, so a logged-in
// student can take the exam (scoring happens server-side in /exam/submit).
export async function GET(req: NextRequest, { params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  const session = await getStudentFromSession(req);
  if (!session) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const { student, supabase } = session;

  const { data: chapter } = await supabase
    .from("academy_chapters")
    .select("id, week_number, track_id")
    .eq("id", chapterId)
    .single();
  if (!chapter || chapter.track_id !== student.track_id || chapter.week_number > student.current_week) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const { data: questions } = await supabase
    .from("academy_exam_questions")
    .select("id, question, options")
    .eq("chapter_id", chapterId)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ questions: questions || [] });
}
