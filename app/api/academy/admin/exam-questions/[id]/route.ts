import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function assertOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  userId: string
) {
  const { data } = await supabase
    .from("academy_exam_questions")
    .select("id, academy_chapters!inner(academy_tracks!inner(user_id))")
    .eq("id", id)
    .single();
  const owner = (data as unknown as { academy_chapters: { academy_tracks: { user_id: string } } } | null)
    ?.academy_chapters?.academy_tracks?.user_id;
  return !!data && owner === userId;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!(await assertOwnership(supabase, id, user.id))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { question, options, correct_index, sort_order } = body;

    if (options !== undefined && (!Array.isArray(options) || options.length < 2 || options.some((o) => !o?.trim()))) {
      return NextResponse.json({ error: "At least 2 non-empty answer options are required" }, { status: 400 });
    }

    // Validate the RESULTING row is consistent even when only one of
    // options/correct_index is sent — e.g. PATCHing options down to 2
    // entries while a stale correct_index of 3 is left untouched would
    // otherwise leave a question whose correct answer can never be matched
    // by a student (the same check POST already does, but only against the
    // fields present in this request; unset fields fall back to what's
    // already stored).
    if (options !== undefined || correct_index !== undefined) {
      let effectiveOptions = options as string[] | undefined;
      let effectiveCorrectIndex = correct_index as number | undefined;
      if (effectiveOptions === undefined || effectiveCorrectIndex === undefined) {
        const { data: existing } = await supabase
          .from("academy_exam_questions")
          .select("options, correct_index")
          .eq("id", id)
          .single();
        if (effectiveOptions === undefined) effectiveOptions = existing?.options as string[] | undefined;
        if (effectiveCorrectIndex === undefined) effectiveCorrectIndex = existing?.correct_index as number | undefined;
      }
      if (
        typeof effectiveCorrectIndex !== "number" ||
        !Array.isArray(effectiveOptions) ||
        effectiveCorrectIndex < 0 ||
        effectiveCorrectIndex >= effectiveOptions.length
      ) {
        return NextResponse.json({ error: "correct_index must point at one of the options" }, { status: 400 });
      }
    }

    const updates: Record<string, unknown> = {};
    if (question !== undefined) updates.question = question;
    if (options !== undefined) updates.options = options;
    if (correct_index !== undefined) updates.correct_index = correct_index;
    if (sort_order !== undefined) updates.sort_order = sort_order;

    const { data: updated, error } = await supabase
      .from("academy_exam_questions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ question: updated });
  } catch (err) {
    console.error("Academy exam-question PATCH error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!(await assertOwnership(supabase, id, user.id))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error } = await supabase.from("academy_exam_questions").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Academy exam-question DELETE error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
