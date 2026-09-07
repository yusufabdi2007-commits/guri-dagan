import { NextRequest, NextResponse } from "next/server";
import { getStudentFromSession } from "@/lib/academy-auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 30, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  try {
    const session = await getStudentFromSession(req);
    if (!session) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    const { student, supabase } = session;

    let body: { chapter_id?: string; answers?: number[] };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { chapter_id, answers } = body;
    if (!chapter_id || !Array.isArray(answers)) {
      return NextResponse.json({ error: "chapter_id and answers are required" }, { status: 400 });
    }

    const { data: chapter } = await supabase
      .from("academy_chapters")
      .select("id, week_number, track_id")
      .eq("id", chapter_id)
      .single();
    if (!chapter || chapter.track_id !== student.track_id) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }
    if (chapter.week_number > student.current_week) {
      return NextResponse.json({ error: "This week isn't unlocked yet" }, { status: 403 });
    }

    const { data: questions } = await supabase
      .from("academy_exam_questions")
      .select("id, correct_index")
      .eq("chapter_id", chapter_id)
      .order("sort_order", { ascending: true });

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: "No exam for this chapter" }, { status: 404 });
    }

    const score = questions.reduce((total, q, i) => total + (answers[i] === q.correct_index ? 1 : 0), 0);
    const total = questions.length;
    const passed = score / total >= 0.7;

    const { data: result, error } = await supabase
      .from("academy_exam_results")
      .upsert(
        { student_id: student.id, chapter_id, score, total, passed },
        { onConflict: "student_id,chapter_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Academy exam submit error:", error);
      return NextResponse.json({ error: "Could not save your result. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ result });
  } catch (err) {
    console.error("Academy exam submit route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
