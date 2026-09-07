import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

// Exam questions have no user_id of their own — ownership is verified by
// joining through chapter -> track -> user_id, same pattern as the chapters routes.

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const chapterId = req.nextUrl.searchParams.get("chapter_id");
    if (!chapterId) return NextResponse.json({ error: "chapter_id is required" }, { status: 400 });

    const { data: chapter } = await supabase
      .from("academy_chapters")
      .select("id, academy_tracks!inner(user_id)")
      .eq("id", chapterId)
      .single();
    if (!chapter || (chapter as unknown as { academy_tracks: { user_id: string } }).academy_tracks.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: questions, error } = await supabase
      .from("academy_exam_questions")
      .select("*")
      .eq("chapter_id", chapterId)
      .order("sort_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ questions: questions || [] });
  } catch (err) {
    console.error("Academy exam-questions GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 60, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: { chapter_id?: string; question?: string; options?: string[]; correct_index?: number; sort_order?: number };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { chapter_id, question, options, correct_index, sort_order } = body;

    if (!chapter_id || !question?.trim()) {
      return NextResponse.json({ error: "chapter_id and question are required" }, { status: 400 });
    }
    if (!Array.isArray(options) || options.length < 2 || options.some(o => !o?.trim())) {
      return NextResponse.json({ error: "At least 2 non-empty answer options are required" }, { status: 400 });
    }
    if (typeof correct_index !== "number" || correct_index < 0 || correct_index >= options.length) {
      return NextResponse.json({ error: "correct_index must point at one of the options" }, { status: 400 });
    }

    const { data: chapter } = await supabase
      .from("academy_chapters")
      .select("id, academy_tracks!inner(user_id)")
      .eq("id", chapter_id)
      .single();
    if (!chapter || (chapter as unknown as { academy_tracks: { user_id: string } }).academy_tracks.user_id !== user.id) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    const { data: created, error } = await supabase
      .from("academy_exam_questions")
      .insert({
        chapter_id,
        question: question.trim(),
        options: options.map(o => o.trim()),
        correct_index,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ question: created }, { status: 201 });
  } catch (err) {
    console.error("Academy exam-questions POST error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
